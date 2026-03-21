import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPoolQuery, mockClientQuery, mockRelease, mockDecrypt, mockShopifyGQL } =
  vi.hoisted(() => ({
    mockPoolQuery: vi.fn(),
    mockClientQuery: vi.fn(),
    mockRelease: vi.fn(),
    mockDecrypt: vi.fn().mockReturnValue("shpat_decrypted_token"),
    mockShopifyGQL: vi.fn(),
  }));

vi.mock("@/lib/pool", () => ({
  pool: {
    query: mockPoolQuery,
    connect: vi.fn().mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    }),
  },
  readonlyPool: { query: vi.fn() },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: mockDecrypt,
  encrypt: vi.fn().mockReturnValue("encrypted"),
}));

vi.mock("@/lib/shopify", () => ({
  shopifyGraphQL: mockShopifyGQL,
  validateHmac: vi.fn(),
  validateWebhookHmac: vi.fn(),
  isValidShopDomain: vi.fn(),
  buildAuthUrl: vi.fn(),
  exchangeCodeForToken: vi.fn(),
}));

import { syncOrders, syncProducts } from "@/lib/shopify-sync";

describe("syncOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getStoreCredentials: store lookup + token lookup
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ shopify_domain: "test.myshopify.com" }] })
      .mockResolvedValueOnce({ rows: [{ access_token: "encrypted_token" }] })
      .mockResolvedValue({ rows: [] }); // all subsequent pool.query calls

    mockClientQuery.mockResolvedValue({ rows: [] });
  });

  it("handles empty store (no JSONL url)", async () => {
    mockShopifyGQL
      .mockResolvedValueOnce({
        bulkOperationRunQuery: {
          bulkOperation: { id: "op-1", status: "CREATED" },
          userErrors: [],
        },
      })
      .mockResolvedValueOnce({
        currentBulkOperation: {
          id: "op-1",
          status: "COMPLETED",
          url: null,
          objectCount: "0",
        },
      });

    const result = await syncOrders("store-1", "2026-01-01");
    expect(result).toEqual({ orders: 0, lineItems: 0, refunds: 0 });
  });

  it("throws on bulk operation failure", async () => {
    mockShopifyGQL
      .mockResolvedValueOnce({
        bulkOperationRunQuery: {
          bulkOperation: { id: "op-1", status: "CREATED" },
          userErrors: [],
        },
      })
      .mockResolvedValueOnce({
        currentBulkOperation: {
          id: "op-1",
          status: "FAILED",
          errorCode: "ACCESS_DENIED",
        },
      });

    await expect(syncOrders("store-1", "2026-01-01")).rejects.toThrow(
      "Bulk operation failed: ACCESS_DENIED"
    );
  });

  it("throws on user errors from bulkOperationRunQuery", async () => {
    mockShopifyGQL.mockResolvedValueOnce({
      bulkOperationRunQuery: {
        bulkOperation: null,
        userErrors: [{ field: "query", message: "Invalid query" }],
      },
    });

    await expect(syncOrders("store-1", "2026-01-01")).rejects.toThrow(
      "Bulk operation error"
    );
  });

  it("updates store sync_status to error on failure", async () => {
    mockShopifyGQL.mockResolvedValueOnce({
      bulkOperationRunQuery: {
        bulkOperation: null,
        userErrors: [{ field: "query", message: "Bad" }],
      },
    });

    await expect(syncOrders("store-1", "2026-01-01")).rejects.toThrow();

    // Should have called pool.query to set status to 'syncing' and then 'error'
    const statusCalls = mockPoolQuery.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("sync_status")
    );
    expect(statusCalls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("syncProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ shopify_domain: "test.myshopify.com" }] })
      .mockResolvedValueOnce({ rows: [{ access_token: "encrypted_token" }] })
      .mockResolvedValue({ rows: [] });

    mockClientQuery.mockResolvedValue({ rows: [] });
  });

  it("handles empty product catalog", async () => {
    mockShopifyGQL
      .mockResolvedValueOnce({
        bulkOperationRunQuery: {
          bulkOperation: { id: "op-2", status: "CREATED" },
          userErrors: [],
        },
      })
      .mockResolvedValueOnce({
        currentBulkOperation: {
          id: "op-2",
          status: "COMPLETED",
          url: null,
          objectCount: "0",
        },
      });

    const result = await syncProducts("store-1");
    expect(result).toEqual({ products: 0, variants: 0 });
  });
});
