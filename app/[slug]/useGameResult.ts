"use client";

import { useEffect, useState } from "react";
import { cachedGameResult, loadGameResult } from "@/lib/client/gameApi";
import { errorMessage } from "@/lib/client/api";
import type { ResultData } from "@/lib/game/types";

export function useGameResult(slug: string, sessionId: string | null) {
  const key = slug + ":" + sessionId;
  const [state, setState] = useState<{ key: string; result: ResultData | null; error: string }>(() => ({ key, result: cachedGameResult(slug, sessionId), error: "" }));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const cached = cachedGameResult(slug, sessionId);
    const request = cached ? Promise.resolve(cached) : loadGameResult(slug, sessionId);
    request.then((result) => { if (active) setState({ key, result, error: "" }); })
      .catch((cause) => { if (active) setState({ key, result: null, error: errorMessage(cause) }); });
    return () => { active = false; };
  }, [slug, sessionId, key, attempt]);
  const current = state.key === key ? state : { result: null, error: "" };
  return {
    result: current.result,
    error: !sessionId ? "Falta la sesión de juego." : current.error,
    loading: Boolean(sessionId) && !current.result && !current.error,
    retry: () => { setState({ key, result: null, error: "" }); setAttempt((value) => value + 1); },
  };
}
