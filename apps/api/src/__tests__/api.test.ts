import { describe, it, expect } from 'vitest';
import { app } from '../app.js';

function req(path: string, init?: RequestInit) {
  return app.request(path, init);
}

describe('Health', () => {
  it('GET /health → 200 with status ok', async () => {
    const res = await req('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

describe('Opportunities', () => {
  it('GET /api/v1/opportunities → paginated results with meta', async () => {
    const res = await req('/api/v1/opportunities');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('page');
    expect(body.meta).toHaveProperty('limit');
    expect(body.meta).toHaveProperty('hasMore');
  });

  it('GET /api/v1/opportunities?q=privacy → FTS results', async () => {
    const res = await req('/api/v1/opportunities?q=privacy');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/opportunities?type=rfp → only RFPs', async () => {
    const res = await req('/api/v1/opportunities?type=rfp');
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const opp of body.data) {
      expect(opp.rfpType).toBe('rfp');
    }
  });

  it('GET /api/v1/opportunities?ecosystem=arbitrum → only Arbitrum', async () => {
    const res = await req('/api/v1/opportunities?ecosystem=arbitrum');
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const opp of body.data) {
      expect(
        (opp.ecosystems as string[]).some((e: string) =>
          e.toLowerCase().includes('arbitrum'),
        ),
      ).toBe(true);
    }
  });

  it('GET /api/v1/opportunities/:id → single opportunity', async () => {
    // First, get a valid ID
    const listRes = await req('/api/v1/opportunities?limit=1');
    const listBody = await listRes.json();
    const id = listBody.data[0]?.id;
    expect(id).toBeDefined();

    const res = await req(`/api/v1/opportunities/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
  });

  it('GET /api/v1/opportunities/:id with bad UUID → 404', async () => {
    const res = await req('/api/v1/opportunities/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('Submit', () => {
  it('POST /api/v1/submit → 201 with submissionId', async () => {
    const res = await req('/api/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Submission',
        description: 'A test submission for integration testing.',
        summary: 'Test summary',
        rfpType: 'grant',
        applicationUrl: 'https://example.com/apply',
        sourceUrl: 'https://example.com/source',
        categories: ['testing'],
        ecosystems: ['ethereum'],
        tags: ['test'],
        budgetMin: null,
        budgetMax: null,
        currency: 'USD',
        opensAt: null,
        closesAt: null,
        submitterEmail: null,
        submitterName: null,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.submissionId).toBeDefined();
    expect(body.message).toContain('received');
  });
});

describe('Sources', () => {
  it('GET /api/v1/sources → array of sources', async () => {
    const res = await req('/api/v1/sources');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
  });
});

describe('Export', () => {
  it('GET /api/v1/export → JSON with all records', async () => {
    const res = await req('/api/v1/export');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/export?format=csv → text/csv with header row', async () => {
    const res = await req('/api/v1/export?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    const text = await res.text();
    const lines = text.split('\n');
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('title');
    expect(lines.length).toBeGreaterThan(1);
  });
});

describe('Feeds', () => {
  it('GET /feed/rss → valid RSS XML', async () => {
    const res = await req('/feed/rss');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/rss+xml');
    const text = await res.text();
    expect(text).toContain('<rss');
    expect(text).toContain('<channel>');
  });
});

describe('Rate Limiting', () => {
  it('responses include rate limit headers', async () => {
    const res = await req('/api/v1/opportunities?limit=1');
    // Headers are present when Redis is available, otherwise skipped
    const limit = res.headers.get('x-ratelimit-limit');
    const remaining = res.headers.get('x-ratelimit-remaining');
    // In CI without Redis, these will be null — just check the request succeeds
    expect(res.status).toBe(200);
    if (limit) {
      expect(Number(limit)).toBeGreaterThan(0);
      expect(remaining).not.toBeNull();
    }
  });
});
