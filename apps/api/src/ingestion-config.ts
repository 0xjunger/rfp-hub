export interface IngestionSourceConfig {
  sourceSlug: string;
  adapterType: 'ef-esp' | 'daoip5';
  config: Record<string, unknown>;
  cron: string;
  enabled: boolean;
}

export const INGESTION_SOURCES: IngestionSourceConfig[] = [
  {
    sourceSlug: 'ethereum-foundation',
    adapterType: 'ef-esp',
    config: { pageUrl: 'https://esp.ethereum.foundation' },
    cron: '0 */6 * * *',
    enabled: true,
  },
];
