import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

export const healthRoute = new OpenAPIHono();

const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  version: z.string(),
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

healthRoute.openapi(route, (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});
