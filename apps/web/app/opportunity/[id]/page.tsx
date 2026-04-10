import { notFound } from 'next/navigation';
import { RfpHubClient } from '@rfp-hub/sdk';

const client = new RfpHubClient({
  baseUrl: process.env.API_URL || 'http://localhost:3000',
});

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

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let opp;
  try {
    opp = await client.getOpportunity(id);
  } catch {
    notFound();
  }

  const budget = formatBudget(opp.budgetMin, opp.budgetMax, opp.currency, opp.prizePool);

  return (
    <div>
      <a href="/" className="detail-back">
        &larr; Back to search
      </a>

      <header className="detail-header">
        <h1>{opp.title}</h1>

        <div className="detail-tags">
          <span className="tag tag-type" data-type={opp.rfpType}>
            {opp.rfpType}
          </span>
          <span className="tag tag-status" data-status={opp.status}>
            {opp.status.replace('_', ' ')}
          </span>
          {opp.ecosystems.map((e) => (
            <span key={e} className="tag">
              {e}
            </span>
          ))}
        </div>

        <div className="detail-budget-row">
          {budget && <span className="detail-budget-amount">{budget}</span>}
          {opp.closesAt && (
            <span className="detail-deadline">
              Closes{' '}
              <time dateTime={new Date(opp.closesAt).toISOString()}>
                {new Date(opp.closesAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </span>
          )}
        </div>
      </header>

      <div className="detail-body">
        <div className="detail-content">{opp.description}</div>

        <aside className="detail-sidebar">
          {opp.categories.length > 0 && (
            <div className="detail-sidebar-section">
              <h3>Categories</h3>
              <div className="detail-sidebar-tags">
                {opp.categories.map((c) => (
                  <span key={c} className="tag">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {opp.tags.length > 0 && (
            <div className="detail-sidebar-section">
              <h3>Tags</h3>
              <div className="detail-sidebar-tags">
                {opp.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-sidebar-section">
            <h3>Publisher</h3>
            <p className="detail-sidebar-value">{opp.publisherType.replace('_', ' ')}</p>
          </div>

          <div className="detail-sidebar-section">
            <h3>Added</h3>
            <p className="detail-sidebar-value">
              <time dateTime={new Date(opp.createdAt).toISOString()}>
                {new Date(opp.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </p>
          </div>

          {opp.sourceUrl && (
            <div className="detail-sidebar-section">
              <h3>Source</h3>
              <p className="detail-sidebar-value">
                <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer">
                  View original &rarr;
                </a>
              </p>
            </div>
          )}

          {opp.applicationUrl && (
            <div className="detail-apply">
              <a
                href={opp.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-solid"
              >
                Apply Now &rarr;
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
