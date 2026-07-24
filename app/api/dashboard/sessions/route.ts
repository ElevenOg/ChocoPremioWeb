import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabase-server";
import { verifySessionToken, extractSessionCookie } from "@/lib/security/session";

export async function GET(req: Request) {
  const token = extractSessionCookie(req.headers.get("cookie"));
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });
  }

  // Verifica que la campaña sea del comercio autenticado antes de
  // exponer nada. Evita que un comercio vea datos de otro cambiando
  // el campaignId en la URL.
  const { data: campaign } = await supabaseServer
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("commerce_id", session.commerceId)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  const pageSize = 1000;
  let from = 0;
  let all: Record<string, unknown>[] = [];

  while (true) {
    const { data, error } = await supabaseServer
      .from("game_sessions")
      .select("*")
      .eq("commerce_id", session.commerceId)
      .eq("campaign_id", campaignId)
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return NextResponse.json({ sessions: all });
}
