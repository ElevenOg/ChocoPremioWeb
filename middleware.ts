import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, extractSessionCookie } from "@/lib/security/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/dashboard/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const token = extractSessionCookie(req.headers.get("cookie"));
    const session = await verifySessionToken(token);

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
