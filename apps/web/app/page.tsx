import { RfpHubClient } from '@rfp-hub/sdk';

export const dynamic = 'force-dynamic';

const client = new RfpHubClient({
  baseUrl: process.env.API_URL || 'http://localhost:3000',
});

function buildUrl(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | number>,
) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v) merged[k] = v;
  }
  for (const [k, v] of Object.entries(overrides)) {
    merged[k] = String(v);
  }
  const qs = new URLSearchParams(merged).toString();
  return qs ? `?${qs}` : '/';
}

function formatBudget(
  min: number | string | null,
  max: number | string | null,
  currency?: string,
  prizePool?: number | string | null,
) {
  const cur = currency || 'USD';
  if (prizePool) return `Prize pool: $${Number(prizePool).toLocaleString()} ${cur}`;
  if (min && max)
    return `$${Number(min).toLocaleString()} – $${Number(max).toLocaleString()} ${cur}`;
  if (max) return `Up to $${Number(max).toLocaleString()} ${cur}`;
  if (min) return `From $${Number(min).toLocaleString()} ${cur}`;
  return null;
}

function relativeDate(dateStr: string | Date) {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 14) return `${days}d left`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const { data, meta } = await client.searchOpportunities({
    q: params.q || undefined,
    type: (params.type as any) || undefined,
    status: (params.status as any) || 'open',
    ecosystem: params.ecosystem || undefined,
    min_budget: params.min_budget ? Number(params.min_budget) : undefined,
    max_budget: params.max_budget ? Number(params.max_budget) : undefined,
    page,
    limit: 20,
  });

  return (
    <div>
      <section className="hero">
        <h1>
          Discover <em>Funding</em>
        </h1>
        <p className="hero-sub">
          Grants, RFPs, bounties, fellowships, and hackathons — aggregated from across web3.
        </p>
      </section>

      <form method="get" className="search-bar">
        <input
          type="search"
          name="q"
          placeholder="Search opportunities..."
          defaultValue={params.q}
        />
        <div className="filters">
          <select name="type" defaultValue={params.type || ''}>
            <option value="">All types</option>
            <option value="grant">Grant</option>
            <option value="rfp">RFP</option>
            <option value="bounty">Bounty</option>
            <option value="fellowship">Fellowship</option>
            <option value="hackathon">Hackathon</option>
          </select>
          <select name="status" defaultValue={params.status || 'open'}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="closing_soon">Closing Soon</option>
            <option value="closed">Closed</option>
            <option value="awarded">Awarded</option>
          </select>
          <input name="ecosystem" placeholder="Ecosystem..." defaultValue={params.ecosystem} />
        </div>
        <button type="submit">Search</button>
      </form>

      <div className="result-meta">
        <span>{meta.total} opportunities</span>
        <span>Page {meta.page}</span>
      </div>

      {data.length === 0 ? (
        <div className="empty">
          <h2>Nothing here yet</h2>
          <p>Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <>
          <div className="feed">
            {data.map((opp) => {
              const budget = formatBudget(
                opp.budgetMin,
                opp.budgetMax,
                opp.currency,
                opp.prizePool,
              );
              return (
                <article key={opp.id} className="feed-item">
                  <div className="feed-accent" data-type={opp.rfpType} />
                  <div className="feed-body">
                    <div className="feed-title">
                      <a href={`/opportunity/${opp.id}`}>{opp.title}</a>
                    </div>
                    <div className="feed-tags">
                      <span className="tag tag-type" data-type={opp.rfpType}>
                        {opp.rfpType}
                      </span>
                      <span className="tag tag-status" data-status={opp.status}>
                        {opp.status.replace('_', ' ')}
                      </span>
                      {opp.ecosystems?.slice(0, 2).map((e) => (
                        <span key={e} className="tag">
                          {e}
                        </span>
                      ))}
                    </div>
                    {opp.summary && <p className="feed-summary">{opp.summary}</p>}
                  </div>
                  <div className="feed-aside">
                    {budget && <span className="feed-budget">{budget}</span>}
                    {opp.closesAt && (
                      <time className="feed-date" dateTime={new Date(opp.closesAt).toISOString()}>
                        {relativeDate(opp.closesAt)}
                      </time>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <nav className="pagination">
            {page > 1 && <a href={buildUrl(params, { page: page - 1 })}>Prev</a>}
            <span className="current">
              {meta.page} / {Math.ceil(meta.total / 20) || 1}
            </span>
            {meta.hasMore && <a href={buildUrl(params, { page: page + 1 })}>Next</a>}
          </nav>
        </>
      )}
    </div>
  );
}
