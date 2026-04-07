import { eq } from 'drizzle-orm';
import { fundingOpportunities, fundingSources } from '@rfp-hub/db';
import { db } from '../db.js';
import { checkDuplicate } from '../services/dedup.js';
import { writeAuditLogBatch } from '../services/audit.js';
import { fetchEfEsp } from '../services/ingestion/ef-esp-adapter.js';
import { fetchDaoip5 } from '../services/ingestion/daoip5-adapter.js';
import { normalize } from '../services/ingestion/normalize.js';
import type { RawOpportunity } from '../services/ingestion/normalize.js';
import type { IngestionSourceConfig } from '../ingestion-config.js';

const ADAPTER_MAP: Record<string, (config: Record<string, unknown>) => Promise<RawOpportunity[]>> = {
  'ef-esp': fetchEfEsp,
  daoip5: fetchDaoip5,
};

export async function runIngestion(source: IngestionSourceConfig): Promise<void> {
  const fetchFn = ADAPTER_MAP[source.adapterType];
  if (!fetchFn) {
    console.error(`[Ingestion] Unknown adapter type: ${source.adapterType}`);
    return;
  }

  // Resolve sourceId from slug
  const sources = await db
    .select({ id: fundingSources.id })
    .from(fundingSources)
    .where(eq(fundingSources.slug, source.sourceSlug))
    .limit(1);

  if (sources.length === 0) {
    console.error(`[Ingestion] Source not found: ${source.sourceSlug}`);
    return;
  }

  const sourceId = sources[0].id;
  let importedCount = 0;
  const errors: string[] = [];

  try {
    const rawItems = await fetchFn(source.config);
    const auditEntries: {
      entityType: string;
      entityId: string;
      action: string;
      changes?: Record<string, unknown>;
      performedBy: string;
    }[] = [];

    for (const raw of rawItems) {
      try {
        const normalized = normalize(raw, sourceId, source.adapterType);
        const dupResult = await checkDuplicate(normalized.title, normalized.sourceUrl, normalized.applicationUrl);

        if (dupResult.isDuplicate && dupResult.matchType === 'url') {
          continue; // Skip exact URL duplicates
        }

        const result = await db
          .insert(fundingOpportunities)
          .values({
            ...normalized,
            duplicateOf: dupResult.matchType === 'fuzzy' ? dupResult.matchedId : null,
          })
          .returning({ id: fundingOpportunities.id });

        auditEntries.push({
          entityType: 'opportunity',
          entityId: result[0].id,
          action: 'ingest',
          changes: {
            adapter: source.adapterType,
            sourceSlug: source.sourceSlug,
            ...(dupResult.matchType === 'fuzzy'
              ? { duplicateOf: dupResult.matchedId, similarity: dupResult.similarity }
              : {}),
          },
          performedBy: `ingestion:${source.adapterType}`,
        });

        importedCount++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (auditEntries.length > 0) {
      await writeAuditLogBatch(auditEntries);
    }

    console.log(
      `[Ingestion] ${source.sourceSlug}: fetched=${rawItems.length} imported=${importedCount} errors=${errors.length}`,
    );
  } catch (err) {
    console.error(`[Ingestion] ${source.sourceSlug} failed:`, err instanceof Error ? err.message : err);
  }
}
