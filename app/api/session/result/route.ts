import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabase-server";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";
import { Prize, pickPrize, getFirstPool, getRetryPool } from "@/lib/game/prizes";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`session-result:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const retry = Boolean(body?.retry);

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseServer
    .from("game_sessions")
    .select("id, campaign_id, prize_id, won")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  // Si ya tiene premio asignado (refresh de página, doble click, etc.),
  // se devuelve el mismo en vez de sortear de nuevo.
  if (session.prize_id) {
    const { data: existingPrize } = await supabaseServer
      .from("prizes")
      .select("*")
      .eq("id", session.prize_id)
      .single();

    if (existingPrize) {
      return NextResponse.json({ won: session.won, prize: existingPrize });
    }
  }

  const { data: prizes, error: prizesError } = await supabaseServer
    .from("prizes")
    .select("*")
    .eq("campaign_id", session.campaign_id);

  if (prizesError || !prizes || prizes.length === 0) {
    return NextResponse.json({ error: "Sin premios configurados" }, { status: 500 });
  }

  const pool = retry ? getRetryPool(prizes as Prize[]) : getFirstPool(prizes as Prize[]);

  if (pool.length === 0) {
    return NextResponse.json({ error: "Sin premios disponibles" }, { status: 500 });
  }

  const selected = pickPrize(pool);
  const won = selected.type !== "lose" && selected.type !== "retry";

  const { error: updateError } = await supabaseServer
    .from("game_sessions")
    .update({
      won,
      prize_id: selected.id,
      prize_type: selected.type,
      prize_title: selected.title,
      game_status: selected.type === "lose" ? "LOSE" : selected.type === "retry" ? "RETRY" : "WIN",
    })
    .eq("id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo guardar el resultado" }, { status: 500 });
  }

  return NextResponse.json({ won, prize: selected });
}
