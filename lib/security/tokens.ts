const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0));
}

function key(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signPayload(payload: object, secret: string): Promise<string> {
  if (!secret) throw new Error("No se ha configurado el secreto de sesión.");
  const body = encode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(body));
  return body + "." + encode(new Uint8Array(signature));
}

export async function verifyPayload(token: string | undefined | null, secret: string): Promise<Record<string, unknown> | null> {
  if (!token || !secret || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const [body, signature] = parts;
    const valid = await crypto.subtle.verify("HMAC", await key(secret), decode(signature), encoder.encode(body));
    if (!valid) return null;
    const value: unknown = JSON.parse(decoder.decode(decode(body)));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function cookieValue(header: string | null, name: string): string | undefined {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="))?.slice(name.length + 1);
}
