// Fixed-window rate limiter (NASCAR-082). Serverless-safe because the counter
// lives in Postgres (no shared memory across lambdas) — a lightweight in-DB
// token bucket, no Redis/Upstash dependency. The window math is pure and
// unit-tested; the count is an atomic upsert+increment.

import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";

/** Start of the fixed window containing `nowMs`, as epoch ms. Pure. */
export function windowStartMs(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

export type RateLimitOptions = {
  /** Max allowed hits per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

/**
 * Count one hit against `key` and report whether it's within `limit` for the
 * current window. Fails open (allowed) if the store is unreachable — abuse
 * throttling must never take down a normal request. ponytail: stale window rows
 * accumulate; prune with a periodic job if the table grows.
 */
export async function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowStart = new Date(windowStartMs(now.getTime(), windowMs));
  try {
    const row = await prisma.rateLimit.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    const allowed = row.count <= limit;
    if (!allowed) {
      log.warn("ratelimit.exceeded", { key, count: row.count, limit });
    }
    return { allowed, remaining: Math.max(0, limit - row.count) };
  } catch (error) {
    log.warn("ratelimit.store_unavailable", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, remaining: limit };
  }
}
