import { supabaseServer } from "@/lib/db/supabase-server";
import { createSessionToken } from "@/lib/security/session";
import { getDashboardBootstrap } from "@/lib/server/dashboard";
import { apiError, guardRequest, HttpError, json, readBody } from "@/lib/server/http";

export async function POST(req: Request) {
  const startedAt = performance.now();
  try {
    guardRequest(req, "dashboard-login", 5);
    const body = await readBody(req);
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password || username.length > 100 || password.length > 1024) throw new HttpError("Completa los datos de acceso correctamente.", 400);
    const authStartedAt = performance.now();
    const { data, error } = await supabaseServer.rpc("verify_commerce_login", { p_username: username, p_password: password });
    const authMs = performance.now() - authStartedAt;
    if (error) throw new HttpError("No se pudo verificar el acceso. Intenta de nuevo.", 503);
    const login = Array.isArray(data) ? data[0] : data;
    if (!login?.id) throw new HttpError("Usuario o contraseña incorrectos.", 401);
    // The login RPC validates credentials and active status. The bootstrap RPC
    // checks active status again and loads all initial data in one snapshot.
    const bootstrapStartedAt = performance.now();
    const [dashboard, token] = await Promise.all([
      getDashboardBootstrap(String(login.id)),
      createSessionToken({ commerceId: String(login.id), username, iat: Date.now() }),
    ]);
    const bootstrapMs = performance.now() - bootstrapStartedAt;
    const response = json({ commerce: dashboard.commerce, dashboard });
    response.cookies.set("dashboard_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
    response.headers.set("Server-Timing", `auth;dur=${authMs.toFixed(1)}, bootstrap;dur=${bootstrapMs.toFixed(1)}, total;dur=${(performance.now() - startedAt).toFixed(1)}`);
    return response;
  } catch (error) { return apiError(error); }
}
