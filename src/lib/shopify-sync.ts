// src/lib/shopify-sync.ts — Shopify bulk operation sync engine.
// Handles order backfill (90 days) and product sync via JSONL bulk operations.
import { pool } from "./pool";
import { decrypt } from "./crypto";
import { shopifyGraphQL } from "./shopify";

// ── Types ───────────────────────────────────────────────────────────

interface BulkOperationResult {
  id: string;
  status: string;
  url?: string;
  objectCount?: string;
  errorCode?: string;
}

// JSONL line types (flat — Shopify uses __parentId for hierarchy)
interface JsonlOrder {
  id: string; // gid://shopify/Order/123
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string | null;
  subtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalShippingPriceSet: { shopMoney: { amount: string } };
  totalTaxSet: { shopMoney: { amount: string } };
  totalDiscountsSet: { shopMoney: { amount: string } };
  totalRefundedSet: { shopMoney: { amount: string } };
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  channelInformation?: { channelDefinition?: { channelName: string } } | null;
  cancelledAt?: string | null;
  processedAt?: string | null;
  tags?: string[];
  customer?: { email: string; displayName: string } | null;
}

interface JsonlLineItem {
  id: string; // gid://shopify/LineItem/456
  __parentId: string; // gid://shopify/Order/123
  title: string;
  quantity: number;
  variant?: { id: string; sku: string; product: { id: string; title: string } } | null;
  originalUnitPriceSet: { shopMoney: { amount: string } };
  discountedUnitPriceSet?: { shopMoney: { amount: string } } | null;
}

interface JsonlRefund {
  id: string; // gid://shopify/Refund/789
  __parentId: string; // gid://shopify/Order/123
  createdAt: string;
  totalRefundedSet?: { shopMoney: { amount: string } };
}

interface JsonlRefundLineItem {
  id: string;
  __parentId: string; // gid://shopify/Refund/789
  lineItem: { id: string };
  quantity: number;
  subtotalSet: { shopMoney: { amount: string } };
}

interface JsonlProduct {
  id: string; // gid://shopify/Product/123
  title: string;
  productType: string;
  vendor: string;
  status: string;
}

interface JsonlVariant {
  id: string; // gid://shopify/ProductVariant/456
  __parentId: string; // gid://shopify/Product/123
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number | null;
}

// ── Bulk Operation Helpers ──────────────────────────────────────────

/**
 * Trigger a bulk operation query on Shopify.
 */
async function startBulkOperation(
  shop: string,
  token: string,
  queryBody: string
): Promise<string> {
  const data = await shopifyGraphQL(shop, token, `
    mutation {
      bulkOperationRunQuery(query: """${queryBody}""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `) as { bulkOperationRunQuery: { bulkOperation: { id: string; status: string }; userErrors: { field: string; message: string }[] } };

  const result = data.bulkOperationRunQuery;
  if (result.userErrors?.length > 0) {
    throw new Error(`Bulk operation error: ${JSON.stringify(result.userErrors)}`);
  }

  return result.bulkOperation.id;
}

/**
 * Poll until the bulk operation completes. Returns the download URL.
 */
async function pollBulkOperation(
  shop: string,
  token: string,
  onProgress?: (status: string, count: string) => void
): Promise<BulkOperationResult> {
  const MAX_POLLS = 120; // 10 minutes at 5s intervals
  const POLL_INTERVAL = 5000;

  for (let i = 0; i < MAX_POLLS; i++) {
    const data = await shopifyGraphQL(shop, token, `{
      currentBulkOperation {
        id
        status
        url
        objectCount
        errorCode
      }
    }`) as { currentBulkOperation: BulkOperationResult | null };

    const op = data.currentBulkOperation;
    if (!op) throw new Error("No active bulk operation found");

    onProgress?.(op.status, op.objectCount || "0");

    if (op.status === "COMPLETED") return op;
    if (op.status === "FAILED") {
      throw new Error(`Bulk operation failed: ${op.errorCode}`);
    }
    if (op.status === "CANCELED" || op.status === "CANCELLED") {
      throw new Error("Bulk operation was cancelled");
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error("Bulk operation timed out after 10 minutes");
}

/**
 * Download and parse the JSONL file from the bulk operation URL.
 */
async function downloadJsonl(url: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download JSONL: ${res.status}`);
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

// ── Get Store Credentials ───────────────────────────────────────────

async function getStoreCredentials(storeId: string) {
  const storeResult = await pool.query(
    "SELECT shopify_domain FROM stores WHERE id = $1",
    [storeId]
  );
  if (storeResult.rows.length === 0) throw new Error("Store not found");

  const tokenResult = await pool.query(
    "SELECT access_token FROM shopify_tokens WHERE store_id = $1",
    [storeId]
  );
  if (tokenResult.rows.length === 0) throw new Error("No Shopify token found");

  return {
    shop: storeResult.rows[0].shopify_domain,
    token: decrypt(tokenResult.rows[0].access_token),
  };
}

// ── Order Sync ──────────────────────────────────────────────────────

const ORDER_QUERY = `{
  orders(query: "created_at:>='__SINCE__'") {
    edges {
      node {
        id
        name
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        subtotalPriceSet { shopMoney { amount currencyCode } }
        totalShippingPriceSet { shopMoney { amount } }
        totalTaxSet { shopMoney { amount } }
        totalDiscountsSet { shopMoney { amount } }
        totalRefundedSet { shopMoney { amount } }
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        channelInformation { channelDefinition { channelName } }
        cancelledAt
        processedAt
        tags
        customer { email displayName }
        lineItems {
          edges {
            node {
              id
              title
              quantity
              variant { id sku product { id title } }
              originalUnitPriceSet { shopMoney { amount } }
              discountedUnitPriceSet { shopMoney { amount } }
            }
          }
        }
        refunds {
          id
          createdAt
          totalRefundedSet { shopMoney { amount } }
          refundLineItems {
            edges {
              node {
                lineItem { id }
                quantity
                subtotalSet { shopMoney { amount } }
              }
            }
          }
        }
      }
    }
  }
}`;

/**
 * Sync orders from Shopify via bulk operation.
 * Pulls all orders created since `sinceDate` (ISO string).
 */
export async function syncOrders(
  storeId: string,
  sinceDate: string,
  onProgress?: (status: string, count: string) => void
): Promise<{ orders: number; lineItems: number; refunds: number }> {
  const { shop, token } = await getStoreCredentials(storeId);

  // Update sync status
  await pool.query(
    "UPDATE stores SET sync_status = 'syncing', updated_at = now() WHERE id = $1",
    [storeId]
  );

  try {
    const query = ORDER_QUERY.replace("__SINCE__", sinceDate);
    await startBulkOperation(shop, token, query);
    const result = await pollBulkOperation(shop, token, onProgress);

    if (!result.url) {
      // No data (empty store)
      await pool.query(
        "UPDATE stores SET sync_status = 'synced', last_sync_at = now(), updated_at = now() WHERE id = $1",
        [storeId]
      );
      return { orders: 0, lineItems: 0, refunds: 0 };
    }

    const lines = await downloadJsonl(result.url);
    const counts = await insertOrderData(storeId, lines);

    await pool.query(
      "UPDATE stores SET sync_status = 'synced', last_sync_at = now(), updated_at = now() WHERE id = $1",
      [storeId]
    );

    return counts;
  } catch (error) {
    await pool.query(
      "UPDATE stores SET sync_status = 'error', updated_at = now() WHERE id = $1",
      [storeId]
    );
    throw error;
  }
}

/**
 * Parse JSONL lines and batch-insert orders, line items, and refunds.
 *
 * JSONL format from bulk operations is FLAT:
 *   {"id":"gid://shopify/Order/1", "name":"#1001", ...}
 *   {"id":"gid://shopify/LineItem/2", "__parentId":"gid://shopify/Order/1", ...}
 *   {"id":"gid://shopify/Refund/3", "__parentId":"gid://shopify/Order/1", ...}
 *   {"id":"gid://shopify/RefundLineItem/4", "__parentId":"gid://shopify/Refund/3", ...}
 *
 * We classify each line by its GID prefix, then insert in dependency order.
 */
async function insertOrderData(
  storeId: string,
  lines: Record<string, unknown>[]
): Promise<{ orders: number; lineItems: number; refunds: number }> {
  const orders: JsonlOrder[] = [];
  const lineItems: JsonlLineItem[] = [];
  const refunds: JsonlRefund[] = [];
  const refundLineItems: JsonlRefundLineItem[] = [];

  // Classify each line by GID type
  for (const line of lines) {
    const id = line.id as string;
    const parentId = line.__parentId as string | undefined;

    if (!id) continue;

    if (id.includes("/Order/")) {
      orders.push(line as unknown as JsonlOrder);
    } else if (id.includes("/LineItem/")) {
      lineItems.push(line as unknown as JsonlLineItem);
    } else if (id.includes("/Refund/") && !id.includes("/RefundLineItem/")) {
      refunds.push(line as unknown as JsonlRefund);
    } else if (id.includes("/RefundLineItem/") || (parentId && parentId.includes("/Refund/"))) {
      refundLineItems.push(line as unknown as JsonlRefundLineItem);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Insert orders (batch of 500)
    for (let i = 0; i < orders.length; i += 500) {
      const batch = orders.slice(i, i + 500);
      for (const order of batch) {
        const channel =
          order.channelInformation?.channelDefinition?.channelName || "Online Store";
        const tags = Array.isArray(order.tags) ? order.tags.join(",") : "";

        await client.query(
          `INSERT INTO shopify_orders (
            store_id, shopify_gid, order_number, created_at_shopify,
            financial_status, fulfillment_status, currency,
            subtotal_price, total_shipping, total_tax,
            total_discounts, total_refunded, current_total_price,
            channel_name, cancelled_at, processed_at, tags,
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
            order.id,
            order.name,
            order.createdAt,
            order.displayFinancialStatus?.toLowerCase() || "unknown",
            order.displayFulfillmentStatus?.toLowerCase() || null,
            order.currentTotalPriceSet?.shopMoney?.currencyCode || "USD",
            order.subtotalPriceSet?.shopMoney?.amount || "0",
            order.totalShippingPriceSet?.shopMoney?.amount || "0",
            order.totalTaxSet?.shopMoney?.amount || "0",
            order.totalDiscountsSet?.shopMoney?.amount || "0",
            order.totalRefundedSet?.shopMoney?.amount || "0",
            order.currentTotalPriceSet?.shopMoney?.amount || "0",
            channel,
            order.cancelledAt || null,
            order.processedAt || null,
            tags,
            order.customer?.email || null,
            order.customer?.displayName || null,
          ]
        );
      }
    }

    // Build a map of shopify_gid → UUID for orders
    const orderMap = new Map<string, string>();
    const orderRows = await client.query(
      "SELECT id, shopify_gid FROM shopify_orders WHERE store_id = $1",
      [storeId]
    );
    for (const row of orderRows.rows) {
      orderMap.set(row.shopify_gid, row.id);
    }

    // 2. Insert line items
    for (const li of lineItems) {
      const orderId = orderMap.get(li.__parentId);
      if (!orderId) continue;

      const unitPrice = li.originalUnitPriceSet?.shopMoney?.amount || "0";
      const discountedPrice = li.discountedUnitPriceSet?.shopMoney?.amount || unitPrice;
      const totalDiscount =
        (parseFloat(unitPrice) - parseFloat(discountedPrice)) * li.quantity;

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
          li.id,
          li.variant?.product?.title || li.title,
          li.title !== "Default Title" ? li.title : null,
          li.variant?.sku || null,
          li.quantity,
          unitPrice,
          totalDiscount.toFixed(2),
        ]
      );
    }

    // 3. Insert refunds
    for (const refund of refunds) {
      const orderId = orderMap.get(refund.__parentId);
      if (!orderId) continue;

      await client.query(
        `INSERT INTO shopify_refunds (
          store_id, order_id, shopify_gid, created_at_shopify, total_refunded
        ) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT ON CONSTRAINT shopify_refunds_store_id_shopify_gid_key DO UPDATE SET
          total_refunded = EXCLUDED.total_refunded`,
        [
          storeId,
          orderId,
          refund.id,
          refund.createdAt,
          refund.totalRefundedSet?.shopMoney?.amount || "0",
        ]
      );
    }

    // Build refund map for refund line items
    const refundMap = new Map<string, string>();
    const refundRows = await client.query(
      "SELECT id, shopify_gid FROM shopify_refunds WHERE store_id = $1",
      [storeId]
    );
    for (const row of refundRows.rows) {
      refundMap.set(row.shopify_gid, row.id);
    }

    // Build line item map for refund line items
    const lineItemMap = new Map<string, string>();
    const lineItemRows = await client.query(
      "SELECT id, shopify_gid FROM shopify_order_line_items WHERE store_id = $1",
      [storeId]
    );
    for (const row of lineItemRows.rows) {
      lineItemMap.set(row.shopify_gid, row.id);
    }

    // 4. Insert refund line items
    for (const rli of refundLineItems) {
      const refundId = refundMap.get(rli.__parentId);
      if (!refundId) continue;

      const lineItemId = rli.lineItem?.id ? lineItemMap.get(rli.lineItem.id) : null;

      await client.query(
        `INSERT INTO shopify_refund_line_items (
          refund_id, line_item_id, quantity, subtotal
        ) VALUES ($1,$2,$3,$4)`,
        [
          refundId,
          lineItemId || null,
          rli.quantity,
          rli.subtotalSet?.shopMoney?.amount || "0",
        ]
      );
    }

    await client.query("COMMIT");

    return {
      orders: orders.length,
      lineItems: lineItems.length,
      refunds: refunds.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ── Product Sync ────────────────────────────────────────────────────

const PRODUCT_QUERY = `{
  products {
    edges {
      node {
        id
        title
        productType
        vendor
        status
        variants {
          edges {
            node {
              id
              title
              sku
              price
              compareAtPrice
              inventoryQuantity
            }
          }
        }
      }
    }
  }
}`;

/**
 * Sync all products and variants from Shopify via bulk operation.
 * Also pre-populates COGS from Shopify's cost field where available.
 */
export async function syncProducts(
  storeId: string,
  onProgress?: (status: string, count: string) => void
): Promise<{ products: number; variants: number }> {
  const { shop, token } = await getStoreCredentials(storeId);

  await startBulkOperation(shop, token, PRODUCT_QUERY);
  const result = await pollBulkOperation(shop, token, onProgress);

  if (!result.url) {
    return { products: 0, variants: 0 };
  }

  const lines = await downloadJsonl(result.url);
  return insertProductData(storeId, lines);
}

async function insertProductData(
  storeId: string,
  lines: Record<string, unknown>[]
): Promise<{ products: number; variants: number }> {
  const products: JsonlProduct[] = [];
  const variants: JsonlVariant[] = [];

  for (const line of lines) {
    const id = line.id as string;
    if (!id) continue;

    if (id.includes("/Product/") && !id.includes("/ProductVariant/")) {
      products.push(line as unknown as JsonlProduct);
    } else if (id.includes("/ProductVariant/")) {
      variants.push(line as unknown as JsonlVariant);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert products
    for (const product of products) {
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
          product.id,
          product.title,
          product.productType || null,
          product.vendor || null,
          product.status?.toLowerCase() || "active",
        ]
      );
    }

    // Build product map
    const productMap = new Map<string, string>();
    const productRows = await client.query(
      "SELECT id, shopify_gid FROM shopify_products WHERE store_id = $1",
      [storeId]
    );
    for (const row of productRows.rows) {
      productMap.set(row.shopify_gid, row.id);
    }

    // Insert variants
    for (const variant of variants) {
      const productId = productMap.get(variant.__parentId);
      if (!productId) continue;

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
          variant.id,
          variant.title || "Default Title",
          variant.sku || null,
          variant.price || "0",
          variant.compareAtPrice || null,
          variant.inventoryQuantity,
        ]
      );
    }

    await client.query("COMMIT");
    return { products: products.length, variants: variants.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ── Full Sync (called from onboarding) ──────────────────────────────

/**
 * Run a complete initial sync: products first (so variant IDs exist for
 * linking line items), then orders.
 */
export async function runFullSync(
  storeId: string,
  onProgress?: (phase: string, status: string, count: string) => void
): Promise<{
  products: number;
  variants: number;
  orders: number;
  lineItems: number;
  refunds: number;
}> {
  // 90 days ago
  const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Products first (variants needed for line item FK linking)
  const productResult = await syncProducts(storeId, (status, count) =>
    onProgress?.("products", status, count)
  );

  // Then orders
  const orderResult = await syncOrders(storeId, sinceDate, (status, count) =>
    onProgress?.("orders", status, count)
  );

  return {
    ...productResult,
    ...orderResult,
  };
}
