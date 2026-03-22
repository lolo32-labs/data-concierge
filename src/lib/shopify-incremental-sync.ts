// src/lib/shopify-incremental-sync.ts — Incremental paginated sync engine.
// Uses small paginated GraphQL queries (50 items/page) instead of bulk operations.
// Works reliably on rate-limited dev stores and shows progress as items arrive.
import { pool } from "./pool";
import { decrypt } from "./crypto";
import { shopifyGraphQL } from "./shopify";

// ── Types ───────────────────────────────────────────────────────────

export interface SyncProgress {
  phase: "shop" | "products" | "orders";
  productCount: number;
  variantCount: number;
  orderCount: number;
  lineItemCount: number;
}

interface ShopInfoResponse {
  shop: {
    name: string;
    plan: { displayName: string };
    currencyCode: string;
  };
}

interface ProductNode {
  id: string;
  title: string;
  productType: string;
  vendor: string;
  status: string;
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        sku: string | null;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number | null;
      };
    }[];
  };
}

interface ProductsPageResponse {
  products: {
    edges: { node: ProductNode; cursor: string }[];
    pageInfo: { hasNextPage: boolean };
  };
}

interface OrderLineItemNode {
  id: string;
  title: string;
  quantity: number;
  variant: {
    id: string;
    sku: string;
    product: { id: string; title: string };
  } | null;
  originalUnitPriceSet: { shopMoney: { amount: string } };
  discountedUnitPriceSet: { shopMoney: { amount: string } } | null;
}

interface RefundNode {
  id: string;
  createdAt: string;
  totalRefundedSet: { shopMoney: { amount: string } } | null;
  refundLineItems: {
    edges: {
      node: {
        lineItem: { id: string };
        quantity: number;
        subtotalSet: { shopMoney: { amount: string } };
      };
    }[];
  };
}

interface OrderNode {
  id: string;
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
  channelInformation: { channelDefinition: { channelName: string } | null } | null;
  cancelledAt: string | null;
  processedAt: string | null;
  tags: string[];
  customer: { email: string; displayName: string } | null;
  lineItems: {
    edges: { node: OrderLineItemNode }[];
  };
  refunds: RefundNode[];
}

interface OrdersPageResponse {
  orders: {
    edges: { node: OrderNode; cursor: string }[];
    pageInfo: { hasNextPage: boolean };
  };
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

// ── 1. Sync Shop Info ───────────────────────────────────────────────

/**
 * Fetch shop name, plan, and currency. Updates the stores table.
 */
export async function syncShopInfo(storeId: string): Promise<void> {
  const { shop, token } = await getStoreCredentials(storeId);

  const data = (await shopifyGraphQL(shop, token, `{
    shop {
      name
      plan { displayName }
      currencyCode
    }
  }`)) as unknown as ShopInfoResponse;

  await pool.query(
    `UPDATE stores SET
       store_name = $2,
       shopify_plan = $3,
       currency = $4,
       updated_at = now()
     WHERE id = $1`,
    [
      storeId,
      data.shop.name,
      data.shop.plan?.displayName || null,
      data.shop.currencyCode || "USD",
    ]
  );
}

// ── 2. Sync Products (Incremental) ─────────────────────────────────

const PRODUCTS_PAGE_QUERY = `
query ProductsPage($cursor: String) {
  products(first: 50, after: $cursor) {
    edges {
      node {
        id
        title
        productType
        vendor
        status
        variants(first: 100) {
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
      cursor
    }
    pageInfo { hasNextPage }
  }
}`;

/**
 * Sync all products with cursor-based pagination (50 products per page).
 * Inserts products and variants as they arrive.
 */
export async function syncProductsIncremental(
  storeId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{ products: number; variants: number }> {
  const { shop, token } = await getStoreCredentials(storeId);

  let cursor: string | null = null;
  let hasNextPage = true;
  let totalProducts = 0;
  let totalVariants = 0;

  while (hasNextPage) {
    const data = (await shopifyGraphQL(
      shop,
      token,
      PRODUCTS_PAGE_QUERY,
      cursor ? { cursor } : {}
    )) as unknown as ProductsPageResponse;

    const edges = data.products.edges;
    hasNextPage = data.products.pageInfo.hasNextPage;

    if (edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;

    // Insert this page of products + variants
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const edge of edges) {
        const product = edge.node;

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

        // Get the product's UUID
        const productRow = await client.query(
          "SELECT id FROM shopify_products WHERE store_id = $1 AND shopify_gid = $2",
          [storeId, product.id]
        );
        const productDbId = productRow.rows[0]?.id;
        if (!productDbId) continue;

        // Insert variants
        for (const variantEdge of product.variants.edges) {
          const variant = variantEdge.node;
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
              productDbId,
              variant.id,
              variant.title || "Default Title",
              variant.sku || null,
              variant.price || "0",
              variant.compareAtPrice || null,
              variant.inventoryQuantity,
            ]
          );
          totalVariants++;
        }

        totalProducts++;
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    onProgress?.({
      phase: "products",
      productCount: totalProducts,
      variantCount: totalVariants,
      orderCount: 0,
      lineItemCount: 0,
    });
  }

  return { products: totalProducts, variants: totalVariants };
}

// ── 3. Sync Orders (Incremental) ───────────────────────────────────

const ORDERS_PAGE_QUERY = `
query OrdersPage($cursor: String, $query: String) {
  orders(first: 50, after: $cursor, query: $query) {
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
        lineItems(first: 100) {
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
          refundLineItems(first: 100) {
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
      cursor
    }
    pageInfo { hasNextPage }
  }
}`;

/**
 * Sync orders with cursor-based pagination (50 orders per page).
 * Inserts orders, line items, and refunds as they arrive.
 */
export async function syncOrdersIncremental(
  storeId: string,
  sinceDate: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{ orders: number; lineItems: number; refunds: number }> {
  const { shop, token } = await getStoreCredentials(storeId);
  const queryFilter = `created_at:>='${sinceDate}'`;

  let cursor: string | null = null;
  let hasNextPage = true;
  let totalOrders = 0;
  let totalLineItems = 0;
  let totalRefunds = 0;

  while (hasNextPage) {
    const variables: Record<string, unknown> = { query: queryFilter };
    if (cursor) variables.cursor = cursor;

    const data = (await shopifyGraphQL(
      shop,
      token,
      ORDERS_PAGE_QUERY,
      variables
    )) as unknown as OrdersPageResponse;

    const edges = data.orders.edges;
    hasNextPage = data.orders.pageInfo.hasNextPage;

    if (edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;

    // Insert this page of orders + line items + refunds
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const edge of edges) {
        const order = edge.node;
        const channel =
          order.channelInformation?.channelDefinition?.channelName || "Online Store";
        const tags = Array.isArray(order.tags) ? order.tags.join(",") : "";

        // Insert order
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
        totalOrders++;

        // Get the order's UUID
        const orderRow = await client.query(
          "SELECT id FROM shopify_orders WHERE store_id = $1 AND shopify_gid = $2",
          [storeId, order.id]
        );
        const orderDbId = orderRow.rows[0]?.id;
        if (!orderDbId) continue;

        // Insert line items
        for (const liEdge of order.lineItems.edges) {
          const li = liEdge.node;
          const unitPrice = li.originalUnitPriceSet?.shopMoney?.amount || "0";
          const discountedPrice =
            li.discountedUnitPriceSet?.shopMoney?.amount || unitPrice;
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
              orderDbId,
              li.id,
              li.variant?.product?.title || li.title,
              li.title !== "Default Title" ? li.title : null,
              li.variant?.sku || null,
              li.quantity,
              unitPrice,
              totalDiscount.toFixed(2),
            ]
          );
          totalLineItems++;
        }

        // Insert refunds
        for (const refund of order.refunds) {
          await client.query(
            `INSERT INTO shopify_refunds (
              store_id, order_id, shopify_gid, created_at_shopify, total_refunded
            ) VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT ON CONSTRAINT shopify_refunds_store_id_shopify_gid_key DO UPDATE SET
              total_refunded = EXCLUDED.total_refunded`,
            [
              storeId,
              orderDbId,
              refund.id,
              refund.createdAt,
              refund.totalRefundedSet?.shopMoney?.amount || "0",
            ]
          );
          totalRefunds++;

          // Get the refund's UUID
          const refundRow = await client.query(
            "SELECT id FROM shopify_refunds WHERE store_id = $1 AND shopify_gid = $2",
            [storeId, refund.id]
          );
          const refundDbId = refundRow.rows[0]?.id;
          if (!refundDbId) continue;

          // Build line item map for this order
          const lineItemRows = await client.query(
            "SELECT id, shopify_gid FROM shopify_order_line_items WHERE store_id = $1 AND order_id = $2",
            [storeId, orderDbId]
          );
          const lineItemMap = new Map<string, string>();
          for (const row of lineItemRows.rows) {
            lineItemMap.set(row.shopify_gid, row.id);
          }

          // Insert refund line items
          for (const rliEdge of refund.refundLineItems.edges) {
            const rli = rliEdge.node;
            const lineItemId = rli.lineItem?.id
              ? lineItemMap.get(rli.lineItem.id)
              : null;

            await client.query(
              `INSERT INTO shopify_refund_line_items (
                refund_id, line_item_id, quantity, subtotal
              ) VALUES ($1,$2,$3,$4)`,
              [
                refundDbId,
                lineItemId || null,
                rli.quantity,
                rli.subtotalSet?.shopMoney?.amount || "0",
              ]
            );
          }
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    onProgress?.({
      phase: "orders",
      productCount: 0,
      variantCount: 0,
      orderCount: totalOrders,
      lineItemCount: totalLineItems,
    });
  }

  return { orders: totalOrders, lineItems: totalLineItems, refunds: totalRefunds };
}

// ── 4. Run Incremental Sync (Orchestrator) ──────────────────────────

/**
 * Full incremental sync: shop info -> products -> orders (90 days).
 * Updates stores.sync_status throughout. Each individual GraphQL query
 * fetches only 50 items, avoiding rate-limit issues on dev stores.
 */
export async function runIncrementalSync(
  storeId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{
  products: number;
  variants: number;
  orders: number;
  lineItems: number;
  refunds: number;
}> {
  // Mark as syncing
  await pool.query(
    "UPDATE stores SET sync_status = 'syncing', updated_at = now() WHERE id = $1",
    [storeId]
  );

  try {
    // 1. Shop info (fast — 1 query)
    onProgress?.({
      phase: "shop",
      productCount: 0,
      variantCount: 0,
      orderCount: 0,
      lineItemCount: 0,
    });
    await syncShopInfo(storeId);

    // 2. Products (paginated, 50 per page)
    const productResult = await syncProductsIncremental(storeId, onProgress);

    // 3. Orders — last 90 days (paginated, 50 per page)
    const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const orderResult = await syncOrdersIncremental(
      storeId,
      sinceDate,
      onProgress
    );

    // Mark as synced
    await pool.query(
      "UPDATE stores SET sync_status = 'synced', last_sync_at = now(), updated_at = now() WHERE id = $1",
      [storeId]
    );

    return {
      ...productResult,
      ...orderResult,
    };
  } catch (error) {
    // Mark as error
    await pool.query(
      "UPDATE stores SET sync_status = 'error', updated_at = now() WHERE id = $1",
      [storeId]
    );
    throw error;
  }
}
