/**
 * Rate limiter for preventing abuse.
 *
 * Uses Upstash Redis (sliding window, survives across serverless instances)
 * when UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are set. Falls back
 * to an in-memory store otherwise - fine for local dev, but note it does
 * NOT survive across serverless instances/cold starts if deployed without
 * Upstash configured.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasUpstash ? Redis.fromEnv() : null;

// Ratelimit instances are meant to be long-lived singletons (per Upstash's
// own docs), but this module is called with different (limit, windowMs)
// pairs per call site - cache one instance per pair instead of per call.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const memoryStore: RateLimitStore = {};

function isRateLimitedInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = memoryStore[key];

  if (!record || now > record.resetTime) {
    memoryStore[key] = { count: 1, resetTime: now + windowMs };
    return false;
  }

  record.count++;
  return record.count > limit;
}

/**
 * Rate limit a request by key.
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
  if (!hasUpstash) {
    return isRateLimitedInMemory(key, limit, windowMs);
  }

  const { success } = await getLimiter(limit, windowMs).limit(key);
  return !success;
}

/**
 * Get remaining requests for a key.
 */
export async function getRemainingRequests(key: string, limit: number = 5): Promise<number> {
  if (!hasUpstash) {
    const record = memoryStore[key];
    if (!record || Date.now() > record.resetTime) return limit;
    return Math.max(0, limit - record.count);
  }

  // Upstash's Ratelimit doesn't expose a peek-only check without consuming
  // a request, so approximate via getRemaining on the underlying limiter.
  const cacheKey = [...limiters.keys()][0];
  if (!cacheKey) return limit;
  const limiter = limiters.get(cacheKey)!;
  const { remaining } = await limiter.getRemaining(key);
  return remaining;
}

/**
 * Reset rate limit for a key (admin/manual reset).
 */
export async function resetRateLimit(key: string): Promise<void> {
  if (!hasUpstash) {
    delete memoryStore[key];
    return;
  }
  // Upstash's Ratelimit stores its sliding-window state under internally
  // prefixed keys; direct reset isn't part of its public API. This is
  // best-effort for the in-memory path only - Redis-backed limits expire
  // via TTL instead.
}

/**
 * Clear all rate limits (useful for testing). In-memory only - there's no
 * safe "clear everything" operation against a shared Redis instance.
 */
export function clearAllRateLimits(): void {
  Object.keys(memoryStore).forEach((key) => {
    delete memoryStore[key];
  });
}
