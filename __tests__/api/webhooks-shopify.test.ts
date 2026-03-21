import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";

const { mockValidateWebhookHmac, mockHandleWebhook } = vi.hoisted(() => ({
  mockValidateWebhookHmac: vi.fn(),
  mockHandleWebhook: vi.fn(),
}));

vi.mock("@/lib/shopify", () => ({
  validateWebhookHmac: mockValidateWebhookHmac,
  validateHmac: vi.fn(),
  isValidShopDomain: vi.fn(),
  buildAuthUrl: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  shopifyGraphQL: vi.fn(),
}));

vi.mock("@/lib/shopify-webhooks", () => ({
  handleWebhook: mockHandleWebhook,
  registerWebhooks: vi.fn(),
}));

vi.mock("@/lib/pool", () => ({
  pool: { query: vi.fn() },
  readonlyPool: { query: vi.fn() },
}));

import { POST } from "@/app/api/webhooks/shopify/route";

const TEST_SECRET = "test-secret";

function makeWebhookRequest(
  body: string,
  topic: string,
  shop: string,
  valid = true
): Request {
  const hmac = valid
    ? createHmac("sha256", TEST_SECRET).update(body, "utf8").digest("base64")
    : "invalid-hmac";

  return new Request("http://localhost:3000/api/webhooks/shopify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shopify-hmac-sha256": hmac,
      "x-shopify-topic": topic,
      "x-shopify-shop-domain": shop,
    },
    body,
  });
}

describe("POST /api/webhooks/shopify", () => {
  const originalEnv = process.env.SHOPIFY_API_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHOPIFY_API_SECRET = TEST_SECRET;
    mockValidateWebhookHmac.mockReturnValue(true);
    mockHandleWebhook.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.SHOPIFY_API_SECRET = originalEnv;
  });

  it("returns 200 and calls handleWebhook for valid request", async () => {
    const body = '{"id": 123}';
    const req = makeWebhookRequest(body, "orders/create", "test.myshopify.com");

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockHandleWebhook).toHaveBeenCalledWith(
      "orders/create",
      "test.myshopify.com",
      { id: 123 }
    );
  });

  it("returns 401 when HMAC validation fails", async () => {
    mockValidateWebhookHmac.mockReturnValue(false);
    const body = '{"id": 123}';
    const req = makeWebhookRequest(body, "orders/create", "test.myshopify.com");

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });

  it("returns 400 when topic header is missing", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/shopify", {
      method: "POST",
      headers: {
        "x-shopify-hmac-sha256": "valid",
        "x-shopify-shop-domain": "test.myshopify.com",
      },
      body: '{"id": 123}',
    });
    mockValidateWebhookHmac.mockReturnValue(true);

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 even if handler throws (Shopify retries on non-200)", async () => {
    mockHandleWebhook.mockRejectedValueOnce(new Error("DB error"));
    const body = '{"id": 123}';
    const req = makeWebhookRequest(body, "orders/create", "test.myshopify.com");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req);
    expect(res.status).toBe(200);
    consoleSpy.mockRestore();
  });
});
