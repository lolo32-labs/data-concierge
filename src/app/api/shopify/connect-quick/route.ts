// POST /api/shopify/connect-quick — One-step signup: connect Shopify → auto-create account → sign in.
// Eliminates the registration form entirely. Shopify IS the onboarding.
// Uses dev store token when available, returns useOAuth=true for production.
import { NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { encrypt } from "@/lib/crypto";
import { shopifyGraphQL } from "@/lib/shopify";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const { shopDomain } = (await request.json()) as { shopDomain: string };

  if (!shopDomain?.includes(".myshopify.com")) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!accessToken) {
    // No dev token — tell the frontend to use OAuth
    return NextResponse.json({ useOAuth: true });
  }

  try {
    // Verify token + get shop info
    const data = await shopifyGraphQL(shopDomain, accessToken, `{
      shop { name email currencyCode timezoneAbbreviation plan { displayName } }
    }`) as { shop: { name: string; email: string; currencyCode: string; timezoneAbbreviation: string; plan: { displayName: string } } };

    const shopEmail = data.shop.email;
    const shopName = data.shop.name;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if user with this email already exists
      let userId: string;
      let tempPassword: string | null = null;
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [shopEmail]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        // Update password so auto-sign-in works
        tempPassword = randomBytes(16).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        await client.query(
          "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
          [userId, passwordHash]
        );
      } else {
        // Auto-create user account from Shopify store email
        tempPassword = randomBytes(16).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const newUser = await client.query(
          `INSERT INTO users (email, name, password_hash)
           VALUES ($1, $2, $3) RETURNING id`,
          [shopEmail, shopName, passwordHash]
        );
        userId = newUser.rows[0].id;
      }

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
        [userId, shopDomain, shopName, data.shop.currencyCode,
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
        [storeId, encryptedToken, "read_orders,read_products"]
      );

      await client.query("COMMIT");

      // Create a session cookie by signing in programmatically
      // We return success + the email so the frontend can auto-sign-in
      return NextResponse.json({
        success: true,
        storeId,
        storeName: shopName,
        email: shopEmail,
        tempPassword,
      });
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Quick connect failed:", error);
    return NextResponse.json(
      { error: "Could not connect to that store. Check the URL and try again." },
      { status: 500 }
    );
  }
}
