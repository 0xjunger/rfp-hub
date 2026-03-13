import { and, lt, inArray, sql } from 'drizzle-orm';
import { fundingOpportunities } from '@rfp-hub/db';
import { db } from '../db.js';
import { writeAuditLogBatch } from '../services/audit.js';

export async function runCleanup(): Promise<void> {
  try {
    const stale = await db
      .select({ id: fundingOpportunities.id, title: fundingOpportunities.title })
      .from(fundingOpportunities)
      .where(
        and(
          lt(fundingOpportunities.closesAt, new Date()),
          inArray(fundingOpportunities.status, ['open', 'closing_soon']),
        ),
      );

    if (stale.length === 0) return;

    const staleIds = stale.map((r) => r.id);

    await db
      .update(fundingOpportunities)
      .set({ status: 'closed', version: sql`${fundingOpportunities.version} + 1` })
      .where(inArray(fundingOpportunities.id, staleIds));

    await writeAuditLogBatch(
      stale.map((r) => ({
        entityType: 'opportunity',
        entityId: r.id,
        action: 'auto_close',
        changes: { reason: 'closes_at in the past' },
        performedBy: 'cron:cleanup',
      })),
    );

    console.log(`[Cleanup] Closed ${stale.length} stale opportunities`);
  } catch (err) {
    console.error('[Cleanup] Failed:', err instanceof Error ? err.message : err);
  }
}
