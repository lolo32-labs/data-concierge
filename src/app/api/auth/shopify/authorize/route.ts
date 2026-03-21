// GET /api/auth/shopify/authorize?shop=mystore.myshopify.com
// Step 1 of OAuth: redirects the merchant to Shopify's permission screen.
// Supports both authenticated (existing user) and unauthenticated (new install) flows.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth-config";
import { buildAuthUrl, isValidShopDomain } from "@/lib/shopify";

export async function GET(request: Request) {
  // Session is optional — unauthenticated users can start OAuth (Shopify-first onboarding)
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.json(
      { error: "Invalid shop domain. Must be yourstore.myshopify.com" },
      { status: 400 }
    );
  }

  // Generate a random state nonce to prevent CSRF
  const state = randomBytes(16).toString("hex");

  // Store state + shop + userId (nullable) + isNewInstall flag in a cookie
  const cookieStore = await cookies();
  cookieStore.set("shopify_oauth_state", JSON.stringify({
    state,
    shop,
    userId,
    isNewInstall: !userId,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authUrl = buildAuthUrl(shop, state);
  return NextResponse.redirect(authUrl);
}
