import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { publishers } from '@rfp-hub/db';
import {
  publicPublisherSchema,
  createPublisherSchema,
  createPublisherResponseSchema,
  rotateKeyResponseSchema,
} from '@rfp-hub/schema';
import { db } from '../db.js';
import { requireAdmin, hashApiKey } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';
import type { AppEnv } from '../types.js';

export const publishersRoute = new OpenAPIHono<AppEnv>();

function generateApiKey(): string {
  return `rfphub_${crypto.randomBytes(32).toString('hex')}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- Create Publisher ---
const createPublisherRoute = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: { content: { 'application/json': { schema: createPublisherSchema } } },
  },
  middleware: [requireAdmin],
  responses: {
    201: {
      content: { 'application/json': { schema: createPublisherResponseSchema } },
      description: 'Publisher created with one-time API key',
    },
  },
  tags: ['Publishers'],
  security: [{ apiKey: [] }],
});

publishersRoute.openapi(createPublisherRoute, async (c) => {
  const body = c.req.valid('json');
  const apiKey = generateApiKey();
  const hashed = hashApiKey(apiKey);
  const slug = body.slug || slugify(body.name);

  const result = await db
    .insert(publishers)
    .values({
      name: body.name,
      slug,
      websiteUrl: body.websiteUrl ?? null,
      logoUrl: body.logoUrl ?? null,
      contactEmail: body.contactEmail,
      isVerified: body.isVerified ?? false,
      apiKeyHash: hashed,
    })
    .returning();

  const pub = result[0];
  await writeAuditLog({
    entityType: 'publisher',
    entityId: pub.id,
    action: 'create',
    performedBy: c.get('publisherId')!,
  });

  const { apiKeyHash: _, ...publicPub } = pub;
  return c.json({ publisher: publicPub, apiKey } as any, 201);
});

// --- List Publishers ---
const listPublishersRoute = createRoute({
  method: 'get',
  path: '/',
  middleware: [requireAdmin],
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ data: z.array(publicPublisherSchema) }) } },
      description: 'List of all publishers',
    },
  },
  tags: ['Publishers'],
  security: [{ apiKey: [] }],
});

publishersRoute.openapi(listPublishersRoute, async (c) => {
  const results = await db.select().from(publishers);
  const data = results.map(({ apiKeyHash: _, ...pub }) => pub);
  return c.json({ data } as any);
});

// --- Get Publisher by ID ---
const getPublisherRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: { params: z.object({ id: z.string().uuid() }) },
  middleware: [requireAdmin],
  responses: {
    200: {
      content: { 'application/json': { schema: publicPublisherSchema } },
      description: 'Publisher details',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Publishers'],
  security: [{ apiKey: [] }],
});

publishersRoute.openapi(getPublisherRoute, async (c) => {
  const { id } = c.req.valid('param');
  const results = await db.select().from(publishers).where(eq(publishers.id, id)).limit(1);
  if (results.length === 0) return c.json({ error: 'Publisher not found' }, 404);
  const { apiKeyHash: _, ...pub } = results[0];
  return c.json(pub as any);
});

// --- Rotate Key ---
const rotateKeyRoute = createRoute({
  method: 'post',
  path: '/:id/rotate-key',
  request: { params: z.object({ id: z.string().uuid() }) },
  middleware: [requireAdmin],
  responses: {
    200: {
      content: { 'application/json': { schema: rotateKeyResponseSchema } },
      description: 'New API key',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Publishers'],
  security: [{ apiKey: [] }],
});

publishersRoute.openapi(rotateKeyRoute, async (c) => {
  const { id } = c.req.valid('param');
  const newKey = generateApiKey();
  const hashed = hashApiKey(newKey);

  const result = await db
    .update(publishers)
    .set({ apiKeyHash: hashed })
    .where(eq(publishers.id, id))
    .returning({ id: publishers.id });

  if (result.length === 0) return c.json({ error: 'Publisher not found' }, 404);

  await writeAuditLog({
    entityType: 'publisher',
    entityId: id,
    action: 'rotate_key',
    performedBy: c.get('publisherId')!,
  });

  return c.json({ apiKey: newKey, message: 'Key rotated. Old key is now invalid.' } as any);
});

// --- Revoke Publisher ---
const revokeRoute = createRoute({
  method: 'delete',
  path: '/:id/revoke',
  request: { params: z.object({ id: z.string().uuid() }) },
  middleware: [requireAdmin],
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ message: z.string() }) } },
      description: 'Publisher revoked',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Publishers'],
  security: [{ apiKey: [] }],
});

publishersRoute.openapi(revokeRoute, async (c) => {
  const { id } = c.req.valid('param');

  const result = await db
    .update(publishers)
    .set({ isVerified: false })
    .where(eq(publishers.id, id))
    .returning({ id: publishers.id });

  if (result.length === 0) return c.json({ error: 'Publisher not found' }, 404);

  await writeAuditLog({
    entityType: 'publisher',
    entityId: id,
    action: 'revoke',
    performedBy: c.get('publisherId')!,
  });

  return c.json({ message: 'Publisher access revoked.' } as any);
});
