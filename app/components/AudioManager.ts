/**
 * AudioManager
 * Optimizado para:
 * - reproducción instantánea
 * - menos delay en móviles (especial: iPhone/Safari)
 * - reutilización global
 * - Safari/iPhone compatible
 * - Android compatible
 * - menor consumo
 */

type SoundName = "win" | "lose" | "click" | "break";

const SOUND_CONFIG: Record<SoundName, { src: string; volume: number }> = {
  win: { src: "/sounds/win.mp3", volume: 0.6 },
  lose: { src: "/sounds/lose.mp3", volume: 0.6 },
  click: { src: "/sounds/click.mp3", volume: 0.4 },
  break: { src: "/sounds/break.mp3", volume: 0.7 },
};

// Sonidos que NUNCA se solapan → un solo elemento reutilizado
const SINGLE_INSTANCE_SOUNDS: SoundName[] = ["win", "lose", "click"];

// Sonidos que sí pueden dispararse varias veces seguidas → pool de clones
const POOLED_SOUNDS: SoundName[] = ["break"];
const POOL_SIZE = 3; // suficiente para solapes rápidos, sin abusar de memoria

const audioCache = new Map<SoundName, HTMLAudioElement>();
const audioPools = new Map<SoundName, HTMLAudioElement[]>();
const poolIndex = new Map<SoundName, number>();

function configureAudio(audio: HTMLAudioElement, sound: SoundName) {
  const config = SOUND_CONFIG[sound];
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.volume = config.volume;
  audio.load();
}

function createSingleAudio(sound: SoundName): HTMLAudioElement {
  const cached = audioCache.get(sound);
  if (cached) return cached;

  const config = SOUND_CONFIG[sound];
  const audio = new Audio(config.src);
  configureAudio(audio, sound);
  audioCache.set(sound, audio);
  return audio;
}

function createPool(sound: SoundName): HTMLAudioElement[] {
  const cached = audioPools.get(sound);
  if (cached) return cached;

  const config = SOUND_CONFIG[sound];
  const pool: HTMLAudioElement[] = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const audio = new Audio(config.src);
    configureAudio(audio, sound);
    pool.push(audio);
  }

  audioPools.set(sound, pool);
  poolIndex.set(sound, 0);
  return pool;
}

/**
 * Precargar sonidos
 * Ejecutar UNA vez en layout
 */
export function preloadSounds() {
  if (typeof window === "undefined") return;

  (Object.keys(SOUND_CONFIG) as SoundName[]).forEach((sound) => {
    if (POOLED_SOUNDS.includes(sound)) {
      createPool(sound);
    } else {
      createSingleAudio(sound);
    }
  });
}

/**
 * Reproducir sonido (instancia única, reutilizada)
 */
function playSingle(sound: SoundName) {
  const audio = createSingleAudio(sound);

  try {
    // Si venía sonando, lo cortamos y reiniciamos
    audio.pause();
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => null);
    }
  } catch (error) {
    console.error("SOUND ERROR", error);
  }
}

/**
 * Reproducir sonido desde pool (permite solapes)
 */
function playPooled(sound: SoundName) {
  const pool = createPool(sound);
  const idx = poolIndex.get(sound) ?? 0;
  const audio = pool[idx];

  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => null);
    }
  } catch (error) {
    console.error("SOUND ERROR", error);
  }

  poolIndex.set(sound, (idx + 1) % pool.length);
}

/**
 * Reproducir sonido
 */
export function playSound(sound: SoundName) {
  if (typeof window === "undefined") return;

  try {
    if (POOLED_SOUNDS.includes(sound)) {
      playPooled(sound);
    } else {
      playSingle(sound);
    }
  } catch (error) {
    console.error("SOUND ERROR", error);
  }
}