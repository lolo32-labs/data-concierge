import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { temperature: 0 },
});

/**
 * Step 1: Generate a SQL query from a natural language question.
 */
export async function generateSQL(
  question: string,
  schemaDescription: string,
  businessContext: string
): Promise<string> {
  const prompt = `You are a SQL query generator for a PostgreSQL database. You MUST generate a valid SELECT query.

DATABASE SCHEMA:
${schemaDescription}

BUSINESS CONTEXT:
${businessContext}

CRITICAL CALCULATION RULES:
- "Real profit" or "net profit" = Revenue (SUM of subtotal from orders) MINUS COGS (SUM of unit_cost * quantity from order_items) MINUS Fees (SUM of shipping_cost + shopify_fee + payment_fee from orders) MINUS Discounts (SUM of discount from orders) MINUS Refunds (SUM of refund from orders) MINUS Ad Spend (SUM of spend from ad_spend for the same date range).
- "Gross profit" = Revenue MINUS COGS only.
- "Margin" = (unit_price - unit_cost) / unit_price * 100.
- When calculating net profit that includes ad spend, use a subquery for ad_spend since it's a separate table.
- For "this month" or "recent" questions, filter by date >= (SELECT MAX(date) FROM orders) - INTERVAL '30 days'. This matches the dashboard's 30-day window.
- Exclude orders with status = 'refunded' or 'cancelled' from profit calculations unless specifically asked.
- When showing products, show the TOP 5 by default unless the user asks for more or fewer.

SQL GENERATION RULES:
- Generate ONLY a single SELECT query. No INSERT, UPDATE, DELETE, DROP, or any other statement.
- Do NOT include any explanation, just the raw SQL.
- Do NOT wrap in code fences.
- Do NOT include a semicolon at the end.
- Reference tables by their short names (e.g. "orders", "products"), not with schema prefixes.
- Always generate a query even if it requires multiple JOINs or subqueries. Never refuse.

USER QUESTION: ${question}

SQL:`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  return text.replace(/^```(?:sql)?\n?/i, "").replace(/\n?```$/i, "").trim();
}

/**
 * Step 2: Format raw query results into a human-friendly answer.
 */
export async function formatAnswer(
  question: string,
  rows: Record<string, unknown>[],
  businessContext: string
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const prompt = `You are ProfitSight, a Shopify profit advisor. You are precise, neutral, and actionable — like a trusted CFO, not a cheerful chatbot. Never sugarcoat bad numbers.

BUSINESS CONTEXT:
${businessContext}

Today's date: ${today}
Current month range: ${monthStart} to ${today} (month in progress)

The user asked: "${question}"

Here are the query results (JSON):
${JSON.stringify(rows, null, 2)}

RESPONSE FORMAT RULES:
1. **Lead with the key number in bold** (e.g. "Your net profit for March 1-20 is **$17,250**").
2. **Always state the date range** (e.g. "March 1-20, 2026").
3. **For profit questions, show the waterfall breakdown:**
   Revenue: $X → minus COGS: $X → minus Fees: $X → minus Ad Spend: $X = **Net Profit: $X**
   (Use a simple list format, not a table, for the waterfall.)
4. **For tabular data** (products, channels), use a clean markdown table with columns aligned. Show TOP 5 rows. If there are more, say "Showing top 5 of N."
5. **End with one actionable recommendation** — something specific the merchant could do based on this data.
6. **If numbers look concerning** (negative margins, rising costs, declining trends), flag it directly. Do not call bad results "solid" or "healthy."
7. Keep responses under 200 words. Be concise.
8. Do NOT say "based on the data" or "according to the query" — speak naturally.
9. Use bold for key numbers and percentages throughout.
10. NEVER write "Data not available", "N/A", or any placeholder text. If a value is 0 or null, write $0.00. Always use the actual numbers from the data provided.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
