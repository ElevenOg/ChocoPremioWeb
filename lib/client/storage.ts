type Store = "session" | "local";

function storage(store: Store): Storage | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    return store === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readStorage(key: string, store: Store = "session"): string | null {
  try {
    return storage(store)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string, store: Store = "session") {
  try {
    storage(store)?.setItem(key, value);
  } catch {
    // La participación sigue funcionando sin almacenamiento del navegador.
  }
}

export function removeStorage(key: string, store: Store = "session") {
  try {
    storage(store)?.removeItem(key);
  } catch {
    // El almacenamiento puede estar bloqueado por el navegador.
  }
}

export const gameStorage = {
  session: (slug: string) => `game:${slug}:session`,
  accepted: (slug: string) => `game:${slug}:accepted`,
  social: (slug: string) => `game:${slug}:social`,
  effects: (sessionId: string) => `game:${sessionId}:effects`,
  shown: (sessionId: string) => `game:${sessionId}:shown`,
};

export function clearGameStorage(slug: string, sessionId: string) {
  [gameStorage.session(slug), gameStorage.effects(sessionId), gameStorage.shown(sessionId)].forEach((key) => removeStorage(key));
  removeStorage(`prize_${sessionId}`, "local");
}
