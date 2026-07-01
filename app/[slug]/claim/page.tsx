"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  useRouter,
  useParams,
  useSearchParams
} from "next/navigation";

/**
 * COMPONENTE DE FONDO
 */
import ChocolateBackground from "../../components/ChocolateBackground";

/**
 * COMPONENTE DE CARGA
 */
import ChocolateLoader from "../../components/ChocolateLoader";

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
 * (eso obligaba a descargarla antes de poder mostrar la
 * tarjeta, sumando peso al primer render). Se carga de forma
 * diferida (dynamic import) y se reutiliza UNA SOLA instancia
 * creada con { useWorker: true }, para que el dibujo del
 * confetti corra en un Web Worker y no compita por el hilo
 * principal con las animaciones de entrada de la tarjeta —
 * esto es lo que más se nota en celulares de gama baja.
 */

interface PrizeData {
  prize?: {
    name?: string;
  };
}

/**
 * Accesos seguros a sessionStorage/localStorage.
 * En modo incógnito o con restricciones del navegador,
 * estas APIs pueden lanzar errores: con esto, la app nunca
 * se rompe por eso, simplemente no persiste ese dato puntual.
 *
 * (Mismo patrón usado en Result.tsx — si en algún momento se
 * quiere compartir código entre pantallas, esto es un buen
 * candidato para moverlo a un archivo utils/storage.ts común.)
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
 * bloquea el audio o el archivo no llegó a cargar, esto NUNCA
 * revienta en consola ni interrumpe el resto de la app. Es un
 * efecto decorativo: si falla, simplemente no suena.
 */
function safePlay(name: Parameters<typeof playSound>[0]) {
  try {
    const maybePromise = playSound(name) as unknown;
    if (
      maybePromise &&
      typeof (maybePromise as Promise<unknown>).catch === "function"
    ) {
      (maybePromise as Promise<unknown>).catch(() => {
        /* noop */
      });
    }
  } catch {
    /* noop */
  }
}

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
 * Heurística simple para detectar un dispositivo de gama
 * baja: pocos núcleos de CPU y/o poca RAM reportada por el
 * navegador.
 */
function isLowEndDevice(): boolean {

  if (typeof navigator === "undefined") return false;

  const cores = (navigator as any).hardwareConcurrency;
  const mem = (navigator as any).deviceMemory;

  if (typeof mem === "number" && mem <= 4) return true;
  if (typeof cores === "number" && cores <= 4) return true;

  return false;
}

async function fireWelcomeConfetti() {

  const fire = await getConfettiFire();
  if (!fire) return;

  const lowEnd = isLowEndDevice();

  fire({
    particleCount: lowEnd ? 40 : 70,
    spread: 75,
    startVelocity: 28,
    scalar: 0.9,
    colors: ["#ffe500", "#c47a00", "#4d3800", "#ffffff"],
    origin: { y: 0.55 },
    disableForReducedMotion: true
  });
}

/**
 * Tiempo máximo (ms) que se le da al audio para terminar de
 * precargar antes de mostrar la tarjeta. Si el sonido ya está
 * listo antes de esto, se revela de inmediato; esto solo actúa
 * como techo para conexiones lentas, así el loader nunca
 * espera más de lo necesario. Mismo patrón usado en Result.tsx.
 */
const MAX_SOUND_WAIT_MS = 600;

/**
 * StepChip — MISMO componente visual que el Intro
 * (mismo padding, bordes, tamaños de letra).
 * Única diferencia pedida: cuando no está hecho,
 * muestra "X" en vez de un número.
 */
const StepChip = memo(function StepChip({
  label,
  done,
  onClick
}: {
  label: string;
  done: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={!done ? onClick : undefined}
      whileTap={!done && onClick ? { scale: 0.97 } : {}}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "16px",
        background: done
          ? "rgba(77,56,0,0.1)"
          : "rgba(255,229,0,0.2)",
        border: done
          ? "1.5px solid #4d3800"
          : "1.5px solid #ffe500",
        cursor: !done && onClick ? "pointer" : "default",
        transition: "all 0.25s ease",
        WebkitTapHighlightColor: "transparent"
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontWeight: 800,
          flexShrink: 0,
          background: done ? "#4d3800" : "#ffe500",
          color: done ? "#fff" : "#4d3800",
          transition: "all 0.3s ease"
        }}
      >
        {done ? "✓" : "✕"}
      </div>

      <span
        style={{
          flex: 1,
          textAlign: "left",
          fontSize: "clamp(13px, 3.5vw, 15px)",
          color: done ? "#4d3800" : "#3a2800",
          fontWeight: done ? 700 : 500,
          transition: "all 0.25s ease"
        }}
      >
        {label}
      </span>

      {!done && onClick && (
        <span style={{ color: "#c47a00", fontSize: "16px", fontWeight: 700 }}>
          →
        </span>
      )}
    </motion.div>
  );
});

/**
 * Partículas de fondo (🎁), memoizadas para que NUNCA se
 * vuelvan a renderizar cuando cambie el estado del padre
 * (redeemed, submitting, showConfirm, etc). Mismo patrón que
 * el FloatingEmojis de Intro.tsx.
 */
const FloatingGifts = memo(function FloatingGifts() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        contain: "strict"
      }}
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="claim-bg-particle"
          style={{
            position: "absolute",
            bottom: "-20px",
            left: `${8 + i * 16}%`,
            fontSize: i % 2 === 0 ? "20px" : "14px",
            opacity: 0.15 + i * 0.02,
            animationDuration: `${5 + i * 0.9}s`,
            animationDelay: `${i * 0.8}s`,
            userSelect: "none",
            willChange: "transform"
          }}
        >
          🎁
        </span>
      ))}
    </div>
  );
});

export default function Claim() {

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

  const [redeemed, setRedeemed] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [prize, setPrize] = useState<{ name: string }>({
    name: "Cargando..."
  });

  /**
   * Evita lanzar el confetti más de una vez
   */
  const welcomeFired = useRef(false);

  /**
   * Promesa que se resuelve cuando el audio terminó de
   * precargar (o si falla, también se resuelve para no
   * bloquear nada). Se usa para darle al sonido una
   * oportunidad de estar listo antes de mostrar la tarjeta,
   * así el primer toque en "Mostrar en caja" nunca queda
   * mudo. Mismo patrón que en Result.tsx.
   */
  const soundsReadyRef = useRef<Promise<void>>(Promise.resolve());

  /**
   * Precargar sonidos + prefetch de la ruta de inicio, para
   * que "Finalizar" navegue al instante cuando se confirme.
   */
  useEffect(() => {
    try {
      soundsReadyRef.current = Promise.resolve(preloadSounds()).catch(
        () => {
          /* noop: si falla la precarga, no bloqueamos la vista */
        }
      );
    } catch {
      soundsReadyRef.current = Promise.resolve();
    }

    router.prefetch("/");
  }, [router]);

  /**
   * Cargar premio guardado — MISMA LÓGICA que antes, solo que
   * ahora, antes de ocultar el loader, se le da al sonido una
   * última oportunidad de terminar de precargar (hasta
   * MAX_SOUND_WAIT_MS). Si la conexión es muy lenta, el loader
   * nunca espera más de ese tope.
   */
  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      try {

        if (sessionId) {

          /**
           * Premio guardado desde RESULT
           */
          const savedPrize = safeGet(localStorage, `prize_${sessionId}`);

          if (savedPrize) {

            const parsed: PrizeData = JSON.parse(savedPrize);

            if (!cancelled) {
              setPrize({
                name: parsed.prize?.name || "Premio especial"
              });
            }
          }

          /**
           * Estado mostrado en caja
           */
          const redeemedSession = safeGet(
            sessionStorage,
            `redeemed_${sessionId}`
          );

          if (redeemedSession === "true" && !cancelled) {
            setRedeemed(true);
          }
        }

      } catch (error) {
        console.error("CLAIM LOAD ERROR", error);
      }

      await Promise.race([
        soundsReadyRef.current,
        new Promise<void>((resolve) =>
          setTimeout(resolve, MAX_SOUND_WAIT_MS)
        )
      ]);

      if (!cancelled) setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };

  }, [sessionId]);

  /**
   * Confetti sutil de bienvenida, una sola vez.
   * Se dispara en requestAnimationFrame (un frame después de
   * que la tarjeta ya pintó) y corre en un Web Worker, así
   * que no compite con las animaciones de entrada ni traba
   * el render en equipos modestos.
   */
  useEffect(() => {

    if (loading || welcomeFired.current) return;

    welcomeFired.current = true;

    const id = setTimeout(() => {
      requestAnimationFrame(() => {
        fireWelcomeConfetti();
      });
    }, 250);

    return () => clearTimeout(id);

  }, [loading]);

  /**
   * Mostrar en caja.
   */
  const handleRedeem = useCallback(() => {

    safePlay("click");

    setRedeemed(true);

    if (sessionId) {
      safeSet(sessionStorage, `redeemed_${sessionId}`, "true");
    }

  }, [sessionId]);

  /**
   * Abrir modal finalizar
   */
  const handleFinish = useCallback(() => {
    safePlay("click");
    setShowConfirm(true);
  }, []);

  /**
   * Cancelar modal
   */
  const handleCancel = useCallback(() => {
    safePlay("click");
    setShowConfirm(false);
  }, []);

  /**
   * Finalizar y limpiar — SIN CAMBIOS DE LÓGICA
   */
  const handleConfirmFinish = useCallback(() => {

    if (submitting) return;
    setSubmitting(true);

    safePlay("click");

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

  }, [submitting, sessionId, router]);

  const canFinish = redeemed && !submitting;

  /**
   * LOADER: se mantiene mientras se lee el premio guardado Y
   * mientras el sonido de "click" termina de precargar (con
   * tope de MAX_SOUND_WAIT_MS). Así, cuando se ve la tarjeta,
   * ya se puede tocar cualquier botón con sonido garantizado.
   */
  if (loading) {
    return <ChocolateLoader />;
  }

  return (

    <ChocolateBackground>

      <FloatingGifts />

      {/**
       * Nota: se retiró el <AnimatePresence mode="wait"> que
       * envolvía esta tarjeta. Esa envoltura solo tiene sentido
       * cuando algo se desmonta/reemplaza (como en Intro, donde
       * la tarjeta puede ocultarse); aquí la tarjeta siempre
       * está montada, así que la animación de entrada (initial
       * + animate) alcanza por sí sola, sin el costo extra de
       * un AnimatePresence que nunca llega a animar una salida.
       */}
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          damping: 22,
          stiffness: 160,
          mass: 0.8
        }}
        style={styles.card}
      >

        {/* Logo + halo — animación 100% CSS (transform-only),
            el navegador la corre en el hilo de composición. */}
        <div style={styles.logoWrapper}>
          <div className="claim-halo" style={styles.halo} />
          <div className="claim-logo-float" style={styles.logoEmoji}>
            🎁
          </div>
        </div>

        <motion.h1
          style={styles.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          ¡EXCELENTE!
        </motion.h1>

        <motion.p
          style={styles.subtitle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          Has ganado:
        </motion.p>

        <motion.div
          style={styles.prizeBox}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          {prize.name}
        </motion.div>

        <motion.div
          style={styles.divider}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        />

        <motion.div
          style={styles.steps}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <StepChip
            label={redeemed ? "Mostrado en caja" : "Mostrar en caja"}
            done={redeemed}
            onClick={handleRedeem}
          />
        </motion.div>

        <motion.div
          style={{ width: "100%" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <motion.button
            disabled={!canFinish}
            onClick={handleFinish}
            whileTap={canFinish ? { scale: 0.96 } : {}}
            style={{
              ...styles.button,
              opacity: canFinish ? 1 : 0.45,
              cursor: canFinish ? "pointer" : "not-allowed",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {canFinish && (
              <span className="claim-button-shine" style={styles.buttonShine} />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>
              FINALIZAR
            </span>
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {!redeemed && (
            <motion.p
              key="warning"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={styles.warning}
            >
              Muestra el premio en caja primero
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          style={styles.termsBox}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <p style={styles.termsTitle}>Importante:</p>
          <ul style={styles.termsList}>
            <li>• Validar el premio en el punto de atención</li>
          </ul>
        </motion.div>

      </motion.div>

      <AnimatePresence>

        {showConfirm && (

          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={styles.modalOverlay}
            onClick={handleCancel}
          >

            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.75, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              style={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >

              <h2 style={styles.modalTitle}>¿Finalizar sesión?</h2>

              <p style={styles.modalText}>
                Se limpiará el premio y volverás al inicio.
              </p>

              <div style={styles.modalButtons}>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCancel}
                  style={styles.cancelButton}
                >
                  CANCELAR
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={submitting}
                  onClick={handleConfirmFinish}
                  style={{
                    ...styles.confirmButton,
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? "..." : "FINALIZAR"}
                </motion.button>

              </div>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

      <style jsx global>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-105vh) rotate(20deg); opacity: 0; }
        }

        .claim-bg-particle {
          animation-name: floatUp;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes claimHaloPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%      { transform: scale(1.15); opacity: 0.55; }
        }

        .claim-halo {
          animation: claimHaloPulse 2.8s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes claimLogoFloat {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50%      { transform: translateY(-8px) rotate(1deg); }
        }

        .claim-logo-float {
          animation: claimLogoFloat 3.5s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes claimButtonShine {
          0%       { transform: translateX(-100%); opacity: 1; }
          56%      { transform: translateX(280%); opacity: 1; }
          57%, 100%{ transform: translateX(280%); opacity: 0; }
        }

        .claim-button-shine {
          animation: claimButtonShine 3.2s ease-in-out infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .claim-halo,
          .claim-logo-float,
          .claim-button-shine,
          .claim-bg-particle {
            animation: none !important;
          }
        }
      `}</style>

    </ChocolateBackground>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {

  card: {
    width: "100%",
    maxWidth: "400px",
    background: "rgba(255,255,255,0.97)",
    borderRadius: "32px",
    padding: "28px 20px 24px",
    textAlign: "center",
    boxShadow: "0 32px 80px rgba(77,56,0,0.2), 0 8px 24px rgba(0,0,0,0.08)",
    zIndex: 5,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0px"
  },

  logoWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "8px"
  },

  halo: {
    position: "absolute",
    width: "clamp(120px, 28vw, 160px)",
    height: "clamp(120px, 28vw, 160px)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,229,0,0.55) 0%, transparent 70%)",
    zIndex: 1
  },

  logoEmoji: {
    fontSize: "clamp(40px, 10vw, 70px)",
    position: "relative",
    zIndex: 2,
    userSelect: "none",
    lineHeight: 1,
    marginTop: "-10px",
  },

  title: {
    fontSize: "clamp(20px, 5vw, 28px)",
    fontWeight: 900,
    color: "#4d3800",
    marginBottom: "8px",
    marginTop: "4px",
    lineHeight: 1.2,
    letterSpacing: "-0.5px"
  },

  subtitle: {
    fontSize: "clamp(13px, 3.5vw, 15px)",
    color: "#7a6040",
    marginBottom: "16px",
    marginTop: "0px"
  },

  prizeBox: {
    fontSize: "clamp(12px, 3vw, 15px)",
    fontWeight: 800,
    marginBottom: "10px",
    padding: "13px",
    borderRadius: "16px",
    background: "#fff4c7",
    border: "2px dashed #d9b100",
    color: "#3a2800",
    lineHeight: 1.4,
    width: "100%"
  },

  divider: {
    width: "80px",
    height: "3px",
    borderRadius: "2px",
    background: "linear-gradient(90deg, #ffe500, #c47a00)",
    marginBottom: "10px"
  },

  steps: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "15px"
  },

  secondaryButton: {
    width: "100%",
    padding: "14px",
    borderRadius: "50px",
    border: "none",
    fontSize: "clamp(14px, 3.8vw, 15px)",
    fontWeight: 800,
    letterSpacing: "0.3px",
    transition: "all 0.25s ease",
    marginBottom: "10px"
  },

  button: {
    width: "100%",
    padding: "17px",
    borderRadius: "50px",
    border: "none",
    background: "linear-gradient(135deg, #4d3800, #7a5c00)",
    color: "#fff",
    fontSize: "clamp(16px, 4vw, 18px)",
    fontWeight: 900,
    letterSpacing: "1px",
    boxShadow: "0 6px 20px rgba(77,56,0,0.35)"
  },

  buttonShine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "55%",
    height: "100%",
    background:
      "linear-gradient(90deg, transparent, rgba(255,229,0,0.3), transparent)",
    zIndex: 0
  },

  warning: {
    fontSize: "12px",
    color: "#9a7a40",
    marginTop: "10px",
    textAlign: "center"
  },

  termsBox: {
    marginTop: "10px",
    marginBottom: "-10px",
    background: "#f5f1eb",
    padding: "12px 14px",
    borderRadius: "12px",
    textAlign: "left",
    width: "100%"
  },

  termsTitle: {
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "4px",
    color: "#4d3800"
  },

  termsList: {
    paddingLeft: "12px",
    margin: 0,
    fontSize: "12.5px",
    color: "#5e4b30",
    lineHeight: 1.5
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    padding: "20px",
    boxSizing: "border-box"
  },

  modal: {
    width: "100%",
    maxWidth: "360px",
    background: "#fffaf3",
    borderRadius: "24px",
    padding: "24px 20px",
    textAlign: "center",
    boxShadow: "0 24px 60px rgba(0,0,0,0.25)"
  },

  modalTitle: {
    fontSize: "17px",
    textAlign: "center",
    fontWeight: 900,
    marginBottom: "8px",
    color: "#4d3800"
  },

  modalText: {
    fontSize: "14px",
    color: "#7a6040",
    marginBottom: "18px",
    lineHeight: 1.4
  },

  modalButtons: {
    display: "flex",
    gap: "10px"
  },

  cancelButton: {
    flex: 1,
    padding: "13px",
    borderRadius: "50px",
    border: "none",
    background: "#e6d3a3",
    color: "#4d3800",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },

  confirmButton: {
    flex: 1,
    padding: "13px",
    borderRadius: "50px",
    border: "none",
    background: "linear-gradient(135deg, #4d3800, #7a5c00)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  }
};