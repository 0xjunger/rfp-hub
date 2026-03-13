import type { Database } from '@rfp-hub/db';

export type AppEnv = {
  Variables: {
    db: Database;
    publisherId?: string;
    publisherRole?: 'publisher' | 'admin';
  };
};
