import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { generateJsonSchemas } from '@rfp-hub/schema';
import type { AppEnv } from '../types.js';

export const schemaRoute = new OpenAPIHono<AppEnv>();

const route = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: { 'application/json': { schema: z.any() } },
      description: 'JSON Schema definitions for all entities',
    },
  },
  tags: ['System'],
});

schemaRoute.openapi(route, (c) => {
  return c.json(generateJsonSchemas() as any);
});
