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
    // Step 1: Generate SQL
    const rawSQL = await generateSQL(question, config.schema_description, config.business_context);

    // Step 2: Validate SQL
    const validation = validateSQL(rawSQL);
    if (!validation.valid) {
      return NextResponse.json({
        answer: "I couldn't generate a query for that. Try rephrasing your question.",
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
        answer: "I couldn't generate a query for that. Try rephrasing your question.",
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
    return NextResponse.json({
      answer: "I'm temporarily unavailable. Please try again in a minute.",
    });
  }
}
