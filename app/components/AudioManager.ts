/**
 * AudioManager
 *
 * Reescrito con Web Audio API para:
 * - reproducción instantánea (sin latencia de HTMLAudioElement)
 * - sin "doble sonido" por colisión de pool
 * - sin delay tras tiempo de inactividad
 * - menor consumo (un solo buffer decodificado por sonido)
 * - Android / iPhone / Safari / Chrome
 * - reproducción simultánea ilimitada y segura
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
 * Se crea de forma "lazy" porque Safari/iOS
 * exige que se cree o reanude tras un gesto del usuario.
 */
let audioContext: AudioContext | null = null;

/**
 * Buffers ya decodificados, uno por sonido.
 * Se decodifican una sola vez y se reutilizan
 * en cada reproducción (sin volver a descargar/decodificar).
 */
const audioBuffers = new Map<SoundName, AudioBuffer>();

/**
 * Sonidos que ya están en proceso de carga,
 * para no disparar fetch duplicados si playSound
 * se llama antes de que termine preloadSounds.
 */
const loadingPromises = new Map<SoundName, Promise<AudioBuffer | null>>();

/**
 * Nodo maestro de volumen (opcional, útil para mute global).
 */
let masterGain: GainNode | null = null;

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

  // Safari/iOS suspende el contexto hasta el primer gesto del usuario.
  // Lo reanudamos cada vez que intentamos usarlo, sin costo si ya está activo.
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

/**
 * Descarga y decodifica un sonido a AudioBuffer.
 * Si ya existe o ya se está cargando, reutiliza esa promesa.
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
 * Llamar una sola vez, idealmente tras el primer
 * gesto del usuario (click/tap) para cumplir con las
 * políticas de autoplay de Safari/iOS y Chrome.
 */
export function preloadSounds(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Crear/activar el contexto en el gesto del usuario.
  getAudioContext();

  (Object.keys(SOUND_CONFIG) as SoundName[]).forEach((sound) => {
    void loadSound(sound);
  });
}

/**
 * Reproducir sonido.
 *
 * Cada llamada crea su propio AudioBufferSourceNode
 * de un solo uso: no hay pool, no hay colisión,
 * no hay "doble sonido", y la reproducción simultánea
 * (varios clicks rápidos) es nativa y segura.
 */
export function playSound(sound: SoundName, volumeOverride?: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx || !masterGain) {
    return;
  }

  const config = SOUND_CONFIG[sound];
  const existingBuffer = audioBuffers.get(sound);

  const play = (buffer: AudioBuffer) => {
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volumeOverride ?? config.volume;

      source.connect(gainNode);
      gainNode.connect(masterGain as GainNode);

      source.start(0);

      // Libera referencias en cuanto termina (limpieza automática,
      // el GC se encarga, pero esto evita listeners colgados).
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    } catch {
      // Reproducción silenciosamente ignorada si algo falla
      // (por ejemplo, contexto cerrado).
    }
  };

  if (existingBuffer) {
    // Caso normal: el buffer ya está listo, reproducción instantánea.
    play(existingBuffer);
    return;
  }

  // Si todavía no se cargó (p. ej. preloadSounds no se llamó
  // o aún no terminó), se carga al vuelo y se reproduce en cuanto esté listo.
  loadSound(sound).then((buffer) => {
    if (buffer) {
      play(buffer);
    }
  });
}

/**
 * Silenciar/activar todos los sonidos sin detener el contexto.
 * Útil para un botón de mute global.
 */
export function setMuted(muted: boolean): void {
  if (!masterGain) {
    return;
  }
  masterGain.gain.value = muted ? 0 : 1;
}

/**
 * Liberar recursos (opcional).
 * Normalmente no es necesario llamarlo en una SPA,
 * pero útil si el audio se desmonta por completo.
 */
export function disposeSounds(): void {
  audioBuffers.clear();
  loadingPromises.clear();

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
    masterGain = null;
  }
}
