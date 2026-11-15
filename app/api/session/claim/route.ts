import { supabaseServer } from "@/lib/db/supabase-server";
import { apiError, guardRequest, HttpError, json, readBody, requireSessionId } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    guardRequest(req, "session-claim", 15);
    const sessionId = requireSessionId((await readBody(req)).sessionId);
    const { data, error } = await supabaseServer.from("game_sessions")
      .update({ claimed_prize: true }).eq("id", sessionId).eq("won", true)
      .not("prize_id", "is", null).select("prize_title,prize_type").maybeSingle();
    if (error) throw new HttpError("No se pudo solicitar el premio.", 503);
    if (!data) throw new HttpError("Esta participación no tiene un premio para reclamar.", 409);
    return json({ ok: true, prize: data });
  } catch (error) { return apiError(error); }
}
