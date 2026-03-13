import { defineConfig } from 'vocs';

export default defineConfig({
  title: 'RFP Hub',
  description: 'Open, neutral aggregation platform for web3 funding opportunities.',
  topNav: [
    { text: 'API', link: '/api' },
    { text: 'Standard', link: '/standard' },
    { text: 'GitHub', link: 'https://github.com/junger/rfp-hub' },
  ],
  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'What is RFP Hub?', link: '/' },
        { text: 'Getting Started', link: '/getting-started' },
      ],
    },
    {
      text: 'API Reference',
      items: [
        { text: 'Overview', link: '/api' },
        { text: 'Opportunities', link: '/api/opportunities' },
        { text: 'Submit', link: '/api/submit' },
        { text: 'Sources', link: '/api/sources' },
        { text: 'Feeds', link: '/api/feeds' },
        { text: 'Export', link: '/api/export' },
        { text: 'Publishers', link: '/api/publishers' },
        { text: 'Bulk Import', link: '/api/bulk-import' },
        { text: 'Admin', link: '/api/admin' },
      ],
    },
    {
      text: 'RFP Object Standard',
      items: [{ text: 'v1.0.0', link: '/standard' }],
    },
    {
      text: 'SDK',
      items: [{ text: 'TypeScript Client', link: '/sdk' }],
    },
  ],
});
