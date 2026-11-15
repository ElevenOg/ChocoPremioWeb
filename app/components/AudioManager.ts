export type SoundName = "click" | "confirm" | "select" | "reveal" | "win" | "lose" | "error";

type Note = { frequency: number; at?: number; duration: number; endFrequency?: number; wave?: OscillatorType };
const NOTE_VOLUME = .2;
const sounds: Record<SoundName, Note[]> = {
  click: [{ frequency: 640, endFrequency: 400, duration: .065 }],
  confirm: [{ frequency: 660, duration: .12 }, { frequency: 880, at: .075, duration: .22 }],
  select: [{ frequency: 340, endFrequency: 140, duration: .12, wave: "triangle" }],
  reveal: [523.25, 659.25, 783.99, 1046.5].map((frequency, i) => ({ frequency, at: i * .075, duration: .19 })),
  win: [783.99, 987.77, 1174.66, 1567.98].map((frequency, i) => ({ frequency, at: i * .105, duration: i === 3 ? .48 : .19 })),
  lose: [{ frequency: 523.25, duration: .2 }, { frequency: 440, at: .16, duration: .3 }],
  error: [{ frequency: 246.94, duration: .09 }, { frequency: 220, at: .11, duration: .12 }],
};

let context: AudioContext | null = null;
let output: GainNode | null = null;
let primedContext: AudioContext | null = null;
const voices = new Set<() => void>();

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== "playback") session.type = "playback";
  } catch { /* Optional on browsers without Audio Session support. */ }
  if (context && context.state !== "closed") return context;
  const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return null;
  context = new Audio({ latencyHint: "interactive" });
  output = context.createGain();
  output.gain.value = .6;
  output.connect(context.destination);
  document.addEventListener("visibilitychange", stopWhenHidden);
  return context;
}

function stopWhenHidden() {
  if (document.hidden) voices.forEach(stop => stop());
}

function scheduleNotes(audio: AudioContext, notes: Note[]): () => void {
  const now = audio.currentTime;
  const group = new Set<() => void>();
  for (const note of notes) {
    if (voices.size >= 16) voices.values().next().value?.();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = now + (note.at ?? 0);
    const end = start + note.duration;
    oscillator.type = note.wave ?? "sine";
    oscillator.frequency.setValueAtTime(note.frequency, start);
    if (note.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, end);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(NOTE_VOLUME, start + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    oscillator.connect(gain);
    gain.connect(output!);
    const cleanup = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(stop); group.delete(stop); };
    const stop = () => { try { oscillator.stop(); } catch { /* Already stopped. */ } cleanup(); };
    voices.add(stop);
    group.add(stop);
    oscillator.onended = cleanup;
    oscillator.start(start);
    oscillator.stop(end + .01);
  }
  return () => group.forEach(stop => stop());
}

function schedule(audio: AudioContext, name: SoundName) { scheduleNotes(audio, sounds[name]); }

// A repeating D-minor motif, generated in short phrases rather than
// streaming a file or keeping an unbounded sequence of notes in memory.
const melody: Note[] = [293.66, 440, 587.33, 659.25, 698.46, 659.25, 523.25, 440]
  .map((frequency, i) => ({ frequency, at: i * .6, duration: .38 }));
let stopMelody: (() => void) | null = null;

export function startGameMelody(): () => void {
  stopMelody?.();
  if (typeof window === "undefined") return () => {};
  let active = true;
  let timer: number | undefined;
  let stopPhrase: (() => void) | undefined;
  const pause = () => {
    window.clearTimeout(timer);
    timer = undefined;
    stopPhrase?.();
    stopPhrase = undefined;
  };
  const play = () => {
    pause();
    if (!active || document.hidden) return;
    try {
      const audio = getContext();
      if (!audio || audio.state !== "running") return;
      stopPhrase = scheduleNotes(audio, melody);
      timer = window.setTimeout(play, 4800);
    } catch { pause(); }
  };
  const unlock = () => {
    if (!active || document.hidden || timer !== undefined) return;
    try {
      const audio = getContext();
      if (!audio) return;
      if (audio.state === "running") play();
      else void audio.resume().then(() => { if (active) play(); }).catch(() => undefined);
    } catch { /* Never block the game for background audio. */ }
  };
  const visibility = () => { if (document.hidden) pause(); else play(); };
  const stop = () => {
    active = false;
    pause();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    if (stopMelody === stop) stopMelody = null;
  };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  stopMelody = stop;
  play();
  return stop;
}

// Called during a tap: initialize one reusable context, without downloads.
export function preloadSounds() {
  try {
    const audio = getContext();
    if (audio && audio.state !== "running") void audio.resume().catch(() => undefined);
    // Prime Safari's output inside the actual touch, using a generated silent
    // sample. This needs no file and is never used as background audio.
    if (audio && primedContext !== audio) {
      const sample = audio.createBufferSource();
      sample.buffer = audio.createBuffer(1, 1, 22050);
      sample.connect(audio.destination);
      sample.onended = () => sample.disconnect();
      sample.start(0);
      primedContext = audio;
    }
  } catch { /* Audio is optional; interaction must always continue. */ }
}

export function initializeGameAudio(): () => void {
  if (typeof document === "undefined") return () => {};
  // Capture real gestures before React handlers, including Safari touch events.
  const options = { capture: true, passive: true };
  document.addEventListener("pointerdown", preloadSounds, options);
  document.addEventListener("touchend", preloadSounds, options);
  document.addEventListener("keydown", preloadSounds, options);
  return () => {
    document.removeEventListener("pointerdown", preloadSounds, true);
    document.removeEventListener("touchend", preloadSounds, true);
    document.removeEventListener("keydown", preloadSounds, true);
  };
}

export function playSound(name: SoundName): boolean {
  if (typeof document === "undefined" || document.hidden) return false;
  try {
    const audio = getContext();
    if (!audio) return false;
    if (audio.state === "running") { schedule(audio, name); return true; }
    // Never queue an autoplay sound to fire on a later, unrelated touch.
    if (navigator.userActivation && !navigator.userActivation.isActive) return false;
    const requestedAt = performance.now();
    void audio.resume().then(() => {
      if (!document.hidden && audio.state === "running" && performance.now() - requestedAt < 200) schedule(audio, name);
    }).catch(() => undefined);
    return true;
  } catch { return false; }
}
