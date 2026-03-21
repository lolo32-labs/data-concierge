// src/lib/shopify-webhooks.ts — Register and handle Shopify webhooks.
// Registers 7 webhooks after OAuth; single handler routes by topic.
import { pool } from "./pool";
import { decrypt } from "./crypto";
import { shopifyGraphQL } from "./shopify";

const WEBHOOK_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_CANCELLED",
  "REFUNDS_CREATE",
  "PRODUCTS_CREATE",
  "PRODUCTS_UPDATE",
  "APP_UNINSTALLED",
] as const;

type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];

// ── Registration ────────────────────────────────────────────────────

/**
 * Register all required webhooks for a store after OAuth completes.
 * Uses GraphQL webhookSubscriptionCreate mutation.
 * Idempotent — Shopify deduplicates by topic + callbackUrl.
 */
export async function registerWebhooks(storeId: string): Promise<void> {
  const storeResult = await pool.query(
    "SELECT shopify_domain FROM stores WHERE id = $1",
    [storeId]
  );
  if (storeResult.rows.length === 0) throw new Error("Store not found");

  const tokenResult = await pool.query(
    "SELECT access_token FROM shopify_tokens WHERE store_id = $1",
    [storeId]
  );
  if (tokenResult.rows.length === 0) throw new Error("No Shopify token");

  const shop = storeResult.rows[0].shopify_domain;
  const token = decrypt(tokenResult.rows[0].access_token);
  const callbackUrl = `${process.env.AUTH_URL}/api/webhooks/shopify`;

  for (const topic of WEBHOOK_TOPICS) {
    try {
      await shopifyGraphQL(shop, token, `
        mutation {
          webhookSubscriptionCreate(
            topic: ${topic}
            webhookSubscription: {
              callbackUrl: "${callbackUrl}"
              format: JSON
            }
          ) {
            webhookSubscription { id }
            userErrors { field message }
          }
        }
      `);
    } catch (error) {
      // Log but don't fail — some topics may already be registered
      console.warn(`Failed to register webhook ${topic} for ${shop}:`, error);
    }
  }
}

// ── Topic Handlers ──────────────────────────────────────────────────

/**
 * Route a webhook payload to the appropriate handler.
 */
export async function handleWebhook(
  topic: string,
  shopDomain: string,
  payload: Record<string, unknown>
): Promise<void> {
  // Find the store by domain
  const storeResult = await pool.query(
    "SELECT id FROM stores WHERE shopify_domain = $1",
    [shopDomain]
  );
  if (storeResult.rows.length === 0) {
    console.warn(`Webhook for unknown store: ${shopDomain}`);
    return;
  }
  const storeId = storeResult.rows[0].id;

  switch (topic) {
    case "orders/create":
    case "orders/updated":
      await handleOrderUpsert(storeId, payload);
      break;
    case "orders/cancelled":
      await handleOrderCancelled(storeId, payload);
      break;
    case "refunds/create":
      await handleRefundCreate(storeId, payload);
      break;
    case "products/create":
    case "products/update":
      await handleProductUpsert(storeId, payload);
      break;
    case "app/uninstalled":
      await handleAppUninstalled(storeId);
      break;
    default:
      console.warn(`Unhandled webhook topic: ${topic}`);
  }
}

// ── Order Handlers ──────────────────────────────────────────────────

async function handleOrderUpsert(
  storeId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const order = payload as {
    admin_graphql_api_id: string;
    name: string;
    created_at: string;
    financial_status: string;
    fulfillment_status: string | null;
    currency: string;
    subtotal_price: string;
    total_shipping_price_set?: { shop_money: { amount: string } };
    total_tax: string;
    total_discounts: string;
    total_price: string;
    current_subtotal_price: string;
    cancelled_at: string | null;
    processed_at: string | null;
    tags: string;
    source_name: string;
    customer?: { email: string; first_name: string; last_name: string };
    line_items: Array<{
      admin_graphql_api_id: string;
      title: string;
      variant_title: string | null;
      quantity: number;
      price: string;
      total_discount: string;
      sku: string | null;
      product_id: number;
      variant_id: number;
    }>;
    refunds?: Array<{
      admin_graphql_api_id: string;
      created_at: string;
      refund_line_items: Array<{
        line_item_id: number;
        quantity: number;
        subtotal: number;
      }>;
    }>;
  };

  const gid = order.admin_graphql_api_id;
  const shipping = order.total_shipping_price_set?.shop_money?.amount || "0";

  // Calculate total refunded from refunds array
  let totalRefunded = 0;
  if (order.refunds) {
    for (const r of order.refunds) {
      for (const rli of r.refund_line_items || []) {
        totalRefunded += rli.subtotal || 0;
      }
    }
  }

  // Current total = total_price - refunds (Shopify REST doesn't have currentTotalPriceSet)
  const currentTotal =
    parseFloat(order.total_price || "0") - totalRefunded;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO shopify_orders (
        store_id, shopify_gid, order_number, created_at_shopify,
        financial_status, fulfillment_status, currency,
        subtotal_price, total_shipping, total_tax,
        total_discounts, total_refunded, current_total_price,
        source_name, cancelled_at, processed_at, tags,
        customer_email, customer_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (store_id, shopify_gid) DO UPDATE SET
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        total_refunded = EXCLUDED.total_refunded,
        current_total_price = EXCLUDED.current_total_price,
        cancelled_at = EXCLUDED.cancelled_at,
        updated_at = now()`,
      [
        storeId,
        gid,
        order.name,
        order.created_at,
        order.financial_status,
        order.fulfillment_status || null,
        order.currency,
        order.subtotal_price || "0",
        shipping,
        order.total_tax || "0",
        order.total_discounts || "0",
        totalRefunded.toFixed(2),
        currentTotal.toFixed(2),
        order.source_name || null,
        order.cancelled_at || null,
        order.processed_at || null,
        order.tags || "",
        order.customer?.email || null,
        order.customer
          ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
          : null,
      ]
    );

    // Get the order UUID for line items
    const orderRow = await client.query(
      "SELECT id FROM shopify_orders WHERE store_id = $1 AND shopify_gid = $2",
      [storeId, gid]
    );
    const orderId = orderRow.rows[0]?.id;

    if (orderId && order.line_items) {
      for (const li of order.line_items) {
        const liGid = li.admin_graphql_api_id;
        await client.query(
          `INSERT INTO shopify_order_line_items (
            store_id, order_id, shopify_gid, product_title, variant_title,
            sku, quantity, unit_price, total_discount
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (store_id, shopify_gid) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            total_discount = EXCLUDED.total_discount`,
          [
            storeId,
            orderId,
            liGid,
            li.title,
            li.variant_title || null,
            li.sku || null,
            li.quantity,
            li.price,
            li.total_discount || "0",
          ]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleOrderCancelled(
  storeId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const gid = payload.admin_graphql_api_id as string;
  const cancelledAt = payload.cancelled_at as string;

  await pool.query(
    `UPDATE shopify_orders
     SET financial_status = 'voided', cancelled_at = $3, updated_at = now()
     WHERE store_id = $1 AND shopify_gid = $2`,
    [storeId, gid, cancelledAt]
  );
}

// ── Refund Handler ──────────────────────────────────────────────────

async function handleRefundCreate(
  storeId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const refund = payload as {
    admin_graphql_api_id: string;
    order_id: number;
    created_at: string;
    refund_line_items: Array<{
      line_item_id: number;
      quantity: number;
      subtotal: number;
    }>;
  };

  // Find the order by Shopify numeric ID (webhooks use REST IDs)
  const orderGid = `gid://shopify/Order/${refund.order_id}`;
  const orderRow = await pool.query(
    "SELECT id FROM shopify_orders WHERE store_id = $1 AND shopify_gid = $2",
    [storeId, orderGid]
  );
  if (orderRow.rows.length === 0) return;
  const orderId = orderRow.rows[0].id;

  const totalRefunded = refund.refund_line_items?.reduce(
    (sum, rli) => sum + (rli.subtotal || 0),
    0
  ) || 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert the refund record
    await client.query(
      `INSERT INTO shopify_refunds (store_id, order_id, shopify_gid, created_at_shopify, total_refunded)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ON CONSTRAINT shopify_refunds_store_id_shopify_gid_key DO UPDATE SET
         total_refunded = EXCLUDED.total_refunded`,
      [storeId, orderId, refund.admin_graphql_api_id, refund.created_at, totalRefunded.toFixed(2)]
    );

    // Update the order's total_refunded and financial_status
    await client.query(
      `UPDATE shopify_orders
       SET total_refunded = (
         SELECT COALESCE(SUM(total_refunded), 0) FROM shopify_refunds WHERE order_id = $2
       ),
       current_total_price = subtotal_price + total_shipping + total_tax - total_discounts - (
         SELECT COALESCE(SUM(total_refunded), 0) FROM shopify_refunds WHERE order_id = $2
       ),
       updated_at = now()
       WHERE store_id = $1 AND id = $2`,
      [storeId, orderId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ── Product Handler ─────────────────────────────────────────────────

async function handleProductUpsert(
  storeId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const product = payload as {
    admin_graphql_api_id: string;
    title: string;
    product_type: string;
    vendor: string;
    status: string;
    variants: Array<{
      admin_graphql_api_id: string;
      title: string;
      sku: string | null;
      price: string;
      compare_at_price: string | null;
      inventory_quantity: number | null;
    }>;
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO shopify_products (store_id, shopify_gid, title, product_type, vendor, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (store_id, shopify_gid) DO UPDATE SET
         title = EXCLUDED.title,
         product_type = EXCLUDED.product_type,
         vendor = EXCLUDED.vendor,
         status = EXCLUDED.status,
         updated_at = now()`,
      [
        storeId,
        product.admin_graphql_api_id,
        product.title,
        product.product_type || null,
        product.vendor || null,
        product.status?.toLowerCase() || "active",
      ]
    );

    // Get product UUID
    const productRow = await client.query(
      "SELECT id FROM shopify_products WHERE store_id = $1 AND shopify_gid = $2",
      [storeId, product.admin_graphql_api_id]
    );
    const productId = productRow.rows[0]?.id;

    if (productId && product.variants) {
      for (const v of product.variants) {
        await client.query(
          `INSERT INTO shopify_product_variants (
            store_id, product_id, shopify_gid, title, sku,
            price, compare_at_price, inventory_quantity
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (store_id, shopify_gid) DO UPDATE SET
            title = EXCLUDED.title,
            sku = EXCLUDED.sku,
            price = EXCLUDED.price,
            compare_at_price = EXCLUDED.compare_at_price,
            inventory_quantity = EXCLUDED.inventory_quantity,
            updated_at = now()`,
          [
            storeId,
            productId,
            v.admin_graphql_api_id,
            v.title || "Default Title",
            v.sku || null,
            v.price || "0",
            v.compare_at_price || null,
            v.inventory_quantity,
          ]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ── App Uninstalled ─────────────────────────────────────────────────

async function handleAppUninstalled(storeId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete the token (access revoked)
    await client.query(
      "DELETE FROM shopify_tokens WHERE store_id = $1",
      [storeId]
    );

    // Mark store as needing reconnect
    await client.query(
      `UPDATE stores SET sync_status = 'disconnected', updated_at = now() WHERE id = $1`,
      [storeId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
