import { createDb, type Database } from '@rfp-hub/db';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const db: Database = createDb(databaseUrl);
