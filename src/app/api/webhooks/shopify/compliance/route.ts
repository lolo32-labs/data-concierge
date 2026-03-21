// POST /api/webhooks/shopify/compliance — Shopify mandatory compliance webhooks.
// Handles: customers/data_request, customers/redact, shop/redact
// These are REQUIRED for all Shopify apps, including unlisted ones.
import { NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { validateWebhookHmac } from "@/lib/shopify";

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  if (!hmac || !validateWebhookHmac(body, hmac, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`Compliance webhook: ${topic} from ${shopDomain}`, {
    shop_id: payload.shop_id,
    shop_domain: payload.shop_domain,
  });

  try {
    switch (topic) {
      case "customers/data_request": {
        // Merchant requests customer data. Log and respond with what we store.
        // ProfitSight stores: customer_email, customer_name on orders.
        // We don't store detailed customer profiles.
        console.log("Customer data request:", {
          shop: shopDomain,
          customer: payload.customer,
          orders_requested: payload.orders_requested,
        });
        break;
      }

      case "customers/redact": {
        // Delete customer data for a specific customer.
        const shopResult = await pool.query(
          "SELECT id FROM stores WHERE shopify_domain = $1",
          [shopDomain]
        );
        if (shopResult.rows.length > 0) {
          const storeId = shopResult.rows[0].id;
          const customer = payload.customer as { email?: string } | undefined;
          if (customer?.email) {
            await pool.query(
              `UPDATE shopify_orders
               SET customer_email = NULL, customer_name = NULL
               WHERE store_id = $1 AND customer_email = $2`,
              [storeId, customer.email]
            );
            console.log(`Redacted customer data for ${customer.email} in store ${storeId}`);
          }
        }
        break;
      }

      case "shop/redact": {
        // Delete ALL data for a shop. Called 48 hours after app uninstall.
        const shopResult = await pool.query(
          "SELECT id FROM stores WHERE shopify_domain = $1",
          [shopDomain]
        );
        if (shopResult.rows.length > 0) {
          const storeId = shopResult.rows[0].id;
          // CASCADE deletes handle all child tables
          await pool.query("DELETE FROM stores WHERE id = $1", [storeId]);
          console.log(`Redacted all data for store ${storeId} (${shopDomain})`);
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Compliance webhook error [${topic}]:`, error);
  }

  // Always return 200 — Shopify requires it
  return NextResponse.json({ ok: true });
}
