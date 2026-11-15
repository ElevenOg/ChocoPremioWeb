import { supabaseServer } from "@/lib/db/supabase-server";
import { apiError, guardRequest, HttpError, json, readBody, requireSessionId } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    guardRequest(req, "session-start", 20);
    const body = await readBody(req);
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug || slug.length > 100 || /[/?#\\]/.test(slug)) throw new HttpError("Comercio inválido.", 400);
    const existingSessionId = body.existingSessionId ? requireSessionId(body.existingSessionId) : null;
    const { data, error } = await supabaseServer.rpc("start_intro_session", { p_slug: slug, p_existing_session_id: existingSessionId });
    if (error) throw new HttpError("Esta experiencia no está disponible por el momento. Intenta de nuevo más tarde.", error.code === "P0001" ? 409 : 503);
    if (!data) throw new HttpError("Comercio no disponible.", 404);
    return json(data);
  } catch (error) { return apiError(error); }
}
