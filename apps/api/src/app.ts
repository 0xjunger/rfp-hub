import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { opportunitiesRoute } from './routes/opportunities.js';
import { sourcesRoute } from './routes/sources.js';
import { submitRoute } from './routes/submit.js';
import { feedRoute } from './routes/feed.js';
import { healthRoute } from './routes/health.js';
import { schemaRoute } from './routes/schema.js';
import { exportRoute } from './routes/export.js';
import { publishersRoute } from './routes/publishers.js';
import { bulkImportRoute } from './routes/bulk-import.js';
import { adminRoute } from './routes/admin.js';
import { rateLimit } from './middleware/rate-limit.js';
import type { AppEnv } from './types.js';

export const app = new OpenAPIHono<AppEnv>();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }),
);

// Rate limiting
app.use('/api/*', rateLimit({ windowMs: 60_000, max: 100, keyPrefix: 'api' }));
app.use('/feed/*', rateLimit({ windowMs: 60_000, max: 100, keyPrefix: 'feed' }));
app.use('/api/v1/submit', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'submit' }));
app.use('/api/v1/bulk-import/*', rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'bulk-import' }));
app.use('/api/v1/admin/*', rateLimit({ windowMs: 60_000, max: 100, keyPrefix: 'admin' }));

// Routes
app.route('/api/v1/opportunities', opportunitiesRoute);
app.route('/api/v1/sources', sourcesRoute);
app.route('/api/v1/submit', submitRoute);
app.route('/api/v1/export', exportRoute);
app.route('/api/v1/publishers', publishersRoute);
app.route('/api/v1/bulk-import', bulkImportRoute);
app.route('/api/v1/admin', adminRoute);
app.route('/feed', feedRoute);
app.route('/health', healthRoute);
app.route('/api/v1/schema', schemaRoute);

// OpenAPI doc endpoint
app.doc('/api/v1/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'RFP Hub API',
    version: '1.0.0',
    description:
      'Open, neutral aggregation platform for web3 funding opportunities (grants, RFPs, bounties).',
    license: {
      name: 'MIT',
    },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
});
