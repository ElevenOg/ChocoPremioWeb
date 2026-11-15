import "server-only";
import { supabaseServer } from "../db/supabase-server";
import { extractSessionCookie, verifySessionToken } from "../security/session";
import { HttpError } from "./http";
import { emptyDashboardStats, type DashboardBootstrap } from "../dashboard/types";

export async function getDashboardBootstrap(commerceId: string): Promise<DashboardBootstrap> {
  const { data, error } = await supabaseServer.rpc("get_dashboard_bootstrap", { p_commerce_id: commerceId });
  if (error) throw new HttpError("No se pudieron consultar las estadísticas.", 503);
  if (!data) throw new HttpError("Comercio no autorizado.", 401);
  if (data.campaignId && !data.stats) throw new HttpError("No se pudieron consultar las estadísticas.", 503);
  return { ...data, stats: data.stats ?? emptyDashboardStats(), updatedAt: new Date().toISOString() };
}

export async function requireCommerce(req: Request) {
  const session = await verifySessionToken(extractSessionCookie(req.headers.get("cookie")));
  if (!session) throw new HttpError("No autorizado.", 401);
  const { data, error } = await supabaseServer.from("commerces").select("id,name")
    .eq("id", session.commerceId).eq("active", true).maybeSingle();
  if (error) throw new HttpError("No se pudo comprobar la sesión.", 503);
  if (!data) throw new HttpError("Comercio no autorizado.", 401);
  return { id: String(data.id), name: String(data.name) };
}
