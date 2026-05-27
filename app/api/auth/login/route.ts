import { NextRequest, NextResponse } from "next/server";
import { type AdminUser } from "@/lib/products";
import { createSessionToken } from "@/lib/sessionToken";

const cookieName = "tempo_admin_session";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url: url.replace(/\/$/, ""), serviceKey };
}

async function loadUsers() {
  const envLogin = process.env.ADMIN_LOGIN;
  const envPassword = process.env.ADMIN_PASSWORD;
  const envUsers = envLogin && envPassword ? [{ login: envLogin, password: envPassword, role: "admin" as const }] : [];
  const config = getSupabaseConfig();
  if (!config) return envUsers;

  try {
    const siteId = process.env.SUPABASE_SITE_ID || "tempo-cmolas";
    const response = await fetch(`${config.url}/rest/v1/tempo_cms_documents?site_id=eq.${encodeURIComponent(siteId)}&key=eq.users&select=data`, {
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`
      },
      cache: "no-store"
    });
    const rows = await response.json();
    const users = Array.isArray(rows?.[0]?.data) ? rows[0].data as AdminUser[] : [];
    return users.length ? users : envUsers;
  } catch {
    return envUsers;
  }
}

export async function POST(request: NextRequest) {
  const { login, password } = await request.json();
  const users = await loadUsers();
  const user = users.find((item) => item.login === String(login ?? "").trim() && item.password === String(password ?? ""));
  if (!user) {
    return NextResponse.json({ error: "Niepoprawny login lub hasło." }, { status: 401 });
  }

  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "tempo-cmolas-dev-secret";
  const token = await createSessionToken(user.login, user.role, secret, Number(process.env.ADMIN_SESSION_TTL_SECONDS ?? 7200));
  const response = NextResponse.json({ ok: true, user: { login: user.login, role: user.role } });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number(process.env.ADMIN_SESSION_TTL_SECONDS ?? 7200)
  });
  return response;
}
