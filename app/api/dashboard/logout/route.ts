import { apiError, guardRequest, json } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    guardRequest(req, "dashboard-logout", 30);
    const response = json({ ok: true });
    response.cookies.set("dashboard_session", "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return response;
  } catch (error) { return apiError(error); }
}
