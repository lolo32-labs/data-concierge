// __tests__/lib/client-config.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientConfig, type ClientConfig } from "@/lib/client-config";

// Mock the db module
vi.mock("@/lib/db", () => ({
  executeAdminQuery: vi.fn(),
}));

import { executeAdminQuery } from "@/lib/db";
const mockQuery = vi.mocked(executeAdminQuery);

const EXAMPLE_ROW = {
  client_id: "mikes-auto",
  name: "Mike's Auto Parts",
  database_schema: "client_mikes_auto",
  password: "hashed_pw",
  suggested_questions: ["What were my top products?"],
  dashboard_metrics: [{ label: "Revenue", query: "SELECT 1", format: "currency", compare_query: "SELECT 0" }],
  schema_description: "Tables: customers, orders",
  business_context: "Auto parts store",
};

describe("getClientConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns config for a valid client ID", async () => {
    mockQuery.mockResolvedValueOnce([EXAMPLE_ROW]);
    const config = await getClientConfig("mikes-auto");
    expect(config).toEqual(EXAMPLE_ROW);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT * FROM public.client_configs WHERE client_id = $1",
      ["mikes-auto"]
    );
  });

  it("returns null for unknown client ID", async () => {
    mockQuery.mockResolvedValueOnce([]);
    const config = await getClientConfig("unknown");
    expect(config).toBeNull();
  });
});
