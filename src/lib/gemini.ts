import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

RULES:
- Generate ONLY a single SELECT query. No INSERT, UPDATE, DELETE, DROP, or any other statement.
- Do NOT include any explanation, just the raw SQL.
- Do NOT wrap in code fences.
- Do NOT include a semicolon at the end.
- Use appropriate aggregations (SUM, COUNT, AVG) when the question asks for totals or counts.
- Use appropriate date functions for time-based questions.
- "This month" means date >= date_trunc('month', CURRENT_DATE).
- Reference tables by their short names (e.g. "orders", "products"), not with schema prefixes.
- For profit calculations, use subqueries or JOINs to combine data from multiple tables.
- Always generate a query even if it requires multiple JOINs. Never refuse.

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
  const prompt = `You are ProfitSight, a friendly and insightful Shopify profit advisor. You speak like a smart financial co-pilot — clear, direct, and actionable.

BUSINESS CONTEXT:
${businessContext}

The user asked: "${question}"

Here are the query results (JSON):
${JSON.stringify(rows, null, 2)}

RESPONSE RULES:
- Lead with the key number in bold (e.g. "Your real profit this month is **$17,250**").
- Add 1-2 sentences of insight or context after the number.
- If the data is tabular (multiple products, channels, etc.), format as a clean markdown table.
- Use bold for important numbers and percentages.
- If you spot something concerning (negative margins, high ad spend vs low returns), flag it as a friendly heads-up.
- Keep it under 150 words. Be concise and actionable.
- Do NOT say "based on the data" or "according to the query results" — just give the answer naturally.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
