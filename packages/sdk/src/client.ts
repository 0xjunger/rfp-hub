import type {
  FundingOpportunity,
  FundingSource,
  SearchOpportunities,
  CreateOpportunity,
  UpdateOpportunity,
  CreateSubmission,
} from '@rfp-hub/schema';

export interface ClientOptions {
  baseUrl: string;
  apiKey?: string;
  next?: { revalidate?: number | false; tags?: string[] };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export class RfpHubClient {
  private baseUrl: string;
  private apiKey?: string;
  private next?: { revalidate?: number | false; tags?: string[] };

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.next = options.next;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const { next: callNext, ...restInit } = (init ?? {}) as RequestInit & { next?: unknown };
    const fetchNext = callNext ?? this.next;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...restInit,
      headers,
      signal: restInit.signal ?? AbortSignal.timeout(15_000),
      ...(fetchNext ? { next: fetchNext } : {}),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`RFP Hub API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // --- Opportunities ---

  async searchOpportunities(
    params?: Partial<SearchOpportunities>,
  ): Promise<PaginatedResponse<FundingOpportunity>> {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) qs.set(k, String(v));
      }
    }
    const query = qs.toString();
    return this.request(`/api/v1/opportunities${query ? `?${query}` : ''}`);
  }

  async getOpportunity(id: string): Promise<FundingOpportunity> {
    return this.request(`/api/v1/opportunities/${id}`);
  }

  async createOpportunity(data: CreateOpportunity): Promise<FundingOpportunity> {
    return this.request('/api/v1/opportunities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOpportunity(id: string, data: UpdateOpportunity): Promise<FundingOpportunity> {
    return this.request(`/api/v1/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Sources ---

  async listSources(): Promise<{ data: FundingSource[] }> {
    return this.request('/api/v1/sources');
  }

  async getSource(id: string): Promise<FundingSource> {
    return this.request(`/api/v1/sources/${id}`);
  }

  // --- Community Submission ---

  async submitOpportunity(
    data: CreateSubmission,
  ): Promise<{ message: string; submissionId: string }> {
    return this.request('/api/v1/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
