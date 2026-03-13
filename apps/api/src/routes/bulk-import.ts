import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { fundingOpportunities } from '@rfp-hub/db';
import { bulkImportSchema, bulkImportResponseSchema } from '@rfp-hub/schema';
import { db } from '../db.js';
import { requireApiKey } from '../middleware/auth.js';
import { checkDuplicate } from '../services/dedup.js';
import { writeAuditLogBatch } from '../services/audit.js';
import type { AppEnv } from '../types.js';

export const bulkImportRoute = new OpenAPIHono<AppEnv>();

const bulkImportEndpoint = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: { content: { 'application/json': { schema: bulkImportSchema } } },
  },
  middleware: [requireApiKey],
  responses: {
    200: {
      content: { 'application/json': { schema: bulkImportResponseSchema } },
      description: 'Bulk import results',
    },
  },
  tags: ['Import'],
  security: [{ apiKey: [] }],
});

bulkImportRoute.openapi(bulkImportEndpoint, async (c) => {
  const { opportunities } = c.req.valid('json');
  const publisherId = c.get('publisherId')!;

  let imported = 0;
  let duplicates = 0;
  const errors: { index: number; message: string }[] = [];
  const auditEntries: {
    entityType: string;
    entityId: string;
    action: string;
    changes?: Record<string, unknown>;
    performedBy: string;
  }[] = [];

  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];
    try {
      const dupResult = await checkDuplicate(opp.title, opp.sourceUrl, opp.applicationUrl);

      if (dupResult.isDuplicate && dupResult.matchType === 'url') {
        duplicates++;
        continue;
      }

      const result = await db
        .insert(fundingOpportunities)
        .values({
          ...opp,
          budgetMin: opp.budgetMin != null ? String(opp.budgetMin) : null,
          budgetMax: opp.budgetMax != null ? String(opp.budgetMax) : null,
          submittedAt: opp.submittedAt ?? new Date(),
          duplicateOf: dupResult.matchType === 'fuzzy' ? dupResult.matchedId : null,
        })
        .returning({ id: fundingOpportunities.id });

      auditEntries.push({
        entityType: 'opportunity',
        entityId: result[0].id,
        action: 'bulk_import',
        changes: dupResult.matchType === 'fuzzy'
          ? { duplicateOf: dupResult.matchedId, similarity: dupResult.similarity }
          : undefined,
        performedBy: publisherId,
      });
      imported++;
    } catch (err) {
      errors.push({ index: i, message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  if (auditEntries.length > 0) {
    await writeAuditLogBatch(auditEntries);
  }

  return c.json({ imported, duplicates, errors } as any);
});
