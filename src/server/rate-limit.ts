/**
 * In-memory sliding-window rate limiter.
 *
 * Each key (e.g. IP + route) maintains a sorted list of timestamps.
 * Entries older than the window are pruned on every check.
 * Returns { allowed, retryAfterMs } so callers can set Retry-After headers.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export type RateLimitConfig = {
  /** Maximum requests allowed within the window. */
  max: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

/** Max buckets before forcing a cleanup sweep. */
const MAX_BUCKETS = 10_000;

/** Prune and return the number of entries inside the window. */
function countInWindow(bucket: Bucket, now: number, windowMs: number): number {
  const cutoff = now - windowMs;
  while (bucket.timestamps.length > 0 && bucket.timestamps[0] <= cutoff) {
    bucket.timestamps.shift();
  }
  return bucket.timestamps.length;
}

/** Remove empty buckets to free memory. */
function evictEmptyBuckets() {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.length === 0) {
      buckets.delete(key);
    }
  }
}

/**
 * Check whether `key` is allowed under the given limit.
 * If allowed, the current timestamp is recorded.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
    evictEmptyBuckets();
  }

  const count = countInWindow(bucket, now, config.windowMs);

  if (count >= config.max) {
    const oldestInWindow = bucket.timestamps[0] ?? now;
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  bucket.timestamps.push(now);
  return { allowed: true, remaining: config.max - count - 1, retryAfterMs: 0 };
}

/**
 * Extract a rate-limit key from the request.
 *
 * Only trusts X-Forwarded-For when the request arrives from a trusted proxy
 * (TRUSTED_PROXY_HOSTS env var is set). Otherwise uses a fixed key per
 * namespace to prevent header-spoofing bypass.
 */
export function rateLimitKeyFromRequest(request: Request, namespace: string): string {
  const trustedHosts = process.env.TRUSTED_PROXY_HOSTS?.trim();
  if (!trustedHosts) {
    return `${namespace}:direct`;
  }
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || "unknown";
  return `${namespace}:${ip}`;
}

/** Allow tests to clear all buckets. */
export function _resetRateLimitBuckets() {
  buckets.clear();
}

// ---------------------------------------------------------------------------
// Convenience rate-limiters used by API routes
// ---------------------------------------------------------------------------

export interface SimpleRateLimiter {
  /** Returns true if the request is allowed; false if rate-limited. */
  allow(key: string): boolean;
}

function createSimpleRateLimiter(config: RateLimitConfig): SimpleRateLimiter {
  return {
    allow(key: string) {
      return checkRateLimit(key, config).allowed;
    },
  };
}

/** 5 completions per minute per IP. */
export const onboardingCompletionLimiter = createSimpleRateLimiter({ max: 5, windowMs: 60_000 });

/** 10 invite creations per minute per user. */
export const inviteCreationLimiter = createSimpleRateLimiter({ max: 10, windowMs: 60_000 });

// ---------------------------------------------------------------------------
// Class-based rate limiter (used by tests and route-level code)
// ---------------------------------------------------------------------------

export class RateLimiter {
  private maxAttempts: number;
  private windowMs: number;
  private attempts = new Map<string, number[]>();

  constructor(config: { maxAttempts: number; windowMs: number }) {
    this.maxAttempts = config.maxAttempts;
    this.windowMs = config.windowMs;
  }

  allow(key: string): boolean {
    const now = Date.now();
    const timestamps = this.attempts.get(key) ?? [];
    const cutoff = now - this.windowMs;
    const valid = timestamps.filter((t) => t > cutoff);

    if (valid.length >= this.maxAttempts) {
      this.attempts.set(key, valid);
      return false;
    }

    valid.push(now);
    this.attempts.set(key, valid);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
