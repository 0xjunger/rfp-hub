import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, inArray } from 'drizzle-orm';
import { fundingOpportunities, fundingSources, auditLog } from '@rfp-hub/db';
import { app } from '../app.js';
import { db } from '../db.js';
import { runCleanup } from '../jobs/cleanup.js';

function req(path: string, init?: RequestInit) {
  return app.request(path, init);
}

let testSourceId: string;
let createdSourceId: string | null = null;

beforeAll(async () => {
  const sources = await db.select().from(fundingSources).limit(1);
  testSourceId = sources[0]?.id;

  if (!testSourceId) {
    const result = await db
      .insert(fundingSources)
      .values({
        name: 'M3 Test Source',
        slug: `m3-test-source-${Date.now()}`,
        description: 'For M3 testing',
      })
      .returning();
    testSourceId = result[0].id;
    createdSourceId = result[0].id;
  }
});

// ---------- ETag + If-Modified-Since ----------

describe('ETag + Conditional GET', () => {
  it('response includes ETag and Last-Modified headers', async () => {
    const res = await req('/api/v1/opportunities');
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toMatch(/^"[0-9a-f]{16}"$/);
    expect(res.headers.get('last-modified')).toBeTruthy();
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
  });

  it('If-None-Match with matching ETag → 304', async () => {
    const first = await req('/api/v1/opportunities');
    const etag = first.headers.get('etag')!;

    const second = await req('/api/v1/opportunities', {
      headers: { 'If-None-Match': etag },
    });
    expect(second.status).toBe(304);
  });

  it('If-None-Match with wrong ETag → 200', async () => {
    const res = await req('/api/v1/opportunities', {
      headers: { 'If-None-Match': '"0000000000000000"' },
    });
    expect(res.status).toBe(200);
  });

  it('If-Modified-Since far in future → 304', async () => {
    const res = await req('/api/v1/opportunities', {
      headers: { 'If-Modified-Since': 'Wed, 01 Jan 2100 00:00:00 GMT' },
    });
    expect(res.status).toBe(304);
  });

  it('If-Modified-Since far in past → 200', async () => {
    const res = await req('/api/v1/opportunities', {
      headers: { 'If-Modified-Since': 'Mon, 01 Jan 2000 00:00:00 GMT' },
    });
    expect(res.status).toBe(200);
  });
});

// ---------- Stale Entry Cleanup ----------

afterAll(async () => {
  if (createdSourceId) {
    await db.delete(fundingSources).where(eq(fundingSources.id, createdSourceId));
  }
});

describe('Stale Entry Cleanup', () => {
  const suffix = Date.now();

  let staleOppId: string;
  let futureOppId: string;
  let alreadyClosedId: string;

  afterAll(async () => {
    const oppIds = [staleOppId, futureOppId, alreadyClosedId].filter(Boolean);
    if (oppIds.length > 0) {
      await db.delete(auditLog).where(inArray(auditLog.entityId, oppIds));
      await db.delete(fundingOpportunities).where(inArray(fundingOpportunities.id, oppIds));
    }
  });

  beforeAll(async () => {
    // Insert a stale opportunity (closesAt in the past, status open)
    const [stale] = await db
      .insert(fundingOpportunities)
      .values({
        title: `Stale Opp ${suffix}`,
        description: 'Should be auto-closed',
        summary: 'Stale',
        rfpType: 'grant',
        applicationUrl: `https://example.com/stale-${suffix}`,
        sourceUrl: `https://example.com/stale-src-${suffix}`,
        slug: `stale-${suffix}`,
        sourceId: testSourceId,
        submittedBy: 'test',
        publisherType: 'community',
        status: 'open',
        closesAt: new Date('2020-01-01'),
        categories: [],
        ecosystems: [],
        tags: [],
        eligibility: [],
        requiredCredentials: [],
      })
      .returning();
    staleOppId = stale.id;

    // Insert a future opportunity (should NOT be touched)
    const [future] = await db
      .insert(fundingOpportunities)
      .values({
        title: `Future Opp ${suffix}`,
        description: 'Should remain open',
        summary: 'Future',
        rfpType: 'grant',
        applicationUrl: `https://example.com/future-${suffix}`,
        sourceUrl: `https://example.com/future-src-${suffix}`,
        slug: `future-${suffix}`,
        sourceId: testSourceId,
        submittedBy: 'test',
        publisherType: 'community',
        status: 'open',
        closesAt: new Date('2099-12-31'),
        categories: [],
        ecosystems: [],
        tags: [],
        eligibility: [],
        requiredCredentials: [],
      })
      .returning();
    futureOppId = future.id;

    // Insert an already-closed opportunity (should NOT be touched)
    const [closed] = await db
      .insert(fundingOpportunities)
      .values({
        title: `Already Closed ${suffix}`,
        description: 'Already closed, leave alone',
        summary: 'Closed',
        rfpType: 'grant',
        applicationUrl: `https://example.com/closed-${suffix}`,
        sourceUrl: `https://example.com/closed-src-${suffix}`,
        slug: `closed-${suffix}`,
        sourceId: testSourceId,
        submittedBy: 'test',
        publisherType: 'community',
        status: 'closed',
        closesAt: new Date('2020-06-01'),
        categories: [],
        ecosystems: [],
        tags: [],
        eligibility: [],
        requiredCredentials: [],
      })
      .returning();
    alreadyClosedId = closed.id;

    // Run cleanup
    await runCleanup();
  });

  it('past closesAt + status open → closed after cleanup', async () => {
    const [row] = await db
      .select({ status: fundingOpportunities.status })
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.id, staleOppId));
    expect(row.status).toBe('closed');
  });

  it('audit log entry with action auto_close exists', async () => {
    const logs = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityId, staleOppId),
          eq(auditLog.action, 'auto_close'),
        ),
      );
    expect(logs.length).toBe(1);
    expect(logs[0].performedBy).toBe('cron:cleanup');
  });

  it('future closesAt opportunity untouched', async () => {
    const [row] = await db
      .select({ status: fundingOpportunities.status })
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.id, futureOppId));
    expect(row.status).toBe('open');
  });

  it('already-closed opportunity untouched', async () => {
    const [row] = await db
      .select({ status: fundingOpportunities.status, version: fundingOpportunities.version })
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.id, alreadyClosedId));
    expect(row.status).toBe('closed');
    expect(row.version).toBe(1); // version unchanged
  });
});
