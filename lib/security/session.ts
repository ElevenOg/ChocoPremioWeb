// Cookie de sesión firmada con HMAC-SHA256 usando Web Crypto,
// compatible con el runtime Edge (middleware) y con Node (API routes).
// No requiere librerías externas ni Buffer.

export interface DashboardSessionPayload {
  commerceId: string;
  username: string;
  iat: number;
}

const SECRET = process.env.DASHBOARD_SESSION_SECRET;
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 horas

const encoder = new TextEncoder();

function toBase64Url(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(
  payload: DashboardSessionPayload
): Promise<string> {
  if (!SECRET) throw new Error("Falta DASHBOARD_SESSION_SECRET en las variables de entorno.");

  const body = toBase64Url(JSON.stringify(payload));
  const key = await getKey(SECRET);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));

  return `${body}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<DashboardSessionPayload | null> {
  if (!token || !SECRET) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const key = await getKey(SECRET);
  const expectedSigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSig = toBase64Url(expectedSigBuf);

  if (expectedSig !== sig) return null;

  try {
    const payload = JSON.parse(fromBase64Url(body)) as DashboardSessionPayload;
    if (Date.now() - payload.iat > MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractSessionCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  return cookieHeader.match(/dashboard_session=([^;]+)/)?.[1];
}
