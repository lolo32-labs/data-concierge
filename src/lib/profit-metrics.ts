// src/lib/profit-metrics.ts — Real profit calculation from multi-tenant Shopify data.
// Revenue - COGS - Fees - Ad Spend - Refunds = Net Profit
// Reads from public schema tables, scoped by store_id.
import { pool } from "./pool";

export interface DashboardMetrics {
  revenue: number;
  cogs: number;
  shopifyFees: number;
  adSpend: number;
  refunds: number;
  netProfit: number;
  marginPct: number;
  orderCount: number;
  avgOrderValue: number;
  productProfits: ProductProfit[];
  channelBreakdown: ChannelBreakdown[];
  missingCogsCount: number;
  period: { start: string; end: string; label: string };
  lastSyncAt: string | null;
}

export interface ProductProfit {
  productId: string;
  title: string;
  revenue: number;
  cogs: number;
  profit: number;
  marginPct: number;
  unitsSold: number;
}

export interface ChannelBreakdown {
  channel: string;
  revenue: number;
  orders: number;
  avgOrder: number;
}

/**
 * Compute dashboard metrics for a store over a given period.
 * Excludes PENDING and VOIDED orders. Uses currentTotalPriceSet for refund accuracy.
 */
export async function computeDashboardMetrics(
  storeId: string,
  periodDays: number = 30
): Promise<DashboardMetrics> {
  const client = await pool.connect();
  try {
    // Get store info for fee calculation
    const storeRow = await client.query(
      `SELECT payment_processor_fee_pct, payment_processor_fee_flat, last_sync_at
       FROM stores WHERE id = $1`,
      [storeId]
    );
    const feePct = parseFloat(storeRow.rows[0]?.payment_processor_fee_pct || "0.029");
    const feeFlat = parseFloat(storeRow.rows[0]?.payment_processor_fee_flat || "0.30");
    const lastSyncAt = storeRow.rows[0]?.last_sync_at;

    // Date range
    const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    // Only include PAID and PARTIALLY_REFUNDED orders
    const validStatuses = "('paid', 'partially_refunded')";

    // 1. Revenue + order count (using current_total_price for post-refund accuracy)
    const revenueResult = await client.query(
      `SELECT
         COALESCE(SUM(current_total_price), 0) AS revenue,
         COUNT(*) AS order_count,
         COALESCE(SUM(total_refunded), 0) AS total_refunded
       FROM shopify_orders
       WHERE store_id = $1
         AND created_at_shopify >= $2
         AND financial_status IN ${validStatuses}`,
      [storeId, sinceDate]
    );
    const revenue = parseFloat(revenueResult.rows[0].revenue);
    const orderCount = parseInt(revenueResult.rows[0].order_count, 10);
    const refunds = parseFloat(revenueResult.rows[0].total_refunded);

    // 2. COGS (sum of line_item quantity * cost_per_unit for matching variants)
    const cogsResult = await client.query(
      `SELECT COALESCE(SUM(li.quantity * c.cost_per_unit), 0) AS total_cogs
       FROM shopify_order_line_items li
       JOIN shopify_orders o ON o.id = li.order_id
       LEFT JOIN cogs_entries c
         ON c.variant_id = li.variant_id
         AND c.effective_to IS NULL
       WHERE o.store_id = $1
         AND o.created_at_shopify >= $2
         AND o.financial_status IN ${validStatuses}`,
      [storeId, sinceDate]
    );
    const cogs = parseFloat(cogsResult.rows[0].total_cogs);

    // 3. Shopify processing fees (estimated: fee_pct * subtotal + fee_flat per order)
    const shopifyFees = orderCount > 0
      ? parseFloat(((revenue * feePct) + (orderCount * feeFlat)).toFixed(2))
      : 0;

    // 4. Ad spend for the period
    const adResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_ad_spend
       FROM ad_spend_entries
       WHERE store_id = $1
         AND month >= $2::date`,
      [storeId, sinceDate]
    );
    const adSpend = parseFloat(adResult.rows[0].total_ad_spend);

    // 5. Net profit
    const netProfit = parseFloat((revenue - cogs - shopifyFees - adSpend).toFixed(2));
    const marginPct = revenue > 0
      ? parseFloat(((netProfit / revenue) * 100).toFixed(1))
      : 0;
    const avgOrderValue = orderCount > 0
      ? parseFloat((revenue / orderCount).toFixed(2))
      : 0;

    // 6. Product-level profitability (top 20)
    const productResult = await client.query(
      `SELECT
         p.id AS product_id,
         p.title,
         COALESCE(SUM(li.quantity * li.unit_price), 0) AS revenue,
         COALESCE(SUM(li.quantity * COALESCE(c.cost_per_unit, 0)), 0) AS cogs,
         COALESCE(SUM(li.quantity), 0) AS units_sold
       FROM shopify_order_line_items li
       JOIN shopify_orders o ON o.id = li.order_id
       LEFT JOIN shopify_product_variants v ON v.id = li.variant_id
       LEFT JOIN shopify_products p ON p.id = v.product_id
       LEFT JOIN cogs_entries c ON c.variant_id = li.variant_id AND c.effective_to IS NULL
       WHERE o.store_id = $1
         AND o.created_at_shopify >= $2
         AND o.financial_status IN ${validStatuses}
         AND p.id IS NOT NULL
       GROUP BY p.id, p.title
       ORDER BY (SUM(li.quantity * li.unit_price) - SUM(li.quantity * COALESCE(c.cost_per_unit, 0))) DESC
       LIMIT 20`,
      [storeId, sinceDate]
    );
    const productProfits: ProductProfit[] = productResult.rows.map((r) => {
      const rev = parseFloat(r.revenue);
      const cost = parseFloat(r.cogs);
      const profit = rev - cost;
      return {
        productId: r.product_id,
        title: r.title,
        revenue: rev,
        cogs: cost,
        profit,
        marginPct: rev > 0 ? parseFloat(((profit / rev) * 100).toFixed(1)) : 0,
        unitsSold: parseInt(r.units_sold, 10),
      };
    });

    // 7. Channel breakdown
    const channelResult = await client.query(
      `SELECT
         COALESCE(channel_name, 'Online Store') AS channel,
         COALESCE(SUM(current_total_price), 0) AS revenue,
         COUNT(*) AS orders
       FROM shopify_orders
       WHERE store_id = $1
         AND created_at_shopify >= $2
         AND financial_status IN ${validStatuses}
       GROUP BY channel_name
       ORDER BY SUM(current_total_price) DESC`,
      [storeId, sinceDate]
    );
    const channelBreakdown: ChannelBreakdown[] = channelResult.rows.map((r) => {
      const rev = parseFloat(r.revenue);
      const orders = parseInt(r.orders, 10);
      return {
        channel: r.channel,
        revenue: rev,
        orders,
        avgOrder: orders > 0 ? parseFloat((rev / orders).toFixed(2)) : 0,
      };
    });

    // 8. Count variants missing COGS
    const missingResult = await client.query(
      `SELECT COUNT(DISTINCT v.id) AS missing
       FROM shopify_product_variants v
       JOIN shopify_products p ON p.id = v.product_id
       LEFT JOIN cogs_entries c ON c.variant_id = v.id AND c.effective_to IS NULL
       WHERE v.store_id = $1 AND p.status = 'active' AND c.id IS NULL`,
      [storeId]
    );
    const missingCogsCount = parseInt(missingResult.rows[0].missing, 10);

    return {
      revenue,
      cogs,
      shopifyFees,
      adSpend,
      refunds,
      netProfit,
      marginPct,
      orderCount,
      avgOrderValue,
      productProfits,
      channelBreakdown,
      missingCogsCount,
      period: {
        start: sinceDate,
        end: endDate,
        label: `Last ${periodDays} days`,
      },
      lastSyncAt,
    };
  } finally {
    client.release();
  }
}
