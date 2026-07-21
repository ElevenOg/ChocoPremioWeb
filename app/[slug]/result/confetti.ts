import { isLowEndDevice, prefersReducedMotion, prizePresentation, type PrizeType } from "./resultUtils";

// canvas-confetti se importa dinámicamente: quien pierde o solo
// reintenta nunca descarga esta librería.
// Instancia única con useWorker:true → el dibujo corre en un Web
// Worker (OffscreenCanvas), sin bloquear el hilo principal.
type ConfettiFireFn = (opts?: Record<string, unknown>) => void;

let confettiFire: ConfettiFireFn | null = null;
let confettiLoading: Promise<ConfettiFireFn | null> | null = null;

export async function getConfettiFire(): Promise<ConfettiFireFn | null> {
  if (confettiFire) return confettiFire;

  if (!confettiLoading) {
    confettiLoading = import("canvas-confetti").then((mod) => {
      const instance = mod.default.create(undefined, { resize: true, useWorker: true });
      confettiFire = instance;
      return instance;
    });
  }

  return confettiLoading;
}

export function tierOf(type: PrizeType) {
  return prizePresentation[type].tier;
}

// Confetti escalado según el tier del premio; en gama baja o con
// "reducir movimiento" se recortan partículas y se omite la 2ª ráfaga.
export async function fireConfetti(tier: ReturnType<typeof tierOf>) {
  if (tier === "neutral") return;

  const fire = await getConfettiFire();
  if (!fire) return;

  const lowEnd = isLowEndDevice();
  const reduced = prefersReducedMotion();

  const base = { disableForReducedMotion: true, origin: { y: 0.6 } };

  if (tier === "low") {
    fire({ ...base, particleCount: lowEnd ? 32 : 55, spread: 65, startVelocity: 26 });
    return;
  }

  if (tier === "mid") {
    fire({ ...base, particleCount: lowEnd ? 55 : 95, spread: 80, startVelocity: 30 });
    return;
  }

  fire({
    ...base,
    particleCount: lowEnd ? 75 : 140,
    spread: 95,
    startVelocity: 34,
    colors: ["#ffd84d", "#e6b800", "#fff4cc", "#ffffff"]
  });

  if (!lowEnd && !reduced) {
    setTimeout(() => {
      fire({
        ...base,
        particleCount: 55,
        spread: 110,
        startVelocity: 40,
        scalar: 0.9,
        colors: ["#ffd84d", "#e6b800", "#ffffff"],
        origin: { y: 0.5 }
      });
    }, 200);
  }
}