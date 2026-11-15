import { supabaseServer } from "@/lib/db/supabase-server";
import { requireCommerce } from "@/lib/server/dashboard";
import type { SessionStatsRow } from "@/lib/dashboard/types";
import { apiError, HttpError, json, requireSessionId } from "@/lib/server/http";

export async function GET(req: Request) {
  try {
    const commerce = await requireCommerce(req);
    const url = new URL(req.url);
    const campaignId = requireSessionId(url.searchParams.get("campaignId"));
    const { data: campaign, error: campaignError } = await supabaseServer.from("campaigns").select("id")
      .eq("id", campaignId).eq("commerce_id", commerce.id).maybeSingle();
    if (campaignError) throw new HttpError("No se pudo consultar la campaña.", 503);
    if (!campaign) throw new HttpError("Campaña no encontrada.", 404);

    if (url.searchParams.get("summary") === "1") {
      const { data, error } = await supabaseServer.rpc("get_dashboard_game_stats", { p_commerce_id:commerce.id, p_campaign_id:campaignId });
      if (error || !data) throw new HttpError("No se pudieron consultar las estadísticas.", 503);
      return json(data);
    }

    const sessions: SessionStatsRow[] = [];
    const pageSize = 1000;
    const snapshot = new Date().toISOString();
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseServer.from("game_sessions")
        .select("scanned_qr,clicked_social,played,claimed_prize,prize_title,prize_type,game_status")
        .eq("commerce_id", commerce.id).eq("campaign_id", campaignId).lte("created_at", snapshot)
        .order("created_at", { ascending: true }).order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw new HttpError("No se pudieron consultar las estadísticas.", 503);
      sessions.push(...(data as SessionStatsRow[] || []));
      if (!data || data.length < pageSize) break;
    }
    return json({ sessions });
  } catch (error) { return apiError(error); }
}
