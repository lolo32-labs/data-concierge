// src/middleware.ts — Protect authenticated routes, redirect to login if no session.
// Uses cookie check instead of auth() since middleware runs in Edge Runtime
// where Node.js APIs (pg, bcrypt) are unavailable.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Auth.js session token cookie
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/settings/:path*", "/onboarding/:path*"],
};
