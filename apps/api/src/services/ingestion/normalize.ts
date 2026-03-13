export interface RawOpportunity {
  title: string;
  description: string;
  summary?: string;
  applicationUrl: string;
  sourceUrl: string;
  externalId?: string;
  rfpType?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  opensAt?: Date | null;
  closesAt?: Date | null;
  categories?: string[];
  ecosystems?: string[];
  tags?: string[];
  eligibility?: string[];
  contactEmail?: string | null;
}

export interface IngestionResult {
  fetched: number;
  imported: number;
  duplicates: number;
  errors: string[];
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 200) +
    '-' +
    Date.now().toString(36)
  );
}

export function normalize(raw: RawOpportunity, sourceId: string, adapterType: string) {
  return {
    title: raw.title,
    description: raw.description,
    summary: (raw.summary ?? raw.description).slice(0, 280),
    rfpType: (raw.rfpType as 'rfp' | 'grant' | 'bounty' | 'fellowship' | 'hackathon') ?? 'grant',
    applicationUrl: raw.applicationUrl,
    sourceUrl: raw.sourceUrl,
    externalId: raw.externalId ?? null,
    budgetMin: raw.budgetMin != null ? String(raw.budgetMin) : null,
    budgetMax: raw.budgetMax != null ? String(raw.budgetMax) : null,
    currency: raw.currency ?? 'USD',
    opensAt: raw.opensAt ?? null,
    closesAt: raw.closesAt ?? null,
    categories: raw.categories ?? [],
    ecosystems: raw.ecosystems ?? [],
    tags: raw.tags ?? [],
    eligibility: raw.eligibility ?? [],
    requiredCredentials: [],
    contactEmail: raw.contactEmail ?? null,
    logoUrl: null,
    fundingMechanism: null,
    projectDuration: null,
    sourceId,
    slug: slugify(raw.title),
    submittedBy: `ingestion:${adapterType}`,
    publisherType: 'verified_publisher' as const,
    status: 'open' as const,
    isActive: true,
  };
}
