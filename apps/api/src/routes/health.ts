import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { db } from '../db.js';

export const healthRoute = new OpenAPIHono();

const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  version: z.string(),
  db: z.string().optional(),
});

const route = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: { 'application/json': { schema: healthResponseSchema } },
      description: 'Health check response',
    },
  },
  tags: ['System'],
});

healthRoute.openapi(route, async (c) => {
  let dbStatus = 'ok';
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = 'unavailable';
  }

  return c.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    ...(dbStatus !== 'ok' ? { db: dbStatus } : {}),
  });
});
