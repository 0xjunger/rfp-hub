# RFP Hub — Progress Report

**Last updated:** 2026-03-13
**Repo:** `/Users/junger/rfp-hub/`
**Infra:** Neon (PostgreSQL) + Redis Cloud, Node 22, Turborepo

---

## Milestone Status

| Milestone                             | Status   | Progress |
| ------------------------------------- | -------- | -------- |
| **M0: Foundation**                    | COMPLETE | 100%     |
| **M1: Core API**                      | COMPLETE | 100%     |
| **M2: Ingestion & Publishers**        | COMPLETE | 100%     |
| **M3: Conditional GET & Maintenance** | COMPLETE | 100%     |
| **M4: Frontend & Docs**               | COMPLETE | 100%     |
| **M5: Production Deploy**             | COMPLETE | 100%     |

---

## M0: Foundation (COMPLETE)

- [x] Turborepo monorepo with 5 packages (`schema`, `db`, `sdk`, `api`, `web`)
- [x] RFP Object Standard v1.0.0 spec (`docs/standard/v1.0.0.md`)
- [x] Zod schemas with JSON Schema export (`packages/schema`)
- [x] Drizzle PostgreSQL schema — 5 tables, 4 enums, 12+ indexes (`packages/db`)
  - `funding_sources`, `funding_opportunities`, `submissions`, `publishers`, `audit_log`
- [x] Hono API server with OpenAPI integration (`apps/api`)
- [x] Docker Compose (Postgres + Redis) + Dockerfile
- [x] GitHub Actions CI (lint + typecheck + test)
- [x] `.env` auto-loading via Node 22 `--env-file`
- [x] Neon DB + Redis Cloud connected and working
- [x] MIT + CC0 license

## M1: Core API (COMPLETE)

- [x] Full-text search (`?q=...`) via PostgreSQL FTS (`tsvector` + `ts_rank`) with GIN index
- [x] Filters: type, ecosystem, status, funder, category, tag, budget range, date range
- [x] Page/limit pagination with total count
- [x] Cursor-based pagination (keyset on sort column + id, backward-compatible with offset)
- [x] Sort by created_at, closes_at, budget_max, title (asc/desc) + relevance ranking for FTS
- [x] RSS/Atom feed generation (open opportunities)
- [x] OpenAPI 3.1 spec auto-generated from Zod (`/api/v1/openapi`)
- [x] Seed database with real data — 8 sources, 23 opportunities
- [x] Bulk export endpoint (JSON + CSV) — `GET /api/v1/export` with filters, up to 10k records
- [x] Rate limiting middleware (Redis-backed sliding window, by IP) — 100 req/min API, 10 req/min submit
- [x] Shared filter builder (`lib/build-filters.ts`) — reused by search + export
- [x] API integration tests (vitest, 13 test cases) — all passing

## M2: Ingestion & Publishers (COMPLETE)

- [x] **Publisher lifecycle**: Create, list, get, rotate keys, revoke via `/api/v1/publishers` (admin-only)
- [x] **Auth upgrade**: API keys hashed with SHA-256 (indexable, O(1) lookup); `requireAdmin` middleware
- [x] **Publisher roles**: `publisher_role` enum (`publisher` | `admin`) on publishers table
- [x] **Bulk import**: `POST /api/v1/bulk-import` with dedup, up to 100 opportunities per request
- [x] **Duplicate detection**: Two-layer (exact URL match + pg_trgm title similarity > 0.6)
- [x] **Admin moderation**: List/review submissions at `/api/v1/admin/submissions`, approve creates opportunity
- [x] **Audit logging**: All mutations (create, update, bulk_import, approve, reject, rotate_key, revoke) logged to audit_log table; viewable at `/api/v1/admin/audit-log`
- [x] **Ingestion framework**: 3 standalone adapter functions + shared `normalize()` utility:
  - `fetchRss()` — generic RSS/Atom feed polling (rss-parser)
  - `fetchEfEsp()` — cheerio-based scraper for esp.ethereum.foundation
  - `fetchDaoip5()` — JSON API fetcher for DAOIP-5 compatible endpoints
- [x] **Scheduling**: node-cron in-process scheduler
- [x] **Ingestion config**: In-code `INGESTION_SOURCES` array (`ingestion-config.ts`)
- [x] **Admin bootstrap**: `npm run create-admin` script for first admin setup
- [x] **New dependencies**: rss-parser, cheerio
- [x] **26 tests** (13 M1 + 13 M2)

### M2 Files Added

| File                                                | Purpose                            |
| --------------------------------------------------- | ---------------------------------- |
| `apps/api/src/services/audit.ts`                    | Audit log write + batch            |
| `apps/api/src/services/dedup.ts`                    | Two-layer duplicate detection      |
| `apps/api/src/services/ingestion/normalize.ts`      | Shared normalize + slugify utility |
| `apps/api/src/services/ingestion/rss-adapter.ts`    | RSS/Atom feed adapter              |
| `apps/api/src/services/ingestion/ef-esp-adapter.ts` | EF ESP scraper adapter             |
| `apps/api/src/services/ingestion/daoip5-adapter.ts` | DAOIP-5 JSON adapter               |
| `apps/api/src/ingestion-config.ts`                  | Static ingestion source config     |
| `apps/api/src/jobs/ingestion.ts`                    | Ingestion runner                   |
| `apps/api/src/routes/publishers.ts`                 | Publisher CRUD routes              |
| `apps/api/src/routes/bulk-import.ts`                | Bulk import endpoint               |
| `apps/api/src/routes/admin.ts`                      | Admin moderation routes            |
| `apps/api/src/__tests__/m2.test.ts`                 | M2 integration tests               |
| `data/create-admin.ts`                              | Admin bootstrap script             |

## M3: Conditional GET & Maintenance (COMPLETE)

- [x] **ETag + If-Modified-Since** on `GET /api/v1/opportunities` — SHA-256 ETag, `Last-Modified`, `Cache-Control`, 304 responses
- [x] **Stale entry cleanup cron** — daily midnight job auto-closes past-due opportunities with audit trail
- [x] **EF ESP live ingestion enabled** — `ethereum-foundation` source configured, every 6 hours
- [x] **9 new tests** (5 ETag/conditional GET + 4 cleanup) — total **35 tests passing**

### M3 Files Added/Modified

| File                                   | Change                                 |
| -------------------------------------- | -------------------------------------- |
| `apps/api/src/routes/opportunities.ts` | ETag + If-Modified-Since + 304 support |
| `apps/api/src/jobs/cleanup.ts`         | **NEW** — stale entry cleanup job      |
| `apps/api/src/index.ts`                | Wire cleanup cron                      |
| `apps/api/src/ingestion-config.ts`     | Enable EF ESP source                   |
| `apps/api/src/__tests__/m3.test.ts`    | **NEW** — M3 integration tests         |

## M4: Frontend & Docs (COMPLETE)

- [x] **Terminal Luxe redesign**: Dark-first aesthetic with cyan/amber accents, JetBrains Mono, glass-morphism cards
- [x] **Test data cleanup**: Removed fake/test entries from production DB, only real opportunities remain
- [x] **SDK timeout fix**: Resolved hanging requests in RfpHubClient
- [x] **CSS theming**: `globals.css` with custom properties, zero-JS dark mode via `prefers-color-scheme`
- [x] **Filter controls**: Type, status, ecosystem selects on search page (pure HTML form, server component)
- [x] **Pagination**: Previous/Page N/Next nav with filter-preserving URLs
- [x] **Empty state**: "No opportunities found" message
- [x] **Responsive layout**: Single breakpoint at 768px, stacking on mobile
- [x] **Error pages**: `not-found.tsx` (404) + `error.tsx` (client error boundary with retry)
- [x] **Detail page polish**: Badges for ecosystems/categories, `<time>` elements, error handling with `notFound()`
- [x] **Submit page polish**: Loading state on submit button, inline styles removed
- [x] **Documentation site**: Vocs-powered (`apps/docs/`) with 9 MDX pages
  - Landing page, Getting Started, API Reference (6 pages), RFP Object Standard, SDK Reference
- [x] **CI updated**: Docs build added to CI pipeline

### M4 Files Added/Modified

| File                                         | Change                                                  |
| -------------------------------------------- | ------------------------------------------------------- |
| `apps/web/app/globals.css`                   | **NEW** — CSS reset, theming, dark mode, layout classes |
| `apps/web/app/not-found.tsx`                 | **NEW** — 404 page                                      |
| `apps/web/app/error.tsx`                     | **NEW** — Error boundary                                |
| `apps/web/app/layout.tsx`                    | Import CSS, remove inline styles, add footer            |
| `apps/web/app/page.tsx`                      | Filters, pagination, empty state, CSS classes           |
| `apps/web/app/opportunity/[id]/page.tsx`     | Badges, error handling, CSS classes                     |
| `apps/web/app/submit/page.tsx`               | Loading state, remove inline styles                     |
| `apps/docs/package.json`                     | **NEW** — Vocs workspace                                |
| `apps/docs/tsconfig.json`                    | **NEW**                                                 |
| `apps/docs/vocs.config.ts`                   | **NEW** — Sidebar + nav config                          |
| `apps/docs/docs/pages/index.mdx`             | **NEW** — Landing page                                  |
| `apps/docs/docs/pages/getting-started.mdx`   | **NEW** — Quick start                                   |
| `apps/docs/docs/pages/api/index.mdx`         | **NEW** — API overview                                  |
| `apps/docs/docs/pages/api/opportunities.mdx` | **NEW** — Opportunities endpoint                        |
| `apps/docs/docs/pages/api/submit.mdx`        | **NEW** — Submit endpoint                               |
| `apps/docs/docs/pages/api/sources.mdx`       | **NEW** — Sources endpoint                              |
| `apps/docs/docs/pages/api/feeds.mdx`         | **NEW** — RSS/Atom feeds                                |
| `apps/docs/docs/pages/api/export.mdx`        | **NEW** — Export endpoint                               |
| `apps/docs/docs/pages/standard/index.mdx`    | **NEW** — RFP Object Standard                           |
| `apps/docs/docs/pages/sdk/index.mdx`         | **NEW** — SDK reference                                 |
| `.github/workflows/ci.yml`                   | Add docs build to CI                                    |

## M5: Production Deploy (COMPLETE)

- [x] **Fly.io API config**: `fly.toml` — `rfp-hub-api` in `fra` region, health check at `/health`
- [x] **Fly.io Web config**: `fly.web.toml` — `rfp-hub-web` in `fra` region, Next.js standalone
- [x] **Web Dockerfile**: Multi-stage build for Next.js standalone output
- [x] **Next.js standalone**: `output: 'standalone'` in `next.config.ts`
- [x] **Environment docs**: `.env.example` with all required variables (credentials removed)
- [x] **README.md**: Project overview, tech stack, quick start, structure
- [x] **Test stability**: `fileParallelism: false` to prevent ETag 304 flake
- [x] **Test cleanup**: `afterAll` hooks in m2/m3 tests to remove test data from DB
- [x] **Search filters fix**: Moved filter elements inside `<form>` tag
- [x] **Docs URL fix**: Replaced hardcoded `localhost:5173` with `NEXT_PUBLIC_DOCS_URL` env var

### Remaining (Post-Deploy)

- [ ] Onboard 3+ verified publishers
- [ ] Load test (100 req/s target)
- [ ] Security audit
- [ ] EF ESP grant application

---

## Seeded Data Summary

| Source                  | Opportunities | Types                                                    |
| ----------------------- | ------------- | -------------------------------------------------------- |
| Ethereum Foundation ESP | 6             | 2 RFP, 1 fellowship, 3 grant                             |
| Optimism Collective     | 4             | 4 grant                                                  |
| Arbitrum Foundation     | 4             | 4 grant                                                  |
| Gitcoin                 | 3             | 3 grant                                                  |
| Starknet Foundation     | 2             | 2 grant                                                  |
| Uniswap Foundation      | 2             | 2 grant                                                  |
| Polygon Labs            | 1             | 1 grant                                                  |
| Protocol Guild          | 1             | 1 fellowship                                             |
| Colosseum               | 1             | 1 hackathon                                              |
| Solana Foundation       | 1             | 1 grant                                                  |
| Avalanche Foundation    | 1             | 1 grant                                                  |
| Aptos Foundation        | 1             | 1 grant                                                  |
| Sui Foundation          | 2             | 2 grant                                                  |
| Filecoin Foundation     | 1             | 1 grant                                                  |
| Zama                    | 1             | 1 bounty                                                 |
| Mysten Labs             | 1             | 1 grant                                                  |
| ETHGlobal               | 1             | 1 hackathon                                              |
| **Total**               | **33**        | **23 grant, 2 RFP, 2 fellowship, 2 hackathon, 1 bounty** |

Status: 31 open, 2 closed

---

## API Endpoints (Live)

| Method | Path                                   | Status                     |
| ------ | -------------------------------------- | -------------------------- |
| GET    | `/health`                              | Working                    |
| GET    | `/api/v1/opportunities`                | Working (search + filters) |
| GET    | `/api/v1/opportunities/:id`            | Working                    |
| POST   | `/api/v1/opportunities`                | Working (API key auth)     |
| PUT    | `/api/v1/opportunities/:id`            | Working (API key auth)     |
| POST   | `/api/v1/submit`                       | Working (community queue)  |
| GET    | `/api/v1/sources`                      | Working                    |
| GET    | `/api/v1/schema`                       | Working                    |
| GET    | `/api/v1/openapi`                      | Working                    |
| GET    | `/feed/rss`                            | Working                    |
| GET    | `/feed/atom`                           | Working                    |
| GET    | `/api/v1/export`                       | Working (JSON + CSV)       |
| POST   | `/api/v1/publishers`                   | Working (admin auth)       |
| GET    | `/api/v1/publishers`                   | Working (admin auth)       |
| GET    | `/api/v1/publishers/:id`               | Working (admin auth)       |
| POST   | `/api/v1/publishers/:id/rotate-key`    | Working (admin auth)       |
| DELETE | `/api/v1/publishers/:id/revoke`        | Working (admin auth)       |
| POST   | `/api/v1/bulk-import`                  | Working (API key auth)     |
| GET    | `/api/v1/admin/submissions`            | Working (admin auth)       |
| GET    | `/api/v1/admin/submissions/:id`        | Working (admin auth)       |
| POST   | `/api/v1/admin/submissions/:id/review` | Working (admin auth)       |
| GET    | `/api/v1/admin/audit-log`              | Working (admin auth)       |

---

## Quick Start

```bash
cd /Users/junger/rfp-hub
nvm use 22
npm run seed          # Populate DB with real data
npm run create-admin  # Bootstrap first admin publisher
npm run dev           # Start API (:3000) + Web (:3001)
```
