/**
 * AudioManager
 * Optimizado para:
 * - reproducción instantánea
 * - menos delay en móviles
 * - reutilización global
 * - Safari/iPhone compatible
 * - Android compatible
 * - menor consumo
 */

type SoundName =
  | "win"
  | "lose"
  | "click"
  | "break";

/**
 * Configuración sonidos
 */
const SOUND_CONFIG: Record<
  SoundName,
  {
    src: string;
    volume: number;
  }
> = {

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
 * Cache global
 */
const audioCache = new Map<
  SoundName,
  HTMLAudioElement
>();

/**
 * Crear audio optimizado
 */
function createAudio(
  sound: SoundName
) {

  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  /**
   * Reutilizar audio existente
   */
  const cached =
    audioCache.get(sound);

  if (cached) {
    return cached;
  }

  const config =
    SOUND_CONFIG[sound];

  const audio =
    new Audio(config.src);

  /**
   * Precarga agresiva
   */
  audio.preload =
    "auto";

  /**
   * Compatibilidad móvil
   */
  audio.setAttribute(
    "playsinline",
    "true"
  );

  audio.setAttribute(
    "webkit-playsinline",
    "true"
  );

  /**
   * Configuración inicial
   */
  audio.volume =
    config.volume;

  /**
   * Evita algunos delays
   */
  audio.load();

  /**
   * Guardar cache
   */
  audioCache.set(
    sound,
    audio
  );

  return audio;
}

/**
 * Precargar sonidos
 * Ejecutar UNA vez en layout
 */
export function preloadSounds() {

  (
    Object.keys(
      SOUND_CONFIG
    ) as SoundName[]
  ).forEach((sound) => {

    createAudio(sound);
  });
}

/**
 * Reproducir sonido
 */
export function playSound(
  sound: SoundName
) {

  try {

    const original =
      createAudio(sound);

    if (!original)
      return;

    /**
     * Clonar para evitar
     * cortes si se reproduce
     * varias veces rápido
     */
    const audio =
      original.cloneNode(
        true
      ) as HTMLAudioElement;

    audio.volume =
      SOUND_CONFIG[sound]
        .volume;

    /**
     * Inicio inmediato
     */
    audio.currentTime = 0;

    /**
     * Reproducir
     */
    const playPromise =
      audio.play();

    /**
     * Evitar errores silenciosos
     */
    if (playPromise) {

      playPromise.catch(
        () => null
      );
    }

  } catch (error) {

    console.error(
      "SOUND ERROR",
      error
    );
  }
}