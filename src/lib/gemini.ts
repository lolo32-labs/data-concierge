import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Step 1: Generate a SQL query from a natural language question.
 */
export async function generateSQL(
  question: string,
  schemaDescription: string,
  businessContext: string
): Promise<string> {
  const prompt = `You are a SQL query generator for a PostgreSQL database.

DATABASE SCHEMA:
${schemaDescription}

BUSINESS CONTEXT:
${businessContext}

RULES:
- Generate ONLY a single SELECT query. No INSERT, UPDATE, DELETE, DROP, or any other statement.
- Do NOT include any explanation, just the raw SQL.
- Do NOT wrap in code fences.
- Use appropriate aggregations (SUM, COUNT, AVG) when the question asks for totals or counts.
- Use appropriate date functions for time-based questions.

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
  const prompt = `You are a helpful business data assistant.

BUSINESS CONTEXT:
${businessContext}

The user asked: "${question}"

Here are the query results (JSON):
${JSON.stringify(rows, null, 2)}

Provide a clear, concise answer in plain English. If the data is tabular, format it as a markdown table. Include relevant insights (trends, comparisons) when obvious from the data. Keep it under 200 words.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
