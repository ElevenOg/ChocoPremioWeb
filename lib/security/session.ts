import { cookieValue, signPayload, verifyPayload } from "./tokens";

export interface DashboardSessionPayload {
  commerceId: string;
  username: string;
  iat: number;
}

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function createSessionToken(payload: DashboardSessionPayload): Promise<string> {
  return signPayload(payload, process.env.DASHBOARD_SESSION_SECRET || "");
}

export async function verifySessionToken(token: string | undefined | null): Promise<DashboardSessionPayload | null> {
  const payload = await verifyPayload(token, process.env.DASHBOARD_SESSION_SECRET || "");
  if (!payload || typeof payload.commerceId !== "string" || !payload.commerceId || typeof payload.username !== "string" || typeof payload.iat !== "number" || !Number.isFinite(payload.iat)) return null;
  const age = Date.now() - payload.iat;
  if (age < 0 || age > MAX_AGE_MS) return null;
  return { commerceId: payload.commerceId, username: payload.username, iat: payload.iat };
}

export function extractSessionCookie(cookieHeader: string | null): string | undefined {
  return cookieValue(cookieHeader, "dashboard_session");
}
