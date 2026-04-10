import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { redis } from '../redis.js';
import type { AppEnv } from '../types.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

function getClientIp(c: Parameters<ReturnType<typeof createMiddleware<AppEnv>>>[0]): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const proxyCount =
      process.env.TRUSTED_PROXY_COUNT != null ? Number(process.env.TRUSTED_PROXY_COUNT) : 1;
    const ips = forwarded.split(',').map((s) => s.trim());
    const idx = Math.max(0, ips.length - proxyCount);
    return ips[idx] ?? 'unknown';
  }
  return 'unknown';
}

export function rateLimit({ windowMs, max, keyPrefix }: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!redis) {
      await next();
      return;
    }

    const ip = getClientIp(c);
    const key = `rl:${keyPrefix}:${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, windowMs);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    const resetAt = Math.ceil((now + windowMs) / 1000);

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    c.header('X-RateLimit-Reset', String(resetAt));

    if (count > max) {
      throw new HTTPException(429, { message: 'Too many requests' });
    }

    await next();
  });
}
