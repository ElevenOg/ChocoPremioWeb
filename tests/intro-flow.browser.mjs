// Run after npm run build: node tests/intro-flow.browser.mjs
// Commerce data and credentials are fixtures. Every session request is intercepted.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

const slug = "qa-intro";
const browserPath = process.env.QA_BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const serverPort = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const base = "http://127.0.0.1:" + serverPort;
const sessionId = "11111111-1111-4111-8111-111111111111";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fixture = new URL("./helpers/intro-server-fixture.mjs", import.meta.url).href;
const server = spawn(process.execPath, ["--import", fixture, "node_modules/next/dist/bin/next", "start", "--port", String(serverPort)], {
  windowsHide: true, stdio: "ignore",
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "https://qa.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "qa-fixture-key" },
});
let browser, ws;
const pending = new Map();

try {
  let html;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(base + "/" + slug, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error("Commerce page returned " + response.status);
      html = await response.text();
      break;
    } catch { await sleep(100); }
  }
  assert.ok(html, "Production server starts and commerce exists");
  assert.ok(html.includes("CUATRO CAJAS."));
  assert.ok(html.includes("/" + slug + "/social"), "Social link is in the initial HTML");
  assert.ok(!html.includes("introPending") && !html.includes("Preparando el juego"));
  const socialRedirect = await fetch(base + "/" + slug + "/social", { redirect: "manual" });
  assert.equal(socialRedirect.status, 307);
  assert.equal(socialRedirect.headers.get("location"), "https://www.instagram.com/example/");
  console.log("Initial HTML contains the complete intro.");

  const profile = await mkdtemp(join(tmpdir(), "chocopremio-intro-"));
  browser = spawn(browserPath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-extensions", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); if (port) break; } catch { /* Still starting. */ }
    await sleep(100);
  }
  assert.ok(port, "Browser starts");
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  let sequence = 0;
  const listeners = new Map();
  const send = (method, params = {}, session) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + " timed out")); }, 15000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const call = pending.get(message.id);
      if (!call) return;
      clearTimeout(call.timer); pending.delete(message.id);
      if (message.error) call.reject(new Error(message.error.message)); else call.resolve(message.result);
    } else listeners.get(message.method)?.(message.params, message.sessionId);
  });
  const targets = await send("Target.getTargets");
  const target = targets.targetInfos.find((item) => item.type === "page" && item.url === "about:blank");
  const { sessionId: page } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const evaluate = async (expression, session = page) => {
    const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true }, session);
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.text);
    return reply.result.value;
  };
  const until = async (expression) => {
    for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await sleep(50); }
    throw new Error("Condition timed out: " + expression);
  };
  const click = (text) => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(text)})); if (!b || b.disabled) throw Error('Button unavailable'); b.click(); })()`);
  const calls = [], errors = [];
  let pausedStart, startMode = "hold", socialPage, blockedExternal = false;
  const prize = { won: true, selected_box: 1, prize: { id: "test-prize", campaign_id: "test-campaign", type: "small_discount", name: "Premio de prueba", title: "Premio de prueba", probability: 1 } };
  const startData = { session_id: sessionId, slug, social_url: "https://www.instagram.com/example/", has_result: false };
  const fulfill = (requestId, data, status = 200, session = page) => send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(data)).toString("base64") }, session);
  listeners.set("Runtime.exceptionThrown", (event) => errors.push(event.exceptionDetails.text));
  listeners.set("Fetch.requestPaused", (event, session) => {
    const url = new URL(event.request.url);
    if (url.origin !== base) {
      blockedExternal = true;
      void send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Aborted" }, session);
      return;
    }
    const route = url.pathname;
    calls.push({ route, body: event.request.postData });
    if (route.endsWith("/start")) {
      if (startMode === "hold") { pausedStart = event.requestId; return; }
      void fulfill(event.requestId, startMode === "error" ? { error: "Fallo de prueba" } : { ...startData, social_url: startMode === "no-social" ? null : startData.social_url, has_result: startMode === "result" }, startMode === "error" ? 503 : 200, session);
      return;
    }
    const data = route.endsWith("/state") ? { played: true, has_result: false } : route.endsWith("/result") ? prize : { ok: true };
    void fulfill(event.requestId, data, 200, session);
  });
  await send("Page.enable", {}, page);
  await send("Runtime.enable", {}, page);
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/session/*" }] }, page);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, page);

  // Pause newly opened tabs before their scripts can send the user to Instagram.
  listeners.set("Target.attachedToTarget", (event) => {
    if (event.targetInfo.type !== "page" || event.targetInfo.targetId === target.targetId) return;
    socialPage = event.sessionId;
    void (async () => {
      await send("Fetch.enable", { patterns: [{ urlPattern: "https://*" }] }, socialPage);
      await send("Runtime.runIfWaitingForDebugger", {}, socialPage);
    })();
  });
  await send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  await send("Page.navigate", { url: base + "/" + slug }, page);
  await until("!!document.querySelector('section') && !!document.querySelector('a[target=_blank]')");
  for (let i = 0; i < 100 && !pausedStart; i++) await sleep(50);
  assert.ok(pausedStart, "Session is deliberately held pending");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('section')).visibility"), "visible");
  assert.equal(await evaluate("!!document.querySelector('section[inert]')"), false);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('section')).animationDuration"), "0.28s");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, page);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('section')).animationName"), "none");
  await send("Emulation.setEmulatedMedia", { features: [] }, page);
  console.log("Intro stays interactive while the session is pending.");
  await click("Acepta los");
  await until("!!document.querySelector('[role=dialog]')");
  await click("Acepto los");
  await evaluate("document.querySelector('a[target=_blank]').click()");
  await until("document.body.textContent.includes('Términos aceptados') && document.body.textContent.includes('Volver a nuestra red social')");
  assert.equal(await evaluate("location.pathname"), "/" + slug);
  await click("ELEGIR MI CAJA");
  assert.equal(calls.filter((call) => call.route.endsWith("/play")).length, 0, "Early start waits for the same session");
  await fulfill(pausedStart, startData);
  await until("!!document.querySelector('button[aria-label^=\"Abrir caja\"]:not(:disabled)')");
  assert.equal(calls.filter((call) => call.route.endsWith("/start")).length, 1);
  assert.equal(calls.filter((call) => call.route.endsWith("/play")).length, 1);
  assert.equal(calls.filter((call) => call.route.endsWith("/social")).length, 1, "Visit before session readiness is recorded");
  await evaluate("document.querySelector('button[aria-label^=\"Abrir caja\"]').click()");
  await until("location.pathname.endsWith('/result') && document.body.textContent.includes('MOSTRAR MI PREMIO')");
  await click("MOSTRAR MI PREMIO");
  await until("location.pathname.endsWith('/claim') && document.body.textContent.includes('MOSTRAR EN CAJA')");
  await click("MOSTRAR EN CAJA");
  await until("document.body.textContent.includes('Marcado como mostrado en caja')");
  console.log("Game, result and claim complete using intercepted API responses.");
  assert.ok(socialPage, "Social opens a separate tab");
  await send("Page.bringToFront", {}, socialPage);
  for (let i = 0; i < 80 && !blockedExternal; i++) await sleep(50);
  assert.ok(blockedExternal, "Social tab attempts external navigation, intercepted for safety");
  const socialTabs = await send("Target.getTargets");
  const socialTarget = socialTabs.targetInfos.find((item) => item.type === "page" && item.targetId !== target.targetId);
  assert.ok(socialTarget);
  await send("Target.closeTarget", { targetId: socialTarget.targetId });
  assert.equal(await evaluate("location.pathname"), "/" + slug + "/claim", "Closing the social tab preserves the original game");

  await evaluate("sessionStorage.clear()");
  startMode = "error";
  await send("Page.navigate", { url: base + "/" + slug }, page);
  await until("document.body.textContent.includes('VOLVER A INTENTAR')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('section')).visibility"), "visible");
  await click("Acepta los"); await until("!!document.querySelector('[role=dialog]')"); await click("Acepto los");
  startMode = "ready";
  await click("VOLVER A INTENTAR");
  await until("!document.body.textContent.includes('VOLVER A INTENTAR')");
  await until("document.querySelector('a[target=_blank]')?.href === 'https://www.instagram.com/example/'");
  assert.ok(await evaluate("document.body.textContent.includes('Términos aceptados')"), "Retry preserves accepted terms");
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 }, page);
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "No horizontal overflow at " + width);
    if (process.env.QA_SCREENSHOTS) {
      const screenshot = await send("Page.captureScreenshot", { format: "png" }, page);
      await writeFile(new URL(`../.next/intro-${width}.png`, import.meta.url), Buffer.from(screenshot.data, "base64"));
    }
  }
  startMode = "result";
  await send("Page.reload", {}, page);
  await until("document.body.textContent.includes('VER MI PREMIO')");
  await click("VER MI PREMIO");
  await until("location.pathname.endsWith('/result') && document.body.textContent.includes('MOSTRAR MI PREMIO')");
  await evaluate("sessionStorage.clear()");
  startMode = "no-social";
  await send("Page.navigate", { url: base + "/" + slug }, page);
  await until("!!document.querySelector('section') && !document.querySelector('a[target=_blank]')");
  await click("Acepta los"); await until("!!document.querySelector('[role=dialog]')"); await click("Acepto los");
  await click("ELEGIR MI CAJA");
  await until("!!document.querySelector('button[aria-label^=\"Abrir caja\"]:not(:disabled)')");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ initialHtmlComplete: true, lightweightIntroAnimation: true, reducedMotionSupported: true, delayedSessionInteractive: true, earlyStartUsesOneSession: true, socialVisitQueued: true, socialOpensDirectly: true, originalGamePreserved: true, fullGameResultClaim: true, retryPreservesTerms: true, existingResultResumed: true, commerceWithoutSocialWorks: true, responsiveWidths: [390, 768, 1440], runtimeErrors: 0 }));
  await send("Browser.close").catch(() => {});
} finally {
  for (const call of pending.values()) clearTimeout(call.timer);
  ws?.close(); browser?.kill(); server.kill();
}
