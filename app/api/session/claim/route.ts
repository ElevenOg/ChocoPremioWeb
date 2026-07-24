import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabase-server";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`session-claim:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("game_sessions")
    .update({ claimed_prize: true })
    .eq("id", sessionId)
    .select("prize_title, prize_type")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo reclamar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prize: data });
}
