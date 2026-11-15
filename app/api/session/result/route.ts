import { supabaseServer } from "@/lib/db/supabase-server";
import { getGameSession, sessionCommerce, storedResult } from "@/lib/game/server";
import { apiError, guardRequest, HttpError, json, readBody, requireSessionId } from "@/lib/server/http";

export async function GET(req: Request) {
  try {
    guardRequest(req, "session-result-read", 40);
    const sessionId = requireSessionId(new URL(req.url).searchParams.get("sessionId"));
    const session = await getGameSession(sessionId);
    await sessionCommerce(session, new URL(req.url).searchParams.get("slug"));
    return json(await storedResult(session));
  } catch (error) { return apiError(error); }
}

export async function POST(req: Request) {
  try {
    guardRequest(req, "session-result", 20);
    const body = await readBody(req);
    const sessionId = requireSessionId(body.sessionId);
    if (body.retry === true) throw new HttpError("Este juego ya no admite reintentos.", 409);
    if (typeof body.box !== "number" || !Number.isInteger(body.box) || body.box < 1 || body.box > 4) {
      throw new HttpError("Elige una de las cuatro cajas para continuar.", 400);
    }
    const session = await getGameSession(sessionId);
    const slug = await sessionCommerce(session, typeof body.slug === "string" ? body.slug : null);
    if (session.prize_id) {
      const result = await storedResult(session);
      if (result.selected_box && result.selected_box !== body.box) throw new HttpError("Esta participación ya eligió otra caja.", 409);
      return json(result);
    }
    if (!session.played) throw new HttpError("Primero debes iniciar el juego.", 409);

    const box = body.box;
    const { data, error } = await supabaseServer.rpc("choose_box", {
      p_slug: slug, p_session_id: sessionId, p_box: box,
    });
    if (error || !data?.prize) {
      const current = await getGameSession(sessionId);
      if (current.prize_id) {
        const result = await storedResult(current);
        if (result.selected_box && result.selected_box !== box) throw new HttpError("Esta participación ya eligió otra caja.", 409);
        return json(result);
      }
      throw new HttpError("No se pudo abrir la caja. Comprueba que la campaña tenga al menos un premio con probabilidad mayor que cero e intenta de nuevo.", 409);
    }
    return json(data);
  } catch (error) { return apiError(error); }
}
