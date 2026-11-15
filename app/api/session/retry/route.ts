import { apiError, guardRequest, json } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    guardRequest(req, "session-retry", 10);
    return json({ error: "Este juego ya no admite reintentos." }, 410);
  } catch (error) { return apiError(error); }
}
