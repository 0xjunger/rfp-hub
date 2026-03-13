import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { redis } from '../redis.js';
import type { AppEnv } from '../types.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

export function rateLimit({ windowMs, max, keyPrefix }: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!redis) {
      await next();
      return;
    }

    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
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
