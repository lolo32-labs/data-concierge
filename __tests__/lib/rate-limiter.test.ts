import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, resetRateLimiter } from "@/lib/rate-limiter";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimiter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit("client-a")).toEqual({ allowed: true });
    }
  });

  it("rejects the 31st request within a minute", () => {
    for (let i = 0; i < 30; i++) {
      checkRateLimit("client-a");
    }
    expect(checkRateLimit("client-a")).toEqual({
      allowed: false,
      retryAfterMs: expect.any(Number),
    });
  });

  it("resets after the window expires", () => {
    for (let i = 0; i < 30; i++) {
      checkRateLimit("client-a");
    }
    expect(checkRateLimit("client-a").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit("client-a")).toEqual({ allowed: true });
  });

  it("tracks clients independently", () => {
    for (let i = 0; i < 30; i++) {
      checkRateLimit("client-a");
    }
    expect(checkRateLimit("client-a").allowed).toBe(false);
    expect(checkRateLimit("client-b").allowed).toBe(true);
  });
});
