import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/sessionToken";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "tempo-cmolas-dev-secret";
  const session = await verifySessionToken(request.cookies.get("tempo_admin_session")?.value, secret);
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};
