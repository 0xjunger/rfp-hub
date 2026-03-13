import { auditLog } from '@rfp-hub/db';
import { db } from '../db.js';

interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, unknown>;
  performedBy: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    changes: entry.changes ?? null,
    performedBy: entry.performedBy,
  });
}

export async function writeAuditLogBatch(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await db.insert(auditLog).values(
    entries.map((entry) => ({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: entry.changes ?? null,
      performedBy: entry.performedBy,
    })),
  );
}
