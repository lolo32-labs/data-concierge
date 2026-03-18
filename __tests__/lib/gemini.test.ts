import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSQL, formatAnswer } from "@/lib/gemini";

// Mock the Gemini SDK
vi.mock("@google/generative-ai", () => {
  const generateContent = vi.fn();
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(function () {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({ generateContent }),
      };
    }),
    __mockGenerateContent: generateContent,
  };
});

import { __mockGenerateContent as mockGenerate } from "@google/generative-ai";

describe("generateSQL", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns SQL extracted from Gemini response", async () => {
    (mockGenerate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: { text: () => "SELECT SUM(total) FROM orders WHERE date > now() - interval '30 days'" },
    });

    const sql = await generateSQL(
      "What were my total sales last month?",
      "Tables: orders (id, date, total)",
      "Auto parts store"
    );

    expect(sql).toBe("SELECT SUM(total) FROM orders WHERE date > now() - interval '30 days'");
  });

  it("strips markdown code fences from response", async () => {
    (mockGenerate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: { text: () => "```sql\nSELECT 1\n```" },
    });

    const sql = await generateSQL("test", "schema", "context");
    expect(sql).toBe("SELECT 1");
  });
});

describe("formatAnswer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns formatted answer from Gemini", async () => {
    (mockGenerate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: { text: () => "Your total sales last month were **$34,700**, up 12% from the previous month." },
    });

    const answer = await formatAnswer(
      "What were my total sales last month?",
      [{ sum: 34700 }],
      "Auto parts store"
    );

    expect(answer).toContain("$34,700");
  });
});
