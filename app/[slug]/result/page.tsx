"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  useRouter,
  useParams,
  useSearchParams
} from "next/navigation";

import { supabase } from "@/lib/supabase";

/**
 * COMPONENTE DE CARGA
 */
import ChocolateLoader from "../../components/ChocolateLoader";

/**
 * COMPONENTE DE FONDO
 */
import ChocolateBackground from "../../components/ChocolateBackground";

// BLOQUEO DE NAVEGACIÓN
import useBlockBackNavigation from "../../components/useBlockBackNavigation";

/**
 * AUDIO MANAGER
 */
import {
  playSound,
  preloadSounds
} from "../../components/AudioManager";

/**
 * NOTA SOBRE "canvas-confetti":
 * Sigue sin importarse de forma estática arriba del archivo
 * (quienes pierden o solo tienen un reintento nunca la
 * descargan). Lo nuevo es CÓMO se usa una vez cargada:
 *
 * 1. Se crea UNA SOLA instancia reutilizable con
 *    confetti.create(..., { useWorker: true }). Antes, cada
 *    llamada a confetti() creaba un <canvas> nuevo y corría
 *    su propio loop de animación en el hilo principal; en un
 *    celular de gama baja, lanzar dos ráfagas (tier "high")
 *    significaba DOS canvas + DOS loops compitiendo con las
 *    animaciones de framer-motion al mismo tiempo, y eso es
 *    lo que se sentía "trabado". Con useWorker:true, el
 *    dibujo del confetti corre en un Web Worker (OffscreenCanvas)
 *    y deja libre el hilo principal.
 * 2. Se respeta prefers-reduced-motion (disableForReducedMotion)
 *    y se detecta heurísticamente un dispositivo de gama baja
 *    (pocos núcleos / poca RAM) para reducir cantidad de
 *    partículas y evitar la doble ráfaga en esos casos.
 */

type PrizeType =
  | "lose"
  | "small_discount"
  | "medium_discount"
  | "large_discount"
  | "big_discount"
  | "accessory"
  | "retry";

interface Prize {
  id: string;

  campaign_id: string;

  type: PrizeType;

  title: string;

  emoji: string;

  probability: number;

  name: string;

  retry_pool: boolean;
}

interface ResultData {
  won: boolean;

  prize: Prize;
}

/**
 * Accesos seguros a sessionStorage/localStorage.
 * En modo incógnito o con restricciones del navegador,
 * estas APIs pueden lanzar errores: con esto, la app nunca
 * se rompe por eso, simplemente no persiste ese dato puntual.
 */
function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function safeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    /* noop */
  }
}

/**
 * Reproduce un sonido "a prueba de fallos": si el navegador
 * bloquea el audio (por ejemplo, políticas de autoplay) o el
 * archivo no llegó a cargar, esto NUNCA revienta en consola
 * ni interrumpe el resto de la app. Es solo un efecto
 * decorativo: si falla, simplemente no suena, pero el juego
 * sigue funcionando con normalidad.
 */
function safePlay(name: Parameters<typeof playSound>[0]) {
  try {
    const maybePromise = playSound(name) as unknown;
    if (
      maybePromise &&
      typeof (maybePromise as Promise<unknown>).catch === "function"
    ) {
      (maybePromise as Promise<unknown>).catch(() => {
        /* noop: reproducción bloqueada o fallida, no es crítico */
      });
    }
  } catch {
    /* noop */
  }
}

/**
 * Colores oficiales por tipo de premio.
 * SE MANTIENEN IGUAL — no se tocan.
 */
const prizeStyles: Record<
  PrizeType,
  {
    color: string;
    bg: string;
  }
> = {

  lose: {
    color: "#707070",
    bg: "linear-gradient(135deg, #c9c9c9, #777)"
  },

  retry: {
    color: "#00a2ff",
    bg: "linear-gradient(135deg, #00a2ff, #00a2ff)"
  },

  small_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  medium_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  large_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  big_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  accessory: {
    color: "#e6b800",
    bg: "linear-gradient(135deg, #e6b800, #e6b800)"
  }
};

/**
 * Degradados de presentación (solo visual, encima
 * del color oficial) para el halo y el borde del
 * iconBox, más vivos según el "peso" del premio.
 */
const prizePresentation: Record<
  PrizeType,
  {
    halo: string;
    ring: string;
    tier: "low" | "mid" | "high" | "neutral";
  }
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

/**
 * Sorteo ponderado — SIN CAMBIOS
 */
function pickPrize(prizes: Prize[]): Prize {

  const total =
    prizes.reduce(
      (acc, prize) => acc + Number(prize.probability),
      0
    );

  let random = Math.random() * total;

  for (const prize of prizes) {

    random -= Number(prize.probability);

    if (random <= 0) {
      return prize;
    }
  }

  return prizes[0];
}

/**
 * Pool primer intento — SIN CAMBIOS
 */
function getFirstPool(prizes: Prize[]) {
  return prizes.filter((prize) => !prize.retry_pool);
}

/**
 * Pool retry — SIN CAMBIOS
 */
function getRetryPool(prizes: Prize[]) {
  return prizes.filter(
    (prize) =>
      prize.retry_pool &&
      [
        "lose",
        "small_discount",
        "medium_discount",
        "large_discount"
      ].includes(prize.type)
  );
}

/**
 * Heurística simple para detectar un dispositivo de gama
 * baja: pocos núcleos de CPU y/o poca RAM reportada por el
 * navegador. No es perfecta (no todos los navegadores
 * exponen deviceMemory), pero alcanza para decidir si vale
 * la pena recortar partículas/ráfagas.
 */
function isLowEndDevice(): boolean {

  if (typeof navigator === "undefined") return false;

  const cores = (navigator as any).hardwareConcurrency;
  const mem = (navigator as any).deviceMemory;

  if (typeof mem === "number" && mem <= 4) return true;
  if (typeof cores === "number" && cores <= 4) return true;

  return false;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Instancia ÚNICA y reutilizable de canvas-confetti.
 * Se crea una sola vez (con su propio <canvas> y, si el
 * navegador lo soporta, su propio Web Worker) y se reutiliza
 * en todas las ráfagas de la sesión, en vez de crear un
 * <canvas> nuevo por cada llamada como ocurría antes.
 */
type ConfettiFireFn = (opts?: Record<string, unknown>) => void;

let confettiFire: ConfettiFireFn | null = null;
let confettiLoading: Promise<ConfettiFireFn | null> | null = null;

async function getConfettiFire(): Promise<ConfettiFireFn | null> {

  if (confettiFire) return confettiFire;

  if (!confettiLoading) {
    confettiLoading = import("canvas-confetti").then((mod) => {
      const create = mod.default.create;
      const instance = create(undefined, {
        resize: true,
        useWorker: true
      });
      confettiFire = instance;
      return instance;
    });
  }

  return confettiLoading;
}

/**
 * Lanza confetti escalado según el "tier" del premio.
 * - high  → doble ráfaga dorada (solo en dispositivos normales)
 * - mid   → ráfaga única, cantidad media
 * - low   → ráfaga corta y sutil
 *
 * En dispositivos de gama baja o con "reducir movimiento"
 * activado, se recortan las partículas y se evita la segunda
 * ráfaga del tier alto, para no sumar carga al hilo principal
 * justo en el momento más importante de la experiencia.
 */
async function fireConfetti(tier: "low" | "mid" | "high" | "neutral") {

  if (tier === "neutral") return;

  const fire = await getConfettiFire();
  if (!fire) return;

  const lowEnd = isLowEndDevice();
  const reduced = prefersReducedMotion();

  const base = {
    disableForReducedMotion: true,
    origin: { y: 0.6 }
  };

  if (tier === "low") {
    fire({
      ...base,
      particleCount: lowEnd ? 32 : 55,
      spread: 65,
      startVelocity: 26
    });
    return;
  }

  if (tier === "mid") {
    fire({
      ...base,
      particleCount: lowEnd ? 55 : 95,
      spread: 80,
      startVelocity: 30
    });
    return;
  }

  // high: ráfaga dorada, más espectacular en equipos que lo soportan
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

/**
 * Renderiza el glifo de un premio: si es el emoji de
 * chocolate (🍫), usa la imagen real en su lugar para que
 * se vea idéntico en todos los dispositivos (el emoji nativo
 * cambia de diseño según el sistema/navegador). Para
 * cualquier otro emoji, se muestra como texto normal
 * (sin costo de red, ya que es una fuente del sistema).
 */
function PrizeGlyph({ emoji, size }: { emoji: string; size: number }) {

  if (emoji === "🍫") {
    return (
      <img
        src="/images/choco.png"
        alt="Chocolate"
        draggable={false}
        style={{
          width: size,
          height: "auto",
          userSelect: "none",
          pointerEvents: "none"
        }}
      />
    );
  }

  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      {emoji}
    </span>
  );
}

/**
 * Tiempo máximo (ms) que se le da al audio para terminar de
 * precargar antes de revelar el premio. Si el sonido ya está
 * listo antes de esto, se revela de inmediato (no se espera
 * este tiempo completo); esto solo actúa como techo para
 * conexiones lentas, así el loader nunca se queda esperando
 * más de lo necesario.
 */
const MAX_SOUND_WAIT_MS = 600;

export default function Result() {

  /**
   * BLOQUEA regresar desde Intro
   * (se queda en Intro)
   */
  useBlockBackNavigation();

  const router = useRouter();

  const params = useParams();

  const searchParams = useSearchParams();

  const slug = params.slug as string;

  const sessionId = searchParams.get("session");

  const [loading, setLoading] = useState(true);

  const [show, setShow] = useState(false);

  /**
   * Fase del reveal:
   * "idle"     -> nada
   * "revealed" -> premio mostrado
   */
  const [revealPhase, setRevealPhase] =
    useState<"idle" | "revealed">("idle");

  const [result, setResult] = useState<ResultData | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const initializedRef = useRef(false);

  /**
   * Promesa que se resuelve cuando el audio terminó de
   * precargar (o si falla, también se resuelve para no
   * bloquear nada). Se usa para darle al sonido una
   * oportunidad de estar listo antes de revelar el premio,
   * sin depender de temporizadores fijos.
   */
  const soundsReadyRef = useRef<Promise<void>>(Promise.resolve());

  /**
   * Timeouts activos — se limpian al desmontar
   * para evitar setState en componente desmontado
   */
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trackTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, []);

  /**
   * Precarga sonidos y la imagen de chocolate (por si esta
   * pantalla llegara a ser la primera del flujo en pedirla;
   * en el resto de los casos ya estará en caché del navegador).
   *
   * Se guarda la promesa de precarga en soundsReadyRef para
   * poder esperarla (con un tope) antes de revelar el premio,
   * garantizando que el sonido de victoria/derrota realmente
   * esté listo para sonar en el momento en que se necesita.
   */
  useEffect(() => {
    try {
      soundsReadyRef.current = Promise.resolve(preloadSounds()).catch(
        () => {
          /* noop: si falla la precarga, no bloqueamos el reveal */
        }
      );
    } catch {
      soundsReadyRef.current = Promise.resolve();
    }

    const warmup = new window.Image();
    warmup.src = "/images/choco.png";
  }, []);

  /**
   * Sonidos centralizados.
   * Se reproducen a través de safePlay: nunca bloquean con
   * await y nunca revientan si el navegador bloquea el audio.
   */
  const playWin = useCallback(() => {
    safePlay("win");
  }, []);

  const playLose = useCallback(() => {
    safePlay("lose");
  }, []);

  const playClick = useCallback(() => {
    safePlay("click");
  }, []);

  /**
   * Sonidos y confetti — SOLO PRIMERA VEZ.
   * El confetti se dispara en el siguiente frame
   * (requestAnimationFrame), no en el mismo tick en que React
   * acaba de montar/animar la tarjeta de resultado. Eso le da
   * al navegador la oportunidad de pintar la tarjeta primero,
   * en vez de competir por el hilo principal con 6 animaciones
   * de framer-motion arrancando a la vez.
   */
  const runEffects = useCallback((prize: Prize) => {

    if (!sessionId) return;

    const playedKey = `effects_played_${sessionId}`;

    const alreadyPlayed = safeGet(sessionStorage, playedKey) === "true";

    if (alreadyPlayed) return;

    safeSet(sessionStorage, playedKey, "true");

    if (prize.type === "lose") {
      playLose();
      return;
    }

    if (prize.type === "retry") {
      return;
    }

    playWin();

    requestAnimationFrame(() => {
      fireConfetti(prizePresentation[prize.type].tier);
    });

  }, [sessionId, playLose, playWin]);

  useEffect(() => {

    if (initializedRef.current) return;

    initializedRef.current = true;

    const loadResult = async () => {

      try {

        if (!sessionId) return;

        /**
         * Obtener sesión.
         * Solo se piden las columnas que realmente se usan
         * más abajo, en vez de "*" — menos datos para
         * descargar, especialmente útil con internet lento.
         */
        const { data: session, error: sessionError } =
          await supabase
            .from("game_sessions")
            .select("id, campaign_id, prize_id, won")
            .eq("id", sessionId)
            .single();

        if (sessionError || !session) {
          console.error("SESSION ERROR", sessionError);
          return;
        }

        /**
         * Obtener premios DB
         */
        const { data: prizes, error: prizesError } =
          await supabase
            .from("prizes")
            .select("*")
            .eq("campaign_id", session.campaign_id);

        if (prizesError || !prizes || prizes.length === 0) {
          console.error("PRIZES ERROR", prizesError);
          return;
        }

        /**
         * Dispara el flujo visual de reveal.
         *
         * Antes de ocultar el loader, se le da al audio una
         * última oportunidad de terminar de precargar (hasta
         * MAX_SOUND_WAIT_MS). Así, cuando aparece el premio,
         * el sonido de victoria/derrota está realmente listo
         * para reproducirse — y si la conexión es muy lenta,
         * el loader nunca espera más de ese tope.
         */
        const startReveal = async (prize: Prize) => {

          await Promise.race([
            soundsReadyRef.current,
            new Promise<void>((resolve) =>
              setTimeout(resolve, MAX_SOUND_WAIT_MS)
            )
          ]);

          setLoading(false);

          /**
           * Si el premio es una celebración (no "lose"/"retry"),
           * se precarga igual la instancia de confetti, para
           * que la primera ráfaga salga sin demora.
           */
          const isCelebration =
            prize.type !== "lose" && prize.type !== "retry";

          if (isCelebration) {
            getConfettiFire().catch(() => {});
          }

          setShow(true);
          setRevealPhase("revealed");
          runEffects(prize);
        };

        /**
         * Si ya existe premio guardado
         * usar el real de DB
         */
        if (session.prize_id) {

          const existingPrize = (prizes as Prize[]).find(
            (prize) => prize.id === session.prize_id
          );

          if (existingPrize) {

            setResult({
              won: session.won,
              prize: existingPrize
            });

            await startReveal(existingPrize);

            return;
          }
        }

        /**
         * Retry mode
         */
        const retryMode =
          safeGet(sessionStorage, `retry_${sessionId}`) === "true";

        /**
         * Pool correcto
         */
        const availablePrizes = retryMode
          ? getRetryPool(prizes as Prize[])
          : getFirstPool(prizes as Prize[]);

        if (availablePrizes.length === 0) {
          console.error("NO AVAILABLE PRIZES");
          return;
        }

        /**
         * Sorteo
         */
        const selectedPrize = pickPrize(availablePrizes);

        /**
         * Resultado final
         */
        const finalResult: ResultData = {
          won:
            selectedPrize.type !== "lose" &&
            selectedPrize.type !== "retry",
          prize: selectedPrize
        };

        /**
         * Guardar resultado oficial
         */
        const { error: updateError } = await supabase
          .from("game_sessions")
          .update({
            won: finalResult.won,
            prize_id: selectedPrize.id,
            prize_type: selectedPrize.type,
            prize_title: selectedPrize.title,
            game_status:
              selectedPrize.type === "lose"
                ? "LOSE"
                : selectedPrize.type === "retry"
                ? "RETRY"
                : "WIN"
          })
          .eq("id", sessionId);

        if (updateError) {
          console.error("UPDATE ERROR", updateError);
          return;
        }

        /**
         * Limpiar retry
         */
        if (retryMode) {
          safeRemove(sessionStorage, `retry_${sessionId}`);
        }

        setResult(finalResult);

        await startReveal(selectedPrize);

      } catch (error) {
        console.error("RESULT ERROR", error);
      }
    };

    loadResult();

  }, [sessionId, runEffects, trackTimeout]);

  /**
   * Acciones de los botones — SIN CAMBIOS DE LÓGICA
   * (solo se deja de esperar al sonido antes de continuar,
   * ya que es puramente decorativo).
   */
  const handleFinish = useCallback(() => {

    if (submitting) return;
    setSubmitting(true);

    playClick();

    if (sessionId) {
      safeRemove(sessionStorage, `retry_${sessionId}`);
      safeRemove(sessionStorage, `effects_played_${sessionId}`);
      safeRemove(sessionStorage, `redeemed_${sessionId}`);
      try {
        localStorage.removeItem(`prize_${sessionId}`);
      } catch {
        /* noop */
      }
    }

    safeRemove(sessionStorage, "redeemed");
    try {
      localStorage.removeItem("prize");
    } catch {
      /* noop */
    }

    router.push("/");

  }, [submitting, playClick, sessionId, router]);

  const handleRetry = useCallback(async () => {

    if (submitting || !sessionId) return;
    setSubmitting(true);

    playClick();

    safeSet(sessionStorage, `retry_${sessionId}`, "true");
    safeRemove(sessionStorage, `effects_played_${sessionId}`);

    /**
     * Este "update" SÍ se espera antes de navegar: la pantalla
     * de juego va a volver a leer esta sesión, así que el
     * premio anterior debe quedar limpio en la base de datos
     * antes de llegar ahí (a diferencia de otros casos, aquí
     * el orden importa para la integridad del estado).
     */
    await supabase
      .from("game_sessions")
      .update({
        prize_id: null,
        prize_type: null,
        prize_title: null,
        won: false,
        game_status: "PENDING"
      })
      .eq("id", sessionId);

    router.push(`/${slug}/game?session=${sessionId}`);

  }, [submitting, sessionId, slug, router]);

  const handleClaim = useCallback(async () => {

    if (submitting || !sessionId || !result) return;
    setSubmitting(true);

    playClick();

    try {
      localStorage.setItem(
        `prize_${sessionId}`,
        JSON.stringify(result)
      );
    } catch {
      /* noop */
    }

    /**
     * La navegación ya NO espera esta escritura: la pantalla
     * de reclamo recibe el premio completo desde localStorage,
     * así que no necesita que termine esta llamada para
     * mostrarse correctamente. El registro en base de datos
     * (para auditoría/back-office) sigue su curso en segundo
     * plano sin demorar al usuario.
     */
    supabase
      .from("game_sessions")
      .update({ claimed_prize: true })
      .eq("id", sessionId)
      .then(({ error }) => {
        if (error) console.error(error);
      });

    router.push(`/${slug}/claim?session=${sessionId}`);

  }, [submitting, sessionId, result, slug, router]);

  /**
   * LOADER NECESARIO
   * mientras consulta sesión y premio en Supabase, Y mientras
   * el sonido de victoria/derrota termina de precargar (con
   * un tope de MAX_SOUND_WAIT_MS para conexiones lentas).
   */
  if (loading) {
    return <ChocolateLoader />;
  }

  if (!result) return null;

  const config = prizeStyles[result.prize.type];
  const presentation = prizePresentation[result.prize.type];

  const isLose = result.prize.type === "lose";
  const isRetry = result.prize.type === "retry";

  return (

    <ChocolateBackground>

      <AnimatePresence>
        {show && (

          <motion.div
            key="result-card"
            initial={{ scale: 0.75, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 20
            }}
            style={styles.card}
          >

            {/* Halo ambiental detrás del icono — animación 100% CSS,
                ya que esta tarjeta puede quedar en pantalla bastante
                tiempo mientras el usuario decide qué hacer. */}
            {!isLose && (
              <div
                className="result-halo"
                style={{
                  ...styles.halo,
                  background: presentation.halo
                }}
              />
            )}

            <motion.div
              style={{
                ...styles.iconBox,
                background: config.bg,
                boxShadow: isLose
                  ? "0 10px 24px rgba(0,0,0,0.12)"
                  : `0 14px 36px ${hexToRgba(presentation.ring, 0.4)}`
              }}
              initial={
                isLose
                  ? { scale: 0.6, opacity: 0 }
                  : { scale: 0.3, opacity: 0, rotate: -25 }
              }
              animate={
                isLose
                  ? { scale: 1, opacity: 1 }
                  : { scale: 1, opacity: 1, rotate: 0 }
              }
              transition={
                isLose
                  ? { duration: 0.45, ease: "easeOut" }
                  : {
                      type: "spring",
                      stiffness: 260,
                      damping: 14,
                      delay: 0.08
                    }
              }
            >
              <PrizeGlyph emoji={result.prize.emoji} size={60} />
            </motion.div>

            <motion.h1
              style={{ ...styles.title, color: config.color }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.35 }}
            >
              {isLose
                ? "¡Sigue participando!"
                : isRetry
                ? "¡Tienes otra oportunidad!"
                : "¡Felicidades!"}
            </motion.h1>

            <motion.h2
              style={styles.subtitle}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.35 }}
            >
              {result.prize.title}
            </motion.h2>

            <motion.p
              style={styles.prize}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.35 }}
            >
              {result.prize.name}
            </motion.p>

            <motion.div
              style={{ width: "100%" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.35 }}
            >
              {isLose ? (

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={submitting}
                  style={{
                    ...styles.button,
                    background: "#707070",
                    opacity: submitting ? 0.7 : 1
                  }}
                  onClick={handleFinish}
                >
                  {submitting ? "UN MOMENTO..." : "FINALIZAR"}
                </motion.button>

              ) : isRetry ? (

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={submitting}
                  style={{
                    ...styles.button,
                    background: config.bg,
                    opacity: submitting ? 0.7 : 1
                  }}
                  onClick={handleRetry}
                >
                  {submitting ? "PREPARANDO..." : "VOLVER A INTENTAR"}
                </motion.button>

              ) : (

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={submitting}
                  style={{
                    ...styles.button,
                    background: config.bg,
                    opacity: submitting ? 0.7 : 1,
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onClick={handleClaim}
                >
                  {!submitting && (
                    <span className="button-shine" style={styles.buttonShine} />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {submitting ? "UN MOMENTO..." : "RECLAMAR PREMIO"}
                  </span>
                </motion.button>
              )}
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes resultHaloPulse {
          0%,
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translateX(-50%) scale(1.18);
            opacity: 0.85;
          }
        }

        .result-halo {
          animation: resultHaloPulse 2.4s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes buttonShineSlide {
          0% {
            transform: translateX(-120%);
            opacity: 1;
          }
          57% {
            transform: translateX(220%);
            opacity: 1;
          }
          58%,
          100% {
            transform: translateX(220%);
            opacity: 0;
          }
        }

        .button-shine {
          animation: buttonShineSlide 2.8s ease-in-out infinite;
          will-change: transform;
        }

        /**
         * Si el usuario tiene "reducir movimiento" activado en
         * su sistema, se apagan las animaciones decorativas
         * infinitas (no las de entrada, que son cortas y
         * comunican estado).
         */
        @media (prefers-reduced-motion: reduce) {
          .result-halo,
          .button-shine {
            animation: none !important;
          }
        }
      `}</style>

    </ChocolateBackground>
  );
}

/**
 * Extrae el primer color hex de un linear-gradient
 * para usarlo en un boxShadow con transparencia.
 * Si no encuentra nada, usa un dorado neutro de respaldo.
 */
function hexToRgba(gradient: string, alpha: number): string {

  const match = gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);

  const hex = match ? match[0] : "#e6b800";

  const normalized =
    hex.length === 4
      ? "#" + hex.slice(1).split("").map((c) => c + c).join("")
      : hex;

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles: {
  [key: string]: React.CSSProperties;
} = {

  card: {
    width: "100%",
    maxWidth: "400px",
    background: "#fff",
    borderRadius: "30px",
    padding: "32px 28px",
    textAlign: "center",
    boxShadow: "0 25px 70px rgba(0,0,0,0.18)",
    zIndex: 2,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    willChange: "transform, opacity"
  },

  halo: {
    position: "absolute",
    top: "18px",
    left: "50%",
    width: "180px",
    height: "180px",
    transform: "translateX(-50%)",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: 0
  },

  iconBox: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    margin: "0 auto 22px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
    willChange: "transform, opacity"
  },

  title: {
    fontSize: "22px",
    fontWeight: 900,
    marginBottom: "10px",
    letterSpacing: "-0.3px"
  },

  subtitle: {
    fontSize: "18px",
    fontWeight: 800,
    marginBottom: "8px",
    color: "#1a1a1a"
  },

  prize: {
    fontSize: "16px",
    marginBottom: "24px",
    color: "#555"
  },

  button: {
    width: "100%",
    padding: "16px",
    borderRadius: "50px",
    border: "none",
    color: "#fff",
    fontWeight: 800,
    fontSize: "15px",
    letterSpacing: "0.5px",
    cursor: "pointer"
  },

  buttonShine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "45%",
    height: "100%",
    background:
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
    zIndex: 0
  }

};