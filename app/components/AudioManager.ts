/**
 * AudioManager
 * Pool de instancias por sonido:
 * - sin cloneNode (causa de duplicados y delay)
 * - reproducción instantánea
 * - memoria constante
 * - Safari/iPhone + Android compatible
 */

type SoundName = "win" | "lose" | "click" | "break";

const SOUND_CONFIG: Record<SoundName, { src: string; volume: number }> = {
  win:   { src: "/sounds/win.mp3",   volume: 0.6 },
  lose:  { src: "/sounds/lose.mp3",  volume: 0.6 },
  click: { src: "/sounds/click.mp3", volume: 0.4 },
  break: { src: "/sounds/break.mp3", volume: 0.7 },
};

/**
 * Tamaño del pool por sonido.
 * 3 cubre superposición real sin desperdiciar memoria.
 */
const POOL_SIZE = 3;

/**
 * Pool global: cada sonido tiene N instancias listas.
 */
const audioPool = new Map<SoundName, HTMLAudioElement[]>();

/**
 * Índice rotativo para elegir la siguiente instancia disponible.
 * Evita siempre tomar la misma y cortarla.
 */
const poolIndex = new Map<SoundName, number>();

/**
 * Crear el pool de un sonido dado.
 * Retorna false si estamos en SSR.
 */
function createPool(sound: SoundName): boolean {
  if (typeof window === "undefined") return false;
  if (audioPool.has(sound)) return true;

  const { src, volume } = SOUND_CONFIG[sound];
  const instances: HTMLAudioElement[] = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audio.load();
    instances.push(audio);
  }

  audioPool.set(sound, instances);
  poolIndex.set(sound, 0);
  return true;
}

/**
 * Precargar todos los sonidos.
 * Llamar UNA sola vez en el layout raíz.
 */
export function preloadSounds(): void {
  (Object.keys(SOUND_CONFIG) as SoundName[]).forEach(createPool);
}

/**
 * Reproducir un sonido.
 * Busca la primera instancia libre del pool.
 * Si todas están ocupadas, usa la más antigua (rotación).
 */
export function playSound(sound: SoundName): void {
  try {
    if (!createPool(sound)) return;

    const pool = audioPool.get(sound)!;

    /**
     * Buscar instancia libre (no está reproduciendo).
     * HTMLAudioElement.paused es true cuando terminó o no comenzó.
     */
    let audio = pool.find((a) => a.paused || a.ended);

    /**
     * Si todas están ocupadas, rotar al siguiente
     * y reiniciarlo (es la reproducción más antigua).
     */
    if (!audio) {
      const idx = poolIndex.get(sound)!;
      audio = pool[idx];
      poolIndex.set(sound, (idx + 1) % POOL_SIZE);
    }

    /**
     * Reiniciar al inicio para reproducción inmediata.
     */
    audio.currentTime = 0;

    const promise = audio.play();
    if (promise) {
      promise.catch(() => null);
    }
  } catch (error) {
    console.error("SOUND ERROR", error);
  }
}

/**
 * Detener un sonido (útil al desmontar pantallas).
 */
export function stopSound(sound: SoundName): void {
  const pool = audioPool.get(sound);
  if (!pool) return;
  pool.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

/**
 * Detener todos los sonidos.
 */
export function stopAllSounds(): void {
  (Object.keys(SOUND_CONFIG) as SoundName[]).forEach(stopSound);
}