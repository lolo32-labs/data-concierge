// POST /api/chat — Authenticated chat endpoint with intent classification + query templates.
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth-config";
import { pool, readonlyPool } from "@/lib/pool";
import { CLASSIFY_PROMPT, TEMPLATE_MAP } from "@/lib/query-templates";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "No store connected" }, { status: 401 });
  }

  const { message } = (await request.json()) as { message: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const storeId = session.user.storeId;

  try {
    // Step 1: Classify intent
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const classifyResult = await model.generateContent(CLASSIFY_PROMPT + message);
    const classifyText = classifyResult.response.text().trim();

    let intent = "freeform";
    let params: Record<string, string> = { days: "30" };
    let confidence = 0;

    try {
      const cleaned = classifyText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      intent = parsed.intent || "freeform";
      params = parsed.params || { days: "30" };
      confidence = parsed.confidence || 0;
    } catch {
      // Classification failed — fall back to freeform
    }

    // Step 2: Execute query
    let queryResult: Record<string, unknown>[] = [];
    let sqlExecuted = "";
    let templateUsed = "";

    const template = TEMPLATE_MAP.get(intent);
    if (template && confidence >= 0.3) {
      templateUsed = template.id;
      const sql = template.buildQuery(storeId, params);
      sqlExecuted = sql;

      const result = await readonlyPool.query(sql);
      queryResult = result.rows;
    } else {
      // Freeform fallback: use Gemini to generate SQL
      const schemaContext = `Tables available (all filtered by store_id='${storeId}'):
- shopify_orders: shopify_gid, order_number, created_at_shopify, financial_status (paid/partially_refunded/refunded/pending/voided), currency, subtotal_price, total_shipping, total_tax, total_discounts, total_refunded, current_total_price, channel_name
- shopify_order_line_items: order_id, shopify_gid, product_title, variant_title, sku, quantity, unit_price, total_discount
- shopify_products: shopify_gid, title, product_type, vendor, status
- shopify_product_variants: product_id, shopify_gid, title, sku, price, compare_at_price, inventory_quantity
- cogs_entries: variant_id, cost_per_unit, effective_from, effective_to (NULL=current), source
- ad_spend_entries: month, platform, amount
- shopify_refunds: order_id, shopify_gid, created_at_shopify, total_refunded`;

      const sqlPrompt = `You are a SQL expert for a Shopify profit tracking tool. Generate a single PostgreSQL query.
${schemaContext}

Rules:
- Always filter by store_id = '${storeId}'
- Only include orders with financial_status IN ('paid', 'partially_refunded')
- Use current_total_price for revenue (it accounts for refunds)
- Return ONLY the SQL query, no explanation, no semicolons
- LIMIT results to 20 rows max

Question: ${message}`;

      try {
        const sqlResult = await model.generateContent(sqlPrompt);
        sqlExecuted = sqlResult.response.text()
          .replace(/```sql\n?/g, "").replace(/```\n?/g, "")
          .replace(/;/g, "").trim();

        const result = await readonlyPool.query(sqlExecuted);
        queryResult = result.rows;
      } catch (sqlError) {
        console.error("Freeform SQL failed:", sqlError);
        queryResult = [];
        sqlExecuted = "FAILED";
      }
    }

    // Step 3: Format the answer with Gemini
    const formatHint = template?.formatHint || "Present the data clearly with specific numbers.";
    const disclaimer = confidence >= 0.3 && confidence < 0.7
      ? "\n\nNote: Add a brief disclaimer that you interpreted the question as asking about " + (template?.description || intent)
      : "";

    const formatPrompt = `You are ProfitSight, a Shopify profit advisor. Format this data into a helpful answer.

Question: ${message}
Data: ${JSON.stringify(queryResult)}
Format instructions: ${formatHint}${disclaimer}

Rules:
- Use specific dollar amounts and percentages
- Be concise but thorough
- If data is empty, say so and suggest what the merchant can do
- Use markdown for structure (bold for key numbers, tables for comparisons)
- End with one actionable recommendation
- Do NOT show raw SQL or technical details`;

    const answerResult = await model.generateContent(formatPrompt);
    const answer = answerResult.response.text();

    // Step 4: Save to chat history
    await pool.query(
      `INSERT INTO chat_messages (store_id, role, content, query_template, sql_executed)
       VALUES ($1, 'user', $2, NULL, NULL),
              ($1, 'assistant', $3, $4, $5)`,
      [storeId, message, answer, templateUsed || null, sqlExecuted || null]
    );

    return NextResponse.json({
      answer,
      intent,
      confidence,
      templateUsed: templateUsed || null,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process your question. Please try again." },
      { status: 500 }
    );
  }
}
