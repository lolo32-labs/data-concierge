// GET /api/auth/shopify/callback?code=...&shop=...&state=...&hmac=...
// Step 2 of OAuth: validates HMAC + state, exchanges code for token, stores encrypted.
// Supports two flows:
//   1. Authenticated user → connect store to existing account (original behavior)
//   2. Unauthenticated user (new install) → auto-create account, set auto-signin cookie, redirect to onboarding
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/pool";
import { encrypt } from "@/lib/crypto";
import {
  validateHmac,
  exchangeCodeForToken,
  isValidShopDomain,
  shopifyGraphQL,
} from "@/lib/shopify";
import { registerWebhooks } from "@/lib/shopify-webhooks";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";

  // Extract all query params
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const { code, shop, state } = query;

  // ── Validate inputs ───────────────────────────────────────────────

  if (!code || !shop || !state) {
    return NextResponse.redirect(
      `${baseUrl}/connect?error=missing_params`
    );
  }

  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(
      `${baseUrl}/connect?error=invalid_shop`
    );
  }

  // ── Validate HMAC ─────────────────────────────────────────────────

  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    console.error("SHOPIFY_API_SECRET not configured");
    return NextResponse.redirect(
      `${baseUrl}/connect?error=config_error`
    );
  }

  if (!validateHmac(query, apiSecret)) {
    console.error("Shopify OAuth HMAC validation failed");
    return NextResponse.redirect(
      `${baseUrl}/connect?error=invalid_hmac`
    );
  }

  // ── Validate state nonce (CSRF protection) ────────────────────────

  const cookieStore = await cookies();
  const oauthStateCookie = cookieStore.get("shopify_oauth_state");
  if (!oauthStateCookie) {
    return NextResponse.redirect(
      `${baseUrl}/connect?error=expired_state`
    );
  }

  let savedState: { state: string; shop: string; userId: string | null; isNewInstall?: boolean };
  try {
    savedState = JSON.parse(oauthStateCookie.value);
  } catch {
    return NextResponse.redirect(
      `${baseUrl}/connect?error=invalid_state`
    );
  }

  if (savedState.state !== state || savedState.shop !== shop) {
    return NextResponse.redirect(
      `${baseUrl}/connect?error=state_mismatch`
    );
  }

  // Clear the OAuth state cookie
  cookieStore.delete("shopify_oauth_state");

  const isNewInstall = savedState.isNewInstall ?? !savedState.userId;

  // ── Exchange code for access token ────────────────────────────────

  let accessToken: string;
  let scopes: string;
  try {
    const tokenResponse = await exchangeCodeForToken(shop, code);
    accessToken = tokenResponse.access_token;
    scopes = tokenResponse.scope;
  } catch (error) {
    console.error("Token exchange failed:", error);
    return NextResponse.redirect(
      `${baseUrl}/connect?error=token_exchange_failed`
    );
  }

  // ── Fetch shop info from Shopify ──────────────────────────────────

  let shopName = shop.replace(".myshopify.com", "");
  let shopEmail = "";
  let currency = "USD";
  let timezone = "UTC";
  let shopifyPlan = "unknown";

  try {
    const data = await shopifyGraphQL(shop, accessToken, `{
      shop {
        name
        email
        currencyCode
        timezoneAbbreviation
        plan { displayName }
      }
    }`) as { shop: { name: string; email: string; currencyCode: string; timezoneAbbreviation: string; plan: { displayName: string } } };

    shopName = data.shop.name;
    shopEmail = data.shop.email;
    currency = data.shop.currencyCode;
    timezone = data.shop.timezoneAbbreviation;
    shopifyPlan = data.shop.plan.displayName;
  } catch (error) {
    console.warn("Failed to fetch shop info, using defaults:", error);
  }

  // ── Resolve userId: use existing or auto-create ───────────────────

  let userId = savedState.userId;
  let tempPassword: string | null = null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify userId still exists (could be stale from a DB wipe or old cookie)
    if (userId) {
      const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [userId]);
      if (userCheck.rows.length === 0) {
        console.log("CALLBACK: stale userId", userId, "- treating as new install");
        userId = null;
      }
    }

    if (!userId) {
      // Auto-create (or find) a user account using the Shopify store email
      if (!shopEmail) {
        // Fallback: use shop domain as email
        shopEmail = `${shop.replace(".myshopify.com", "")}@shopify-user.profitsight.app`;
      }

      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [shopEmail]
      );

      tempPassword = randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        // Update password so auto-sign-in works
        await client.query(
          "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
          [userId, passwordHash]
        );
      } else {
        // Create new user from Shopify store info
        const newUser = await client.query(
          `INSERT INTO users (email, name, password_hash)
           VALUES ($1, $2, $3) RETURNING id`,
          [shopEmail, shopName, passwordHash]
        );
        userId = newUser.rows[0].id;
        console.log("CALLBACK DEBUG: Created new user:", userId);
      }
    }
    console.log("CALLBACK DEBUG: Final userId before store insert:", userId);

    // ── Create or update store + token in DB ──────────────────────────

    // Upsert the store record
    const storeResult = await client.query(
      `INSERT INTO stores (user_id, shopify_domain, store_name, currency, timezone, shopify_plan, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       ON CONFLICT (shopify_domain) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         store_name = EXCLUDED.store_name,
         currency = EXCLUDED.currency,
         timezone = EXCLUDED.timezone,
         shopify_plan = EXCLUDED.shopify_plan,
         sync_status = 'pending',
         updated_at = now()
       RETURNING id`,
      [userId, shop, shopName, currency, timezone, shopifyPlan]
    );
    const storeId = storeResult.rows[0].id;

    // Encrypt and store the access token
    const encryptedToken = encrypt(accessToken);
    await client.query(
      `INSERT INTO shopify_tokens (store_id, access_token, scopes)
       VALUES ($1, $2, $3)
       ON CONFLICT (store_id) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         scopes = EXCLUDED.scopes,
         created_at = now()`,
      [storeId, encryptedToken, scopes]
    );

    await client.query("COMMIT");

    // Register webhooks (fire-and-forget — don't block redirect)
    registerWebhooks(storeId).catch((err) =>
      console.error("Webhook registration failed:", err)
    );

    // ── Redirect ────────────────────────────────────────────────────

    if (tempPassword && shopEmail) {
      // Set auto-signin cookie so the redirect page can sign in the new user
      const response = NextResponse.redirect(
        `${baseUrl}/onboarding?store=${storeId}&newInstall=1`
      );
      response.cookies.set("ps_auto_signin", JSON.stringify({
        email: shopEmail,
        tempPassword,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 120, // 2 minutes — just enough for the redirect + sign-in
        path: "/",
      });
      return response;
    }

    // Existing user — redirect straight to onboarding
    return NextResponse.redirect(
      `${baseUrl}/onboarding?store=${storeId}`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to store Shopify credentials:", errMsg, error);
    return NextResponse.redirect(
      `${baseUrl}/connect?error=db_error&detail=${encodeURIComponent(errMsg.slice(0, 100))}`
    );
  } finally {
    client.release();
  }
}
