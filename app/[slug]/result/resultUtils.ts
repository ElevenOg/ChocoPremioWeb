export type PrizeType =
  | "lose"
  | "small_discount"
  | "medium_discount"
  | "large_discount"
  | "big_discount"
  | "accessory"
  | "retry";

export interface Prize {
  id: string;
  campaign_id: string;
  type: PrizeType;
  title: string;
  emoji: string;
  probability: number;
  name: string;
  retry_pool: boolean;
}

export interface ResultData {
  won: boolean;
  prize: Prize;
}

/** Colores oficiales por tipo de premio. */
export const prizeStyles: Record<PrizeType, { color: string; bg: string }> = {
  lose: { color: "#707070", bg: "linear-gradient(135deg, #c9c9c9, #777)" },
  retry: { color: "#00a2ff", bg: "linear-gradient(135deg, #00a2ff, #00a2ff)" },
  small_discount: { color: "#00d11c", bg: "linear-gradient(135deg, #00d11c, #00d11c)" },
  medium_discount: { color: "#00d11c", bg: "linear-gradient(135deg, #00d11c, #00d11c)" },
  large_discount: { color: "#00d11c", bg: "linear-gradient(135deg, #00d11c, #00d11c)" },
  big_discount: { color: "#00d11c", bg: "linear-gradient(135deg, #00d11c, #00d11c)" },
  accessory: { color: "#e6b800", bg: "linear-gradient(135deg, #e6b800, #e6b800)" }
};

/** Degradados de presentación (solo visual) según el "peso" del premio. */
export const prizePresentation: Record<
  PrizeType,
  { halo: string; ring: string; tier: "low" | "mid" | "high" | "neutral" }
> = {
  lose: {
    halo: "radial-gradient(circle, rgba(150,150,150,0.35) 0%, transparent 70%)",
    ring: "linear-gradient(135deg, #d8d8d8, #9a9a9a)",
    tier: "neutral"
  },
  retry: {
    halo: "radial-gradient(circle, rgba(0,162,255,0.4) 0%, transparent 70%)",
    ring: "linear-gradient(135deg, #5fc4ff, #00a2ff)",
    tier: "mid"
  },
  small_discount: {
    halo: "radial-gradient(circle, rgba(0,209,28,0.4) 0%, transparent 70%)",
    ring: "linear-gradient(135deg, #4be36a, #00d11c)",
    tier: "low"
  },
  medium_discount: {
    halo: "radial-gradient(circle, rgba(0,209,28,0.45) 0%, transparent 70%)",
    ring: "linear-gradient(135deg, #4be36a, #00d11c)",
    tier: "mid"
  },
  large_discount: {
    halo: "radial-gradient(circle, rgba(0,209,28,0.5) 0%, transparent 70%)",
    ring: "linear-gradient(135deg, #4be36a, #00d11c)",
    tier: "high"
  },
  big_discount: {
    halo: "radial-gradient(circle, rgba(230,184,0,0.55) 0%, transparent 70%)",
    ring: "linear-gradient(135deg, #ffd84d, #e6b800)",
    tier: "high"
  },
  accessory: {
    halo: "radial-gradient(circle, rgba(230,184,0,0.6) 0%, transparent 70%)",
    ring: "linear-gradient(135deg, #ffd84d, #e6b800)",
    tier: "high"
  }
};

/** Tiempo máximo (ms) que se espera al audio antes de revelar el premio. */
export const MAX_SOUND_WAIT_MS = 600;

/** Sorteo ponderado. */
export function pickPrize(prizes: Prize[]): Prize {
  const total = prizes.reduce((acc, prize) => acc + Number(prize.probability), 0);
  let random = Math.random() * total;

  for (const prize of prizes) {
    random -= Number(prize.probability);
    if (random <= 0) return prize;
  }

  return prizes[0];
}

export function getFirstPool(prizes: Prize[]) {
  return prizes.filter((prize) => !prize.retry_pool);
}

export function getRetryPool(prizes: Prize[]) {
  return prizes.filter(
    (prize) =>
      prize.retry_pool &&
      ["lose", "small_discount", "medium_discount", "large_discount"].includes(prize.type)
  );
}

export function getCachedPrizes(campaignId: string): Prize[] | null {
  try {
    const raw = sessionStorage.getItem(`prizes_cache_${campaignId}`);
    return raw ? (JSON.parse(raw) as Prize[]) : null;
  } catch {
    return null;
  }
}

export function setCachedPrizes(campaignId: string, prizes: Prize[]) {
  try {
    sessionStorage.setItem(`prizes_cache_${campaignId}`, JSON.stringify(prizes));
  } catch {
    /* noop: si falla el cache, simplemente se vuelve a pedir a Supabase */
  }
}

/** Accesos seguros a Storage: nunca rompen la app en modo incógnito o con restricciones. */
export function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    /* noop */
  }
}

export function safeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    /* noop */
  }
}

/** Heurística simple para detectar un dispositivo de gama baja. */
export function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = (navigator as any).hardwareConcurrency;
  const mem = (navigator as any).deviceMemory;
  if (typeof mem === "number" && mem <= 4) return true;
  if (typeof cores === "number" && cores <= 4) return true;
  return false;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Extrae el primer color hex de un gradiente para usarlo en un boxShadow con transparencia. */
export function hexToRgba(gradient: string, alpha: number): string {
  const match = gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  const hex = match ? match[0] : "#e6b800";
  const normalized =
    hex.length === 4
      ? "#" +
        hex
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}