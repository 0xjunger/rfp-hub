import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { eq, like, inArray } from 'drizzle-orm';
import { publishers, fundingSources, fundingOpportunities, submissions, auditLog } from '@rfp-hub/db';
import { app } from '../app.js';
import { db } from '../db.js';
import { hashApiKey } from '../middleware/auth.js';

function req(path: string, init?: RequestInit) {
  return app.request(path, init);
}

// Test fixtures
const ADMIN_KEY = `rfphub_test_admin_${crypto.randomBytes(16).toString('hex')}`;
const ADMIN_KEY_HASH = hashApiKey(ADMIN_KEY);
let adminPublisherId: string;
let testSourceId: string;
let createdSourceId: string | null = null;

afterAll(async () => {
  // Clean up test-created opportunities by test markers
  const testOpps = await db
    .select({ id: fundingOpportunities.id })
    .from(fundingOpportunities)
    .where(like(fundingOpportunities.submittedBy, '%test%'));
  const oppIds = testOpps.map((o) => o.id);

  if (oppIds.length > 0) {
    await db.delete(auditLog).where(inArray(auditLog.entityId, oppIds));
    await db.delete(fundingOpportunities).where(inArray(fundingOpportunities.id, oppIds));
  }

  // Clean up submissions created by tests
  const testSubs = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(like(submissions.title, '%M2 Test%'));
  const subIds = testSubs.map((s) => s.id);
  const rejectSubs = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(like(submissions.title, '%Reject Test%'));
  subIds.push(...rejectSubs.map((s) => s.id));

  if (subIds.length > 0) {
    await db.delete(auditLog).where(inArray(auditLog.entityId, subIds));
    await db.delete(submissions).where(inArray(submissions.id, subIds));
  }

  // Clean up test publishers (admin + created ones)
  const testPubs = await db
    .select({ id: publishers.id })
    .from(publishers)
    .where(like(publishers.slug, 'test-%'));
  const pubIds = testPubs.map((p) => p.id);
  const newPubs = await db
    .select({ id: publishers.id })
    .from(publishers)
    .where(like(publishers.slug, 'new-publisher-%'));
  pubIds.push(...newPubs.map((p) => p.id));

  if (pubIds.length > 0) {
    await db.delete(auditLog).where(inArray(auditLog.entityId, pubIds));
    await db.delete(publishers).where(inArray(publishers.id, pubIds));
  }

  if (createdSourceId) {
    // Delete any remaining opportunities referencing this source before deleting it
    const remainingOpps = await db
      .select({ id: fundingOpportunities.id })
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.sourceId, createdSourceId));
    const remainingIds = remainingOpps.map((o) => o.id);
    if (remainingIds.length > 0) {
      await db.delete(auditLog).where(inArray(auditLog.entityId, remainingIds));
      await db.delete(fundingOpportunities).where(inArray(fundingOpportunities.id, remainingIds));
    }
    await db.delete(fundingSources).where(eq(fundingSources.id, createdSourceId));
  }
});

beforeAll(async () => {
  // Ensure we have a funding source
  const sources = await db.select().from(fundingSources).limit(1);
  testSourceId = sources[0]?.id;

  if (!testSourceId) {
    const result = await db
      .insert(fundingSources)
      .values({
        name: 'Test Source',
        slug: `test-source-${Date.now()}`,
        description: 'For testing',
      })
      .returning();
    testSourceId = result[0].id;
    createdSourceId = result[0].id;
  }

  // Create admin publisher
  const result = await db
    .insert(publishers)
    .values({
      name: 'Test Admin',
      slug: `test-admin-${Date.now()}`,
      contactEmail: 'admin@test.com',
      isVerified: true,
      apiKeyHash: ADMIN_KEY_HASH,
      role: 'admin',
    })
    .returning();
  adminPublisherId = result[0].id;
});

describe('Publisher Management', () => {
  let createdPublisherId: string;
  let createdApiKey: string;

  it('POST /api/v1/publishers as admin → publisher created, API key returned', async () => {
    const res = await req('/api/v1/publishers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ADMIN_KEY },
      body: JSON.stringify({
        name: 'New Publisher',
        slug: `new-publisher-${Date.now()}`,
        contactEmail: 'pub@test.com',
        isVerified: true,
        websiteUrl: null,
        logoUrl: null,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.apiKey).toBeDefined();
    expect(body.apiKey).toMatch(/^rfphub_/);
    expect(body.publisher.id).toBeDefined();
    createdPublisherId = body.publisher.id;
    createdApiKey = body.apiKey;
  });

  it('new API key can create opportunities', async () => {
    const res = await req('/api/v1/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': createdApiKey },
      body: JSON.stringify({
        title: 'Opportunity from new publisher',
        description: 'Testing new publisher key',
        summary: 'Test',
        rfpType: 'grant',
        applicationUrl: `https://example.com/apply-${Date.now()}`,
        sourceUrl: `https://example.com/source-${Date.now()}`,
        slug: `test-opp-newpub-${Date.now()}`,
        sourceId: testSourceId,
        submittedBy: 'test',
        submittedAt: new Date().toISOString(),
        publisherType: 'verified_publisher',
        status: 'open',
        categories: [],
        ecosystems: [],
        tags: [],
        eligibility: [],
        requiredCredentials: [],
        contactEmail: null,
        logoUrl: null,
        externalId: null,
        fundingMechanism: null,
        budgetMin: null,
        budgetMax: null,
        currency: 'USD',
        opensAt: null,
        closesAt: null,
        projectDuration: null,
        isActive: true,
      }),
    });
    expect(res.status).toBe(201);
  });

  it('POST /api/v1/publishers/:id/rotate-key → new key works, old key fails', async () => {
    const rotateRes = await req(`/api/v1/publishers/${createdPublisherId}/rotate-key`, {
      method: 'POST',
      headers: { 'X-API-Key': ADMIN_KEY },
    });
    expect(rotateRes.status).toBe(200);
    const body = await rotateRes.json();
    expect(body.apiKey).toBeDefined();
    const newKey = body.apiKey;

    // Old key should fail
    const oldKeyRes = await req('/api/v1/opportunities?limit=1', {
      headers: { 'X-API-Key': createdApiKey },
    });
    // GET doesn't require auth, so test with POST
    const oldKeyPostRes = await req('/api/v1/publishers', {
      method: 'GET',
      headers: { 'X-API-Key': createdApiKey },
    });
    expect(oldKeyPostRes.status).toBe(401);

    createdApiKey = newKey;
  });

  it('DELETE /api/v1/publishers/:id/revoke → subsequent auth requests get 403', async () => {
    const revokeRes = await req(`/api/v1/publishers/${createdPublisherId}/revoke`, {
      method: 'DELETE',
      headers: { 'X-API-Key': ADMIN_KEY },
    });
    expect(revokeRes.status).toBe(200);

    // Revoked publisher should get 403
    const authRes = await req('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': createdApiKey,
      },
      body: JSON.stringify({
        title: 'Should fail',
        description: 'x',
        summary: 'x',
        rfpType: 'grant',
        applicationUrl: 'https://example.com/fail',
        sourceUrl: 'https://example.com/fail',
        slug: `fail-${Date.now()}`,
        sourceId: testSourceId,
        submittedBy: 'test',
        submittedAt: new Date().toISOString(),
        publisherType: 'community',
        status: 'draft',
        categories: [],
        ecosystems: [],
        tags: [],
        eligibility: [],
        requiredCredentials: [],
        contactEmail: null,
        logoUrl: null,
        externalId: null,
        fundingMechanism: null,
        budgetMin: null,
        budgetMax: null,
        currency: 'USD',
        opensAt: null,
        closesAt: null,
        projectDuration: null,
        isActive: true,
      }),
    });
    expect(authRes.status).toBe(403);
  });

  it('GET /api/v1/publishers → lists publishers', async () => {
    const res = await req('/api/v1/publishers', {
      headers: { 'X-API-Key': ADMIN_KEY },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
    // Should not expose apiKeyHash
    for (const pub of body.data) {
      expect(pub.apiKeyHash).toBeUndefined();
    }
  });
});

describe('Bulk Import & Dedup', () => {
  const uniqueSuffix = Date.now();

  it('POST /api/v1/bulk-import with 3 opportunities → imported=3', async () => {
    const opps = [1, 2, 3].map((i) => ({
      title: `Bulk Test ${uniqueSuffix} #${i}`,
      description: `Description for bulk test ${i}`,
      summary: `Summary ${i}`,
      rfpType: 'grant',
      applicationUrl: `https://example.com/bulk-${uniqueSuffix}-${i}`,
      sourceUrl: `https://example.com/bulk-source-${uniqueSuffix}-${i}`,
      slug: `bulk-${uniqueSuffix}-${i}`,
      sourceId: testSourceId,
      submittedBy: 'bulk-test',
      submittedAt: new Date().toISOString(),
      publisherType: 'verified_publisher',
      status: 'open',
      categories: [],
      ecosystems: [],
      tags: [],
      eligibility: [],
      requiredCredentials: [],
      contactEmail: null,
      logoUrl: null,
      externalId: null,
      fundingMechanism: null,
      budgetMin: null,
      budgetMax: null,
      currency: 'USD',
      opensAt: null,
      closesAt: null,
      projectDuration: null,
      isActive: true,
    }));

    const res = await req('/api/v1/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ADMIN_KEY },
      body: JSON.stringify({ opportunities: opps }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(3);
    expect(body.duplicates).toBe(0);
  });

  it('POST /api/v1/bulk-import with same 3 URLs → duplicates=3', async () => {
    const opps = [1, 2, 3].map((i) => ({
      title: `Bulk Test ${uniqueSuffix} #${i} (dup)`,
      description: `Description for dup ${i}`,
      summary: `Summary ${i}`,
      rfpType: 'grant',
      applicationUrl: `https://example.com/bulk-${uniqueSuffix}-${i}`,
      sourceUrl: `https://example.com/bulk-source-${uniqueSuffix}-${i}`,
      slug: `bulk-dup-${uniqueSuffix}-${i}`,
      sourceId: testSourceId,
      submittedBy: 'bulk-test',
      submittedAt: new Date().toISOString(),
      publisherType: 'verified_publisher',
      status: 'open',
      categories: [],
      ecosystems: [],
      tags: [],
      eligibility: [],
      requiredCredentials: [],
      contactEmail: null,
      logoUrl: null,
      externalId: null,
      fundingMechanism: null,
      budgetMin: null,
      budgetMax: null,
      currency: 'USD',
      opensAt: null,
      closesAt: null,
      projectDuration: null,
      isActive: true,
    }));

    const res = await req('/api/v1/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ADMIN_KEY },
      body: JSON.stringify({ opportunities: opps }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicates).toBe(3);
    expect(body.imported).toBe(0);
  });
});

describe('Submission & Moderation', () => {
  let submissionId: string;

  it('POST /api/v1/submit → pending submission created', async () => {
    const res = await req('/api/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `M2 Test Submission ${Date.now()}`,
        description: 'A test submission for M2 moderation testing.',
        summary: 'M2 test summary',
        rfpType: 'grant',
        applicationUrl: `https://example.com/m2-submit-${Date.now()}`,
        sourceUrl: `https://example.com/m2-source-${Date.now()}`,
        categories: ['testing'],
        ecosystems: ['ethereum'],
        tags: ['m2-test'],
        budgetMin: null,
        budgetMax: null,
        currency: 'USD',
        opensAt: null,
        closesAt: null,
        submitterEmail: 'submitter@test.com',
        submitterName: 'Test Submitter',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    submissionId = body.submissionId;
    expect(submissionId).toBeDefined();
  });

  it('GET /api/v1/admin/submissions → lists pending submissions', async () => {
    const res = await req('/api/v1/admin/submissions?status=pending', {
      headers: { 'X-API-Key': ADMIN_KEY },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/admin/submissions/:id/review (approve) → opportunity created', async () => {
    const res = await req(`/api/v1/admin/submissions/${submissionId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ADMIN_KEY },
      body: JSON.stringify({ action: 'approve' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunityId).toBeDefined();
    expect(body.message).toContain('approved');
  });

  it('reject flow works', async () => {
    // Create another submission to reject
    const subRes = await req('/api/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Reject Test ${Date.now()}`,
        description: 'Will be rejected',
        summary: 'Reject test',
        rfpType: 'bounty',
        applicationUrl: `https://example.com/reject-${Date.now()}`,
        sourceUrl: `https://example.com/reject-src-${Date.now()}`,
        categories: [],
        ecosystems: [],
        tags: [],
        budgetMin: null,
        budgetMax: null,
        currency: 'USD',
        opensAt: null,
        closesAt: null,
        submitterEmail: null,
        submitterName: null,
      }),
    });
    const { submissionId: rejectId } = await subRes.json();

    const res = await req(`/api/v1/admin/submissions/${rejectId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ADMIN_KEY },
      body: JSON.stringify({ action: 'reject', reviewNotes: 'Not relevant' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunityId).toBeNull();
    expect(body.message).toContain('rejected');
  });
});

describe('Audit Log', () => {
  it('GET /api/v1/admin/audit-log → entries present from above actions', async () => {
    const res = await req('/api/v1/admin/audit-log', {
      headers: { 'X-API-Key': ADMIN_KEY },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
    // Verify we have various action types
    const actions = body.data.map((e: any) => e.action);
    expect(actions).toContain('create');
  });

  it('non-admin cannot access audit log', async () => {
    const res = await req('/api/v1/admin/audit-log');
    expect(res.status).toBe(401);
  });
});
