import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabase-server";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!rateLimit(`session-start:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const slug = typeof body?.slug === "string"
    ? body.slug.trim()
    : "";

  const existingSessionId =
    typeof body?.existingSessionId === "string"
      ? body.existingSessionId
      : null;

  if (!slug) {
    return NextResponse.json(
      { error: "Slug inválido" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer.rpc(
    "start_intro_session",
    {
      p_slug: slug,
      p_existing_session_id: existingSessionId,
    }
  );

  if (error || !data) {
    console.error(error);

    return NextResponse.json(
      { error: "Comercio no disponible" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}