import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { validateHmac, validateWebhookHmac, isValidShopDomain } from "@/lib/shopify";

const TEST_SECRET = "test-secret-key-12345";

describe("validateHmac", () => {
  function signQuery(params: Record<string, string>): Record<string, string> {
    const message = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    const hmac = createHmac("sha256", TEST_SECRET).update(message).digest("hex");
    return { ...params, hmac };
  }

  it("returns true for valid HMAC", () => {
    const query = signQuery({
      code: "abc123",
      shop: "test.myshopify.com",
      state: "nonce123",
    });
    expect(validateHmac(query, TEST_SECRET)).toBe(true);
  });

  it("returns false for tampered parameters", () => {
    const query = signQuery({
      code: "abc123",
      shop: "test.myshopify.com",
      state: "nonce123",
    });
    query.code = "tampered";
    expect(validateHmac(query, TEST_SECRET)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const query = signQuery({
      code: "abc123",
      shop: "test.myshopify.com",
      state: "nonce123",
    });
    expect(validateHmac(query, "wrong-secret")).toBe(false);
  });

  it("returns false when hmac is missing", () => {
    expect(
      validateHmac({ code: "abc123", shop: "test.myshopify.com" }, TEST_SECRET)
    ).toBe(false);
  });
});

describe("validateWebhookHmac", () => {
  it("returns true for valid webhook HMAC", () => {
    const body = '{"id": 123, "topic": "orders/create"}';
    const hmac = createHmac("sha256", TEST_SECRET)
      .update(body, "utf8")
      .digest("base64");
    expect(validateWebhookHmac(body, hmac, TEST_SECRET)).toBe(true);
  });

  it("returns false for tampered body", () => {
    const body = '{"id": 123}';
    const hmac = createHmac("sha256", TEST_SECRET)
      .update(body, "utf8")
      .digest("base64");
    expect(validateWebhookHmac('{"id": 456}', hmac, TEST_SECRET)).toBe(false);
  });
});

describe("isValidShopDomain", () => {
  it("accepts valid myshopify.com domains", () => {
    expect(isValidShopDomain("my-store.myshopify.com")).toBe(true);
    expect(isValidShopDomain("profitsight-test.myshopify.com")).toBe(true);
    expect(isValidShopDomain("store123.myshopify.com")).toBe(true);
  });

  it("rejects invalid domains", () => {
    expect(isValidShopDomain("evil.com")).toBe(false);
    expect(isValidShopDomain("myshopify.com")).toBe(false);
    expect(isValidShopDomain("store.notshopify.com")).toBe(false);
    expect(isValidShopDomain("-invalid.myshopify.com")).toBe(false);
    expect(isValidShopDomain("")).toBe(false);
  });
});
