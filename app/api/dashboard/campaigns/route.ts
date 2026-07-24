import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabase-server";
import { verifySessionToken, extractSessionCookie } from "@/lib/security/session";

export async function GET(req: Request) {
  try {
    const token = extractSessionCookie(req.headers.get("cookie"));
    console.log("TOKEN:", token);

    const session = await verifySessionToken(token);
    console.log("SESSION:", session);

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener el comercio
    const { data: commerce, error: commerceError } = await supabaseServer
      .from("commerces")
      .select("id, name")
      .eq("id", session.commerceId)
      .single();

    if (commerceError) {
      return NextResponse.json(
        { error: commerceError.message },
        { status: 500 }
      );
    }

    // Obtener las campañas
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from("campaigns")
      .select("*")
      .eq("commerce_id", session.commerceId);

    console.log("COMMERCE:", commerce);
    console.log("CAMPAIGNS:", campaigns);

    if (campaignsError) {
      return NextResponse.json(
        { error: campaignsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      commerce,
      campaigns: campaigns ?? [],
    });
  } catch (err) {
    console.error("ROUTE ERROR:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}