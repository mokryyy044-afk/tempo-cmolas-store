import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionToken";

const cookieName = "tempo_admin_session";

export async function GET(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "tempo-cmolas-dev-secret";
  const session = await verifySessionToken(request.cookies.get(cookieName)?.value, secret);
  if (!session) return NextResponse.json({ error: "Brak aktywnej sesji." }, { status: 401 });
  return NextResponse.json({ login: session.login, role: session.role, createdAt: session.createdAt });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
