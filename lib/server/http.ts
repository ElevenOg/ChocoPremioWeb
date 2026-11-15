import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "../security/rateLimit";

export class HttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error("No se pudo completar la operación del servidor.");
  return json({ error: "No se pudo completar la operación. Intenta de nuevo." }, 500);
}

export function guardRequest(req: Request, operation: string, limit: number) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) throw new HttpError("Origen no permitido.", 403);
  if (!rateLimit(operation + ":" + getClientIp(req), limit, 60000)) throw new HttpError("Demasiadas solicitudes. Intenta de nuevo en un minuto.", 429);
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 16384) throw new HttpError("Solicitud demasiado grande.", 413);
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError("Solicitud inválida.", 400);
  }
}

export function requireSessionId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError("Sesión inválida.", 400);
  }
  return value;
}
