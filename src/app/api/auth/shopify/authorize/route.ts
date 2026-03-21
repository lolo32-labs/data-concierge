// GET /api/auth/shopify/authorize?shop=mystore.myshopify.com
// Step 1 of OAuth: redirects the merchant to Shopify's permission screen.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth-config";
import { buildAuthUrl, isValidShopDomain } from "@/lib/shopify";

export async function GET(request: Request) {
  // Must be logged in
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Store state + shop + userId in a cookie so we can verify on callback
  const cookieStore = await cookies();
  cookieStore.set("shopify_oauth_state", JSON.stringify({
    state,
    shop,
    userId: session.user.id,
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
