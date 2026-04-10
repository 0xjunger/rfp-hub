import { createHash } from 'node:crypto';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, and, sql, desc, asc, getTableColumns } from 'drizzle-orm';
import { fundingOpportunities } from '@rfp-hub/db';
import {
  fundingOpportunitySchema,
  createOpportunitySchema,
  updateOpportunitySchema,
  searchOpportunitiesSchema,
} from '@rfp-hub/schema';
import { db } from '../db.js';
import { requireApiKey } from '../middleware/auth.js';
import { buildOpportunityFilters, ftsVector } from '../lib/build-filters.js';
import { writeAuditLog } from '../services/audit.js';
import type { AppEnv } from '../types.js';

export const opportunitiesRoute = new OpenAPIHono<AppEnv>();

// Columns to select — excludes internal searchVector field
const { searchVector: _sv, ...opportunityColumns } = getTableColumns(fundingOpportunities);

// --- List / Search ---
const listRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: searchOpportunitiesSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(fundingOpportunitySchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
              hasMore: z.boolean(),
              nextCursor: z.string().uuid().nullable().optional(),
            }),
          }),
        },
      },
      description: 'List of funding opportunities',
    },
    304: {
      description: 'Not Modified',
    },
  },
  tags: ['Opportunities'],
});

opportunitiesRoute.openapi(listRoute, async (c) => {
  const query = c.req.valid('query');
  const { page, limit, sort, cursor } = query;
  const offset = (page - 1) * limit;

  const where = await buildOpportunityFilters(query);

  // Parse sort
  const [sortField, sortDir] = sort.split(':') as [string, 'asc' | 'desc'];
  const sortColumn =
    sortField === 'closes_at'
      ? fundingOpportunities.closesAt
      : sortField === 'budget_max'
        ? fundingOpportunities.budgetMax
        : sortField === 'budget_min'
          ? fundingOpportunities.budgetMin
          : sortField === 'prize_pool'
            ? fundingOpportunities.prizePool
            : sortField === 'title'
              ? fundingOpportunities.title
              : fundingOpportunities.createdAt;

  // FTS relevance sort: when ?q= is provided and default sort is used
  const useRelevanceSort = !!query.q && sort === 'created_at:desc';
  const orderBy = useRelevanceSort
    ? desc(sql`ts_rank(${ftsVector}, plainto_tsquery('english', ${query.q}))`)
    : sortDir === 'asc'
      ? asc(sortColumn)
      : desc(sortColumn);

  // Cursor-based pagination (keyset) — skip for relevance sort
  let cursorCondition = undefined;
  if (cursor && !useRelevanceSort) {
    const sortColName =
      sortField === 'closes_at'
        ? 'closes_at'
        : sortField === 'budget_max'
          ? 'budget_max'
          : sortField === 'budget_min'
            ? 'budget_min'
            : sortField === 'prize_pool'
              ? 'prize_pool'
              : sortField === 'title'
                ? 'title'
                : 'created_at';

    cursorCondition =
      sortDir === 'asc'
        ? sql`(${sql.raw(sortColName)}, id) > (SELECT ${sql.raw(sortColName)}, id FROM funding_opportunities WHERE id = ${cursor})`
        : sql`(${sql.raw(sortColName)}, id) < (SELECT ${sql.raw(sortColName)}, id FROM funding_opportunities WHERE id = ${cursor})`;
  }

  const finalWhere = cursorCondition ? and(where, cursorCondition) : where;

  const [results, countResult] = await Promise.all([
    db
      .select(opportunityColumns)
      .from(fundingOpportunities)
      .where(finalWhere)
      .orderBy(orderBy)
      .limit(limit + 1) // fetch one extra to detect hasMore
      .offset(cursor ? 0 : offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(fundingOpportunities)
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  // --- Conditional GET (ETag + If-Modified-Since) ---
  const maxUpdatedAt = data.reduce(
    (max, row) => (row.updatedAt > max ? row.updatedAt : max),
    new Date(0),
  );
  const lastModifiedStr = maxUpdatedAt.toUTCString();
  const etag = `"${createHash('sha256').update(`${total}:${maxUpdatedAt.toISOString()}`).digest('hex').slice(0, 16)}"`;

  const ifNoneMatch = c.req.header('if-none-match');
  if (ifNoneMatch === etag) {
    return c.body(null, 304);
  }

  const ifModifiedSince = c.req.header('if-modified-since');
  if (ifModifiedSince) {
    const sinceDate = new Date(ifModifiedSince);
    if (!isNaN(sinceDate.getTime()) && maxUpdatedAt <= sinceDate) {
      return c.body(null, 304);
    }
  }

  c.header('ETag', etag);
  c.header('Last-Modified', lastModifiedStr);
  c.header('Cache-Control', 'public, max-age=60');

  return c.json({
    data: data as any,
    meta: {
      total,
      page,
      limit,
      hasMore,
      nextCursor,
    },
  });
});

// --- Get by ID ---
const getRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: fundingOpportunitySchema } },
      description: 'Single funding opportunity',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Opportunities'],
});

opportunitiesRoute.openapi(getRoute, async (c) => {
  const { id } = c.req.valid('param');

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return c.json({ error: 'Opportunity not found' }, 404);
  }

  const results = await db
    .select(opportunityColumns)
    .from(fundingOpportunities)
    .where(and(eq(fundingOpportunities.id, id), eq(fundingOpportunities.isActive, true)))
    .limit(1);

  if (results.length === 0) {
    return c.json({ error: 'Opportunity not found' }, 404);
  }

  return c.json(results[0] as any);
});

// --- Create (requires API key) ---
const createOppRoute = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: {
      content: { 'application/json': { schema: createOpportunitySchema } },
    },
  },
  middleware: [requireApiKey],
  responses: {
    201: {
      content: { 'application/json': { schema: fundingOpportunitySchema } },
      description: 'Created opportunity',
    },
  },
  tags: ['Opportunities'],
  security: [{ apiKey: [] }],
});

opportunitiesRoute.openapi(createOppRoute, async (c) => {
  const body = c.req.valid('json');

  const result = await db
    .insert(fundingOpportunities)
    .values({
      ...body,
      submittedBy: c.get('publisherId') ?? body.submittedBy,
      budgetMin: body.budgetMin != null ? String(body.budgetMin) : null,
      budgetMax: body.budgetMax != null ? String(body.budgetMax) : null,
      prizePool: body.prizePool != null ? String(body.prizePool) : null,
      submittedAt: body.submittedAt ?? new Date(),
    })
    .returning();

  const created = result[0];
  await writeAuditLog({
    entityType: 'opportunity',
    entityId: created.id,
    action: 'create',
    performedBy: c.get('publisherId') ?? 'api',
  });

  return c.json(created as any, 201);
});

// --- Update (requires API key) ---
const updateOppRoute = createRoute({
  method: 'put',
  path: '/:id',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { 'application/json': { schema: updateOpportunitySchema } },
    },
  },
  middleware: [requireApiKey],
  responses: {
    200: {
      content: { 'application/json': { schema: fundingOpportunitySchema } },
      description: 'Updated opportunity',
    },
    403: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Forbidden — not the owner',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Opportunities'],
  security: [{ apiKey: [] }],
});

opportunitiesRoute.openapi(updateOppRoute, async (c) => {
  const { id } = c.req.valid('param');
  const publisherId = c.get('publisherId');
  const publisherRole = c.get('publisherRole');

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return c.json({ error: 'Opportunity not found' }, 404);
  }

  if (publisherRole !== 'admin') {
    const existing = await db
      .select({ submittedBy: fundingOpportunities.submittedBy })
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: 'Opportunity not found' }, 404);
    }

    if (existing[0].submittedBy !== publisherId) {
      return c.json({ error: 'Not authorized to update this opportunity' }, 403);
    }
  }

  const body = c.req.valid('json');

  const updateData: Record<string, unknown> = { ...body };
  if (body.budgetMin !== undefined)
    updateData.budgetMin = body.budgetMin != null ? String(body.budgetMin) : null;
  if (body.budgetMax !== undefined)
    updateData.budgetMax = body.budgetMax != null ? String(body.budgetMax) : null;
  if (body.prizePool !== undefined)
    updateData.prizePool = body.prizePool != null ? String(body.prizePool) : null;

  const result = await db
    .update(fundingOpportunities)
    .set({ ...updateData, version: sql`${fundingOpportunities.version} + 1` })
    .where(eq(fundingOpportunities.id, id))
    .returning();

  if (result.length === 0) {
    return c.json({ error: 'Opportunity not found' }, 404);
  }

  await writeAuditLog({
    entityType: 'opportunity',
    entityId: id,
    action: 'update',
    changes: body as Record<string, unknown>,
    performedBy: publisherId ?? 'api',
  });

  return c.json(result[0] as any);
});
