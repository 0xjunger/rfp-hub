import Parser from 'rss-parser';
import type { RawOpportunity } from './normalize.js';

const parser = new Parser();

export async function fetchRss(config: Record<string, unknown>): Promise<RawOpportunity[]> {
  const feedUrl = config.feedUrl as string;
  if (!feedUrl) throw new Error('RSS adapter requires feedUrl in config');

  const feed = await parser.parseURL(feedUrl);
  const opportunities: RawOpportunity[] = [];

  for (const item of feed.items) {
    if (!item.title || !item.link) continue;

    opportunities.push({
      title: item.title,
      description: item.contentSnippet ?? item.content ?? item.title,
      summary: (item.contentSnippet ?? item.title).slice(0, 280),
      applicationUrl: item.link,
      sourceUrl: item.link,
      externalId: item.guid ?? item.link,
      rfpType: (config.defaultRfpType as string) ?? 'grant',
      categories: item.categories ?? [],
      opensAt: item.pubDate ? new Date(item.pubDate) : null,
    });
  }

  return opportunities;
}
