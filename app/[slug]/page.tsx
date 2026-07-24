"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import ChocolateLoader from "../components/ChocolateLoader";
import ChocolateBackground from "../components/ChocolateBackground";
import useBlockBackNavigation from "../components/useBlockBackNavigation";
import { playSound } from "../components/AudioManager";
import { MIN_LOADING_MS, markNavStart } from "../components/loaderConfig";
import { preloadGameAssets } from "./game/useGameLoader";
import styles from "./Intro.module.css";

// El modal solo se descarga/ejecuta cuando realmente se abre.
const TermsModal = dynamic(() => import("./TermsModal"), { ssr: false });

// Precarga el chunk JS del modal en tiempo libre del navegador.
// Sin esto, la primera vez que el usuario toca "Acepta los términos"
// el navegador tiene que descargar+parsear ese JS justo cuando debería
// arrancar la animación de apertura — en Android eso se siente como
// un tranco. Precargándolo antes, al hacer click el modal ya está
// listo y solo anima.
let termsModalPreloaded = false;
function preloadTermsModal() {
  if (termsModalPreloaded) return;
  termsModalPreloaded = true;
  import("./TermsModal").catch(() => {
    termsModalPreloaded = false;
  });
}

interface Commerce {
  id: string;
  slug: string;
  social_url: string | null;
}

const EMOJI_POSITIONS = [0, 1, 2, 3, 4, 5];

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
  const chipClass = `${styles.chip} ${done ? styles.done : ""} ${locked ? styles.locked : ""}`;
  const circleClass = `${styles.chipCircle} ${done ? styles.done : ""} ${locked ? styles.locked : ""}`;
  const labelClass = `${styles.chipLabel} ${done ? styles.done : ""} ${locked ? styles.locked : ""}`;

  return (
    <div className={chipClass} onClick={onClick}>
      <div className={circleClass}>{done ? "✓" : number}</div>
      <span className={labelClass}>{label}</span>
      {onClick && <span className={styles.chipArrow}>→</span>}
    </div>
  );
});

const FloatingEmojis = memo(function FloatingEmojis() {
  return (
    <div className={styles.floatingEmojis} aria-hidden="true">
      {EMOJI_POSITIONS.map((i) => (
        <span
          key={i}
          className={styles.floatingEmoji}
          style={{
            left: `${8 + i * 16}%`,
            fontSize: i % 2 === 0 ? "20px" : "14px",
            opacity: 0.15 + i * 0.02,
            animationDuration: `${5 + i * 0.9}s`,
            animationDelay: `${i * 0.8}s`
          }}
        >
          🍫
        </span>
      ))}
    </div>
  );
});

interface FlowState {
  accepted: boolean;
  followed: boolean;
  showModal: boolean;
  startingGame: boolean;
  cardVisible: boolean;
}

const INITIAL_FLOW: FlowState = {
  accepted: false,
  followed: false,
  showModal: false,
  startingGame: false,
  cardVisible: true
};

export default function Intro() {
  useBlockBackNavigation();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW);
  const [loading, setLoading] = useState(true);
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const navTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobileRef = useRef<boolean | null>(null);

  // Marca cuándo arrancó el loader; finishLoading() usa esto para
  // sostener el loader un mínimo de MIN_LOADING_MS, igual que Game,
  // Result y Claim, sin importar qué tan rápido responda la API.
  const startedAt = useRef(Date.now());

  const router = useRouter();
  const params = useParams<{ slug: string }>();

  const patchFlow = useCallback((patch: Partial<FlowState>) => {
    setFlow((prev) => ({ ...prev, ...patch }));
  }, []);

  // Reemplaza a setLoading(false): siempre espera el piso de tiempo
  // antes de apagar el loader, para que la duración se sienta igual
  // en todas las pantallas.
  const finishLoading = useCallback(() => {
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(MIN_LOADING_MS - elapsed, 0);
    setTimeout(() => setLoading(false), remaining);
  }, []);

  useEffect(() => {
    if (!params?.slug) return;
    let active = true;

    // Precarga el chunk JS de /game...
    router.prefetch(`/${params.slug}/game`);
    // ...y también sus imágenes/sonidos/fuentes, usando la MISMA
    // bandera (assetsWarmed) que consume useGameLoader. Cuando el
    // usuario llegue a Game, este ya sabrá que no hay nada que
    // esperar y arrancará con loading=false de inmediato.
    preloadGameAssets();

    // Precarga el chunk del modal de términos en tiempo libre,
    // para que abrirlo no dispare descarga+parseo de JS al mismo
    // tiempo que la animación (la causa del tranco en Android).
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(preloadTermsModal, { timeout: 1500 });
    } else {
      setTimeout(preloadTermsModal, 300);
    }

    const followedSession = sessionStorage.getItem("followed") === "true";
    const acceptedSession = sessionStorage.getItem("accepted") === "true";
    if (followedSession || acceptedSession) {
      patchFlow({ followed: followedSession, accepted: acceptedSession });
    }

    // Toda la creación/recuperación de sesión de juego ahora vive
    // en el servidor (/api/session/start), usando el service_role
    // de Supabase. El navegador nunca vuelve a tocar la tabla
    // commerces ni game_sessions directamente.
    const loadCommerce = async () => {
      try {
        const existingSessionId = sessionStorage.getItem("intro_session_id");
        
        const res = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
           slug: params.slug,
           existingSessionId,
         }),

        });

        if (!active) return;

        if (!res.ok) {
          console.error("SESSION START ERROR", await res.text());
          setCommerce(null);
          finishLoading();
          return;
        }

        const data = await res.json();

        setCommerce({
          id: data.commerce_id,
          slug: data.slug,
          social_url: data.social_url
        });
        setSessionId(data.session_id);
        sessionStorage.setItem("intro_session_id", data.session_id);
        finishLoading();
      } catch (err) {
        if (!active) return;
        console.error("SESSION START ERROR", err);
        setCommerce(null);
        finishLoading();
      }
    };

    loadCommerce();

    return () => {
      active = false;
    };
  }, [params.slug, router, patchFlow, finishLoading]);

  useEffect(() => {
    return () => {
      if (navTimeout.current) clearTimeout(navTimeout.current);
    };
  }, []);

  const playClick = useCallback(() => {
    playSound("click");
  }, []);

  const handleFollow = useCallback(() => {
    if (!commerce?.social_url) return;

    playClick();

    if (isMobileRef.current === null) {
      isMobileRef.current = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    if (isMobileRef.current) {
      window.location.href = commerce.social_url;
    } else {
      window.open(commerce.social_url, "_blank");
    }

    patchFlow({ followed: true });
    sessionStorage.setItem("followed", "true");

    if (sessionId) {
      fetch("/api/session/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch((err) => console.error("SOCIAL ERROR", err));
    }
    
  }, [playClick, commerce, sessionId, patchFlow]);

  const handleStartGame = useCallback(() => {
    playClick();
    patchFlow({ startingGame: true, cardVisible: false });

    if (sessionId) {
      fetch("/api/session/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch((err) => console.error("PLAY ERROR", err));
    }

    navTimeout.current = setTimeout(() => {
      // Marca el instante de navegación: el loader de Game contará
      // su mínimo desde AQUÍ, no desde que Game termine de montar.
      // (En la práctica, si preloadGameAssets ya terminó, Game ni
      // siquiera va a mostrar loader, así que esto es solo un
      // resguardo por si el usuario hace click MUY rápido).
      markNavStart();
      router.push(`/${params.slug}/game?session=${sessionId}`);
    }, 400);
  }, [playClick, sessionId, router, params.slug, patchFlow]);

  const handleOpenTermsModal = useCallback(() => {
    playClick();
    // Por si el idle callback aún no corrió (click muy rápido):
    // dispara la precarga igual, sin esperar más tiempo libre.
    preloadTermsModal();
    patchFlow({ showModal: true });
  }, [playClick, patchFlow]);

  const handleAcceptTerms = useCallback(() => {
    playClick();
    sessionStorage.setItem("accepted", "true");
    patchFlow({ accepted: true, showModal: false });
  }, [playClick, patchFlow]);

  const handleCloseModal = useCallback(() => patchFlow({ showModal: false }), [patchFlow]);

  const { accepted, followed, showModal, startingGame, cardVisible } = flow;
  const canPlay = accepted && followed && !startingGame;

  const warningText = useMemo(() => {
    if (!accepted && !followed) return "Completa los pasos 1 y 2 para jugar";
    if (!accepted) return "Acepta los términos primero";
    if (!followed) return "Síguenos en Instagram primero";
    return "Presiona JUGAR AHORA para comenzar.";
  }, [accepted, followed]);

  if (loading) return <ChocolateLoader isVisible={true} />;

  if (!commerce) {
    return (
      <ChocolateBackground>
        <h1 className={styles.title}>NO DISPONIBLE</h1>
      </ChocolateBackground>
    );
  }

  return (
    <ChocolateBackground>
      <FloatingEmojis />

      {cardVisible && (
        <div className={`${styles.card} ${!cardVisible ? styles.cardExit : ""}`}>
          <div className={styles.logoWrapper}>
            <div className={styles.halo} aria-hidden="true" />
            <div className={`${styles.logoImageBox} ${styles.chocoFloat}`}>
              <Image
                src="/images/choco.webp"
                alt="Chocolate"
                width={95}
                height={95}
                unoptimized
                priority
              />
            </div>
          </div>

          <h1 className={styles.title}>
            ¡ROMPE Y GANA
            <br />
            <span className={styles.titleAccent}>TU PREMIO!</span>
          </h1>

          <p className={styles.subtitle}>Rompe el chocolate y descubre tu sorpresa</p>

          <div className={styles.divider} />

          <div className={styles.steps}>
            <StepChip number={1} label="Acepta los términos" done={accepted} onClick={handleOpenTermsModal} />
            <StepChip number={2} label="Síguenos en redes" done={followed} onClick={handleFollow} />
          </div>

          <div className={styles.buttonWrap}>
            <button
              disabled={!canPlay}
              onClick={handleStartGame}
              className={`${styles.button} ${canPlay ? styles.canPlay : ""}`}
            >
              {canPlay && <span className={styles.shimmer} aria-hidden="true" />}
              <span className={styles.buttonLabel}>
                {startingGame ? "CARGANDO" : " JUGAR AHORA"}
              </span>
            </button>
          </div>

          <p className={styles.warning}>
            {warningText ?? "Presiona «JUGAR AHORA» para comenzar."}
          </p>
        </div>
      )}

      {showModal && (
        <TermsModal onAccept={handleAcceptTerms} onClose={handleCloseModal} />
      )}
    </ChocolateBackground>
  );
}
