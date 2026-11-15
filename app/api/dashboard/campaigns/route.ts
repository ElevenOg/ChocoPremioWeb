import { supabaseServer } from "@/lib/db/supabase-server";
import { requireCommerce } from "@/lib/server/dashboard";
import { apiError, HttpError, json } from "@/lib/server/http";

export async function GET(req: Request) {
  try {
    const commerce = await requireCommerce(req);
    const { data, error } = await supabaseServer.from("campaigns")
      .select("id,name,active,created_at").eq("commerce_id", commerce.id).order("created_at", { ascending: false });
    if (error) throw new HttpError("No se pudieron consultar las campañas.", 503);
    return json({ commerce, campaigns: data || [] });
  } catch (error) { return apiError(error); }
}
