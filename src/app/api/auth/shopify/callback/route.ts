// GET /api/auth/shopify/callback?code=...&shop=...&state=...&hmac=...
// Step 2 of OAuth: validates HMAC + state, exchanges code for token, stores encrypted.
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
      `${baseUrl}/auth/login?error=missing_params`
    );
  }

  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=invalid_shop`
    );
  }

  // ── Validate HMAC ─────────────────────────────────────────────────

  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    console.error("SHOPIFY_API_SECRET not configured");
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=config_error`
    );
  }

  if (!validateHmac(query, apiSecret)) {
    console.error("Shopify OAuth HMAC validation failed");
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=invalid_hmac`
    );
  }

  // ── Validate state nonce (CSRF protection) ────────────────────────

  const cookieStore = await cookies();
  const oauthStateCookie = cookieStore.get("shopify_oauth_state");
  if (!oauthStateCookie) {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=expired_state`
    );
  }

  let savedState: { state: string; shop: string; userId: string };
  try {
    savedState = JSON.parse(oauthStateCookie.value);
  } catch {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=invalid_state`
    );
  }

  if (savedState.state !== state || savedState.shop !== shop) {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=state_mismatch`
    );
  }

  // Clear the OAuth state cookie
  cookieStore.delete("shopify_oauth_state");

  const userId = savedState.userId;

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
      `${baseUrl}/auth/login?error=token_exchange_failed`
    );
  }

  // ── Fetch shop info from Shopify ──────────────────────────────────

  let shopName = shop.replace(".myshopify.com", "");
  let currency = "USD";
  let timezone = "UTC";
  let shopifyPlan = "unknown";

  try {
    const data = await shopifyGraphQL(shop, accessToken, `{
      shop {
        name
        currencyCode
        timezoneAbbreviation
        plan { displayName }
      }
    }`) as { shop: { name: string; currencyCode: string; timezoneAbbreviation: string; plan: { displayName: string } } };

    shopName = data.shop.name;
    currency = data.shop.currencyCode;
    timezone = data.shop.timezoneAbbreviation;
    shopifyPlan = data.shop.plan.displayName;
  } catch (error) {
    console.warn("Failed to fetch shop info, using defaults:", error);
  }

  // ── Create or update store + token in DB ──────────────────────────

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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

    // Redirect to onboarding (which triggers the data sync)
    return NextResponse.redirect(
      `${baseUrl}/onboarding?store=${storeId}`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to store Shopify credentials:", error);
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=db_error`
    );
  } finally {
    client.release();
  }
}
