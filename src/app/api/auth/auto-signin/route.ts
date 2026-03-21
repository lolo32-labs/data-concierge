// POST /api/auth/auto-signin — Consumes the ps_auto_signin cookie set by the OAuth callback.
// Returns the temp credentials so the client can call signIn() to establish a session.
// The cookie is deleted after reading to prevent replay.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const autoSigninCookie = cookieStore.get("ps_auto_signin");

  if (!autoSigninCookie) {
    return NextResponse.json({ error: "No auto-signin data" }, { status: 404 });
  }

  // Delete cookie immediately — single use
  cookieStore.delete("ps_auto_signin");

  try {
    const { email, tempPassword } = JSON.parse(autoSigninCookie.value);
    return NextResponse.json({ email, tempPassword });
  } catch {
    return NextResponse.json({ error: "Invalid auto-signin data" }, { status: 400 });
  }
}
