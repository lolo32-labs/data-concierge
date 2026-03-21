import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/client-config";
import { generateSQL, formatAnswer } from "@/lib/gemini";
import { validateSQL } from "@/lib/sql-validator";
import { executeClientQuery } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";
import { isAuthenticated } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;

  // Auth check
  if (!(await isAuthenticated(clientId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateCheck = checkRateLimit(clientId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
    );
  }

  // Load client config
  const config = await getClientConfig(clientId);
  if (!config) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Parse request body
  const body = await request.json();
  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    // Special case: "what if" / "raise prices" simulations — these aren't SQL queries
    const lowerQ = question.toLowerCase();
    if (lowerQ.includes("raise price") || lowerQ.includes("raise all price") || (lowerQ.includes("what if") && lowerQ.includes("price"))) {
      // Get current revenue and profit from a simple query
      let rows;
      try {
        rows = await executeClientQuery(
          config.database_schema,
          `SELECT COALESCE(SUM(subtotal), 0) AS revenue,
                  COALESCE(SUM(subtotal), 0) - COALESCE((SELECT SUM(oi.unit_cost * oi.quantity) FROM order_items oi JOIN orders o2 ON oi.order_id = o2.id WHERE o2.status NOT IN ('refunded','cancelled')), 0) AS gross_profit
           FROM orders WHERE status NOT IN ('refunded','cancelled')`
        );
      } catch {
        rows = [{ revenue: 0, gross_profit: 0 }];
      }

      const revenue = Number(rows[0]?.revenue ?? 0);
      const grossProfit = Number(rows[0]?.gross_profit ?? 0);

      // Extract percentage from question (default to 10%)
      const pctMatch = lowerQ.match(/(\d+)\s*%/);
      const pct = pctMatch ? parseInt(pctMatch[1], 10) : 10;
      const increase = pct / 100;

      const newRevenue = revenue * (1 + increase);
      const newProfit = grossProfit + (revenue * increase);
      const fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const answer = `**If you raise all prices by ${pct}%:**\n\n` +
        `- Current revenue: **${fmt(revenue)}**\n` +
        `- New revenue: **${fmt(newRevenue)}** (+${fmt(revenue * increase)})\n` +
        `- Current gross profit: **${fmt(grossProfit)}**\n` +
        `- New gross profit: **${fmt(newProfit)}** (+${fmt(revenue * increase)})\n\n` +
        `This assumes the same order volume — no demand drop from higher prices. ` +
        `In practice, a ${pct}% price increase often reduces volume by 2-5%. ` +
        `**Recommendation:** Test the increase on your top 3 products first and monitor conversion rates for 2 weeks before rolling out store-wide.`;

      return NextResponse.json({ answer });
    }

    // Step 1: Generate SQL
    const rawSQL = await generateSQL(question, config.schema_description, config.business_context);

    // Step 2: Validate SQL
    console.log("Generated SQL:", rawSQL);
    const validation = validateSQL(rawSQL);
    if (!validation.valid) {
      console.error("SQL validation failed:", validation.error, "SQL:", rawSQL);
      return NextResponse.json({
        answer: "I wasn't able to answer that specific question. Try asking about your profit, top products, ad spend, or channel margins — those are my specialties!",
      });
    }

    // Step 3: Execute query
    let rows;
    try {
      rows = await executeClientQuery(config.database_schema, validation.sql);
    } catch (dbError: unknown) {
      const message = dbError instanceof Error ? dbError.message : "Unknown error";
      if (message.includes("canceling statement due to statement timeout")) {
        return NextResponse.json({
          answer: "That question is too complex. Try breaking it into smaller parts.",
        });
      }
      console.error("DB query error:", message);
      return NextResponse.json({
        answer: "I wasn't able to answer that specific question. Try asking about your profit, top products, ad spend, or channel margins — those are my specialties!",
      });
    }

    // Step 4: Handle empty results
    if (rows.length === 0) {
      return NextResponse.json({
        answer: "No data found for that question. Try a broader time range?",
      });
    }

    // Step 5: Format answer
    const answer = await formatAnswer(question, rows, config.business_context);

    return NextResponse.json({ answer, rowCount: rows.length });
  } catch (error) {
    console.error("Chat error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      answer: "I'm temporarily unavailable. Please try again in a minute.",
    });
  }
}
