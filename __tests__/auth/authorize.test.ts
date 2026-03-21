import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQuery, mockCompare } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCompare: vi.fn(),
}));

vi.mock("@/lib/pool", () => ({
  pool: { query: mockQuery },
  readonlyPool: { query: mockQuery },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: unknown[]) => mockCompare(...args),
    hash: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (config: Record<string, unknown>) => config,
}));

import { authorizeCredentials } from "@/lib/auth-config";

describe("authorizeCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when credentials are undefined", async () => {
    const result = await authorizeCredentials(undefined);
    expect(result).toBeNull();
  });

  it("returns null when email is missing", async () => {
    const result = await authorizeCredentials({ password: "test1234" });
    expect(result).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns null when password is missing", async () => {
    const result = await authorizeCredentials({ email: "test@example.com" });
    expect(result).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns null when user not found in database", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await authorizeCredentials({
      email: "nobody@example.com",
      password: "test1234",
    });
    expect(result).toBeNull();
  });

  it("returns null when user has no password_hash (OAuth-only user)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "user-1", email: "oauth@example.com", name: "OAuth", password_hash: null }],
    });

    const result = await authorizeCredentials({
      email: "oauth@example.com",
      password: "test1234",
    });
    expect(result).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns null when password is incorrect", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "user-1",
          email: "test@example.com",
          name: "Test",
          password_hash: "$2a$12$existinghash",
        },
      ],
    });
    mockCompare.mockResolvedValueOnce(false);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "wrongpass",
    });
    expect(result).toBeNull();
    expect(mockCompare).toHaveBeenCalledWith("wrongpass", "$2a$12$existinghash");
  });

  it("returns user object when credentials are valid", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "user-1",
          email: "valid@example.com",
          name: "Valid User",
          password_hash: "$2a$12$existinghash",
        },
      ],
    });
    mockCompare.mockResolvedValueOnce(true);

    const result = await authorizeCredentials({
      email: "valid@example.com",
      password: "correctpass",
    });
    expect(result).toEqual({
      id: "user-1",
      email: "valid@example.com",
      name: "Valid User",
    });
  });

  it("does not return password_hash in the user object", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "user-1",
          email: "test@example.com",
          name: "Test",
          password_hash: "$2a$12$secret",
        },
      ],
    });
    mockCompare.mockResolvedValueOnce(true);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "correctpass",
    });
    expect(result).not.toHaveProperty("password_hash");
  });
});
