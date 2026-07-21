import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { playSound, preloadSounds } from "../../components/AudioManager";
import { getConfettiFire, fireConfetti, tierOf } from "./confetti";
import { MIN_LOADING_MS, consumeNavStart, markNavStart } from "../../components/loaderConfig";
import {
  Prize,
  ResultData,
  pickPrize,
  getFirstPool,
  getRetryPool,
  safeGet,
  safeSet,
  safeRemove,
  getCachedPrizes,
  setCachedPrizes
} from "./resultUtils";

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

        const { data: session, error: sessionError } = await supabase
          .from("game_sessions")
          .select("id, campaign_id, prize_id, won")
          .eq("id", sessionId)
          .single();

        if (sessionError || !session) {
          console.error("SESSION ERROR", sessionError);
          return;
        }

        let prizes = getCachedPrizes(session.campaign_id);

        if (!prizes) {
          const { data: fetchedPrizes, error: prizesError } = await supabase
            .from("prizes")
            .select("*")
            .eq("campaign_id", session.campaign_id);

          if (prizesError || !fetchedPrizes || fetchedPrizes.length === 0) {
            console.error("PRIZES ERROR", prizesError);
            return;
          }

          prizes = fetchedPrizes as Prize[];
          setCachedPrizes(session.campaign_id, prizes);
        }

        const startReveal = async (prize: Prize) => {
          const isCelebration = prize.type !== "lose" && prize.type !== "retry";

          await Promise.all([
            soundsReadyRef.current,
            isCelebration ? getConfettiFire().catch(() => null) : Promise.resolve()
          ]);

          await reveal();
          setShow(true);
          runEffects(prize);
        };

        if (session.prize_id) {
          const existingPrize = (prizes as Prize[]).find((p) => p.id === session.prize_id);
          if (existingPrize) {
            setResult({ won: session.won, prize: existingPrize });
            await startReveal(existingPrize);
            return;
          }
        }

        const retryMode = safeGet(sessionStorage, `retry_${sessionId}`) === "true";
        const availablePrizes = retryMode
          ? getRetryPool(prizes as Prize[])
          : getFirstPool(prizes as Prize[]);

        if (availablePrizes.length === 0) {
          console.error("NO AVAILABLE PRIZES");
          return;
        }

        const selectedPrize = pickPrize(availablePrizes);

        const finalResult: ResultData = {
          won: selectedPrize.type !== "lose" && selectedPrize.type !== "retry",
          prize: selectedPrize
        };

        const updatePromise = supabase
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

        const isCelebration = finalResult.won;

        const [{ error: updateError }] = await Promise.all([
          updatePromise,
          soundsReadyRef.current,
          isCelebration ? getConfettiFire().catch(() => null) : Promise.resolve()
        ]);

        if (updateError) {
          console.error("UPDATE ERROR", updateError);
          return;
        }

        if (retryMode) {
          safeRemove(sessionStorage, `retry_${sessionId}`);
        }

        setResult(finalResult);
        await reveal();
        setShow(true);
        runEffects(selectedPrize);
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

    supabase
      .from("game_sessions")
      .update({
        prize_id: null,
        prize_type: null,
        prize_title: null,
        won: false,
        game_status: "PENDING"
      })
      .eq("id", sessionId)
      .then(({ error }) => {
        if (error) console.error("RETRY UPDATE ERROR", error);
      });

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

    supabase
      .from("game_sessions")
      .update({ claimed_prize: true })
      .eq("id", sessionId)
      .then(({ error }) => {
        if (error) console.error(error);
      });

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