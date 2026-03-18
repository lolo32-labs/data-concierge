import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/client-config";
import { cookies } from "next/headers";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;

  const config = await getClientConfig(clientId);
  if (!config) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const body = await request.json();

  // Simple password comparison (V1 — plaintext, upgrade to bcrypt for production)
  if (body.password !== config.password) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(`dc-auth-${clientId}`, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: `/${clientId}`,
  });

  return NextResponse.json({ success: true });
}
