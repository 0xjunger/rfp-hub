import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { fundingSources } from '@rfp-hub/db';
import { fundingSourceSchema } from '@rfp-hub/schema';
import { db } from '../db.js';
import type { AppEnv } from '../types.js';

export const sourcesRoute = new OpenAPIHono<AppEnv>();

// --- List Sources ---
const listRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(fundingSourceSchema),
          }),
        },
      },
      description: 'List of funding sources',
    },
  },
  tags: ['Sources'],
});

sourcesRoute.openapi(listRoute, async (c) => {
  const results = await db
    .select()
    .from(fundingSources)
    .where(eq(fundingSources.isActive, true));

  return c.json({ data: results as any });
});

// --- Get Source by ID ---
const getRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: fundingSourceSchema } },
      description: 'Single funding source',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Sources'],
});

sourcesRoute.openapi(getRoute, async (c) => {
  const { id } = c.req.valid('param');

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return c.json({ error: 'Source not found' }, 404);
  }

  const results = await db
    .select()
    .from(fundingSources)
    .where(eq(fundingSources.id, id))
    .limit(1);

  if (results.length === 0) {
    return c.json({ error: 'Source not found' }, 404);
  }

  return c.json(results[0] as any);
});
