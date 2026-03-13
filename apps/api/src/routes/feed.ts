import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Feed } from 'feed';
import { desc, eq, and } from 'drizzle-orm';
import { fundingOpportunities } from '@rfp-hub/db';
import { db } from '../db.js';
import type { AppEnv } from '../types.js';

export const feedRoute = new OpenAPIHono<AppEnv>();

async function buildFeed(format: 'rss' | 'atom') {
  const feed = new Feed({
    title: 'RFP Hub — Web3 Funding Opportunities',
    description: 'Latest grants, RFPs, bounties, and fellowships in the web3 ecosystem.',
    id: 'https://rfphub.xyz/',
    link: 'https://rfphub.xyz/',
    language: 'en',
    copyright: 'CC0 — Public Domain',
    updated: new Date(),
  });

  const opportunities = await db
    .select()
    .from(fundingOpportunities)
    .where(and(eq(fundingOpportunities.isActive, true), eq(fundingOpportunities.status, 'open')))
    .orderBy(desc(fundingOpportunities.createdAt))
    .limit(50);

  for (const opp of opportunities) {
    feed.addItem({
      title: opp.title,
      id: opp.id,
      link: opp.applicationUrl,
      description: opp.summary,
      content: opp.description,
      date: opp.createdAt,
      category: (opp.categories as string[]).map((c) => ({ name: c })),
    });
  }

  return format === 'rss' ? feed.rss2() : feed.atom1();
}

const rssRoute = createRoute({
  method: 'get',
  path: '/rss',
  responses: {
    200: {
      content: { 'application/xml': { schema: z.string() } },
      description: 'RSS 2.0 feed',
    },
  },
  tags: ['Feeds'],
});

feedRoute.openapi(rssRoute, async (c) => {
  const xml = await buildFeed('rss');
  return c.text(xml, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
});

const atomRoute = createRoute({
  method: 'get',
  path: '/atom',
  responses: {
    200: {
      content: { 'application/xml': { schema: z.string() } },
      description: 'Atom 1.0 feed',
    },
  },
  tags: ['Feeds'],
});

feedRoute.openapi(atomRoute, async (c) => {
  const xml = await buildFeed('atom');
  return c.text(xml, 200, { 'Content-Type': 'application/atom+xml; charset=utf-8' });
});
