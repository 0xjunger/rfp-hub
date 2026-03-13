import type { RawOpportunity } from './normalize.js';

interface Daoip5GrantPool {
  id?: string;
  name: string;
  description?: string;
  applicationUrl?: string;
  websiteUrl?: string;
  amount?: { min?: number; max?: number; currency?: string };
  deadline?: string;
  categories?: string[];
  ecosystems?: string[];
  status?: string;
}

export async function fetchDaoip5(config: Record<string, unknown>): Promise<RawOpportunity[]> {
  const apiUrl = config.apiUrl as string;
  if (!apiUrl) throw new Error('DAOIP-5 adapter requires apiUrl in config');

  const response = await globalThis.fetch(apiUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`DAOIP-5 fetch failed: ${response.status}`);

  const data = await response.json();

  // Handle both array and wrapped response
  const pools: Daoip5GrantPool[] = Array.isArray(data)
    ? data
    : data.grantPools ?? data.grants ?? data.data ?? [];

  return pools.map((pool) => ({
    title: pool.name,
    description: pool.description ?? pool.name,
    applicationUrl: pool.applicationUrl ?? pool.websiteUrl ?? apiUrl,
    sourceUrl: pool.websiteUrl ?? apiUrl,
    externalId: pool.id ?? pool.name,
    rfpType: 'grant' as const,
    budgetMin: pool.amount?.min ?? null,
    budgetMax: pool.amount?.max ?? null,
    currency: pool.amount?.currency ?? 'USD',
    closesAt: pool.deadline ? new Date(pool.deadline) : null,
    categories: pool.categories ?? [],
    ecosystems: pool.ecosystems ?? [],
  }));
}
