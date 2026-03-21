// src/lib/metrics.ts
import { readonlyPool as metricsPool } from "./pool";

export interface StoreMetrics {
  healthScore: number;
  revenue: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  orders: number;
  adSpend: number;
  products: ProductMetric[];
  channels: ChannelMetric[];
  dateRange: { start: string | null; end: string | null };
}

export interface ProductMetric {
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

export interface ChannelMetric {
  name: string;
  revenue: number;
  orders: number;
}

interface ScalarRow {
  value: string | null;
}

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

/**
 * Quote a SQL identifier to prevent injection in SET search_path.
 */
function quoteIdent(ident: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ident)) {
    throw new Error(`Invalid schema name: ${ident}`);
  }
  return `"${ident}"`;
}

/**
 * Compute store metrics for any client schema.
 * Uses a single database connection: sets search_path once, runs all queries
 * sequentially, then releases — avoiding connection pool contention.
 */
export async function computeStoreMetrics(schema: string): Promise<StoreMetrics> {
  const client = await metricsPool.connect();

  try {
    // Set search_path once for all subsequent queries on this connection
    await client.query(`SET search_path = ${quoteIdent(schema)}`);
    await client.query("SET statement_timeout = 10000");

    // Date filter: last 30 days relative to max date in data
    const cutoff = `(SELECT MAX(date)::date - interval '30 days' FROM orders)`;
    const valid = `status NOT IN ('refunded', 'cancelled')`;

    // Run all queries sequentially on the same connection
    const revenueResult = await client.query<ScalarRow>(
      `SELECT COALESCE(SUM(subtotal), 0)::text AS value FROM orders WHERE date >= ${cutoff} AND ${valid}`
    );

    const cogsResult = await client.query<ScalarRow>(
      `SELECT COALESCE(SUM(oi.quantity * oi.unit_cost), 0)::text AS value
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.date >= ${cutoff} AND o.status NOT IN ('refunded', 'cancelled')`
    );

    const feesResult = await client.query<ScalarRow>(
      `SELECT COALESCE(SUM(shipping_cost + shopify_fee + payment_fee + discount + refund), 0)::text AS value
       FROM orders WHERE date >= ${cutoff} AND ${valid}`
    );

    const adSpendResult = await client.query<ScalarRow>(
      `SELECT COALESCE(SUM(spend), 0)::text AS value FROM ad_spend WHERE date >= ${cutoff}`
    );

    const orderCountResult = await client.query<ScalarRow>(
      `SELECT COUNT(*)::text AS value FROM orders WHERE date >= ${cutoff} AND ${valid}`
    );

    const productResult = await client.query<ProductRow>(
      `SELECT p.name,
              COALESCE(SUM(oi.quantity * oi.unit_price), 0)::text AS revenue,
              COALESCE(SUM(oi.quantity * oi.unit_cost), 0)::text AS cogs,
              COALESCE(SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost), 0)::text AS profit,
              CASE
                WHEN SUM(oi.quantity * oi.unit_price) > 0
                THEN ROUND(((SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost))
                     / SUM(oi.quantity * oi.unit_price) * 100)::numeric, 1)::text
                ELSE '0'
              END AS margin
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.date >= ${cutoff} AND o.status NOT IN ('refunded', 'cancelled')
       GROUP BY p.id, p.name
       ORDER BY (SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost)) DESC`
    );

    const channelResult = await client.query<ChannelRow>(
      `SELECT channel,
              COALESCE(SUM(subtotal), 0)::text AS revenue,
              COUNT(*)::text AS orders
       FROM orders
       WHERE date >= ${cutoff} AND ${valid}
       GROUP BY channel
       ORDER BY SUM(subtotal) DESC`
    );

    const dateRangeResult = await client.query<DateRangeRow>(
      `SELECT MIN(date)::date::text AS start, MAX(date)::date::text AS end
       FROM orders WHERE date >= ${cutoff} AND ${valid}`
    );

    // Parse scalar values
    const revenue = parseFloat(revenueResult.rows[0]?.value ?? "0") || 0;
    const cogs    = parseFloat(cogsResult.rows[0]?.value ?? "0") || 0;
    const fees    = parseFloat(feesResult.rows[0]?.value ?? "0") || 0;
    const adSpend = parseFloat(adSpendResult.rows[0]?.value ?? "0") || 0;
    const orders  = parseInt(orderCountResult.rows[0]?.value ?? "0", 10) || 0;

    const totalCosts = parseFloat((cogs + fees + adSpend).toFixed(2));
    const netProfit  = parseFloat((revenue - totalCosts).toFixed(2));
    const margin     = revenue > 0 ? parseFloat(((netProfit / revenue) * 100).toFixed(1)) : 0;

    // Parse products
    const products: ProductMetric[] = productResult.rows.map((row) => ({
      name:    row.name,
      revenue: parseFloat(row.revenue) || 0,
      cogs:    parseFloat(row.cogs)    || 0,
      profit:  parseFloat(row.profit)  || 0,
      margin:  parseFloat(row.margin)  || 0,
    }));

    // Parse channels
    const channels: ChannelMetric[] = channelResult.rows.map((row) => ({
      name:    row.channel,
      revenue: parseFloat(row.revenue) || 0,
      orders:  parseInt(row.orders, 10) || 0,
    }));

    // Parse date range
    const dateRangeRow = dateRangeResult.rows[0] as DateRangeRow | undefined;
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

    return {
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
    };
  } finally {
    // Reset search_path before returning connection to pool
    await client.query("RESET search_path");
    await client.query("RESET statement_timeout");
    client.release();
  }
}
