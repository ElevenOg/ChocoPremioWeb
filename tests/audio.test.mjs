import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

function setup({ state = "running", active = true, unsupported = false, delayedResume = false } = {}) {
  const oscillators = [], contexts = [], gains = [], samples = [], events = new Map();
  const listeners = new Map(), windowListeners = new Map(), windowEvents = new Map(), timers = new Map();
  let nextTimer = 0;
  const add = (map, dispatch, name, callback) => { if (!map.has(name)) map.set(name, new Set()); map.get(name).add(callback); dispatch.set(name, () => [...map.get(name)].forEach(fn => fn())); };
  const remove = (map, name, callback) => map.get(name)?.delete(callback);
  const document = { hidden: false, addEventListener: (name, callback) => add(listeners, events, name, callback), removeEventListener: (name, callback) => remove(listeners, name, callback) };
  let clock = 100;
  const parameter = () => ({ value: 0, events: [], setValueAtTime(value, time) { this.events.push([value, time]); }, linearRampToValueAtTime(value, time) { this.events.push([value, time]); }, exponentialRampToValueAtTime(value, time) { this.events.push([value, time]); } });
  class AudioContext {
    constructor(options) { this.options = options; this.state = state; this.currentTime = 10; this.destination = {}; contexts.push(this); }
    createGain() { const gain = { gain: parameter(), connect() {}, disconnect() { gain.disconnected = true; } }; gains.push(gain); return gain; }
    createBuffer(channels, frames, rate) { return { channels, frames, rate }; }
    createBufferSource() { const sample = { connect() {}, disconnect() {}, start() {} }; samples.push(sample); return sample; }
    createOscillator() {
      const oscillator = { frequency: parameter(), connect() {}, disconnect() { oscillator.disconnected = true; }, start(time) { oscillator.startedAt = time; }, stop(time) { oscillator.stoppedAt = time ?? this.currentTime; } };
      oscillators.push(oscillator); return oscillator;
    }
    resume() { this.resumes = (this.resumes ?? 0) + 1; if (delayedResume) clock += 300; this.state = "running"; return Promise.resolve(); }
  }
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../app/components/AudioManager.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const host = {
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, callback) => add(windowListeners, windowEvents, name, callback),
    removeEventListener: (name, callback) => remove(windowListeners, name, callback),
  };
  const navigator = { userActivation: { isActive: active }, audioSession: { type: "auto" } };
  vm.runInNewContext(code, { exports, window: { ...host, ...(unsupported ? {} : { AudioContext }) }, document, navigator, performance: { now: () => clock } });
  return { ...exports, contexts, oscillators, gains, samples, navigator, document, events, windowEvents, timers };
}

test("all seven cues use the audio clock immediately and share one interactive context", () => {
  const audio = setup();
  for (const name of ["click", "confirm", "select", "reveal", "win", "lose", "error"]) {
    const before = audio.oscillators.length;
    assert.equal(audio.playSound(name), true);
    assert.equal(audio.oscillators[before].startedAt, 10);
  }
  assert.equal(audio.contexts.length, 1);
  assert.equal(audio.contexts[0].options.latencyHint, "interactive");
  assert.equal(audio.gains[0].gain.value, .6);
  assert.ok(audio.gains.slice(1).every(g => g.gain.events[1][0] === .2));
});

test("win notes are precisely scheduled and every oscillator has an end", () => {
  const audio = setup(); audio.playSound("win");
  assert.deepEqual(audio.oscillators.map(o => o.startedAt), [10, 10.105, 10.21, 10.315]);
  assert.ok(audio.oscillators.every(o => o.stoppedAt > o.startedAt && o.stoppedAt < 11));
  audio.oscillators.forEach(o => o.onended());
  assert.ok(audio.oscillators.every(o => o.disconnected));
});

test("blocked autoplay does not queue a result to play after a later gesture", () => {
  const audio = setup({ state: "suspended", active: false });
  assert.equal(audio.playSound("win"), false);
  assert.equal(audio.contexts[0].resumes, undefined);
  assert.equal(audio.oscillators.length, 0);
});

test("a slow audio unlock drops the stale cue instead of playing it late", async () => {
  const audio = setup({ state: "suspended", delayedResume: true });
  audio.playSound("click"); await Promise.resolve();
  assert.equal(audio.oscillators.length, 0);
});

test("hiding the tab stops scheduled voices and suppresses new cues", () => {
  const audio = setup(); audio.playSound("win");
  audio.document.hidden = true; audio.events.get("visibilitychange")();
  assert.ok(audio.oscillators.every(o => o.disconnected));
  assert.equal(audio.playSound("click"), false);
});

test("unsupported audio never throws or blocks an action", () => {
  const audio = setup({ unsupported: true });
  assert.doesNotThrow(() => audio.preloadSounds());
  assert.equal(audio.playSound("select"), false);
});

test("repeated taps keep at most sixteen active voices", () => {
  const audio = setup();
  for (let i = 0; i < 30; i++) audio.playSound("click");
  assert.equal(audio.oscillators.filter(o => !o.disconnected).length, 16);
});

test("game melody uses the same volume as cues and stops without cutting them", () => {
  const audio = setup();
  const stop = audio.startGameMelody();
  assert.equal(audio.oscillators.length, 8);
  assert.ok(audio.gains.slice(1).every(g => g.gain.events[1][0] === .2));
  assert.equal([...audio.timers.values()][0].delay, 4800);
  [...audio.timers.values()][0].fn();
  assert.equal(audio.oscillators.filter(o => !o.disconnected).length, 8);
  audio.playSound("select");
  stop();
  assert.equal(audio.oscillators.filter(o => !o.disconnected).length, 1);
  assert.equal(audio.timers.size, 0);
});

test("game melody pauses in a hidden tab and resumes only one phrase", () => {
  const audio = setup();const stop = audio.startGameMelody();
  audio.document.hidden = true;audio.events.get("visibilitychange")();
  assert.equal(audio.timers.size, 0);
  assert.ok(audio.oscillators.every(o => o.disconnected));
  audio.document.hidden = false;audio.events.get("visibilitychange")();
  assert.equal(audio.oscillators.filter(o => !o.disconnected).length, 8);
  assert.equal(audio.timers.size, 1);
  stop();
});

test("blocked melody waits for interaction and cannot start after leaving game", async () => {
  const audio = setup({ state: "suspended", active: false });
  const stop = audio.startGameMelody();
  assert.equal(audio.oscillators.length, 0);
  assert.equal(audio.contexts[0].resumes, undefined);
  audio.windowEvents.get("pointerdown")();stop();await Promise.resolve();
  assert.equal(audio.oscillators.length, 0);
  assert.equal(audio.timers.size, 0);
});

test("Safari touch unlocks playback once and resumes an interrupted context", () => {
  const audio = setup({ state: "suspended", active: false });
  const cleanup = audio.initializeGameAudio();
  assert.equal(audio.contexts.length, 0);
  audio.events.get("touchend")();
  assert.equal(audio.navigator.audioSession.type, "playback");
  assert.equal(audio.contexts[0].state, "running");
  assert.equal(audio.samples.length, 1);
  assert.equal(audio.samples[0].buffer.frames, 1);
  audio.contexts[0].state = "interrupted";
  audio.events.get("touchend")();
  assert.equal(audio.contexts[0].state, "running");
  assert.equal(audio.samples.length, 1);
  cleanup();
  audio.events.get("touchend")();
  assert.equal(audio.contexts[0].resumes, 2);
});
