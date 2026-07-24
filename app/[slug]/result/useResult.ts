import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { playSound, preloadSounds } from "../../components/AudioManager";
import { getConfettiFire, fireConfetti, tierOf } from "./confetti";
import { MIN_LOADING_MS, consumeNavStart, markNavStart } from "../../components/loaderConfig";
import { Prize, ResultData, safeGet, safeSet, safeRemove } from "./resultUtils";

function safePlay(name: Parameters<typeof playSound>[0]) {
  try {
    const maybePromise = playSound(name) as unknown;
    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === "function") {
      (maybePromise as Promise<unknown>).catch(() => {});
    }
  } catch {
    // noop
  }
}

function useResultLoader() {
  const [ready, setReady] = useState(false);
  const startedAt = useRef<number>(consumeNavStart());

  const reveal = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const elapsed = Date.now() - startedAt.current;
      const remaining = Math.max(MIN_LOADING_MS - elapsed, 0);
      setTimeout(() => {
        setReady(true);
        resolve();
      }, remaining);
    });
  }, []);

  return { loading: !ready, reveal };
}

export function useResult() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const sessionId = searchParams.get("session");

  const { loading, reveal } = useResultLoader();

  const [show, setShow] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initializedRef = useRef(false);
  const soundsReadyRef = useRef<Promise<void>>(Promise.resolve());
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trackTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    if (!slug) return;

    router.prefetch(`/${slug}/game`);
    router.prefetch(`/${slug}/claim`);

    // Renueva el prefetch de claim cada 20s mientras el usuario
    // sigue en Result: así nunca se vence el caché de Next, sin
    // importar cuánto se demore antes de tocar "Reclamar".
    const interval = setInterval(() => {
      router.prefetch(`/${slug}/claim`);
    }, 20000);

    return () => clearInterval(interval);
  }, [router, slug]);

  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, []);

  useEffect(() => {
    try {
      soundsReadyRef.current = Promise.resolve(preloadSounds()).catch(() => {});
    } catch {
      soundsReadyRef.current = Promise.resolve();
    }

    const warmup = new window.Image();
    warmup.src = "/images/choco.webp";
  }, []);

  const playWin = useCallback(() => safePlay("win"), []);
  const playLose = useCallback(() => safePlay("lose"), []);
  const playClick = useCallback(() => safePlay("click"), []);

  const runEffects = useCallback(
    (prize: Prize) => {
      if (!sessionId) return;

      const playedKey = `effects_played_${sessionId}`;
      if (safeGet(sessionStorage, playedKey) === "true") return;
      safeSet(sessionStorage, playedKey, "true");

      if (prize.type === "lose") {
        playLose();
        return;
      }
      if (prize.type === "retry") return;

      playWin();
      requestAnimationFrame(() => {
        fireConfetti(tierOf(prize.type));
      });
    },
    [sessionId, playLose, playWin]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const loadResult = async () => {
      try {
        if (!sessionId) return;

        // El sorteo y el guardado en game_sessions (won, prize_id,
        // prize_type, prize_title, game_status) ocurren en el
        // servidor, dentro de /api/session/result — el navegador
        // solo recibe el resultado ya decidido y confirmado en DB.
        const retryMode = safeGet(sessionStorage, `retry_${sessionId}`) === "true";

        const res = await fetch("/api/session/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, retry: retryMode }),
        });

        if (!res.ok) {
          console.error("RESULT ERROR", await res.text());
          return;
        }

        const finalResult: ResultData = await res.json();
        const isCelebration =
          finalResult.prize.type !== "lose" && finalResult.prize.type !== "retry";

        await Promise.all([
          soundsReadyRef.current,
          isCelebration ? getConfettiFire().catch(() => null) : Promise.resolve(),
        ]);

        if (retryMode) {
          safeRemove(sessionStorage, `retry_${sessionId}`);
        }

        setResult(finalResult);
        await reveal();
        setShow(true);
        runEffects(finalResult.prize);
      } catch (error) {
        console.error("RESULT ERROR", error);
      }
    };

    loadResult();
  }, [sessionId, runEffects, trackTimeout, reveal]);

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
        // noop
      }
    }

    safeRemove(sessionStorage, "redeemed");
    try {
      localStorage.removeItem("prize");
    } catch {
      // noop
    }

    router.push("/");
  }, [submitting, playClick, sessionId, router]);

  const handleRetry = useCallback(() => {
    if (submitting || !sessionId) return;
    setSubmitting(true);
    playClick();

    safeSet(sessionStorage, `retry_${sessionId}`, "true");
    safeRemove(sessionStorage, `effects_played_${sessionId}`);

    // Reinicia el registro en game_sessions (prize_id, prize_type,
    // prize_title -> null, won -> false, game_status -> PENDING)
    // en el servidor, para que el próximo /api/session/result
    // vuelva a sortear en vez de devolver el premio anterior.
    fetch("/api/session/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch((err) => console.error("RETRY ERROR", err));

    markNavStart();
    router.push(`/${slug}/game?session=${sessionId}`);
  }, [submitting, sessionId, slug, router, playClick]);

  const handleClaim = useCallback(async () => {
    if (submitting || !sessionId || !result) return;
    setSubmitting(true);
    playClick();

    try {
      localStorage.setItem(`prize_${sessionId}`, JSON.stringify(result));
    } catch {
      // noop
    }

    // Marca claimed_prize = true en game_sessions, en el servidor.
    fetch("/api/session/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch((err) => console.error("CLAIM ERROR", err));

    markNavStart();
    router.push(`/${slug}/claim?session=${sessionId}`);
  }, [submitting, sessionId, result, slug, router]);

  return {
    loading,
    show,
    result,
    submitting,
    handleFinish,
    handleRetry,
    handleClaim
  };
}
