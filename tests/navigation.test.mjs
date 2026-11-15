import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

function setup() {
  let callback;
  const assigned = [], cleared = [];
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../lib/client/navigation.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, window: {
    setTimeout(fn, delay) { assert.equal(delay, 6000); callback = fn; return 42; },
    clearTimeout(id) { cleared.push(id); callback = undefined; },
    location: { assign(href) { assigned.push(href); } },
  } });
  return { navigate: exports.navigateWithRecovery, assigned, cleared, fire: () => callback?.() };
}

test("a stalled client navigation recovers to the same session URL", () => {
  const { navigate, assigned, fire } = setup();
  const href = "/comercio/game?session=existing-session";
  const pushed = [];
  navigate(href, url => pushed.push(url));
  assert.deepEqual(pushed, [href]);
  assert.deepEqual(assigned, []);
  fire();
  assert.deepEqual(assigned, [href]);
});

test("successful navigation cancels recovery when the intro unmounts", () => {
  const { navigate, assigned, cleared, fire } = setup();
  const cleanup = navigate("/comercio/game?session=existing-session", () => {});
  cleanup(); fire();
  assert.deepEqual(cleared, [42]);
  assert.deepEqual(assigned, []);
});

test("a synchronous router failure recovers immediately and clears the timer", () => {
  const { navigate, assigned, cleared, fire } = setup();
  const href = "/comercio/result?session=existing-result";
  navigate(href, () => { throw new Error("Router unavailable"); });
  fire();
  assert.deepEqual(cleared, [42]);
  assert.deepEqual(assigned, [href]);
});
