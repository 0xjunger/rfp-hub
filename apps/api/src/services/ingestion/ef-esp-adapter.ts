import * as cheerio from 'cheerio';
import type { RawOpportunity } from './normalize.js';

export async function fetchEfEsp(config: Record<string, unknown>): Promise<RawOpportunity[]> {
  const pageUrl = (config.pageUrl as string) ?? 'https://esp.ethereum.foundation';
  const response = await globalThis.fetch(pageUrl);
  if (!response.ok) throw new Error(`Failed to fetch EF ESP page: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const opportunities: RawOpportunity[] = [];

  // Try multiple selectors for resilience
  const selectors = [
    config.itemSelector as string,
    'article',
    '.wishlist-item',
    '.rfp-card',
    '[data-rfp]',
  ].filter(Boolean);

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      const title =
        $el.find('h2, h3, .title').first().text().trim() ||
        $el.find('a').first().text().trim();
      const link =
        $el.find('a').first().attr('href') || '';
      const description =
        $el.find('p, .description, .summary').first().text().trim() ||
        title;

      if (!title || !link) return;

      const fullUrl = link.startsWith('http') ? link : new URL(link, pageUrl).toString();

      opportunities.push({
        title,
        description,
        applicationUrl: fullUrl,
        sourceUrl: fullUrl,
        externalId: fullUrl,
        rfpType: 'rfp',
        ecosystems: ['ethereum'],
        categories: ['ethereum-foundation'],
      });
    });

    if (opportunities.length > 0) break; // Use first selector that yields results
  }

  return opportunities;
}
