"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";

import ChocolateBackground from "../../components/ChocolateBackground";
import useBlockBackNavigation from "../../components/useBlockBackNavigation";
import { playSound } from "../../components/AudioManager";
import { useGameLoader } from "./useGameLoader";
import { markNavStart } from "../../components/loaderConfig";
import styles from "./Game.module.css";

interface CrumbData {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  scale: number;
}

type CSSVars = React.CSSProperties & { [key: string]: string | number };

const Crumb = memo(function Crumb({
  crumb,
  onDone
}: {
  crumb: CrumbData;
  onDone: (id: number) => void;
}) {
  const style: CSSVars = {
    "--dx": `${crumb.dx}px`,
    "--dy": `${crumb.dy}px`,
    "--rot": `${crumb.rot}deg`,
    "--s": crumb.scale
  };

  return (
    <img
      src="/images/parti.webp"
      alt=""
      draggable={false}
      decoding="async"
      style={style}
      className={styles.crumb}
      onAnimationEnd={() => onDone(crumb.id)}
    />
  );
});

export default function Game() {
  useBlockBackNavigation();
  useGameLoader();

  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(false);
  const [maxClicks, setMaxClicks] = useState(10);
  const [crumbs, setCrumbs] = useState<CrumbData[]>([]);

  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const chocoRef = useRef<HTMLDivElement>(null);
  const lastEffect = useRef(0);
  const finishedRef = useRef(false);
  const crumbIdRef = useRef(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trackTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    if (params?.slug) router.prefetch(`/${params.slug}/result`);

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
        // noop
      }
      setMaxClicks(randomClicks);
    }
  }, [router, params?.slug]);

  useEffect(() => {
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  // Dispara la navegación como efecto de "finished", no dentro
  // del updater de setClicks (que debe quedar puro).
  useEffect(() => {
    if (!finished) return;

    const id = trackTimeout(() => {
      markNavStart();
      router.push(`/${params.slug}/result?session=${sessionId}`);
    }, 900);

    return () => clearTimeout(id);
  }, [finished, trackTimeout, router, params.slug, sessionId]);

  const playBreak = useCallback(() => playSound("break"), []);
  const vibrate = useCallback(() => navigator.vibrate?.(40), []);

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

  const handleCrumbDone = useCallback((id: number) => {
    setCrumbs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleClick = useCallback(
    (e?: React.PointerEvent | React.KeyboardEvent) => {
      if (finishedRef.current) return;
      if (e && "cancelable" in e && e.cancelable) e.preventDefault();

      const now = Date.now();
      if (now - lastEffect.current > 60) {
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
            // noop
          }
        }

        return newClicks;
      });
    },
    [maxClicks, playBreak, vibrate, shake, spawnCrumbs]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") handleClick(e);
    },
    [handleClick]
  );

  return (
    <ChocolateBackground>
      <div className={styles.card}>
        <h1 className={styles.title}>ROMPE EL CHOCOLATE !</h1>

        <div className={styles.progressBar}>
          {clicks > 0 && <div key={clicks} className={styles.progressFill} />}
        </div>

        <div className={styles.relativeInline}>
          <div className={styles.cardEntrance}>
            <div
              ref={chocoRef}
              className={`${styles.chocolateWrap} ${finished ? styles.finished : ""}`}
            >
              {clicks < maxClicks ? (
                <img
                  src="/images/choco.webp"
                  className={styles.image}
                  draggable={false}
                  decoding="async"
                  loading="eager"
                  fetchPriority="high"
                  alt="Chocolate"
                />
              ) : (
                <img
                  src="/images/gift.webp"
                  className={styles.image}
                  draggable={false}
                  decoding="async"
                  alt="Premio"
                />
              )}
            </div>
          </div>

          {!finished && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Golpear el chocolate"
              onPointerDown={handleClick}
              onKeyDown={handleKeyDown}
              className={styles.hitbox}
            />
          )}

          {crumbs.map((crumb) => (
            <Crumb key={crumb.id} crumb={crumb} onDone={handleCrumbDone} />
          ))}
        </div>

        {clicks > 0 && clicks < maxClicks && (
          <div key={clicks + "particle"} className={styles.particle}>
            🔨
          </div>
        )}
      </div>
    </ChocolateBackground>
  );
}