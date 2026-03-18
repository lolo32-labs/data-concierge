type Allowed = { allowed: true };
type Rejected = { allowed: false; retryAfterMs: number };
export type RateLimitResult = Allowed | Rejected;

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

const windows = new Map<string, { count: number; startedAt: number }>();

export function checkRateLimit(clientId: string): RateLimitResult {
  const now = Date.now();
  const entry = windows.get(clientId);

  if (!entry || now - entry.startedAt > WINDOW_MS) {
    windows.set(clientId, { count: 1, startedAt: now });
    return { allowed: true };
  }

  if (entry.count < MAX_REQUESTS) {
    entry.count++;
    return { allowed: true };
  }

  const retryAfterMs = WINDOW_MS - (now - entry.startedAt);
  return { allowed: false, retryAfterMs };
}

export function resetRateLimiter(): void {
  windows.clear();
}
