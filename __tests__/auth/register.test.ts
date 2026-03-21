import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so the mock fn is available inside vi.mock factory
const { mockQuery, mockHash } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockHash: vi.fn().mockResolvedValue("$2a$12$hashedpassword"),
}));

vi.mock("@/lib/pool", () => ({
  pool: { query: mockQuery },
  readonlyPool: { query: mockQuery },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockHash },
}));

import { POST } from "@/app/api/auth/register/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue("$2a$12$hashedpassword");
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "validpass1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email|password/i);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(
      makeRequest({ email: "test@example.com", password: "short" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/8 characters/i);
  });

  it("returns 409 when email already exists (pre-check)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "existing-id" }] });

    const res = await POST(
      makeRequest({ email: "taken@example.com", password: "validpass1" })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already exists/i);
  });

  it("returns 201 and creates user on valid input", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "new-id", email: "new@example.com", name: "Test" }],
    });

    const res = await POST(
      makeRequest({
        email: "new@example.com",
        password: "validpass1",
        name: "Test",
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.email).toBe("new@example.com");
    expect(data.message).toMatch(/created/i);
  });

  it("passes null name when name not provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "new-id", email: "no-name@example.com", name: null }],
    });

    await POST(
      makeRequest({ email: "no-name@example.com", password: "validpass1" })
    );

    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1][1]).toBeNull();
  });

  it("returns 409 on Postgres unique violation (race condition)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const pgError = new Error("duplicate key") as Error & { code: string };
    pgError.code = "23505";
    mockQuery.mockRejectedValueOnce(pgError);

    const res = await POST(
      makeRequest({ email: "race@example.com", password: "validpass1" })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already exists/i);
  });

  it("returns 500 on unexpected database error", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockRejectedValueOnce(new Error("Connection lost"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(
      makeRequest({ email: "error@example.com", password: "validpass1" })
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/something went wrong/i);
    consoleSpy.mockRestore();
  });

  it("accepts password exactly 8 characters (boundary)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "new-id", email: "boundary@example.com", name: null }],
    });

    const res = await POST(
      makeRequest({ email: "boundary@example.com", password: "12345678" })
    );
    expect(res.status).toBe(201);
  });
});
