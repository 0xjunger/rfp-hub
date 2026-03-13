import { eq, and, gte, lte, inArray, sql, type SQL } from 'drizzle-orm';
import { fundingOpportunities, fundingSources } from '@rfp-hub/db';
import { db } from '../db.js';
import type { SearchOpportunities } from '@rfp-hub/schema';

/** The tsvector expression used for FTS — reused for indexing and ranking. */
export const ftsVector = sql`to_tsvector('english', coalesce(${fundingOpportunities.title},'') || ' ' || coalesce(${fundingOpportunities.summary},'') || ' ' || coalesce(${fundingOpportunities.description},''))`;

export async function buildOpportunityFilters(
  query: Partial<SearchOpportunities>,
): Promise<SQL | undefined> {
  const conditions: SQL[] = [eq(fundingOpportunities.isActive, true)];

  if (query.q) {
    conditions.push(
      sql`${ftsVector} @@ plainto_tsquery('english', ${query.q})`,
    );
  }

  if (query.type) {
    conditions.push(inArray(fundingOpportunities.rfpType, query.type));
  }

  if (query.status) {
    conditions.push(inArray(fundingOpportunities.status, query.status));
  }

  if (query.ecosystem) {
    conditions.push(
      sql`${fundingOpportunities.ecosystems} @> ${JSON.stringify([query.ecosystem])}::jsonb`,
    );
  }

  if (query.category) {
    conditions.push(
      sql`${fundingOpportunities.categories} @> ${JSON.stringify([query.category])}::jsonb`,
    );
  }

  if (query.tag) {
    conditions.push(
      sql`${fundingOpportunities.tags} @> ${JSON.stringify([query.tag])}::jsonb`,
    );
  }

  if (query.funder) {
    const source = await db
      .select({ id: fundingSources.id })
      .from(fundingSources)
      .where(eq(fundingSources.slug, query.funder))
      .limit(1);
    if (source.length > 0) {
      conditions.push(eq(fundingOpportunities.sourceId, source[0].id));
    }
  }

  if (query.min_budget !== undefined) {
    conditions.push(gte(fundingOpportunities.budgetMin, String(query.min_budget)));
  }

  if (query.max_budget !== undefined) {
    conditions.push(lte(fundingOpportunities.budgetMax, String(query.max_budget)));
  }

  if (query.closing_after) {
    conditions.push(gte(fundingOpportunities.closesAt, query.closing_after));
  }

  if (query.closing_before) {
    conditions.push(lte(fundingOpportunities.closesAt, query.closing_before));
  }

  return and(...conditions);
}
