import { type AdminRole, type AdminSession } from "@/lib/products";

const encoder = new TextEncoder();

export type SignedAdminSession = AdminSession & {
  exp: number;
};

export async function createSessionToken(login: string, role: AdminRole, secret: string, ttlSeconds = 60 * 60 * 2) {
  const session: SignedAdminSession = {
    login,
    role,
    createdAt: new Date().toISOString(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined, secret: string) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = await sign(payload, secret);
  if (signature !== expected) return null;
  const session = JSON.parse(base64UrlDecode(payload)) as SignedAdminSession;
  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
  return session;
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value: string) {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return decodeURIComponent(binary.split("").map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
}
