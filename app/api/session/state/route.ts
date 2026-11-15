import { getGameSession, sessionCommerce } from "@/lib/game/server";
import { apiError, guardRequest, json, requireSessionId } from "@/lib/server/http";

export async function GET(req: Request) {
  try {
    guardRequest(req, "session-state", 40);
    const url = new URL(req.url);
    const session = await getGameSession(requireSessionId(url.searchParams.get("sessionId")));
    await sessionCommerce(session, url.searchParams.get("slug"));
    return json({ played: session.played, has_result: Boolean(session.prize_id) });
  } catch (error) { return apiError(error); }
}
