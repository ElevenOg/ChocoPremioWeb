import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function setup() {
  const href = "https://chocopremio.test/comercio/game?session=active";
  const events = new Map(), cleanups = [];
  const location = { href };
  const originalState = { __NA: true, tree: "current-game-tree" };
  const history = { state: originalState, pushState(state, unused, url) { this.state = state; location.href = url; } };
  const style = { overscrollBehaviorX: "auto", overscrollBehaviorY: "auto" };
  const add = (name, callback, capture) => events.set(name, { callback, capture });
  const remove = name => events.delete(name);
  const exports = {};
  const require = name => {
    if (name === "react") return { useEffect: fn => { cleanups.push(fn()); } };
    if (name === "next/navigation") return { usePathname: () => "/comercio/game", useSearchParams: () => new URL(href).searchParams };
    if (name === "./AudioManager") return { initializeGameAudio: () => () => {} };
    if (name === "./useBlockZoom") return { default: () => {} };
    throw new Error(name);
  };
  const code = ts.transpileModule(readFileSync(new URL("../app/components/useBlockBackNavigation.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require, URL, window: { history, location, addEventListener: add, removeEventListener: remove }, document: { body: { style }, addEventListener() {}, removeEventListener() {} } });
  exports.default();
  return { href, events, history, location, style, cleanup: () => cleanups.forEach(fn => fn?.()) };
}

test("Back restores the current game URL and Next state before router listeners", () => {
  const state = setup();
  const handler = state.events.get("popstate");
  assert.equal(handler.capture, true);
  state.location.href = "https://chocopremio.test/comercio";
  state.history.state = { tree: "previous-intro-tree" };
  let stopped = false;
  handler.callback({ stopImmediatePropagation() { stopped = true; } });
  assert.equal(stopped, true);
  assert.equal(state.location.href, state.href);
  assert.equal(state.history.state.tree, "current-game-tree");
});

test("reload shortcuts and vertical pull to refresh stay enabled", () => {
  const state = setup();
  assert.equal(state.events.has("keydown"), false);
  assert.equal(state.style.overscrollBehaviorY, "auto");
  state.cleanup();
  assert.equal(state.events.has("popstate"), false);
  assert.equal(state.style.overscrollBehaviorX, "auto");
});
