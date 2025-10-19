/**
 * In-memory rate limiter for preventing abuse
 * Note: In production with multiple instances, use Redis instead
 */

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

/**
 * Rate limit a request by key
 * @param key Unique identifier (e.g., "register:user@example.com")
 * @param limit Maximum number of requests allowed
 * @param windowMs Time window in milliseconds
 * @returns true if rate limited, false if allowed
 */
export async function isRateLimited(
  key: string,
  limit: number = 5,
  windowMs: number = 3600000 // 1 hour default
): Promise<boolean> {
  const now = Date.now();
  const record = store[key];

  // Reset if window has expired
  if (!record || now > record.resetTime) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return false;
  }

  // Increment counter
  record.count++;

  // Check if exceeded limit
  if (record.count > limit) {
    return true;
  }

  return false;
}

/**
 * Get remaining requests for a key
 */
export function getRemainingRequests(key: string, limit: number = 5): number {
  const record = store[key];

  if (!record || Date.now() > record.resetTime) {
    return limit;
  }

  return Math.max(0, limit - record.count);
}

/**
 * Reset rate limit for a key (admin/manual reset)
 */
export function resetRateLimit(key: string): void {
  delete store[key];
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  Object.keys(store).forEach((key) => {
    delete store[key];
  });
}
