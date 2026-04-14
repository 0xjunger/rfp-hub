'use client';

import { useState } from 'react';

export default function SubmitPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get('title') as string,
      description: form.get('description') as string,
      summary: (form.get('summary') as string) || (form.get('title') as string).slice(0, 280),
      rfpType: form.get('rfpType') as string,
      applicationUrl: form.get('applicationUrl') as string,
      sourceUrl: form.get('sourceUrl') as string,
      budgetMin: form.get('budgetMin') ? Number(form.get('budgetMin')) : null,
      budgetMax: form.get('budgetMax') ? Number(form.get('budgetMax')) : null,
      currency: 'USD',
      opensAt: form.get('opensAt') ? new Date(form.get('opensAt') as string) : null,
      closesAt: form.get('closesAt') ? new Date(form.get('closesAt') as string) : null,
      categories: (form.get('categories') as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      ecosystems: (form.get('ecosystems') as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      prizePool: form.get('prizePool') ? Number(form.get('prizePool')) : null,
      tags: [],
      submitterEmail: (form.get('submitterEmail') as string) || null,
      submitterName: (form.get('submitterName') as string) || null,
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/v1/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.issues
                ?.map(
                  (i: { message: string; path: (string | number)[] }) =>
                    `${i.path.join('.')}: ${i.message}`,
                )
                .join('; ') || 'Submission failed';
        throw new Error(msg);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="success-state">
        <h1>Submitted</h1>
        <p>Your opportunity has been received and is queued for review.</p>
        <a href="/" className="btn">
          &larr; Back to feed
        </a>
      </div>
    );
  }

  return (
    <div className="submit-layout">
      <h1>Submit Opportunity</h1>
      <p className="submit-intro">
        Know about a grant, RFP, bounty, or hackathon? Submit it for community review.
      </p>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-full">
          Title *
          <input name="title" required />
        </label>

        <label>
          Type *
          <select name="rfpType" required>
            <option value="grant">Grant</option>
            <option value="rfp">RFP</option>
            <option value="bounty">Bounty</option>
            <option value="fellowship">Fellowship</option>
            <option value="hackathon">Hackathon</option>
          </select>
        </label>

        <label>
          Summary
          <input name="summary" maxLength={280} placeholder="Brief summary (max 280 chars)" />
        </label>

        <label className="form-full">
          Description *
          <textarea name="description" required rows={6} />
        </label>

        <label>
          Application URL *
          <input name="applicationUrl" type="url" required placeholder="https://" />
        </label>

        <label>
          Source URL *
          <input name="sourceUrl" type="url" required placeholder="https://" />
        </label>

        <label>
          Budget Min ($)
          <input name="budgetMin" type="number" />
        </label>

        <label>
          Budget Max ($)
          <input name="budgetMax" type="number" />
        </label>

        <label>
          Prize Pool ($)
          <input name="prizePool" type="number" />
        </label>

        <label>
          Opens
          <input name="opensAt" type="date" />
        </label>

        <label>
          Closes
          <input name="closesAt" type="date" />
        </label>

        <label className="form-full">
          Ecosystems
          <input name="ecosystems" placeholder="ethereum, optimism, arbitrum" />
        </label>

        <label className="form-full">
          Categories
          <input name="categories" placeholder="infrastructure, research, defi" />
        </label>

        <label>
          Your Name
          <input name="submitterName" />
        </label>

        <label>
          Your Email
          <input name="submitterEmail" type="email" />
        </label>

        <div className="form-submit-row">
          <button type="submit" className="btn-solid" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
