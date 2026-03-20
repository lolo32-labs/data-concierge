import { NextResponse } from "next/server";
import { Pool, type QueryResultRow } from "pg";

// Use a dedicated pool for demo queries to avoid connection contention
const pool = new Pool({
  connectionString: process.env.DATABASE_READONLY_URL || process.env.DATABASE_URL,
  max: 3,
});

async function demoQuery<T extends QueryResultRow = QueryResultRow>(sql: string): Promise<T[]> {
  const result = await pool.query<T>(sql);
  return result.rows;
}

const S = "client_shopify_demo"; // schema prefix

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
    // All queries use fully qualified table names (no search_path needed)
    // Date filter: last 30 days relative to max date in data (avoids CURRENT_DATE staleness)
    const cutoff = `(SELECT MAX(date)::date - interval '30 days' FROM ${S}.orders)`;
    const valid = `status NOT IN ('refunded', 'cancelled')`;

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
      demoQuery(`SELECT COALESCE(SUM(subtotal), 0)::text AS value FROM ${S}.orders WHERE date >= ${cutoff} AND ${valid}`),
      demoQuery(`SELECT COALESCE(SUM(oi.quantity * oi.unit_cost), 0)::text AS value FROM ${S}.order_items oi JOIN ${S}.orders o ON o.id = oi.order_id WHERE o.date >= ${cutoff} AND o.status NOT IN ('refunded', 'cancelled')`),
      demoQuery(`SELECT COALESCE(SUM(shipping_cost + shopify_fee + payment_fee + discount + refund), 0)::text AS value FROM ${S}.orders WHERE date >= ${cutoff} AND ${valid}`),
      demoQuery(`SELECT COALESCE(SUM(spend), 0)::text AS value FROM ${S}.ad_spend WHERE date >= ${cutoff}`),
      demoQuery(`SELECT COUNT(*)::text AS value FROM ${S}.orders WHERE date >= ${cutoff} AND ${valid}`),
      demoQuery(`SELECT p.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0)::text AS revenue, COALESCE(SUM(oi.quantity * oi.unit_cost), 0)::text AS cogs, COALESCE(SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost), 0)::text AS profit, CASE WHEN SUM(oi.quantity * oi.unit_price) > 0 THEN ROUND((SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost)) / SUM(oi.quantity * oi.unit_price) * 100, 1)::text ELSE '0' END AS margin FROM ${S}.order_items oi JOIN ${S}.orders o ON o.id = oi.order_id JOIN ${S}.products p ON p.id = oi.product_id WHERE o.date >= ${cutoff} AND o.status NOT IN ('refunded', 'cancelled') GROUP BY p.id, p.name ORDER BY (SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost)) DESC`),
      demoQuery(`SELECT channel, COALESCE(SUM(subtotal), 0)::text AS revenue, COUNT(*)::text AS orders FROM ${S}.orders WHERE date >= ${cutoff} AND ${valid} GROUP BY channel ORDER BY SUM(subtotal) DESC`),
      demoQuery(`SELECT MIN(date)::date::text AS start, MAX(date)::date::text AS end FROM ${S}.orders WHERE date >= ${cutoff} AND ${valid}`),
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
