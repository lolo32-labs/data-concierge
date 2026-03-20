import { NextResponse } from "next/server";
import { executeClientQuery } from "@/lib/db";

const DEMO_SCHEMA = "client_shopify_demo";

interface ProductRow {
  name: string;
  revenue: string;
  cogs: string;
  profit: string;
  margin: string;
}

interface ChannelRow {
  channel: string;
  revenue: string;
  orders: string;
}

interface ScalarRow {
  value: string | null;
}

interface DateRangeRow {
  start: string | null;
  end: string | null;
}

function calculateHealthScore(params: {
  margin: number;
  orders: number;
  adSpend: number;
  revenue: number;
  productCount: number;
  hasNegativeMarginProducts: boolean;
}): number {
  const { margin, orders, adSpend, revenue, productCount, hasNegativeMarginProducts } = params;

  // Margin score: 30 / 20 / 10
  let score = margin > 50 ? 30 : margin > 30 ? 20 : 10;

  // Orders score: 25 / 15 / 5
  score += orders > 100 ? 25 : orders > 50 ? 15 : 5;

  // ROAS score: 20 / 10 / 15
  if (adSpend > 0) {
    const roas = revenue / adSpend;
    score += roas > 2 ? 20 : 10;
  } else {
    score += 15;
  }

  // Products score: 10 / 5
  score += productCount > 10 ? 10 : 5;

  // No negative-margin products: 10 / 0
  score += hasNegativeMarginProducts ? 0 : 10;

  return Math.min(100, Math.max(0, score));
}

export async function GET() {
  try {
    // Compute the cutoff date once as a subquery reference — avoids CURRENT_DATE
    // All queries use relative dates derived from the max date in the orders table.
    const recentFilter = `date >= (SELECT MAX(date)::date - interval '30 days' FROM orders)`;
    const validStatuses = `status NOT IN ('refunded', 'cancelled')`;

    const [
      revenueRows,
      cogsRows,
      feesRows,
      adSpendRows,
      orderCountRows,
      productRows,
      channelRows,
      dateRangeRows,
    ] = await Promise.all([
      // 1. Revenue (exclude refunded/cancelled)
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT COALESCE(SUM(subtotal), 0)::text AS value
         FROM orders
         WHERE ${recentFilter}
           AND ${validStatuses}`
      ),

      // 2. COGS via order_items joined to valid orders
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT COALESCE(SUM(oi.quantity * oi.unit_cost), 0)::text AS value
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.date >= (SELECT MAX(date)::date - interval '30 days' FROM orders)
           AND o.status NOT IN ('refunded', 'cancelled')`
      ),

      // 3. Fees: shipping + platform fees + discounts + refunds
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT COALESCE(SUM(shipping_cost + shopify_fee + payment_fee + discount + refund), 0)::text AS value
         FROM orders
         WHERE ${recentFilter}
           AND ${validStatuses}`
      ),

      // 4. Ad spend — uses ad_spend.date, subquery still references orders for relative range
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT COALESCE(SUM(spend), 0)::text AS value
         FROM ad_spend
         WHERE date >= (SELECT MAX(date)::date - interval '30 days' FROM orders)`
      ),

      // 5. Order count (exclude refunded/cancelled)
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT COUNT(*)::text AS value
         FROM orders
         WHERE ${recentFilter}
           AND ${validStatuses}`
      ),

      // 6. Top products by profit, sorted DESC
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT
           p.name,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0)::text AS revenue,
           COALESCE(SUM(oi.quantity * oi.unit_cost), 0)::text  AS cogs,
           COALESCE(
             SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost),
             0
           )::text AS profit,
           CASE
             WHEN SUM(oi.quantity * oi.unit_price) > 0 THEN
               ROUND(
                 (SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost))
                 / SUM(oi.quantity * oi.unit_price) * 100,
                 1
               )::text
             ELSE '0'
           END AS margin
         FROM order_items oi
         JOIN orders   o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE o.date >= (SELECT MAX(date)::date - interval '30 days' FROM orders)
           AND o.status NOT IN ('refunded', 'cancelled')
         GROUP BY p.id, p.name
         ORDER BY (SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost)) DESC`
      ),

      // 7. Revenue and order count by channel
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT
           channel,
           COALESCE(SUM(subtotal), 0)::text AS revenue,
           COUNT(*)::text                   AS orders
         FROM orders
         WHERE ${recentFilter}
           AND ${validStatuses}
         GROUP BY channel
         ORDER BY SUM(subtotal) DESC`
      ),

      // 8. Actual date range of the filtered orders
      executeClientQuery(
        DEMO_SCHEMA,
        `SELECT
           MIN(date)::date::text AS start,
           MAX(date)::date::text AS end
         FROM orders
         WHERE ${recentFilter}
           AND ${validStatuses}`
      ),
    ]);

    // Parse scalar values
    const revenue  = parseFloat((revenueRows[0]    as ScalarRow)?.value ?? "0") || 0;
    const cogs     = parseFloat((cogsRows[0]        as ScalarRow)?.value ?? "0") || 0;
    const fees     = parseFloat((feesRows[0]        as ScalarRow)?.value ?? "0") || 0;
    const adSpend  = parseFloat((adSpendRows[0]     as ScalarRow)?.value ?? "0") || 0;
    const orders   = parseInt(  (orderCountRows[0]  as ScalarRow)?.value ?? "0", 10) || 0;

    const totalCosts = parseFloat((cogs + fees + adSpend).toFixed(2));
    const netProfit  = parseFloat((revenue - totalCosts).toFixed(2));
    const margin     = revenue > 0 ? parseFloat(((netProfit / revenue) * 100).toFixed(1)) : 0;

    // Parse products
    const products = (productRows as ProductRow[]).map((row) => ({
      name:    row.name,
      revenue: parseFloat(row.revenue) || 0,
      cogs:    parseFloat(row.cogs)    || 0,
      profit:  parseFloat(row.profit)  || 0,
      margin:  parseFloat(row.margin)  || 0,
    }));

    // Parse channels
    const channels = (channelRows as ChannelRow[]).map((row) => ({
      name:    row.channel,
      revenue: parseFloat(row.revenue) || 0,
      orders:  parseInt(row.orders, 10) || 0,
    }));

    // Parse date range
    const dateRangeRow = dateRangeRows[0] as DateRangeRow | undefined;
    const dateRange = {
      start: dateRangeRow?.start ?? null,
      end:   dateRangeRow?.end   ?? null,
    };

    // Health score
    const hasNegativeMarginProducts = products.some((p) => p.margin < 0);
    const healthScore = calculateHealthScore({
      margin,
      orders,
      adSpend,
      revenue,
      productCount: products.length,
      hasNegativeMarginProducts,
    });

    return NextResponse.json({
      healthScore,
      revenue:    parseFloat(revenue.toFixed(2)),
      totalCosts,
      netProfit,
      margin,
      orders,
      adSpend:    parseFloat(adSpend.toFixed(2)),
      products,
      channels,
      dateRange,
    });
  } catch (error) {
    console.error("Demo snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to load demo snapshot" },
      { status: 500 }
    );
  }
}
