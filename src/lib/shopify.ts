// src/lib/shopify.ts — Shopify API utilities for ProfitSight.
// Handles HMAC validation, token exchange, and GraphQL client.
import { createHmac } from "crypto";

const API_VERSION = "2025-01";

const REQUIRED_SCOPES = [
  "read_orders",
  "read_all_orders",
  "read_products",
];

// ── HMAC Validation ─────────────────────────────────────────────────

/**
 * Validate the HMAC signature from Shopify's OAuth callback.
 * Shopify signs the query params (excluding hmac) with the API secret.
 */
export function validateHmac(
  query: Record<string, string>,
  secret: string
): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;

  // Build the message from all query params except hmac, sorted alphabetically
  const params = Object.keys(query)
    .filter((key) => key !== "hmac")
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join("&");

  const computed = createHmac("sha256", secret)
    .update(params)
    .digest("hex");

  // Timing-safe comparison
  if (computed.length !== hmac.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ hmac.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate HMAC for webhook payloads (different from OAuth HMAC).
 * Webhooks use the raw body + HMAC-SHA256 + base64 encoding.
 */
export function validateWebhookHmac(
  body: string,
  hmacHeader: string,
  secret: string
): boolean {
  const computed = createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  if (computed.length !== hmacHeader.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  }
  return result === 0;
}

// ── OAuth ───────────────────────────────────────────────────────────

/**
 * Build the Shopify OAuth authorization URL.
 */
export function buildAuthUrl(shop: string, state: string): string {
  const apiKey = process.env.SHOPIFY_API_KEY!;
  const redirectUri = `${process.env.AUTH_URL}/api/auth/shopify/callback`;
  const scopes = REQUIRED_SCOPES.join(",");

  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${apiKey}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`
  );
}

/**
 * Exchange the authorization code for an offline access token.
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const res = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ── GraphQL Client ──────────────────────────────────────────────────

/**
 * Execute a Shopify GraphQL Admin API query.
 */
export async function shopifyGraphQL(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

/**
 * Validate that a shop domain looks legitimate.
 * Must be *.myshopify.com format.
 */
export function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}
