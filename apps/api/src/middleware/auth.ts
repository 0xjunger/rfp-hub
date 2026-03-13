import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { publishers } from '@rfp-hub/db';
import { db } from '../db.js';
import type { AppEnv } from '../types.js';

/**
 * Hash an API key with SHA-256 for storage and lookup.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Middleware that requires a valid API key in X-API-Key header.
 * Sets publisherId and publisherRole in context variables.
 */
export const requireApiKey = createMiddleware<AppEnv>(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    throw new HTTPException(401, { message: 'Missing X-API-Key header' });
  }

  const hashed = hashApiKey(apiKey);

  const publisher = await db
    .select()
    .from(publishers)
    .where(eq(publishers.apiKeyHash, hashed))
    .limit(1);

  if (publisher.length === 0) {
    throw new HTTPException(401, { message: 'Invalid API key' });
  }

  if (!publisher[0].isVerified) {
    throw new HTTPException(403, { message: 'Publisher not verified' });
  }

  c.set('publisherId', publisher[0].id);
  c.set('publisherRole', publisher[0].role);
  await next();
});

/**
 * Middleware that requires admin role. Must be used after requireApiKey.
 */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    throw new HTTPException(401, { message: 'Missing X-API-Key header' });
  }

  const hashed = hashApiKey(apiKey);

  const publisher = await db
    .select()
    .from(publishers)
    .where(eq(publishers.apiKeyHash, hashed))
    .limit(1);

  if (publisher.length === 0) {
    throw new HTTPException(401, { message: 'Invalid API key' });
  }

  if (!publisher[0].isVerified) {
    throw new HTTPException(403, { message: 'Publisher not verified' });
  }

  if (publisher[0].role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin access required' });
  }

  c.set('publisherId', publisher[0].id);
  c.set('publisherRole', publisher[0].role);
  await next();
});
