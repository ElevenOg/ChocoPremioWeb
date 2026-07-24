import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabase-server";
import { createSessionToken } from "@/lib/security/session";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // 5 intentos por minuto por IP: frena fuerza bruta al login.
  if (!rateLimit(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en un minuto." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password.trim() : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Completa todos los campos" }, { status: 400 });
  }

  // La contraseña nunca se compara en texto plano en el cliente ni en
  // JS: la función SQL verify_commerce_login usa crypt() de pgcrypto
  // para comparar el hash almacenado, dentro de la propia base de datos.
  const { data, error } = await supabaseServer.rpc("verify_commerce_login", {
    p_username: username,
    p_password: password,
  });

  const commerce = data?.[0];

  if (error || !commerce) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await createSessionToken({
    commerceId: commerce.id,
    username,
    iat: Date.now(),
  });

  const res = NextResponse.json({ commerce });

  res.cookies.set("dashboard_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 horas
  });

  return res;
}
