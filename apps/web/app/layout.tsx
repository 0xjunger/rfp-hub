import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RFP Hub — Web3 Funding Opportunities',
  description:
    'Open, neutral aggregation platform for web3 grants, RFPs, bounties, and fellowships.',
  other: {
    'color-scheme': 'light dark',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RFP Hub RSS"
          href="/feed/rss"
        />
      </head>
      <body>
        <header className="site-header">
          <nav>
            <a href="/" className="logo">
              RFP Hub
            </a>
            <a href="/submit">Submit</a>
            <a href={process.env.NEXT_PUBLIC_DOCS_URL || 'https://rfp-hub-api.fly.dev/api/v1/openapi'} target="_blank" rel="noopener noreferrer">
              Docs
            </a>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>RFP Hub</span>
            <div className="site-footer-links">
              <a href="/feed/rss">RSS</a>
              <a href={process.env.NEXT_PUBLIC_DOCS_URL || 'https://rfp-hub-api.fly.dev/api/v1/openapi'} target="_blank" rel="noopener noreferrer">
                Docs
              </a>
              <a
                href="https://github.com/junger/rfp-hub"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
