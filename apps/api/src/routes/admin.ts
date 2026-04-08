import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, desc, and, sql } from 'drizzle-orm';
import { submissions, fundingOpportunities, fundingSources, auditLog } from '@rfp-hub/db';
import { submissionSchema, reviewSubmissionSchema, listSubmissionsSchema } from '@rfp-hub/schema';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';
import type { AppEnv } from '../types.js';

export const adminRoute = new OpenAPIHono<AppEnv>();

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

// --- List Submissions ---
const listSubmissionsRoute = createRoute({
  method: 'get',
  path: '/submissions',
  request: { query: listSubmissionsSchema },
  middleware: [requireAdmin],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(submissionSchema),
            meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
          }),
        },
      },
      description: 'Paginated submissions',
    },
  },
  tags: ['Admin'],
  security: [{ apiKey: [] }],
});

adminRoute.openapi(listSubmissionsRoute, async (c) => {
  const { status, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const where = status ? eq(submissions.status, status) : undefined;

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(where)
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissions)
      .where(where),
  ]);

  return c.json({
    data: results as any,
    meta: { total: countResult[0]?.count ?? 0, page, limit },
  });
});

// --- Get Single Submission ---
const getSubmissionRoute = createRoute({
  method: 'get',
  path: '/submissions/:id',
  request: { params: z.object({ id: z.string().uuid() }) },
  middleware: [requireAdmin],
  responses: {
    200: {
      content: { 'application/json': { schema: submissionSchema } },
      description: 'Submission details',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Admin'],
  security: [{ apiKey: [] }],
});

adminRoute.openapi(getSubmissionRoute, async (c) => {
  const { id } = c.req.valid('param');
  const results = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (results.length === 0) return c.json({ error: 'Submission not found' }, 404);
  return c.json(results[0] as any);
});

// --- Review Submission ---
const reviewRoute = createRoute({
  method: 'post',
  path: '/submissions/:id/review',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: reviewSubmissionSchema } } },
  },
  middleware: [requireAdmin],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            opportunityId: z.string().uuid().nullable(),
          }),
        },
      },
      description: 'Review result',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
  tags: ['Admin'],
  security: [{ apiKey: [] }],
});

adminRoute.openapi(reviewRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { action, reviewNotes } = c.req.valid('json');
  const publisherId = c.get('publisherId')!;

  const sub = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (sub.length === 0) return c.json({ error: 'Submission not found' }, 404);

  const submission = sub[0];

  if (action === 'reject') {
    await db
      .update(submissions)
      .set({
        status: 'rejected',
        reviewedBy: publisherId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
      })
      .where(eq(submissions.id, id));

    await writeAuditLog({
      entityType: 'submission',
      entityId: id,
      action: 'reject',
      changes: { reviewNotes },
      performedBy: publisherId,
    });

    return c.json({ message: 'Submission rejected.', opportunityId: null } as any);
  }

  // Approve: find sourceId from first matching source, or use a default
  const sources = await db.select({ id: fundingSources.id }).from(fundingSources).limit(1);
  const sourceId = sources[0]?.id;
  if (!sourceId) return c.json({ error: 'No funding sources configured' }, 404);

  const slug = slugify(submission.title) + '-' + Date.now().toString(36);

  const oppResult = await db
    .insert(fundingOpportunities)
    .values({
      title: submission.title,
      description: submission.description,
      summary: submission.summary,
      rfpType: submission.rfpType,
      applicationUrl: submission.applicationUrl,
      sourceUrl: submission.sourceUrl,
      budgetMin: submission.budgetMin,
      budgetMax: submission.budgetMax,
      currency: submission.currency,
      opensAt: submission.opensAt,
      closesAt: submission.closesAt,
      categories: submission.categories,
      ecosystems: submission.ecosystems,
      tags: submission.tags,
      slug,
      sourceId,
      submittedBy: submission.submitterName ?? submission.submitterEmail ?? 'community',
      publisherType: 'community',
      status: 'open',
      eligibility: [],
      requiredCredentials: [],
      contactEmail: null,
      logoUrl: null,
      externalId: null,
      fundingMechanism: null,
      projectDuration: null,
    })
    .returning();

  const opp = oppResult[0];

  await db
    .update(submissions)
    .set({
      status: 'approved',
      reviewedBy: publisherId,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes ?? null,
      opportunityId: opp.id,
    })
    .where(eq(submissions.id, id));

  await writeAuditLog({
    entityType: 'submission',
    entityId: id,
    action: 'approve',
    changes: { opportunityId: opp.id },
    performedBy: publisherId,
  });

  await writeAuditLog({
    entityType: 'opportunity',
    entityId: opp.id,
    action: 'create_from_submission',
    changes: { submissionId: id },
    performedBy: publisherId,
  });

  return c.json({
    message: 'Submission approved. Opportunity created.',
    opportunityId: opp.id,
  } as any);
});

// --- Audit Log Viewer ---
const auditLogRoute = createRoute({
  method: 'get',
  path: '/audit-log',
  request: {
    query: z.object({
      entityType: z.string().optional(),
      action: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  },
  middleware: [requireAdmin],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.string().uuid(),
                entityType: z.string(),
                entityId: z.string().uuid(),
                action: z.string(),
                changes: z.any().nullable(),
                performedBy: z.string(),
                performedAt: z.coerce.date(),
              }),
            ),
            meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
          }),
        },
      },
      description: 'Paginated audit log',
    },
  },
  tags: ['Admin'],
  security: [{ apiKey: [] }],
});

adminRoute.openapi(auditLogRoute, async (c) => {
  const { entityType, action, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [];
  if (entityType) conditions.push(eq(auditLog.entityType, entityType));
  if (action) conditions.push(eq(auditLog.action, action));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.performedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where),
  ]);

  return c.json({
    data: results as any,
    meta: { total: countResult[0]?.count ?? 0, page, limit },
  });
});
