/**
 * AudioManager
 *
 * Web Audio API como motor principal (sin "doble sonido",
 * reproducción simultánea nativa, sin rebobinado) CON un
 * fallback automático a HTMLAudioElement mientras el buffer
 * todavía no está decodificado.
 *
 * Por qué el fallback es necesario:
 * Safari/iOS exige que AudioContext.resume() y la primera
 * reproducción ocurran dentro de la "ventana" de un gesto de
 * usuario síncrono. Si el usuario hace click ANTES de que
 * fetch() + decodeAudioData() terminen (lo cual es async y
 * puede tardar más en redes móviles), Safari descarta la
 * reproducción en silencio. El fallback con HTMLAudioElement
 * no tiene ese problema porque no depende de decodificación
 * async en el momento exacto del click, así que garantiza que
 * SIEMPRE se escuche algo desde el primer click, incluso si
 * el buffer de Web Audio aún no está listo.
 *
 * Una vez que el buffer ya decodificó (normalmente en
 * cuestión de milisegundos a un par de segundos), todas las
 * reproducciones siguientes usan Web Audio API de forma
 * normal, con todas sus ventajas.
 */

type SoundName =
  | "win"
  | "lose"
  | "click"
  | "break";

interface SoundConfig {
  src: string;
  volume: number;
}

/**
 * Configuración
 */
const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
  win: {
    src: "/sounds/win.mp3",
    volume: 0.6
  },
  lose: {
    src: "/sounds/lose.mp3",
    volume: 0.6
  },
  click: {
    src: "/sounds/click.mp3",
    volume: 0.4
  },
  break: {
    src: "/sounds/break.mp3",
    volume: 0.7
  }
};

/**
 * Contexto de audio único (singleton).
 */
let audioContext: AudioContext | null = null;

/**
 * Buffers ya decodificados, uno por sonido.
 */
const audioBuffers = new Map<SoundName, AudioBuffer>();

/**
 * Promesas de carga en curso (evita fetch duplicados).
 */
const loadingPromises = new Map<SoundName, Promise<AudioBuffer | null>>();

/**
 * Nodo maestro de volumen.
 */
let masterGain: GainNode | null = null;

/**
 * FALLBACK: elementos HTMLAudioElement listos para reproducir
 * de inmediato mientras el buffer de Web Audio no esté decodificado.
 * Se crean siempre, en paralelo a la carga de Web Audio,
 * porque son baratos y garantizan sonido instantáneo.
 */
const fallbackElements = new Map<SoundName, HTMLAudioElement>();

function createFallbackElement(sound: SoundName): HTMLAudioElement {
  const config = SOUND_CONFIG[sound];

  const audio = new Audio(config.src);
  audio.preload = "auto";
  audio.volume = config.volume;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.load();

  return audio;
}

function getFallbackElement(sound: SoundName): HTMLAudioElement {
  let audio = fallbackElements.get(sound);

  if (!audio) {
    audio = createFallbackElement(sound);
    fallbackElements.set(sound, audio);
  }

  return audio;
}

/**
 * Reproduce usando el fallback de HTMLAudioElement.
 * Se clona el nodo para permitir reproducción simultánea
 * sin cortar la instancia anterior (mismo patrón que ya
 * te funcionaba en producción).
 */
function playFallback(sound: SoundName, volumeOverride?: number) {
  try {
    const original = getFallbackElement(sound);

    const clone = original.cloneNode(true) as HTMLAudioElement;
    clone.volume = volumeOverride ?? SOUND_CONFIG[sound].volume;
    clone.currentTime = 0;

    const playPromise = clone.play();

    if (playPromise) {
      playPromise.catch(() => {});
    }
  } catch {
    // Reproducción silenciosamente ignorada si algo falla.
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

/**
 * Descarga y decodifica un sonido a AudioBuffer.
 */
function loadSound(sound: SoundName): Promise<AudioBuffer | null> {
  const existing = audioBuffers.get(sound);
  if (existing) {
    return Promise.resolve(existing);
  }

  const inFlight = loadingPromises.get(sound);
  if (inFlight) {
    return inFlight;
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return Promise.resolve(null);
  }

  const config = SOUND_CONFIG[sound];

  const promise = fetch(config.src)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      audioBuffers.set(sound, buffer);
      loadingPromises.delete(sound);
      return buffer;
    })
    .catch(() => {
      loadingPromises.delete(sound);
      return null;
    });

  loadingPromises.set(sound, promise);
  return promise;
}

/**
 * Precargar todos los sonidos.
 *
 * Llamar en el primer gesto del usuario (click/tap).
 * Crea el AudioContext, lanza la decodificación de los
 * buffers de Web Audio EN PARALELO, y además prepara los
 * elementos de fallback (HTMLAudioElement) que están listos
 * de inmediato, sin esperar nada async.
 */
export function preloadSounds(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Crear/activar el contexto en el gesto del usuario.
  getAudioContext();

  (Object.keys(SOUND_CONFIG) as SoundName[]).forEach((sound) => {
    // Fallback: instantáneo, sin esperar nada.
    getFallbackElement(sound);

    // Web Audio: se decodifica en segundo plano.
    void loadSound(sound);
  });
}

/**
 * Reproducir sonido.
 *
 * Si el buffer de Web Audio ya está decodificado, lo usa
 * (mejor rendimiento, sin colisiones). Si todavía NO está
 * listo (lo más común en el primer click en móvil), usa el
 * fallback de HTMLAudioElement para garantizar que se
 * escuche algo de inmediato, sin silencios.
 */
export function playSound(sound: SoundName, volumeOverride?: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const existingBuffer = audioBuffers.get(sound);

  if (existingBuffer) {
    const ctx = getAudioContext();

    if (ctx && masterGain) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = existingBuffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = volumeOverride ?? SOUND_CONFIG[sound].volume;

        source.connect(gainNode);
        gainNode.connect(masterGain);

        source.start(0);

        source.onended = () => {
          source.disconnect();
          gainNode.disconnect();
        };

        return;
      } catch {
        // Si algo falla con Web Audio, cae al fallback.
      }
    }
  }

  // Buffer no listo todavía (o Web Audio falló): usar fallback
  // inmediato para que SIEMPRE suene desde el primer click.
  playFallback(sound, volumeOverride);

  // Aseguramos que la carga del buffer esté en curso para que
  // las próximas reproducciones ya puedan usar Web Audio.
  void loadSound(sound);
}

/**
 * Silenciar/activar todos los sonidos sin detener el contexto.
 * Nota: solo afecta reproducciones vía Web Audio; si en algún
 * momento se usa el fallback, su volumen se controla por
 * instancia (ver playFallback).
 */
export function setMuted(muted: boolean): void {
  if (!masterGain) {
    return;
  }
  masterGain.gain.value = muted ? 0 : 1;
}

/**
 * Liberar recursos (opcional).
 */
export function disposeSounds(): void {
  audioBuffers.clear();
  loadingPromises.clear();
  fallbackElements.clear();

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
    masterGain = null;
  }
}