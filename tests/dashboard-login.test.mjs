import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commerceId = "11111111-1111-4111-8111-111111111111";
const campaignId = "22222222-2222-4222-8222-222222222222";
const initialData = {
  commerce: { id: commerceId, name: "Comercio de prueba" },
  campaigns: [{ id: campaignId, name: "Campaña", active: true }],
  campaignId,
  stats: {
    metrics: { qr: 10, social: 8, played: 7, opened: 5, abandoned: 3, claimed: 2 },
    prizeStats: [{ name: "Premio", count: 5 }],
    boxStats: [], dailyActivity: [], timeZone: "America/Bogota",
  },
};

// Exercise the real route, validation, bootstrap helper and signed cookies.
// Only the Supabase network boundary is replaced; production data is untouched.
function setup(respond) {
  const calls = [];
  const cache = new Map();
  const db = { rpc: async (name, args) => {
    calls.push({ name, args: JSON.parse(JSON.stringify(args)) });
    return respond(name, args);
  } };
  const context = vm.createContext({
    console, crypto: webcrypto, performance, TextEncoder, TextDecoder,
    Uint8Array, atob, btoa, Date, Number, JSON, Map, URL, Request,
    process: { env: { NODE_ENV: "production", DASHBOARD_SESSION_SECRET: "dashboard-tests-only-secret" } },
  });
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loaded = { exports: {} };
    cache.set(file, loaded);
    const nativeRequire = createRequire(file);
    const customRequire = (specifier) => {
      if (specifier === "server-only") return {};
      const resolved = specifier.startsWith("@/")
        ? path.join(root, specifier.slice(2))
        : specifier.startsWith(".") ? path.resolve(path.dirname(file), specifier) : null;
      if (!resolved) return nativeRequire(specifier);
      if (resolved === path.join(root, "lib/db/supabase-server")) return { supabaseServer: db };
      return load(resolved + ".ts");
    };
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const run = vm.runInContext(`(function(require, module, exports) { ${source}\n})`, context, { filename: file });
    run(customRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  const route = load(path.join(root, "app/api/dashboard/login/route.ts"));
  return { calls, route, session: load(path.join(root, "lib/security/session.ts")) };
}

function request(body = { username: " comercio ", password: "test-password" }, headers = {}) {
  return new Request("https://chocopremio.test/api/dashboard/login", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
}

const success = (name) => ({ data: name === "verify_commerce_login" ? [{ id: commerceId }] : initialData, error: null });

test("successful login returns complete data with two RPCs and a valid secure session", async () => {
  const { route, calls, session } = setup(success);
  const response = await route.POST(request({ username: " comercio ", password: "test-password", commerceId: "untrusted-id" }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.commerce, initialData.commerce);
  assert.deepEqual(body.dashboard.stats, initialData.stats);
  assert.equal(body.dashboard.campaignId, campaignId);
  assert.ok(Number.isFinite(Date.parse(body.dashboard.updatedAt)));
  assert.deepEqual(calls, [
    { name: "verify_commerce_login", args: { p_username: "comercio", p_password: "test-password" } },
    { name: "get_dashboard_bootstrap", args: { p_commerce_id: commerceId } },
  ]);
  const cookie = response.headers.get("set-cookie");
  for (const flag of ["HttpOnly", "Secure", "SameSite=lax", "Max-Age=43200"]) assert.ok(cookie.includes(flag), flag);
  const token = cookie.split(";")[0].split("=")[1];
  assert.equal((await session.verifySessionToken(token)).commerceId, commerceId);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("server-timing"), /auth;dur=[\d.]+, bootstrap;dur=[\d.]+, total;dur=[\d.]+/);
});

test("invalid credentials never load dashboard data or create a session", async () => {
  const { route, calls } = setup(() => ({ data: [], error: null }));
  const response = await route.POST(request());
  assert.equal(response.status, 401);
  assert.equal(calls.length, 1);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("authentication outage never loads dashboard data", async () => {
  const { route, calls } = setup(() => ({ data: null, error: { message: "unavailable" } }));
  const response = await route.POST(request());
  assert.equal(response.status, 503);
  assert.equal(calls.length, 1);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("statistics outage keeps login from returning an incomplete dashboard", async () => {
  const { route } = setup((name) => name === "verify_commerce_login" ? success(name) : { data: null, error: { message: "unavailable" } });
  const response = await route.POST(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("a commerce disabled after credential validation cannot enter", async () => {
  const { route } = setup((name) => name === "verify_commerce_login" ? success(name) : { data: null, error: null });
  assert.equal((await route.POST(request())).status, 401);
});

test("a commerce without campaigns still gets the empty dashboard", async () => {
  const { route } = setup((name) => name === "verify_commerce_login" ? success(name) : {
    data: { commerce: initialData.commerce, campaigns: [], campaignId: null, stats: null }, error: null,
  });
  const response = await route.POST(request());
  assert.equal(response.status, 200);
  const { dashboard } = await response.json();
  assert.deepEqual(dashboard.campaigns, []);
  assert.equal(dashboard.campaignId, null);
  assert.equal(dashboard.stats.metrics.qr, 0);
  assert.equal(dashboard.stats.boxStats.length, 4);
});

test("missing statistics for a selected campaign are treated as failure", async () => {
  const { route } = setup((name) => name === "verify_commerce_login" ? success(name) : {
    data: { ...initialData, stats: null }, error: null,
  });
  assert.equal((await route.POST(request())).status, 503);
});

test("input validation and same-origin protection run before database access", async () => {
  const { route, calls } = setup(success);
  assert.equal((await route.POST(request({ username: "", password: "x" }))).status, 400);
  assert.equal((await route.POST(request(undefined, { origin: "https://other.test" }))).status, 403);
  assert.equal(calls.length, 0);
});

test("login retains the five-attempt rate limit", async () => {
  const { route, calls } = setup(() => ({ data: [], error: null }));
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await route.POST(request())).status, 401);
  assert.equal((await route.POST(request())).status, 429);
  assert.equal(calls.length, 5);
});
