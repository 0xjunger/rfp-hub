import { serve } from '@hono/node-server';
import cron from 'node-cron';
import { app } from './app.js';
import { INGESTION_SOURCES } from './ingestion-config.js';
import { runIngestion } from './jobs/ingestion.js';
import { runCleanup } from './jobs/cleanup.js';

const port = Number(process.env.PORT) || 3000;

async function main() {
  console.log(`Starting RFP Hub API on port ${port}`);
  serve({ fetch: app.fetch, port });

  // Schedule ingestion for all enabled sources
  for (const source of INGESTION_SOURCES) {
    if (!source.enabled) continue;
    cron.schedule(source.cron, () => runIngestion(source));
    console.log(`[Cron] Scheduled ${source.sourceSlug} (${source.cron})`);
  }

  // Daily stale entry cleanup at midnight
  cron.schedule('0 0 * * *', () => runCleanup());
  console.log('[Cron] Scheduled stale entry cleanup (0 0 * * *)');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
