// POST /api/webhooks/shopify — Single endpoint for all Shopify webhooks.
// Routes by X-Shopify-Topic header. Validates HMAC on every request.
import { NextResponse } from "next/server";
import { validateWebhookHmac } from "@/lib/shopify";
import { handleWebhook } from "@/lib/shopify-webhooks";

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.error("SHOPIFY_API_SECRET not configured");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  // Read raw body for HMAC validation
  const body = await request.text();

  // Validate HMAC signature
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader || !validateWebhookHmac(body, hmacHeader, secret)) {
    console.error("Webhook HMAC validation failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract routing info
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  if (!topic || !shopDomain) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Parse payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle asynchronously — respond 200 immediately to Shopify
  // (Shopify retries if it doesn't get 200 within 5 seconds)
  try {
    await handleWebhook(topic, shopDomain, payload);
  } catch (error) {
    // Log but still return 200 — Shopify will retry on non-200
    console.error(`Webhook handler error [${topic}]:`, error);
  }

  return NextResponse.json({ ok: true });
}
