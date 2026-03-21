// POST /api/shopify/connect-dev — Connect using pre-configured dev store token.
// Only works when SHOPIFY_ACCESS_TOKEN env var is set (dev/testing mode).
// In production, merchants use the OAuth flow instead.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { pool } from "@/lib/pool";
import { encrypt } from "@/lib/crypto";
import { shopifyGraphQL } from "@/lib/shopify";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shopDomain } = (await request.json()) as { shopDomain: string };
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Dev store token not configured. Use OAuth flow instead." },
      { status: 400 }
    );
  }

  if (!shopDomain?.includes(".myshopify.com")) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  try {
    // Fetch shop info to verify the token works
    const data = await shopifyGraphQL(shopDomain, accessToken, `{
      shop { name currencyCode timezoneAbbreviation plan { displayName } }
    }`) as { shop: { name: string; currencyCode: string; timezoneAbbreviation: string; plan: { displayName: string } } };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create or update store
      const storeResult = await client.query(
        `INSERT INTO stores (user_id, shopify_domain, store_name, currency, timezone, shopify_plan, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         ON CONFLICT (shopify_domain) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           store_name = EXCLUDED.store_name,
           sync_status = 'pending',
           updated_at = now()
         RETURNING id`,
        [session.user.id, shopDomain, data.shop.name, data.shop.currencyCode,
         data.shop.timezoneAbbreviation, data.shop.plan.displayName]
      );
      const storeId = storeResult.rows[0].id;

      // Store encrypted token
      const encryptedToken = encrypt(accessToken);
      await client.query(
        `INSERT INTO shopify_tokens (store_id, access_token, scopes)
         VALUES ($1, $2, $3)
         ON CONFLICT (store_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           scopes = EXCLUDED.scopes,
           created_at = now()`,
        [storeId, encryptedToken, "read_orders,read_products,write_orders,write_draft_orders,read_draft_orders"]
      );

      await client.query("COMMIT");

      return NextResponse.json({ success: true, storeId, storeName: data.shop.name });
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Dev store connect failed:", error);
    return NextResponse.json(
      { error: "Failed to connect store. Check the domain and try again." },
      { status: 500 }
    );
  }
}
