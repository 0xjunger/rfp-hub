import { eq, sql, or } from 'drizzle-orm';
import { fundingOpportunities } from '@rfp-hub/db';
import { db } from '../db.js';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: 'url' | 'fuzzy' | null;
  matchedId: string | null;
  similarity?: number;
}

/**
 * Two-layer duplicate detection:
 * Layer 1: Exact URL match on sourceUrl or applicationUrl
 * Layer 2: pg_trgm title similarity > 0.6
 */
export async function checkDuplicate(
  title: string,
  sourceUrl?: string | null,
  applicationUrl?: string | null,
): Promise<DuplicateCheckResult> {
  // Layer 1: Exact URL match
  if (sourceUrl || applicationUrl) {
    const urlConditions = [];
    if (sourceUrl) {
      urlConditions.push(eq(fundingOpportunities.sourceUrl, sourceUrl));
    }
    if (applicationUrl) {
      urlConditions.push(eq(fundingOpportunities.applicationUrl, applicationUrl));
    }

    const urlMatch = await db
      .select({ id: fundingOpportunities.id })
      .from(fundingOpportunities)
      .where(or(...urlConditions))
      .limit(1);

    if (urlMatch.length > 0) {
      return {
        isDuplicate: true,
        matchType: 'url',
        matchedId: urlMatch[0].id,
      };
    }
  }

  // Layer 2: Fuzzy title match via pg_trgm
  const fuzzyMatch = await db
    .select({
      id: fundingOpportunities.id,
      similarity: sql<number>`similarity(${fundingOpportunities.title}, ${title})`,
    })
    .from(fundingOpportunities)
    .where(sql`similarity(${fundingOpportunities.title}, ${title}) > 0.6`)
    .orderBy(sql`similarity(${fundingOpportunities.title}, ${title}) DESC`)
    .limit(1);

  if (fuzzyMatch.length > 0) {
    return {
      isDuplicate: true,
      matchType: 'fuzzy',
      matchedId: fuzzyMatch[0].id,
      similarity: fuzzyMatch[0].similarity,
    };
  }

  return { isDuplicate: false, matchType: null, matchedId: null };
}
