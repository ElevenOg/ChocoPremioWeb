"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import ChocolateLoader from "../components/ChocolateLoader";
import ChocolateBackground from "../components/ChocolateBackground";
import useBlockBackNavigation from "../components/useBlockBackNavigation";
import { playSound, preloadSounds } from "../components/AudioManager";

interface Commerce {
  id: string;
  slug: string;
  social_url: string | null;
}

/* ---------------------------------------------------------
   StepChip: memoizado para no re-renderizar si sus props
   no cambian (evita renders innecesarios al escribir/clickear)
--------------------------------------------------------- */
const StepChip = memo(function StepChip({
  number,
  label,
  done,
  locked,
  onClick
}: {
  number: number;
  label: string;
  done: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : {}}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "16px",
        background: done
          ? "rgba(77,56,0,0.1)"
          : locked
          ? "rgba(0,0,0,0.04)"
          : "rgba(255,229,0,0.2)",
        border: done
          ? "1.5px solid #4d3800"
          : locked
          ? "1.5px solid rgba(0,0,0,0.1)"
          : "1.5px solid #ffe500",
        cursor: onClick ? "pointer" : "default",
        opacity: locked ? 0.5 : 1,
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
          background: done ? "#4d3800" : locked ? "#ccc" : "#ffe500",
          color: done ? "#fff" : locked ? "#fff" : "#4d3800",
          transition: "all 0.3s ease"
        }}
      >
        {done ? "✓" : number}
      </div>

      <span
        style={{
          flex: 1,
          textAlign: "left",
          fontSize: "clamp(13px, 3.5vw, 15px)",
          color: done ? "#4d3800" : locked ? "#999" : "#3a2800",
          fontWeight: done ? 700 : 500,
          transition: "all 0.25s ease"
        }}
      >
        {label}
      </span>

      {onClick && (
        <span style={{ color: "#c47a00", fontSize: "16px", fontWeight: 700 }}>
          →
        </span>
      )}
    </motion.div>
  );
});

/* ---------------------------------------------------------
   FloatingEmojis: decoración de fondo, 100% CSS (sin JS),
   memoizada para que NUNCA se vuelva a renderizar cuando
   cambie el estado del componente padre (accepted, followed, etc).
--------------------------------------------------------- */
const FloatingEmojis = memo(function FloatingEmojis() {
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
          style={{
            position: "absolute",
            bottom: "-20px",
            left: `${8 + i * 16}%`,
            fontSize: i % 2 === 0 ? "20px" : "14px",
            opacity: 0.15 + i * 0.02,
            animationName: "floatUp",
            animationDuration: `${5 + i * 0.9}s`,
            animationDelay: `${i * 0.8}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            userSelect: "none",
            willChange: "transform"
          }}
        >
          🍫
        </span>
      ))}
    </div>
  );
});

export default function Intro() {
  useBlockBackNavigation();

  const [accepted, setAccepted] = useState<boolean>(false);
  const [followed, setFollowed] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startingGame, setStartingGame] = useState<boolean>(false);
  const [cardVisible, setCardVisible] = useState<boolean>(true);

  const soundsPreloaded = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const navTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const params = useParams<{ slug: string }>();

  useEffect(() => {
    if (!params?.slug) return;
    router.prefetch(`/${params.slug}/game`);
  }, [router, params?.slug]);

  useEffect(() => {
    const followedSession = sessionStorage.getItem("followed");
    if (followedSession === "true") setFollowed(true);
    const acceptedSession = sessionStorage.getItem("accepted");
    if (acceptedSession === "true") setAccepted(true);
  }, []);

  /* -----------------------------------------------------------
     Carga del comercio + sesión.
     OPTIMIZACIÓN CLAVE: si el usuario ya tiene una sesión guardada
     en este dispositivo, NO se consulta "campaigns" ni se inserta
     en "game_sessions" → se ahorra 1-2 round trips a Supabase,
     algo muy importante con internet lento o datos móviles.
     También se piden solo las columnas necesarias (select puntual
     en vez de "*") para reducir el peso de la respuesta.
  ----------------------------------------------------------- */
  useEffect(() => {
    let active = true;

    const loadCommerce = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("commerces")
        .select("id, slug, social_url")
        .eq("slug", params.slug)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        console.error(error);
        setCommerce(null);
        setLoading(false);
        return;
      }

      setCommerce(data);

      const existingSessionId = sessionStorage.getItem("intro_session_id");
      if (existingSessionId) {
        setSessionId(existingSessionId);
        setLoading(false);
        return;
      }

      const { data: activeCampaign } = await supabase
        .from("campaigns")
        .select("id")
        .eq("commerce_id", data.id)
        .eq("active", true)
        .maybeSingle();

      if (!active) return;

      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .insert([
          {
            commerce_id: data.id,
            campaign_id: activeCampaign?.id || null,
            scanned_qr: true
          }
        ])
        .select("id")
        .single();

      if (!active) return;

      if (sessionError) console.error(sessionError);

      if (sessionData) {
        setSessionId(sessionData.id);
        sessionStorage.setItem("intro_session_id", sessionData.id);
      }

      setLoading(false);
    };

    loadCommerce();

    return () => {
      active = false;
    };
  }, [params.slug]);

  useEffect(() => {
    if (!showModal || !scrollRef.current) return;

    const el = scrollRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const t1 = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      const t2 = setTimeout(() => {
        el.scrollTo({ top: 0, behavior: "smooth" });
      }, 700);
      timers.push(t2);
    }, 200);

    timers.push(t1);
    return () => timers.forEach(clearTimeout);
  }, [showModal]);

  useEffect(() => {
    return () => {
      if (navTimeout.current) clearTimeout(navTimeout.current);
    };
  }, []);

  const ensureSoundsReady = useCallback(() => {
    if (soundsPreloaded.current) return;
    soundsPreloaded.current = true;
    preloadSounds();
  }, []);

  const playClick = useCallback(() => {
    ensureSoundsReady();
    playSound("click");
  }, [ensureSoundsReady]);

  const handleFollow = useCallback(() => {
    if (followed) return;
    playClick();
    if (!commerce?.social_url) return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = commerce.social_url;
    } else {
      window.open(commerce.social_url, "_blank");
    }

    setFollowed(true);
    sessionStorage.setItem("followed", "true");

    if (sessionId) {
      // Fire-and-forget: no bloquea la UI esperando la respuesta de Supabase
      supabase
        .from("game_sessions")
        .update({ clicked_social: true })
        .eq("id", sessionId)
        .then(({ error }) => {
          if (error) console.error(error);
        });
    }
  }, [followed, playClick, commerce, sessionId]);

  /* -----------------------------------------------------------
     OPTIMIZACIÓN: la navegación al juego ya NO espera a que
     termine el "update" en Supabase. Esto hace que el cambio
     de pantalla se sienta instantáneo incluso con internet lento;
     el registro en base de datos sigue su curso en segundo plano.
  ----------------------------------------------------------- */
  const handleStartGame = useCallback(() => {
    if (startingGame) return;
    setStartingGame(true);
    playClick();
    setCardVisible(false);

    if (sessionId) {
      supabase
        .from("game_sessions")
        .update({ played: true })
        .eq("id", sessionId)
        .then(({ error }) => {
          if (error) console.error(error);
        });
    }

    navTimeout.current = setTimeout(() => {
      router.push(`/${params.slug}/game?session=${sessionId}`);
    }, 400);
  }, [startingGame, playClick, sessionId, router, params.slug]);

  const handleOpenTermsModal = useCallback(() => {
    playClick();
    setShowModal(true);
  }, [playClick]);

  const handleAcceptTerms = useCallback(() => {
    playClick();
    setAccepted(true);
    sessionStorage.setItem("accepted", "true");
    setShowModal(false);
  }, [playClick]);

  const handleCloseModal = useCallback(() => setShowModal(false), []);

  const canPlay = accepted && followed && !startingGame;

  if (loading) return <ChocolateLoader />;

  if (!commerce) {
    return (
      <ChocolateBackground>
        <h1
          style={{
            color: "#4d3800",
            fontSize: "clamp(18px, 4vw, 24px)",
            fontWeight: "900",
            textAlign: "center",
            zIndex: 2,
            letterSpacing: "1px"
          }}
        >
          NO DISPONIBLE
        </h1>
      </ChocolateBackground>
    );
  }

  return (
    <ChocolateBackground>
        <FloatingEmojis />

        <AnimatePresence mode="wait">
          {cardVisible && (
            <motion.div
              key="intro-card"
              initial={{ scale: 0.82, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.05, opacity: 0, y: -40 }}
              transition={{
                type: "spring",
                damping: 22,
                stiffness: 160,
                mass: 0.8
              }}
              style={styles.card}
            >
              {/* Logo: halo + flotación 100% CSS (sin JS, va al compositor) */}
              <div style={styles.logoWrapper}>
                <div style={styles.halo} aria-hidden="true" />
                <div style={styles.logoImageBox} className="choco-float">
                  <Image
                    src="/images/choco.png"
                    alt="Chocolate"
                    fill
                    sizes="(max-width: 480px) 95px, 95px"
                    style={{ objectFit: "contain" }}
                    priority
                    draggable={false}
                  />
                </div>
              </div>

              <motion.h1
                style={styles.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                ¡ROMPE Y GANA
                <br />
                <span style={styles.titleAccent}>TU PREMIO!</span>
              </motion.h1>

              <motion.p
                style={styles.subtitle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                Rompe el chocolate y descubre tu sorpresa
              </motion.p>

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
                  number={1}
                  label="Acepta los términos"
                  done={accepted}
                  onClick={handleOpenTermsModal}
                />
                <StepChip
                  number={2}
                  label="Síguenos en redes"
                  done={followed}
                  onClick={handleFollow}
                />
                <StepChip number={3} label="¡Empieza el juego!" done={false} locked={!canPlay} />
              </motion.div>

              <motion.div
                style={{ width: "100%" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <motion.button
                  disabled={!canPlay}
                  onClick={handleStartGame}
                  whileTap={canPlay ? { scale: 0.96 } : {}}
                  style={{
                    ...styles.button,
                    opacity: canPlay ? 1 : 0.45,
                    cursor: canPlay ? "pointer" : "not-allowed",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {canPlay && (
                    <span style={styles.shimmer} aria-hidden="true" />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {startingGame ? "CARGANDO" : " JUGAR AHORA"}
                  </span>
                </motion.button>
              </motion.div>

              <AnimatePresence>
                {!canPlay && (
                  <motion.p
                    key="warning"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={styles.warning}
                  >
                    {!accepted && !followed
                      ? "Completa los pasos 1 y 2 para jugar"
                      : !accepted
                      ? "Acepta los términos primero"
                      : "Síguenos en Instagram primero"}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showModal && (
            <motion.div
              key="terms-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={styles.modalOverlay}
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.75, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.75, opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                style={styles.modal}
                onClick={(e) => e.stopPropagation()}
              >
                <div ref={scrollRef} style={styles.modalContent}>
                  <h3 style={styles.modalTitle}>Condiciones</h3>
                  <ul style={styles.modalList}>
                    <li>• Juega solo en el punto</li>
                    <li>• 1 intento por persona</li>
                    <li>• +1 intento por compra</li>
                    <li>• Máx. 2 intentos por persona</li>
                    <li>• Resultado aleatorio</li>
                    <li>• Premios con condiciones</li>
                    <li>• No canjeable por dinero</li>
                    <li>• No acumulable</li>
                    <li>• Premios sujetos a disponibilidad</li>
                    <li>• El premio debe validarse en el punto de atención</li>
                    <li>• Redención válida únicamente el día de la participación</li>
                  </ul>
                  <h3 style={styles.modalTitle}>Términos</h3>
                  <ul style={styles.modalList}>
                    <li>• Participar implica aceptar términos</li>
                    <li>• Es una actividad promocional</li>
                    <li>• La organización podrá verificar participaciones duplicadas</li>
                    <li>• Cualquier intento de manipulación anula la participación</li>
                    <li>• En caso de fallas técnicas, la dinámica podrá ser ajustada</li>
                  </ul>
                  <p style={styles.modalNote}>
                    🎥 Puede ser grabado con fines promocionales
                  </p>
                </div>
                <button style={styles.modalButton} onClick={handleAcceptTerms}>
                  Acepto los términos
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style jsx global>{`
          @keyframes floatUp {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 0.6;
            }
            100% {
              transform: translateY(-105vh) rotate(20deg);
              opacity: 0;
            }
          }

          @keyframes haloPulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.3;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.55;
            }
          }

          @keyframes logoFloat {
            0%,
            100% {
              transform: translateY(0) rotate(-1deg);
            }
            50% {
              transform: translateY(-8px) rotate(1deg);
            }
          }

          @keyframes shimmerSlide {
            0% {
              transform: translateX(-100%);
              opacity: 1;
            }
            55% {
              transform: translateX(280%);
              opacity: 1;
            }
            56%,
            100% {
              transform: translateX(280%);
              opacity: 0;
            }
          }

          .choco-float {
            animation: logoFloat 3.5s ease-in-out infinite;
            will-change: transform;
          }

          ::-webkit-scrollbar {
            width: 5px;
          }
          ::-webkit-scrollbar-track {
            background: #e6d3a3;
            border-radius: 10px;
          }
          ::-webkit-scrollbar-thumb {
            background: #4d3800;
            border-radius: 10px;
          }
        `}</style>
      </ChocolateBackground>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
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
    background: "radial-gradient(circle, rgba(255,229,0,0.55) 0%, transparent 70%)",
    zIndex: 1,
    animation: "haloPulse 2.8s ease-in-out infinite",
    willChange: "transform, opacity"
  },

  logoImageBox: {
    position: "relative",
    width: "clamp(50px, 10vw, 95px)",
    height: "clamp(50px, 10vw, 95px)",
    zIndex: 2,
    marginTop: "-10px"
  },

  title: {
    fontSize: "clamp(20px, 5vw, 28px)",
    fontWeight: 900,
    color: "#4d3800",
    marginBottom: "8px",
    lineHeight: 1.2,
    letterSpacing: "-0.5px"
  },

  titleAccent: {
    color: "#c47a00",
    fontSize: "clamp(20px, 5vw, 28px)"
  },

  subtitle: {
    fontSize: "clamp(13px, 3.5vw, 15px)",
    color: "#7a6040",
    marginBottom: "8px",
    marginTop: "0px"
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

  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "55%",
    height: "100%",
    background: "linear-gradient(90deg, transparent, rgba(255,229,0,0.3), transparent)",
    zIndex: 0,
    animation: "shimmerSlide 3.2s ease-in-out infinite",
    willChange: "transform"
  },

  warning: {
    fontSize: "12px",
    color: "#9a7a40",
    marginTop: "10px",
    marginBottom: "-10px",
    textAlign: "center"
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
    maxHeight: "80vh",
    background: "#fffaf3",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.25)"
  },

  modalContent: {
    padding: "24px 20px",
    overflowY: "auto",
    flex: 1,
    scrollbarColor: "#4d3800 #e6d3a3",
    scrollbarWidth: "thin" as const
  },

  modalTitle: {
    fontSize: "17px",
    textAlign: "center",
    fontWeight: 900,
    marginBottom: "12px",
    color: "#4d3800"
  },

  modalList: {
    textAlign: "left",
    fontSize: "14px",
    marginBottom: "14px",
    color: "#3a2800",
    lineHeight: 1.8,
    paddingLeft: "4px"
  },

  modalNote: {
    fontSize: "14px",
    textAlign: "center",
    marginTop: "20px",
    marginBottom: "20px",
    color: "#7a6040"
  },

  modalButton: {
    width: "100%",
    padding: "16px",
    border: "none",
    background: "#4d3800",
    color: "#fff",
    fontWeight: 900,
    fontSize: "16px",
    cursor: "pointer",
    letterSpacing: "0.5px",
    flexShrink: 0
  }
};