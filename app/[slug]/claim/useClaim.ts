import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { playSound, preloadSounds } from "../../components/AudioManager";
import { MIN_LOADING_MS, consumeNavStart } from "../../components/loaderConfig";

export const GIFTS = [0, 1, 2, 3, 4, 5];

export function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // noop
  }
}

export function safeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // noop
  }
}

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

interface PrizeData {
  prize?: { name?: string };
}

interface ClaimState {
  redeemed: boolean;
  showConfirm: boolean;
  submitting: boolean;
  prizeName: string;
}

export function useClaim() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const sessionId = searchParams.get("session");

  const [loading, setLoading] = useState(true);

  const [state, setState] = useState<ClaimState>({
    redeemed: false,
    showConfirm: false,
    submitting: false,
    prizeName: "Cargando..."
  });

  const soundsReadyRef = useRef<Promise<void>>(Promise.resolve());
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trackTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    try {
      soundsReadyRef.current = Promise.resolve(preloadSounds()).catch(() => {});
    } catch {
      soundsReadyRef.current = Promise.resolve();
    }

    const idlePrefetch = () => router.prefetch("/");

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(idlePrefetch, { timeout: 1000 });
    } else {
      trackTimeout(idlePrefetch, 0);
    }
  }, [router, trackTimeout]);

  useEffect(() => {
    let cancelled = false;
    const mountedAt = consumeNavStart();

    const load = async () => {
      try {
        if (sessionId) {
          const savedPrize = safeGet(localStorage, `prize_${sessionId}`);
          if (savedPrize) {
            const parsed: PrizeData = JSON.parse(savedPrize);
            if (!cancelled) {
              setState((s) => ({ ...s, prizeName: parsed.prize?.name || "Premio especial" }));
            }
          }

          const redeemedSession = safeGet(sessionStorage, `redeemed_${sessionId}`);
          if (redeemedSession === "true" && !cancelled) {
            setState((s) => ({ ...s, redeemed: true }));
          }
        }
      } catch (error) {
        console.error("CLAIM LOAD ERROR", error);
      }

      await soundsReadyRef.current;

      // Loader siempre dura MIN_LOADING_MS completo desde que el usuario
      // pulsó el botón en la pantalla anterior (Result), no desde que
      // Claim montó, igual que Intro y Result.
      const elapsed = Date.now() - mountedAt;
      const remaining = Math.max(MIN_LOADING_MS - elapsed, 0);

      trackTimeout(() => {
        if (!cancelled) setLoading(false);
      }, remaining);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, trackTimeout]);

  const handleRedeem = useCallback(() => {
    safePlay("click");
    setState((s) => ({ ...s, redeemed: true }));
    if (sessionId) safeSet(sessionStorage, `redeemed_${sessionId}`, "true");
  }, [sessionId]);

  const handleFinish = useCallback(() => {
    safePlay("click");
    setState((s) => ({ ...s, showConfirm: true }));
  }, []);

  const handleCancel = useCallback(() => {
    safePlay("click");
    setState((s) => ({ ...s, showConfirm: false }));
  }, []);

  const handleConfirmFinish = useCallback(() => {
    if (state.submitting) return;
    setState((s) => ({ ...s, submitting: true }));
    safePlay("click");

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
  }, [state.submitting, sessionId, router]);

  return {
    loading,
    redeemed: state.redeemed,
    showConfirm: state.showConfirm,
    submitting: state.submitting,
    prizeName: state.prizeName,
    canFinish: state.redeemed && !state.submitting,
    handleRedeem,
    handleFinish,
    handleCancel,
    handleConfirmFinish
  };
}