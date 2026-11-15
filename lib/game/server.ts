import "server-only";
import { supabaseServer } from "../db/supabase-server";
import { HttpError } from "../server/http";
import type { Prize, ResultData } from "./types";

export interface GameSessionRecord {
  id: string;
  commerce_id: string;
  campaign_id: string;
  prize_id: string | null;
  prize_type: string | null;
  game_status: string;
  won: boolean;
  played: boolean;
  claimed_prize: boolean;
}

export async function getGameSession(sessionId: string): Promise<GameSessionRecord> {
  const { data, error } = await supabaseServer.from("game_sessions")
    .select("id,commerce_id,campaign_id,prize_id,prize_type,game_status,won,played,claimed_prize")
    .eq("id", sessionId).single();
  if (error || !data) throw new HttpError("Sesión no disponible.", error?.code === "PGRST116" ? 404 : 503);
  return data as GameSessionRecord;
}

export async function sessionCommerce(session: GameSessionRecord, slug?: string | null) {
  const { data, error } = await supabaseServer.from("commerces").select("slug")
    .eq("id", session.commerce_id).maybeSingle();
  if (error || !data) throw new HttpError("Comercio no disponible.", 503);
  if (slug && data.slug !== slug) throw new HttpError("Participación no disponible para este comercio.", 404);
  return data.slug as string;
}

export async function storedResult(session: GameSessionRecord): Promise<ResultData> {
  if (!session.prize_id) throw new HttpError("Esta participación todavía no tiene resultado.", 409);
  const { data, error } = await supabaseServer.rpc("get_session_result", { p_session_id: session.id });
  if (error || !data?.prize || data.prize.id !== session.prize_id || data.prize.campaign_id !== session.campaign_id) {
    throw new HttpError("No se pudo recuperar el premio.", 503);
  }
  return { won: session.won, prize: data.prize as Prize, selected_box: data.selected_box ?? null };
}
