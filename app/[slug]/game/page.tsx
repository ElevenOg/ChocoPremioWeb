"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";

import { motion } from "framer-motion";

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
 * Tipo para permitir variables CSS personalizadas
 * (--dx, --dy, --rot, --s) en el style inline,
 * sin perder el tipado del resto de propiedades.
 */
type CSSVars = React.CSSProperties & { [key: string]: string | number };

interface CrumbData {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  scale: number;
}

/**
 * Partícula individual memorizada.
 *
 * OPTIMIZACIÓN: ya NO usa framer-motion para animarse.
 * Cada partícula se mueve con una animación CSS pura
 * (@keyframes crumbFly), que el navegador ejecuta en el
 * hilo de composición (GPU) y no en el hilo de JavaScript.
 * Esto es clave porque en este juego se generan partículas
 * en CADA toque: si fueran animadas por JS, los toques
 * rápidos podrían acumular trabajo y generar "trabas".
 *
 * La propia partícula avisa cuándo terminó su animación
 * (onAnimationEnd) para que el padre la elimine del estado.
 * Esto es más robusto que un setTimeout con slice(), que
 * dependía de que el orden de inserción nunca se rompiera.
 */
const Crumb = memo(function Crumb({
  crumb,
  onDone
}: {
  crumb: CrumbData;
  onDone: (id: number) => void;
}) {
  const style: CSSVars = {
    ...crumbStyle,
    "--dx": `${crumb.dx}px`,
    "--dy": `${crumb.dy}px`,
    "--rot": `${crumb.rot}deg`,
    "--s": crumb.scale
  };

  return (
    <img
      src="/images/parti.png"
      alt=""
      draggable={false}
      style={style}
      className="crumb-fly"
      onAnimationEnd={() => onDone(crumb.id)}
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
  const [crumbs, setCrumbs] = useState<CrumbData[]>([]);

  /**
   * Router y parámetros
   */
  const router = useRouter();

  const params = useParams<{ slug: string }>();

  const searchParams = useSearchParams();

  /**
   * Obtiene session_id
   * enviado desde Intro
   */
  const sessionId = searchParams.get("session");

  /**
   * Referencia directa al chocolate para animar
   * la "sacudida" con la Web Animations API (WAAPI)
   * en lugar de framer-motion. Se ejecuta nativamente
   * en el navegador, sin pasar por React ni por el
   * hilo de JS en cada frame: ideal para algo que se
   * dispara en CADA toque del juego.
   */
  const chocoRef = useRef<HTMLDivElement>(null);

  /**
   * Anti-spam de efectos (sonido + vibración + sacudida + partículas).
   * El conteo del click SIEMPRE se respeta (la jugabilidad nunca se
   * frena), pero si el usuario toca extremadamente rápido, los
   * efectos visuales/sonoros se limitan a uno cada ~60ms para
   * proteger el rendimiento en equipos modestos.
   */
  const lastEffect = useRef(0);

  /**
   * Guard adicional (ref, no estado) para evitar por completo
   * cualquier doble navegación o doble limpieza de sessionStorage
   * si el último click llegara a procesarse dos veces.
   */
  const finishedRef = useRef(false);

  /**
   * Contador para ids de partículas: garantiza unicidad real
   * (más seguro que Math.random() como key).
   */
  const crumbIdRef = useRef(0);

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

    preloadSounds();

    /**
     * Precarga TODAS las imágenes del juego (partículas, chocolate
     * y, sobre todo, el regalo) para que el navegador ya las tenga
     * descargadas y decodificadas antes de necesitarlas.
     *
     * "gift.png" es la más importante de precargar: solo aparece
     * en el instante exacto en que el usuario gana, que es el
     * momento más importante de toda la experiencia. Si no está
     * precargada, justo ahí podría haber un parpadeo o una pausa
     * mientras el navegador la descarga por primera vez — el peor
     * lugar posible para que se note una traba.
     */
    ["/images/parti.png", "/images/choco.png", "/images/gift.png"].forEach(
      (src) => {
        const warmup = new window.Image();
        warmup.src = src;
      }
    );

    /**
     * Prefetch de la pantalla de resultado para que la
     * transición final sea instantánea.
     */
    if (params?.slug) {
      router.prefetch(`/${params.slug}/result`);
    }

    /**
     * Recupera cantidad de golpes guardados en sesión.
     * Envuelto en try/catch: en modo privado/incógnito de
     * algunos navegadores sessionStorage puede lanzar error.
     */
    let storedClicks: string | null = null;
    try {
      storedClicks = sessionStorage.getItem("maxClicks");
    } catch {
      storedClicks = null;
    }

    if (storedClicks) {

      setMaxClicks(parseInt(storedClicks, 10));

    } else {

      const randomClicks = Math.floor(Math.random() * 3) + 3;

      try {
        sessionStorage.setItem("maxClicks", String(randomClicks));
      } catch {
        /* noop: si falla, simplemente no persiste entre renders */
      }

      setMaxClicks(randomClicks);
    }

  }, [router, params?.slug]);

  /**
   * Limpieza al desmontar: cancela cualquier
   * timeout pendiente (navegación final)
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
   * Animación de golpe vía WAAPI (nativa del navegador).
   */
  const shake = useCallback(() => {
    chocoRef.current?.animate?.(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.88)" },
        { transform: "scale(1.04)" },
        { transform: "scale(0.97)" },
        { transform: "scale(1)" }
      ],
      { duration: 220, easing: "ease-out" }
    );
  }, []);

  /**
   * Genera partículas visuales.
   * Limita el máximo de partículas simultáneas en pantalla
   * (defensivo): si alguien "ametralla" la pantalla en un
   * celular muy limitado, no se acumulan decenas de nodos
   * DOM animándose a la vez.
   */
  const spawnCrumbs = useCallback(() => {
    const newCrumbs: CrumbData[] = Array.from({ length: 6 }).map(() => ({
      id: crumbIdRef.current++,
      dx: (Math.random() - 0.5) * 140,
      dy: (Math.random() - 0.5) * 140,
      rot: Math.random() * 360,
      scale: 0.6 + Math.random() * 0.6
    }));

    setCrumbs((prev) => (prev.length > 36 ? prev : [...prev, ...newCrumbs]));
  }, []);

  /**
   * Elimina una partícula puntual cuando termina su animación.
   */
  const handleCrumbDone = useCallback((id: number) => {
    setCrumbs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /**
   * Maneja la interacción del juego.
   * Se dispara en "pointerdown" (no en "click") para que la
   * respuesta sea inmediata al tocar, sin esperar el evento
   * completo de presionar+soltar.
   */
  const handleClick = useCallback((e?: React.PointerEvent | React.KeyboardEvent) => {

    if (finishedRef.current) return;

    if (e && "cancelable" in e && e.cancelable) {
      e.preventDefault();
    }

    const now = Date.now();
    const allowEffects = now - lastEffect.current > 60;

    if (allowEffects) {
      lastEffect.current = now;
      playBreak();
      vibrate();
      shake();
      spawnCrumbs();
    }

    setClicks((prev) => {

      const newClicks = prev + 1;

      if (newClicks >= maxClicks && !finishedRef.current) {

        finishedRef.current = true;
        setFinished(true);

        try {
          sessionStorage.removeItem("maxClicks");
        } catch {
          /* noop */
        }

        trackTimeout(() => {
          router.push(`/${params.slug}/result?session=${sessionId}`);
        }, 900);
      }

      return newClicks;
    });
  }, [
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick(e);
    }
  }, [handleClick]);

  return (

    <ChocolateBackground>

      {/* Tarjeta principal */}
      <div style={styles.card}>

        <h1 style={styles.title}>
          ROMPE EL CHOCOLATE !
        </h1>

        {/* Barra de progreso (animación CSS, se reinicia al cambiar la key) */}
        <div style={styles.progressBar}>

          {clicks > 0 && (
            <div
              key={clicks}
              style={styles.progressFill}
              className="progress-flash"
            />
          )}
        </div>

        <div style={relativeInline}>

          {/* Entrada animada (una sola vez al montar: framer-motion aquí no afecta el rendimiento del juego) */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >

            <div
              ref={chocoRef}
              style={
                finished
                  ? styles.chocolateDefault
                  : styles.chocolatePointer
              }
            >

              {clicks < maxClicks ? (

                <img
                  src="/images/choco.png"
                  style={styles.image}
                  draggable={false}
                  alt="Chocolate"
                />

              ) : (

                <img
                  src="/images/gift.png"
                  style={styles.image}
                  draggable={false}
                  alt="Premio"
                />
              )}
            </div>

          </motion.div>

          {/* Área clickeable */}
          {!finished && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Golpear el chocolate"
              onPointerDown={handleClick}
              onKeyDown={handleKeyDown}
              style={styles.hitbox}
            />
          )}

          {/* Partículas */}
          {crumbs.map((crumb) => (
            <Crumb key={crumb.id} crumb={crumb} onDone={handleCrumbDone} />
          ))}
        </div>

        {/* Martillo flotante (animación CSS, se reinicia al cambiar la key) */}
        {clicks > 0 && clicks < maxClicks && (
          <div
            key={clicks + "particle"}
            className="hammer-float"
            style={styles.particle}
          >
            🔨
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes crumbFly {
          0% {
            transform: translate(-50%, -50%) scale(var(--s));
            opacity: 1;
          }
          100% {
            transform: translate(
                calc(-50% + var(--dx)),
                calc(-50% + var(--dy))
              )
              rotate(var(--rot)) scale(var(--s));
            opacity: 0;
          }
        }

        .crumb-fly {
          animation: crumbFly 0.5s ease-out forwards;
        }

        @keyframes progressFlash {
          0% {
            width: 0%;
          }
          50% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }

        .progress-flash {
          animation: progressFlash 0.5s ease-in-out forwards;
        }

        @keyframes hammerFloat {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-60px);
          }
        }

        .hammer-float {
          animation: hammerFloat 0.6s ease-out forwards;
        }
      `}</style>

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
    background: "linear-gradient(90deg, gold, orange)",
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
    zIndex: 5,
    touchAction: "manipulation",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent"
  },

  particle: {
    position: "absolute",
    top: "40%",
    left: "50%",
    fontSize: "120px"
  }
};