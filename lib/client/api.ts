export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");

  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal, credentials: "same-origin" });
    const data = await response.json().catch((error: unknown) => {
      if (controller.signal.aborted) throw error;
      return null;
    });
    if (!response.ok) {
      throw new ApiError(typeof data?.error === "string" ? data.error : "No se pudo completar la solicitud. Intenta de nuevo.", response.status);
    }
    if (data === null) throw new ApiError("La respuesta del servidor no es válida.", 502);
    return data as T;
  } catch (error) {
    if (timedOut) throw new ApiError("La solicitud tardó demasiado. Intenta de nuevo.", 408);
    if (error instanceof TypeError) throw new ApiError("No se pudo conectar. Revisa tu conexión e intenta de nuevo.", 0);
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}

export function postJson<T>(url: string, body: unknown, signal?: AbortSignal) {
  return requestJson<T>(url, { method: "POST", body: JSON.stringify(body), signal });
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error. Intenta de nuevo.";
}
