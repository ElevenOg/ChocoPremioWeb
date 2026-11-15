import { postJson, requestJson } from "./api";
import type { IntroSession, ResultData } from "../game/types";

const pending = new Map<string, Promise<unknown>>();
const results = new Map<string, ResultData>();
const resultKey = (slug: string, sessionId: string) => slug + ":" + sessionId;

export function cachedGameResult(slug: string, sessionId: string | null) {
  return sessionId ? results.get(resultKey(slug, sessionId)) ?? null : null;
}

function remember(slug: string, sessionId: string, result: ResultData) {
  if (results.size >= 20) results.delete(results.keys().next().value!);
  results.set(resultKey(slug, sessionId), result);
  return result;
}

export function forgetGameResult(slug: string, sessionId: string) {
  results.delete(resultKey(slug, sessionId));
}

function singleRequest<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const request = run().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function startGameSession(slug: string, existingSessionId: string | null) {
  return singleRequest("intro:" + slug + ":" + existingSessionId, () =>
    postJson<IntroSession>("/api/session/start", { slug, existingSessionId })
  );
}

export function loadGameResult(slug: string, sessionId: string) {
  return singleRequest("result:" + resultKey(slug, sessionId), () =>
    requestJson<ResultData>("/api/session/result?sessionId=" + encodeURIComponent(sessionId) + "&slug=" + encodeURIComponent(slug))
      .then((result) => remember(slug, sessionId, result))
  );
}

export function chooseGameBox(slug: string, sessionId: string, box: number) {
  return singleRequest("choose:" + resultKey(slug, sessionId), () =>
    postJson<ResultData>("/api/session/result", { sessionId, slug, box })
      .then((result) => remember(slug, sessionId, result))
  );
}
