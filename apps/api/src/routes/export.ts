import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { fundingOpportunities } from '@rfp-hub/db';
import { exportOpportunitiesSchema, fundingOpportunitySchema } from '@rfp-hub/schema';
import { db } from '../db.js';
import { buildOpportunityFilters } from '../lib/build-filters.js';
import { desc, getTableColumns } from 'drizzle-orm';

const { searchVector: _sv, ...opportunityColumns } = getTableColumns(fundingOpportunities);
import type { AppEnv } from '../types.js';

export const exportRoute = new OpenAPIHono<AppEnv>();

const exportListRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: exportOpportunitiesSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: z.array(fundingOpportunitySchema) }),
        },
        'text/csv': {
          schema: z.string(),
        },
      },
      description: 'Exported funding opportunities',
    },
  },
  tags: ['Export'],
});

const CSV_COLUMNS = [
  'id', 'title', 'summary', 'rfpType', 'status',
  'budgetMin', 'budgetMax', 'currency',
  'opensAt', 'closesAt', 'applicationUrl', 'sourceUrl',
  'ecosystems', 'categories', 'tags',
] as const;

function escapeCsv(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join(', ');
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((col) => escapeCsv(row[col])).join(','),
  );
  return [header, ...lines].join('\n');
}

exportRoute.openapi(exportListRoute, async (c) => {
  const query = c.req.valid('query');
  const where = await buildOpportunityFilters(query);

  const results = await db
    .select(opportunityColumns)
    .from(fundingOpportunities)
    .where(where)
    .orderBy(desc(fundingOpportunities.createdAt))
    .limit(query.limit);

  if (query.format === 'csv') {
    const csv = toCsv(results as any);
    return c.text(csv, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="opportunities.csv"',
    });
  }

  return c.json({ data: results as any });
});
