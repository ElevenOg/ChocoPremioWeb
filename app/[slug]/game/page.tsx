"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";

import { motion, useAnimation } from "framer-motion";

import {
  useRouter,
  useSearchParams,
  useParams
} from "next/navigation";

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
 * Partícula individual memorizada.
 * Evita que React vuelva a montar/diffear
 * las partículas viejas cuando llegan nuevas.
 */
const Crumb = memo(function Crumb({
  crumb
}: {
  crumb: { id: number; x: number; y: number; rotate: number; scale: number };
}) {
  return (
    <motion.img
      src="/images/parti.png"
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: crumb.scale
      }}
      animate={{
        x: crumb.x,
        y: crumb.y,
        rotate: crumb.rotate,
        opacity: 0
      }}
      transition={{
        duration: 0.5,
        ease: "easeOut"
      }}
      style={crumbStyle}
    />
  );
});

export default function Game() {

  /**
   * BLOQUEA regresar desde Intro
   * (se queda en Intro)
   */
  useBlockBackNavigation();

  /**
   * Estado de clicks realizados
   */
  const [clicks, setClicks] = useState<number>(0);

  /**
   * Estado para bloquear interacción
   * cuando el juego termina
   */
  const [finished, setFinished] = useState<boolean>(false);

  /**
   * Número de golpes necesarios
   * para romper el chocolate
   */
  const [maxClicks, setMaxClicks] = useState<number>(10);

  /**
   * Partículas visuales
   */
  const [crumbs, setCrumbs] = useState<any[]>([]);

  /**
   * Router y parámetros
   */
  const router = useRouter();

  const params = useParams();

  const searchParams = useSearchParams();

  /**
   * Obtiene session_id
   * enviado desde Intro
   */
  const sessionId = searchParams.get("session");

  /**
   * Controles de animación
   */
  const controls = useAnimation();

  /**
   * Anti spam sonido
   */
  const lastPlay = useRef(0);

  /**
   * Timeouts activos, para poder limpiarlos
   * todos si el componente se desmonta
   * (evita setState en componente desmontado
   * y fugas de memoria al salir rápido de la página)
   */
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trackTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  }, []);

  /**
   * Inicialización
   */
  useEffect(() => {

    /**
     * Precarga sonidos globales
     */
    preloadSounds();

    /**
     * Recupera cantidad de golpes
     * guardados en sesión
     */
    const storedClicks =
      sessionStorage.getItem("maxClicks");

    if (storedClicks) {

      setMaxClicks(parseInt(storedClicks));

    } else {

      /**
       * Genera cantidad aleatoria
       * entre 3 y 5 golpes
       */
      const randomClicks =
        Math.floor(Math.random() * 3) + 3;

      sessionStorage.setItem(
        "maxClicks",
        String(randomClicks)
      );

      setMaxClicks(randomClicks);
    }

  }, []);

  /**
   * Limpieza al desmontar: cancela cualquier
   * timeout pendiente (partículas o navegación)
   */
  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, []);

  /**
   * Sonido de ruptura
   */
  const playBreak = useCallback(() => {

    const now = Date.now();

    if (now - lastPlay.current < 80) return;

    lastPlay.current = now;

    /**
     * Sonido desde AudioManager
     */
    playSound("break");
  }, []);

  /**
   * Vibración móvil
   */
  const vibrate = useCallback(() => {

    if (navigator.vibrate) {

      navigator.vibrate(40);
    }
  }, []);

  /**
   * Animación de golpe
   */
  const shake = useCallback(() => {

    controls.start({
      scale: [1, 0.88, 1.04, 0.97, 1],
      transition: {
        duration: 0.22,
        ease: "easeOut"
      }
    });
  }, [controls]);

  /**
   * Genera partículas visuales
   */
  const spawnCrumbs = useCallback(() => {

    const newCrumbs =
      Array.from({ length: 8 }).map(() => ({
        id: Math.random(),
        x: (Math.random() - 0.5) * 140,
        y: (Math.random() - 0.5) * 140,
        rotate: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.6
      }));

    setCrumbs((prev) => [
      ...prev,
      ...newCrumbs
    ]);

    trackTimeout(() => {

      setCrumbs((prev) =>
        prev.slice(newCrumbs.length)
      );

    }, 500);
  }, [trackTimeout]);

  /**
   * Maneja clicks del juego
   */
  const handleClick = useCallback(() => {

    if (finished) return;

    playBreak();

    vibrate();

    shake();

    spawnCrumbs();

    setClicks((prev) => {

      const newClicks = prev + 1;

      /**
       * Chocolate roto
       */
      if (newClicks >= maxClicks) {

        setFinished(true);

        /**
         * Limpia maxClicks
         * para próximas partidas
         */
        sessionStorage.removeItem("maxClicks");

        /**
         * Navega al resultado final
         * enviando session_id
         */
        trackTimeout(() => {

          router.push(
            `/${params.slug}/result?session=${sessionId}`
          );

        }, 900);
      }

      return newClicks;
    });
  }, [
    finished,
    maxClicks,
    playBreak,
    vibrate,
    shake,
    spawnCrumbs,
    trackTimeout,
    router,
    params.slug,
    sessionId
  ]);

  return (

    <ChocolateBackground>

      {/* Tarjeta principal */}
      <div style={styles.card}>

        <h1 style={styles.title}>
          ROMPE EL CHOCOLATE !
        </h1>

        {/* Barra de progreso */}
        <div style={styles.progressBar}>

          {clicks > 0 && (

            <motion.div
              key={clicks}
              style={styles.progressFill}
              initial={{ width: "0%" }}
              animate={{
                width: ["0%", "100%", "0%"]
              }}
              transition={{
                duration: 0.5,
                ease: "easeInOut"
              }}
            />
          )}
        </div>

        <div style={relativeInline}>

          {/* Contenedor animado */}
          <motion.div
            initial={{
              scale: 0.7,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            transition={{
              duration: 0.5
            }}
          >

            <motion.div
              animate={controls}
              whileTap={{
                scale: finished ? 1 : 0.95
              }}
              style={
                finished
                  ? styles.chocolateDefault
                  : styles.chocolatePointer
              }
            >

              {/* Chocolate */}
              {clicks < maxClicks ? (

                <img
                  src="/images/choco.png"
                  style={styles.image}
                  draggable={false}
                />

              ) : (

                <img
                  src="/images/gift.png"
                  style={styles.image}
                  draggable={false}
                />
              )}
            </motion.div>

          </motion.div>

          {/* Área clickeable */}
          {!finished && (

            <div
              onClick={handleClick}
              style={styles.hitbox}
            />
          )}

          {/* Partículas */}
          {crumbs.map((crumb) => (
            <Crumb key={crumb.id} crumb={crumb} />
          ))}
        </div>

        {/* Martillo flotante */}
        {clicks > 0 &&
          clicks < maxClicks && (

          <motion.div
            key={clicks + "particle"}
            initial={{ y: 0 }}
            animate={{
              opacity: 0,
              y: -60
            }}
            transition={{
              duration: 0.6
            }}
            style={styles.particle}
          >
            🔨
          </motion.div>
        )}
      </div>

    </ChocolateBackground>
  );
}

/**
 * Estilos estáticos extraídos fuera del render
 * para que sean la MISMA referencia de objeto
 * en cada render (evita recrear objetos en cada
 * pasada y ayuda a memo/diffing).
 */
const relativeInline: React.CSSProperties = {
  position: "relative",
  display: "inline-block"
};

const crumbStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: "12px",
  pointerEvents: "none",
  transform: "translate(-50%, -50%)",
  willChange: "transform, opacity"
};

const styles: {
  [key: string]: React.CSSProperties
} = {

  card: {
    width: "100%",
    maxWidth: "420px",
    textAlign: "center",
    zIndex: 2,
    position: "relative"
  },

  title: {
    fontSize: "22px",
    fontWeight: "900",
    color: "#4d3800",
    marginBottom: "15px"
  },

  progressBar: {
    width: "100%",
    height: "8px",
    background: "#4d3800",
    borderRadius: "20px",
    overflow: "hidden",
    marginBottom: "40px"
  },

  progressFill: {
    height: "100%",
    background:
      "linear-gradient(90deg, gold, orange)",
    width: "0%",
    willChange: "width"
  },

  chocolatePointer: {
    marginBottom: "20px",
    userSelect: "none",
    cursor: "pointer",
    willChange: "transform"
  },

  chocolateDefault: {
    marginBottom: "20px",
    userSelect: "none",
    cursor: "default",
    willChange: "transform"
  },

  image: {
    width: "clamp(260px, 70vw, 300px)",
    height: "auto",
    userSelect: "none",
    pointerEvents: "none",
    marginBottom: "20px"
  },

  hitbox: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "clamp(260px, 70vw, 300px)",
    height: "clamp(260px, 70vw, 300px)",
    cursor: "pointer",
    zIndex: 5
  },

  particle: {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "120px"
  }
};