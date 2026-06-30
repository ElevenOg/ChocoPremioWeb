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
 * Ya NO se importa de forma estática arriba del archivo.
 * Antes se descargaba esa librería SIEMPRE, incluso para
 * quienes pierden o solo tienen un reintento (donde nunca
 * se usa). Ahora se carga de forma diferida (más abajo, en
 * fireConfetti) solo cuando realmente hay una celebración,
 * y además se precarga en paralelo durante el "suspenso"
 * para que esté lista al instante cuando se revela el premio.
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
 * Lanza confetti escalado según el "tier" del premio.
 * - high  → doble ráfaga dorada, mucha cantidad
 * - mid   → ráfaga única, cantidad media
 * - low   → ráfaga corta y sutil
 *
 * "canvas-confetti" se importa de forma DIFERIDA (dynamic
 * import) justo aquí, no arriba del archivo. Así, quienes
 * pierden o solo obtienen un reintento nunca descargan esta
 * librería. Para quienes ganan, el módulo normalmente ya
 * está precargado desde el inicio del "suspenso" (ver
 * startReveal), así que esta importación resuelve al
 * instante, sin demora perceptible.
 */
async function fireConfetti(tier: "low" | "mid" | "high" | "neutral") {

  if (tier === "neutral") return;

  const { default: confetti } = await import("canvas-confetti");

  if (tier === "low") {
    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 28,
      origin: { y: 0.6 }
    });
    return;
  }

  if (tier === "mid") {
    confetti({
      particleCount: 110,
      spread: 85,
      startVelocity: 32,
      origin: { y: 0.6 }
    });
    return;
  }

  // high: ráfaga dorada doble, más espectacular
  confetti({
    particleCount: 160,
    spread: 100,
    startVelocity: 38,
    colors: ["#ffd84d", "#e6b800", "#fff4cc", "#ffffff"],
    origin: { y: 0.6 }
  });

  setTimeout(() => {
    confetti({
      particleCount: 90,
      spread: 120,
      startVelocity: 45,
      scalar: 0.9,
      colors: ["#ffd84d", "#e6b800", "#ffffff"],
      origin: { y: 0.5 }
    });
  }, 220);
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
   * "idle"    -> nada
   * "suspense" -> parpadeo breve antes de revelar (solo WIN)
   * "revealed" -> premio mostrado
   */
  const [revealPhase, setRevealPhase] =
    useState<"idle" | "suspense" | "revealed">("idle");

  const [result, setResult] = useState<ResultData | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const initializedRef = useRef(false);

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
   */
  useEffect(() => {
    preloadSounds();

    const warmup = new window.Image();
    warmup.src = "/images/choco.png";
  }, []);

  /**
   * Sonidos centralizados.
   * Ya no se esperan (await) antes de continuar: reproducir
   * un sonido es decorativo y no debería retrasar ninguna
   * otra acción (confetti, navegación, etc.).
   */
  const playWin = useCallback(() => {
    playSound("win");
  }, []);

  const playLose = useCallback(() => {
    playSound("lose");
  }, []);

  const playClick = useCallback(() => {
    playSound("click");
  }, []);

  /**
   * Sonidos y confetti — SOLO PRIMERA VEZ.
   * playWin y fireConfetti ya no se esperan en secuencia:
   * se disparan en paralelo, ya que ambos son efectos
   * independientes entre sí.
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
    fireConfetti(prizePresentation[prize.type].tier);

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
         * Dispara el flujo visual de reveal:
         * suspense breve (solo si gana algo distinto
         * de "lose") y luego revela.
         */
        const startReveal = (prize: Prize) => {

          setLoading(false);

          const isCelebration =
            prize.type !== "lose" && prize.type !== "retry";

          if (isCelebration) {

            /**
             * Precarga "canvas-confetti" EN PARALELO a los
             * 900ms de suspenso. Para cuando se revele el
             * premio, el módulo ya estará descargado y listo,
             * así que el confetti aparece al instante.
             */
            import("canvas-confetti").catch(() => {});

            setRevealPhase("suspense");

            trackTimeout(() => {
              setShow(true);
              setRevealPhase("revealed");
              runEffects(prize);
            }, 900);

          } else {

            trackTimeout(() => {
              setShow(true);
              setRevealPhase("revealed");
              runEffects(prize);
            }, 300);
          }
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

            startReveal(existingPrize);

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

        startReveal(selectedPrize);

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
   * mientras consulta sesión
   * y premio en Supabase
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

      {/* Fase de suspenso: anticipación breve antes del reveal */}
      <AnimatePresence>
        {revealPhase === "suspense" && (
          <SuspenseSpinner key="suspense" />
        )}
      </AnimatePresence>

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

        @keyframes suspenseIconPulse {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.15) rotate(-8deg);
          }
          75% {
            transform: scale(1.15) rotate(8deg);
          }
        }

        .suspense-icon-spin {
          animation: suspenseIconPulse 0.5s ease-in-out infinite;
        }

        @keyframes suspenseSymbolFade {
          0%,
          100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }

        .suspense-symbol-fade {
          animation: suspenseSymbolFade 0.5s ease-in-out infinite;
        }
      `}</style>

    </ChocolateBackground>
  );
}

/**
 * Anticipación breve antes de revelar un premio ganador:
 * parpadeo tipo "sorteo" de pocos emojis. Ahora 100% CSS
 * (antes eran varios componentes de framer-motion animando
 * en simultáneo); esto importa especialmente aquí porque
 * coincide con el instante más importante de la experiencia:
 * el momento justo antes de revelar el premio.
 */
function SuspenseSpinner() {

  const symbols = ["🎁", "✨", "🍫", "⭐"];

  return (
    <motion.div
      style={styles.suspenseWrap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <div className="suspense-icon-spin" style={styles.suspenseIcon}>
        {symbols.map((s, i) => (
          <span
            key={s}
            className="suspense-symbol-fade"
            style={{
              ...styles.suspenseSymbol,
              animationDelay: `${i * 0.125}s`
            }}
          >
            {s === "🍫" ? <PrizeGlyph emoji={s} size={56} /> : s}
          </span>
        ))}
      </div>
    </motion.div>
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
  },

  suspenseWrap: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    pointerEvents: "none"
  },

  suspenseIcon: {
    position: "relative",
    width: "90px",
    height: "90px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  suspenseSymbol: {
    position: "absolute",
    fontSize: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }

};