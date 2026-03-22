// src/middleware.ts — Protect authenticated routes, redirect to login if no session.
// Uses cookie check instead of auth() since middleware runs in Edge Runtime
// where Node.js APIs (pg, bcrypt) are unavailable.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Redirect common URL variants to actual auth routes
  if (pathname === "/sign-in" || pathname === "/signin" || pathname === "/login") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (pathname === "/sign-up" || pathname === "/signup" || pathname === "/register") {
    return NextResponse.redirect(new URL("/auth/register", request.url));
  }

  // Allow /onboarding when coming from OAuth (has auto-signin cookie)
  if (pathname.startsWith("/onboarding") &&
      (searchParams.get("newInstall") === "1" || request.cookies.get("ps_auto_signin"))) {
    return NextResponse.next();
  }

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
  matcher: ["/dashboard/:path*", "/chat/:path*", "/settings/:path*", "/onboarding/:path*", "/sign-in", "/signin", "/login", "/sign-up", "/signup", "/register"],
};
