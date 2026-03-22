// src/lib/query-templates.ts — 5 parameterized query templates for the killer questions.
// Intent classification + template selection + SQL generation.

export interface QueryTemplate {
  id: string;
  intent: string;
  description: string;
  question: string; // The killer question this answers
  buildQuery: (storeId: string, params: Record<string, string>) => string;
  formatHint: string; // Instructions for Gemini on how to format the answer
}

// ── Template 1: Profit Summary (Q1) ────────────────────────────────

const profitSummary: QueryTemplate = {
  id: "profit_summary",
  intent: "profit_summary",
  description: "Overall profit: revenue, costs, fees, ad spend, refunds, net profit",
  question: "What's my real profit this month?",
  buildQuery: (storeId, params) => {
    const days = params.days || "30";
    return `
      SELECT
        COALESCE(SUM(current_total_price), 0) AS revenue,
        COALESCE(SUM(total_refunded), 0) AS refunds,
        COUNT(*) AS order_count
      FROM shopify_orders
      WHERE store_id = '${storeId}'
        AND created_at_shopify >= NOW() - INTERVAL '${days} days'
        AND financial_status IN ('paid', 'partially_refunded')`;
  },
  formatHint: "Present as a profit waterfall: Revenue → minus COGS → minus fees → minus ad spend → minus refunds = Net Profit. Use dollar amounts. If COGS data is incomplete, mention it.",
};

// ── Template 2: Product Profitability (Q2) ─────────────────────────

const productProfitability: QueryTemplate = {
  id: "product_profitability",
  intent: "product_profitability",
  description: "Which products make or lose money, ranked by profit",
  question: "Which products are actually making me money?",
  buildQuery: (storeId, params) => {
    const days = params.days || "30";
    const limit = params.limit || "10";
    return `
      SELECT
        p.title,
        COALESCE(SUM(li.quantity * li.unit_price), 0) AS revenue,
        COALESCE(SUM(li.quantity * COALESCE(c.cost_per_unit, 0)), 0) AS cogs,
        COALESCE(SUM(li.quantity * li.unit_price) - SUM(li.quantity * COALESCE(c.cost_per_unit, 0)), 0) AS profit,
        COALESCE(SUM(li.quantity), 0) AS units_sold,
        CASE WHEN SUM(li.quantity * li.unit_price) > 0
          THEN ROUND(((SUM(li.quantity * li.unit_price) - SUM(li.quantity * COALESCE(c.cost_per_unit, 0)))
               / SUM(li.quantity * li.unit_price) * 100)::numeric, 1)
          ELSE 0 END AS margin_pct
      FROM shopify_order_line_items li
      JOIN shopify_orders o ON o.id = li.order_id
      LEFT JOIN shopify_product_variants v ON v.id = li.variant_id
      LEFT JOIN shopify_products p ON p.id = v.product_id
      LEFT JOIN cogs_entries c ON c.variant_id = li.variant_id AND c.effective_to IS NULL
      WHERE o.store_id = '${storeId}'
        AND o.created_at_shopify >= NOW() - INTERVAL '${days} days'
        AND o.financial_status IN ('paid', 'partially_refunded')
        AND p.id IS NOT NULL
      GROUP BY p.id, p.title
      ORDER BY profit DESC
      LIMIT ${limit}`;
  },
  formatHint: "Show a ranked table of products with revenue, cost, profit, and margin %. Highlight any products with negative margins. Suggest investigating low-margin products.",
};

// ── Template 3: Ad Spend ROAS (Q3) ─────────────────────────────────

const adSpendRoas: QueryTemplate = {
  id: "ad_spend_roas",
  intent: "ad_spend_roas",
  description: "Ad spend vs revenue return by platform",
  question: "How much did I spend on ads vs. what they brought in?",
  buildQuery: (storeId, params) => {
    const days = params.days || "30";
    return `
      SELECT
        platform,
        SUM(amount) AS spend
      FROM ad_spend_entries
      WHERE store_id = '${storeId}'
        AND month >= (CURRENT_DATE - INTERVAL '${days} days')::date
      GROUP BY platform
      ORDER BY spend DESC`;
  },
  formatHint: "Show ad spend by platform. Calculate ROAS (revenue / ad spend) if total revenue is known. If no ad spend data, tell the merchant they can add it in Settings. Suggest which platforms might be worth scaling or cutting.",
};

// ── Template 4: Channel Margins (Q4) ───────────────────────────────

const channelMargins: QueryTemplate = {
  id: "channel_margins",
  intent: "channel_margins",
  description: "Revenue and order breakdown by sales channel",
  question: "What are my margins by order channel/source?",
  buildQuery: (storeId, params) => {
    const days = params.days || "30";
    return `
      SELECT
        COALESCE(channel_name, 'Online Store') AS channel,
        COUNT(*) AS orders,
        COALESCE(SUM(current_total_price), 0) AS revenue,
        ROUND(AVG(current_total_price)::numeric, 2) AS avg_order
      FROM shopify_orders
      WHERE store_id = '${storeId}'
        AND created_at_shopify >= NOW() - INTERVAL '${days} days'
        AND financial_status IN ('paid', 'partially_refunded')
      GROUP BY channel_name
      ORDER BY revenue DESC`;
  },
  formatHint: "Present channel breakdown as a table. Compare channels by revenue, orders, and average order value. Note which channels have the highest AOV. If there's only one channel, mention that.",
};

// ── Template 5: Profit Waterfall (Q1 detailed) ─────────────────────

const profitWaterfall: QueryTemplate = {
  id: "profit_waterfall",
  intent: "profit_waterfall",
  description: "Detailed profit waterfall with every cost line item",
  question: "Break down my profit step by step",
  buildQuery: (storeId, params) => {
    const days = params.days || "30";
    return `
      WITH order_stats AS (
        SELECT
          COALESCE(SUM(subtotal_price), 0) AS gross_revenue,
          COALESCE(SUM(total_shipping), 0) AS shipping_collected,
          COALESCE(SUM(total_tax), 0) AS tax_collected,
          COALESCE(SUM(total_discounts), 0) AS discounts,
          COALESCE(SUM(total_refunded), 0) AS refunds,
          COALESCE(SUM(subtotal_price - total_discounts), 0) AS net_revenue,
          COUNT(*) AS order_count
        FROM shopify_orders
        WHERE store_id = '${storeId}'
          AND created_at_shopify >= NOW() - INTERVAL '${days} days'
          AND financial_status IN ('paid', 'partially_refunded')
      ),
      cogs_total AS (
        SELECT COALESCE(SUM(li.quantity * COALESCE(c.cost_per_unit, 0)), 0) AS total_cogs
        FROM shopify_order_line_items li
        JOIN shopify_orders o ON o.id = li.order_id
        LEFT JOIN cogs_entries c ON c.variant_id = li.variant_id AND c.effective_to IS NULL
        WHERE o.store_id = '${storeId}'
          AND o.created_at_shopify >= NOW() - INTERVAL '${days} days'
          AND o.financial_status IN ('paid', 'partially_refunded')
      ),
      ad_total AS (
        SELECT COALESCE(SUM(amount), 0) AS total_ads
        FROM ad_spend_entries
        WHERE store_id = '${storeId}'
          AND month >= (CURRENT_DATE - INTERVAL '${days} days')::date
      )
      SELECT os.*, ct.total_cogs, at.total_ads
      FROM order_stats os, cogs_total ct, ad_total at`;
  },
  formatHint: "Present as a detailed waterfall: Gross Revenue (subtotal_price) → minus Discounts → Net Revenue → minus COGS → minus Shopify Fees (estimate 2.9% of net_revenue + $0.30/order) → minus Ad Spend → minus Refunds = Net Profit. Show each line with dollar amounts. Calculate the margin percentage. Note: shipping_collected is pass-through, not profit.",
};

// ── Template Registry ───────────────────────────────────────────────

export const TEMPLATES: QueryTemplate[] = [
  profitSummary,
  productProfitability,
  adSpendRoas,
  channelMargins,
  profitWaterfall,
];

export const TEMPLATE_MAP = new Map(TEMPLATES.map((t) => [t.id, t]));

// ── Intent Classification Prompt ────────────────────────────────────

export const CLASSIFY_PROMPT = `You are an intent classifier for ProfitSight, a Shopify profit tracking tool.

Given a merchant's question, return JSON with:
- intent: one of [${TEMPLATES.map((t) => t.id).join(", ")}, freeform]
- params: extracted parameters (days: "7"|"30"|"90", limit: "5"|"10"|"20", product: "name")
- confidence: 0 to 1

Examples:
- "What's my profit this month?" -> {"intent":"profit_summary","params":{"days":"30"},"confidence":0.95}
- "Which products lose money?" -> {"intent":"product_profitability","params":{"days":"30","limit":"10"},"confidence":0.9}
- "How are my Facebook ads doing?" -> {"intent":"ad_spend_roas","params":{"days":"30"},"confidence":0.85}
- "Break down my margins by channel" -> {"intent":"channel_margins","params":{"days":"30"},"confidence":0.9}
- "Show me the full profit breakdown" -> {"intent":"profit_waterfall","params":{"days":"30"},"confidence":0.9}
- "How many blue widgets did I sell?" -> {"intent":"freeform","params":{},"confidence":0.1}

Return ONLY valid JSON. No explanation.

Question: `;
