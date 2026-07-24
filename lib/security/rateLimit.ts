// Rate limit simple en memoria. Suficiente para frenar bots/abusos
// básicos (login, play, claim). Limitación: en Vercel/serverless cada
// instancia tiene su propia memoria, así que el límite real puede ser
// N veces el configurado según cuántas instancias haya. Si más adelante
// necesitas un límite exacto y global, cambia esto por Upstash Redis
// (@upstash/ratelimit), la interfaz de abajo se mantendría igual.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
