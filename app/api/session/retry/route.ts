import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabase-server";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`session-retry:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("game_sessions")
    .update({
      prize_id: null,
      prize_type: null,
      prize_title: null,
      won: false,
      game_status: "PENDING",
    })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: "No se pudo reiniciar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
