import { supabaseServer } from "@/lib/db/supabase-server";
import { apiError, guardRequest, HttpError, json, readBody, requireSessionId } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    guardRequest(req, "session-play", 30);
    const sessionId = requireSessionId((await readBody(req)).sessionId);
    const { data, error } = await supabaseServer.from("game_sessions").update({ played: true })
      .eq("id", sessionId).select("id").maybeSingle();
    if (error) throw new HttpError("No se pudo registrar la participación.", 503);
    if (!data) throw new HttpError("Sesión no encontrada.", 404);
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
