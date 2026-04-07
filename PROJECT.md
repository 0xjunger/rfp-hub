# RFP Hub — Complete Project Reference

**Last updated:** 2026-03-15
**Status:** Production (all milestones complete, 35/35 tests passing)
**License:** MIT (code) + CC0 (RFP Object Standard)

---

## Table of Contents

1. [What is RFP Hub?](#1-what-is-rfp-hub)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Ingestion Pipeline](#8-ingestion-pipeline)
9. [Frontend (Web)](#9-frontend-web)
10. [Documentation Site](#10-documentation-site)
11. [TypeScript SDK](#11-typescript-sdk)
12. [Validation & Schemas](#12-validation--schemas)
13. [RFP Object Standard v1.0.0](#13-rfp-object-standard-v100)
14. [Testing](#14-testing)
15. [Deployment](#15-deployment)
16. [CI/CD](#16-cicd)
17. [Environment Variables](#17-environment-variables)
18. [Development Setup](#18-development-setup)
19. [Seeded Data](#19-seeded-data)
20. [Milestone History](#20-milestone-history)
21. [File Index](#21-file-index)
22. [Post-Launch Fixes](#22-post-launch-fixes-2026-03-13--2026-03-15)

---

## 1. What is RFP Hub?

RFP Hub is an **open, neutral aggregation platform** for web3 funding opportunities. It collects grants, RFPs, bounties, fellowships, and hackathons from across the ecosystem into a single searchable index with a standardized schema.

**Core value props:**
- Unified search across 8+ funding sources (EF, Optimism, Arbitrum, Gitcoin, etc.)
- Machine-readable RFP Object Standard (extends DAOIP-5)
- REST API with full-text search, cursor pagination, RSS/Atom feeds, bulk export
- Community submissions with admin moderation + audit trail
- Automated ingestion from RSS feeds, scrapers, and DAOIP-5 endpoints
- Publisher API key system for verified data sources

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│  Browser ─── SDK ─── RSS Reader ─── External Integrations    │
└──────┬──────────┬──────────┬──────────────────┬──────────────┘
       │          │          │                  │
       ▼          ▼          ▼                  ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐
│   Web   │  │   API   │  │  Feeds  │  │  Docs Site   │
│ Next.js │──│  Hono   │  │ RSS/Atom│  │    Vocs      │
│  :3001  │  │  :3000  │  │         │  │   :5173      │
└─────────┘  └────┬────┘  └─────────┘  └──────────────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
        ▼         ▼          ▼
   ┌────────┐ ┌───────┐ ┌────────────┐
   │ Neon   │ │ Redis │ │ Ingestion  │
   │ Postgres│ │ Cloud │ │  Cron Jobs │
   │ (DB)   │ │(Rate) │ │ (node-cron)│
   └────────┘ └───────┘ └────────────┘
```

**Three-layer system:**
1. **Data layer** — PostgreSQL (Neon) with Drizzle ORM, Redis for rate limiting
2. **API layer** — Hono REST API with OpenAPI spec, auth, rate limiting, cron jobs
3. **Presentation layer** — Next.js frontend, Vocs documentation, RSS/Atom feeds

---

## 3. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | 22+ |
| **Monorepo** | Turborepo | 2.3+ |
| **Package Manager** | npm | 10.9+ |
| **Language** | TypeScript | 5.7+ |
| **API Framework** | Hono | 4.6+ |
| **Database** | PostgreSQL (Neon) | 16 |
| **ORM** | Drizzle | 0.38+ |
| **Cache/Rate Limit** | Redis (Redis Cloud) | 7 |
| **Frontend** | Next.js (App Router) | 15.1+ |
| **React** | React | 19.0+ |
| **Docs** | Vocs | 1.0.12 |
| **Validation** | Zod | 3.24+ |
| **OpenAPI** | @hono/zod-openapi | 0.18+ |
| **Testing** | Vitest | 2.1+ |
| **Scraping** | Cheerio | 1.1+ |
| **RSS Parsing** | rss-parser | 3.13+ |
| **Feed Generation** | feed | 4.2+ |
| **Scheduling** | node-cron | 3.0+ |
| **Deploy** | Fly.io | — |
| **CI** | GitHub Actions | — |

---

## 4. Project Structure

```
rfp-hub/
├── apps/
│   ├── api/                          # Hono REST API server
│   │   ├── src/
│   │   │   ├── __tests__/
│   │   │   │   ├── api.test.ts       # M1 tests (13 cases)
│   │   │   │   ├── m2.test.ts        # M2 tests (13 cases)
│   │   │   │   └── m3.test.ts        # M3 tests (9 cases)
│   │   │   ├── routes/
│   │   │   │   ├── opportunities.ts  # CRUD + search + ETag
│   │   │   │   ├── sources.ts        # Funding sources
│   │   │   │   ├── submit.ts         # Community submissions
│   │   │   │   ├── feed.ts           # RSS + Atom feeds
│   │   │   │   ├── export.ts         # Bulk export (JSON/CSV)
│   │   │   │   ├── publishers.ts     # Publisher management
│   │   │   │   ├── bulk-import.ts    # Bulk ingest
│   │   │   │   ├── admin.ts          # Moderation + audit log
│   │   │   │   ├── health.ts         # Health check
│   │   │   │   └── schema.ts         # JSON Schema endpoint
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # API key auth (SHA-256)
│   │   │   │   └── rate-limit.ts     # Redis sliding window
│   │   │   ├── services/
│   │   │   │   ├── audit.ts          # Audit log writer
│   │   │   │   ├── dedup.ts          # Duplicate detection
│   │   │   │   └── ingestion/
│   │   │   │       ├── normalize.ts  # Raw → standard format
│   │   │   │       ├── rss-adapter.ts
│   │   │   │       ├── ef-esp-adapter.ts
│   │   │   │       └── daoip5-adapter.ts
│   │   │   ├── jobs/
│   │   │   │   ├── ingestion.ts      # Ingestion runner
│   │   │   │   └── cleanup.ts        # Stale entry auto-close
│   │   │   ├── lib/
│   │   │   │   └── build-filters.ts  # Shared filter builder
│   │   │   ├── app.ts               # Hono app setup + CORS + rate limits
│   │   │   ├── index.ts             # Server entrypoint + cron scheduling
│   │   │   ├── db.ts                # Drizzle instance
│   │   │   ├── redis.ts             # Redis client
│   │   │   ├── types.ts             # AppEnv type
│   │   │   └── ingestion-config.ts  # Source configuration
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── web/                          # Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── page.tsx              # Home — search + filters + feed
│   │   │   ├── layout.tsx            # Root layout + nav + footer
│   │   │   ├── globals.css           # Terminal Luxe design system
│   │   │   ├── opportunity/
│   │   │   │   └── [id]/page.tsx     # Detail page
│   │   │   ├── submit/
│   │   │   │   └── page.tsx          # Community submission form
│   │   │   ├── error.tsx             # Error boundary
│   │   │   └── not-found.tsx         # 404 page
│   │   ├── Dockerfile
│   │   ├── next.config.ts            # standalone output + transpile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── docs/                         # Vocs documentation site
│       ├── docs/pages/
│       │   ├── index.mdx             # Landing page
│       │   ├── getting-started.mdx
│       │   ├── api/
│       │   │   ├── index.mdx         # API overview
│       │   │   ├── opportunities.mdx
│       │   │   ├── submit.mdx
│       │   │   ├── sources.mdx
│       │   │   ├── feeds.mdx
│       │   │   └── export.mdx
│       │   ├── standard/
│       │   │   └── index.mdx         # RFP Object Standard
│       │   └── sdk/
│       │       └── index.mdx         # SDK reference
│       ├── Dockerfile
│       ├── vocs.config.ts
│       └── package.json
│
├── packages/
│   ├── schema/                       # Zod validation schemas
│   │   └── src/
│   │       ├── opportunity.ts        # 4 schemas + search/export
│   │       ├── submission.ts         # 4 schemas
│   │       ├── publisher.ts          # 5 schemas
│   │       ├── source.ts             # 3 schemas
│   │       ├── common.ts             # Shared utilities
│   │       ├── json-schema.ts        # Zod → JSON Schema
│   │       └── index.ts              # Re-exports
│   │
│   ├── db/                           # Drizzle ORM + schema
│   │   └── src/
│   │       ├── schema.ts             # 5 tables, 5 enums, 12+ indexes
│   │       └── index.ts              # createDb() + re-exports
│   │
│   └── sdk/                          # TypeScript client SDK
│       └── src/
│           ├── client.ts             # RfpHubClient class (7 methods)
│           └── index.ts
│
├── data/
│   ├── seeds/seed.ts                 # 8 sources + 23 opportunities
│   ├── create-admin.ts               # Bootstrap admin publisher
│   ├── init.sql                      # PG extensions + FTS/trgm indexes
│   └── importers/                    # Data import utilities
│
├── docs/
│   ├── standard/v1.0.0.md            # RFP Object Standard spec
│   └── PROGRESS.md                   # Milestone tracking
│
├── .github/workflows/ci.yml          # GitHub Actions CI pipeline
├── .dockerignore
├── .env.example
├── docker-compose.yml                # Local dev (Postgres 16 + Redis 7)
├── Dockerfile                        # API production image
├── fly.toml                          # API Fly.io config
├── fly.web.toml                      # Web Fly.io config
├── fly.docs.toml                     # Docs Fly.io config
├── turbo.json                        # Turborepo task config
├── tsconfig.json                     # Root TypeScript config
├── package.json                      # Workspace root
├── README.md
└── LICENSE                           # MIT
```

---

## 5. Database Schema

**Database:** PostgreSQL 16 on Neon (eu-central-1)
**ORM:** Drizzle 0.38+
**Extensions:** `uuid-ossp`, `pg_trgm`

### 5.1 Enums

| Enum | Values |
|---|---|
| `rfp_type` | `rfp`, `grant`, `bounty`, `fellowship`, `hackathon` |
| `opportunity_status` | `draft`, `open`, `closing_soon`, `closed`, `awarded` |
| `publisher_type` | `community`, `verified_publisher` |
| `publisher_role` | `publisher`, `admin` |
| `submission_status` | `pending`, `approved`, `rejected` |

### 5.2 Tables

#### `funding_sources`
The organizations that provide funding.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default uuid_generate_v4() |
| `name` | varchar(255) | NOT NULL |
| `slug` | varchar(255) | UNIQUE, NOT NULL |
| `description` | text | |
| `website_url` | varchar(2048) | |
| `logo_url` | varchar(2048) | |
| `contact_email` | varchar(255) | |
| `ecosystems` | jsonb | Default `[]` |
| `is_active` | boolean | Default `true` |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

#### `funding_opportunities` (main table)
Individual grants, RFPs, bounties, etc.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `external_id` | varchar(500) | DAOIP-5 formatted ID |
| `slug` | varchar(255) | UNIQUE, NOT NULL |
| `title` | varchar(500) | NOT NULL |
| `description` | text | NOT NULL |
| `summary` | varchar(280) | NOT NULL |
| `rfp_type` | rfp_type enum | NOT NULL |
| `funding_mechanism` | varchar(100) | |
| `budget_min` | numeric(15,2) | |
| `budget_max` | numeric(15,2) | |
| `currency` | varchar(3) | Default `'USD'` |
| `opens_at` | timestamptz | |
| `closes_at` | timestamptz | |
| `project_duration` | varchar(100) | |
| `status` | opportunity_status enum | NOT NULL |
| `categories` | jsonb | Default `[]` |
| `ecosystems` | jsonb | Default `[]` |
| `tags` | jsonb | Default `[]` |
| `source_id` | UUID | FK → funding_sources |
| `application_url` | varchar(2048) | NOT NULL |
| `source_url` | varchar(2048) | NOT NULL |
| `submitted_by` | varchar(255) | NOT NULL |
| `submitted_at` | timestamptz | |
| `verified_by` | varchar(255) | |
| `verified_at` | timestamptz | |
| `publisher_type` | publisher_type enum | NOT NULL |
| `eligibility` | jsonb | Default `[]` |
| `required_credentials` | jsonb | Default `[]` |
| `contact_email` | varchar(255) | |
| `logo_url` | varchar(2048) | |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |
| `version` | integer | Default `1` |
| `is_active` | boolean | Default `true` |
| `duplicate_of` | UUID | FK → self |
| `search_vector` | text | For FTS |

**Indexes:** slug, status, rfp_type, source_id, closes_at, created_at, is_active, FTS GIN (title+summary+description), pg_trgm GIN (title), source_url, application_url

#### `publishers`
API key holders (publishers + admins).

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(255) | NOT NULL |
| `slug` | varchar(255) | UNIQUE, NOT NULL |
| `website_url` | varchar(2048) | |
| `logo_url` | varchar(2048) | |
| `contact_email` | varchar(255) | |
| `is_verified` | boolean | Default `false` |
| `api_key_hash` | varchar(255) | SHA-256 hash |
| `role` | publisher_role enum | Default `'publisher'` |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

#### `submissions`
Community-submitted opportunities awaiting moderation.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `title` | varchar(500) | NOT NULL |
| `description` | text | NOT NULL |
| `summary` | varchar(280) | |
| `rfp_type` | rfp_type enum | NOT NULL |
| `application_url` | varchar(2048) | NOT NULL |
| `source_url` | varchar(2048) | NOT NULL |
| `budget_min` | numeric(15,2) | |
| `budget_max` | numeric(15,2) | |
| `currency` | varchar(3) | Default `'USD'` |
| `opens_at` | timestamptz | |
| `closes_at` | timestamptz | |
| `categories` | jsonb | Default `[]` |
| `ecosystems` | jsonb | Default `[]` |
| `tags` | jsonb | Default `[]` |
| `submitter_email` | varchar(255) | |
| `submitter_name` | varchar(255) | |
| `status` | submission_status enum | Default `'pending'` |
| `reviewed_by` | varchar(255) | |
| `reviewed_at` | timestamptz | |
| `review_notes` | text | |
| `opportunity_id` | UUID | FK → funding_opportunities |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

#### `audit_log`
Immutable log of all mutations.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `entity_type` | varchar(50) | NOT NULL |
| `entity_id` | UUID | NOT NULL |
| `action` | varchar(50) | NOT NULL |
| `changes` | jsonb | |
| `performed_by` | varchar(255) | NOT NULL |
| `performed_at` | timestamptz | Default `now()` |

**Actions tracked:** `create`, `update`, `delete`, `ingest`, `bulk_import`, `approve`, `reject`, `rotate_key`, `revoke`, `auto_close`

### 5.3 PostgreSQL Extensions & Special Indexes

```sql
-- Extensions (init.sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Full-text search (GIN index)
CREATE INDEX idx_fts ON funding_opportunities
  USING GIN (to_tsvector('english', title || ' ' || summary || ' ' || description));

-- Fuzzy title matching (trigram)
CREATE INDEX idx_trgm_title ON funding_opportunities
  USING GIN (title gin_trgm_ops);

-- URL dedup indexes
CREATE INDEX idx_source_url ON funding_opportunities (source_url);
CREATE INDEX idx_application_url ON funding_opportunities (application_url);
```

---

## 6. API Reference

**Base URL:** `https://rfp-hub-api.fly.dev`
**OpenAPI spec:** `GET /api/v1/openapi`

### 6.1 Public Endpoints (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check → `{status, timestamp, version}` |
| `GET` | `/api/v1/opportunities` | Search & filter opportunities |
| `GET` | `/api/v1/opportunities/:id` | Get single opportunity |
| `GET` | `/api/v1/sources` | List all funding sources |
| `GET` | `/api/v1/sources/:id` | Get single source |
| `GET` | `/api/v1/schema` | JSON Schema definitions |
| `GET` | `/api/v1/openapi` | OpenAPI 3.1 spec |
| `GET` | `/api/v1/export` | Bulk export (JSON/CSV) |
| `GET` | `/feed/rss` | RSS 2.0 feed (50 latest open) |
| `GET` | `/feed/atom` | Atom 1.0 feed |
| `POST` | `/api/v1/submit` | Community submission (no auth) |

### 6.2 Authenticated Endpoints (API key required)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/opportunities` | API key | Create opportunity |
| `PUT` | `/api/v1/opportunities/:id` | API key | Update opportunity |
| `POST` | `/api/v1/bulk-import` | API key | Bulk import (up to 100) |

### 6.3 Admin Endpoints (admin API key required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/publishers` | Create publisher (returns API key) |
| `GET` | `/api/v1/publishers` | List all publishers |
| `GET` | `/api/v1/publishers/:id` | Get single publisher |
| `POST` | `/api/v1/publishers/:id/rotate-key` | Rotate API key |
| `DELETE` | `/api/v1/publishers/:id/revoke` | Revoke publisher |
| `GET` | `/api/v1/admin/submissions` | List pending submissions |
| `GET` | `/api/v1/admin/submissions/:id` | Get single submission |
| `POST` | `/api/v1/admin/submissions/:id/review` | Approve/reject submission |
| `GET` | `/api/v1/admin/audit-log` | View audit trail |

### 6.4 Search & Filter Parameters

`GET /api/v1/opportunities` supports:

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Full-text search (PostgreSQL FTS with ranking) |
| `type` | enum[] | Filter by rfp_type |
| `status` | enum[] | Filter by status |
| `ecosystem` | string | JSONB contains match |
| `category` | string | JSONB contains match |
| `tag` | string | JSONB contains match |
| `funder` | UUID | Filter by source_id |
| `min_budget` | number | Budget range lower bound |
| `max_budget` | number | Budget range upper bound |
| `closing_after` | ISO date | Deadline range start |
| `closing_before` | ISO date | Deadline range end |
| `sort` | string | `field:asc\|desc` (created_at, closes_at, budget_max, title) |
| `page` | number | Offset pagination (default: 1) |
| `limit` | number | Results per page (1-100, default: 20) |
| `cursor` | string | Cursor-based pagination (keyset) |

**Response format:**
```json
{
  "data": [...],
  "meta": {
    "total": 23,
    "page": 1,
    "limit": 20,
    "hasMore": true,
    "nextCursor": "uuid-string"
  }
}
```

### 6.5 Conditional GET (Caching)

The `GET /api/v1/opportunities` endpoint supports:
- **ETag** — SHA-256 hash of response, returned as `"<16-char-hex>"`
- **Last-Modified** — Timestamp of most recent update
- **Cache-Control** — `public, max-age=60`
- **If-None-Match** — Send ETag → 304 if unchanged
- **If-Modified-Since** — Send date → 304 if unchanged

### 6.6 Rate Limiting

Redis-backed sliding window, by IP address:

| Endpoint Group | Limit |
|---|---|
| `/api/v1/*`, `/feed/*` | 100 req/min |
| `/api/v1/submit` | 10 req/min |
| `/api/v1/bulk-import/*` | 5 req/min |
| `/api/v1/admin/*` | 100 req/min |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
Exceeded: returns `429 Too Many Requests`

---

## 7. Authentication & Authorization

### API Key System

- Keys prefixed with `rfphub_` (publishers) or `rfphub_admin_` (admins)
- Stored as SHA-256 hashes (indexable, O(1) lookup)
- Sent via `X-API-Key` header

### Middleware Chain

```
requireApiKey       → validates X-API-Key, sets publisherId + publisherRole
  └── requireAdmin  → additionally checks role === 'admin'
```

### Roles

| Role | Can Do |
|---|---|
| **publisher** | Create/update opportunities, bulk import |
| **admin** | All publisher actions + manage publishers, moderate submissions, view audit log |

### Bootstrap

```bash
npm run create-admin  # Generates admin publisher + prints API key
```

---

## 8. Ingestion Pipeline

### Architecture

```
INGESTION_SOURCES config
        │
        ▼
  node-cron scheduler (in-process)
        │
        ▼
  runIngestion(source)
        │
   ┌────┼────┐
   ▼    ▼    ▼
  RSS  EF   DAOIP-5    ← Adapter layer
   │   ESP    │
   └────┼─────┘
        ▼
  normalize() → standard format
        │
        ▼
  checkDuplicate()  ← Two-layer dedup
        │
   ┌────┴────┐
   │         │
  new     duplicate
   │         │
   ▼         ▼
  INSERT   SKIP
   │
   ▼
  Audit log
```

### Adapters

| Adapter | Source | Method |
|---|---|---|
| `rss-adapter.ts` | Generic RSS/Atom | rss-parser library |
| `ef-esp-adapter.ts` | esp.ethereum.foundation | Cheerio HTML scraping |
| `daoip5-adapter.ts` | DAOIP-5 JSON endpoints | HTTP fetch |

### Duplicate Detection (Two-Layer)

1. **Exact URL match** — checks `source_url` and `application_url`
2. **Fuzzy title match** — pg_trgm similarity > 0.6

Returns: `{isDuplicate, matchType, matchedId, similarity}`

### Scheduling

Configured in `ingestion-config.ts`:

```typescript
// Currently enabled:
{ name: 'ethereum-foundation', adapter: 'ef-esp', cron: '0 */6 * * *' }  // every 6 hours
```

### Cron Jobs

| Job | Schedule | Description |
|---|---|---|
| Source ingestion | Per-source cron | Fetch → normalize → dedup → insert |
| Stale cleanup | `0 0 * * *` (midnight) | Auto-close past-due opportunities |

---

## 9. Frontend (Web)

**Framework:** Next.js 15 (App Router, server components)
**Design:** Terminal Luxe — dark-first aesthetic, cyan/amber accents, JetBrains Mono, glass-morphism cards
**Output:** Standalone (for Docker deployment)

### Pages

| Route | Component | Description |
|---|---|---|
| `/` | `page.tsx` | Home — search bar, type/status/ecosystem filters, opportunity feed, pagination |
| `/opportunity/[id]` | `opportunity/[id]/page.tsx` | Detail — full description, badges, budget, dates |
| `/submit` | `submit/page.tsx` | Community submission form with loading state |
| (404) | `not-found.tsx` | Custom 404 page |
| (error) | `error.tsx` | Client error boundary with retry |

### Key Design Decisions

- **Server components only** — no client-side JS for search/filter (pure HTML `<form method="get">`)
- **SDK integration** — uses `@rfp-hub/sdk` RfpHubClient for API calls
- **`force-dynamic`** — all pages server-rendered on demand
- **Filter-preserving pagination** — URL query params carry through page navigation
- **Responsive** — single breakpoint at 768px

### CSS Architecture

`globals.css` uses CSS custom properties for theming:
- Dark mode via `prefers-color-scheme` (zero JS)
- Type-colored accent bars on feed items (`data-type` attribute)
- Status badges with color coding (`data-status` attribute)

---

## 10. Documentation Site

**Framework:** Vocs 1.0.12 (MDX-based static site generator)
**URL:** https://rfp-hub-docs.fly.dev

### Pages (9 total)

| Page | Path | Content |
|---|---|---|
| Landing | `/` | What is RFP Hub, features overview |
| Getting Started | `/getting-started` | Quick start, installation |
| API Overview | `/api` | Auth, rate limits, pagination |
| Opportunities | `/api/opportunities` | Search, CRUD, filters |
| Submit | `/api/submit` | Community submission endpoint |
| Sources | `/api/sources` | Funding source endpoints |
| Feeds | `/api/feeds` | RSS/Atom feed usage |
| Export | `/api/export` | Bulk export (JSON/CSV) |
| RFP Standard | `/standard` | v1.0.0 spec |
| SDK | `/sdk` | TypeScript client reference |

---

## 11. TypeScript SDK

**Package:** `@rfp-hub/sdk`
**Class:** `RfpHubClient`

```typescript
import { RfpHubClient } from '@rfp-hub/sdk';

const client = new RfpHubClient({
  baseUrl: 'https://rfp-hub-api.fly.dev',
  apiKey: 'rfphub_...',  // optional, for write operations
});
```

### Methods

| Method | HTTP | Description |
|---|---|---|
| `searchOpportunities(params?)` | `GET /api/v1/opportunities` | Search with all filter params |
| `getOpportunity(id)` | `GET /api/v1/opportunities/:id` | Single opportunity |
| `createOpportunity(data)` | `POST /api/v1/opportunities` | Create (needs API key) |
| `updateOpportunity(id, data)` | `PUT /api/v1/opportunities/:id` | Update (needs API key) |
| `listSources()` | `GET /api/v1/sources` | All funding sources |
| `getSource(id)` | `GET /api/v1/sources/:id` | Single source |
| `submitOpportunity(data)` | `POST /api/v1/submit` | Community submission |

**Timeout:** 15 seconds
**Response type:** `PaginatedResponse<T>` with `{data: T[], meta: {total, page, limit, hasMore}}`

---

## 12. Validation & Schemas

**Package:** `@rfp-hub/schema`
**Library:** Zod 3.24+ with JSON Schema export

### Schema Definitions

| File | Schemas | Types Exported |
|---|---|---|
| `opportunity.ts` | `fundingOpportunitySchema`, `createOpportunitySchema`, `updateOpportunitySchema`, `searchOpportunitiesSchema`, `exportOpportunitiesSchema` | `FundingOpportunity`, `CreateOpportunity`, `UpdateOpportunity`, `SearchOpportunities`, `RfpType`, `OpportunityStatus` |
| `submission.ts` | `submissionSchema`, `createSubmissionSchema`, `reviewSubmissionSchema`, `listSubmissionsSchema` | `Submission`, `CreateSubmission`, `ReviewSubmission`, `ListSubmissions` |
| `publisher.ts` | `publisherSchema`, `createPublisherSchema`, `publicPublisherSchema`, `createPublisherResponseSchema`, `rotateKeyResponseSchema` | Publisher types |
| `source.ts` | `fundingSourceSchema`, `createFundingSourceSchema`, `updateFundingSourceSchema` | `FundingSource`, `CreateFundingSource`, `UpdateFundingSource` |

All schemas auto-generate:
- **OpenAPI 3.1 spec** at `/api/v1/openapi` via `@hono/zod-openapi`
- **JSON Schema** at `/api/v1/schema` via `zod-to-json-schema`

---

## 13. RFP Object Standard v1.0.0

**Status:** Draft
**License:** CC0 1.0 Universal
**Extends:** [DAOIP-5](https://github.com/metagov/daostar/blob/main/DAOIPs/daoip-5.md), [schema.org/Grant](https://schema.org/Grant)

### Hierarchy

```
FundingSource          → DAOIP-5 "Grant System"
  └── FundingOpportunity → DAOIP-5 "Grant Pool" (extended)
        └── Application    → DAOIP-5 "Grant" (future)
```

### FundingOpportunity Fields (30 total)

**Identity:** id (UUID v7), externalId (DAOIP-5 format), slug
**Content:** title (500 chars), description (Markdown), summary (280 chars), rfpType (5 enum values)
**Funding:** fundingMechanism (DAOIP-5, 31 types), budgetMin, budgetMax, currency (ISO 4217)
**Dates:** opensAt, closesAt, projectDuration
**Classification:** status (5 enum values), categories[], ecosystems[], tags[]
**Provenance:** sourceId, applicationUrl, sourceUrl, submittedBy, submittedAt, verifiedBy, verifiedAt, publisherType
**Metadata:** eligibility[], requiredCredentials[], contactEmail, logoUrl
**System:** createdAt, updatedAt, version, isActive, duplicateOf

Full spec: `docs/standard/v1.0.0.md`

---

## 14. Testing

**Framework:** Vitest 2.1+
**Total:** 35 tests across 3 files
**Config:** `fileParallelism: false` (sequential to prevent ETag race conditions)

### Test Files

| File | Tests | Coverage |
|---|---|---|
| `api.test.ts` | 13 | Health, search, FTS, filters, pagination, detail, 404, submit, sources, export (JSON+CSV), RSS feed, rate limit headers |
| `m2.test.ts` | 13 | Publisher CRUD, API key rotation, key revocation, bulk import, dedup, submission lifecycle, moderation (approve+reject), audit log, auth enforcement |
| `m3.test.ts` | 9 | ETag headers, If-None-Match 304, wrong ETag 200, If-Modified-Since (future/past), stale cleanup (auto-close), audit log for auto_close, future opp untouched, already-closed untouched |

### Test Data Cleanup

Both `m2.test.ts` and `m3.test.ts` include `afterAll` hooks that clean up all test-created data (opportunities, publishers, submissions, audit log entries, funding sources) to prevent DB pollution.

### Running Tests

```bash
# Requires Node 22+ and DATABASE_URL set
cd apps/api
node --env-file=../../.env ../../node_modules/.bin/vitest run

# Or from repo root
npm test --workspace=apps/api
```

---

## 15. Deployment

### Production URLs

| Service | URL | Fly App |
|---|---|---|
| **API** | https://rfp-hub-api.fly.dev | `rfp-hub-api` |
| **Web** | https://rfp-hub-web.fly.dev | `rfp-hub-web` |
| **Docs** | https://rfp-hub-docs.fly.dev | `rfp-hub-docs` |

### Infrastructure

| Component | Provider | Region | Specs |
|---|---|---|---|
| API server | Fly.io | `fra` (Frankfurt) | 1 shared CPU, 512MB RAM, min 1 machine |
| Web server | Fly.io | `fra` | 1 shared CPU, 512MB RAM, min 1 machine |
| Docs server | Fly.io | `fra` | 1 shared CPU, 256MB RAM, min 1 machine |
| Database | Neon | eu-central-1 | PostgreSQL 16, connection pooling |
| Cache | Redis Cloud | eu-central-1 | Redis 7 |

### Dockerfiles (Multi-Stage Builds)

**API** (`Dockerfile`, 99MB image):
```
node:22-alpine → npm install → turbo build --filter=@rfp-hub/api...
                → runner: node apps/api/dist/index.js
```

**Web** (`apps/web/Dockerfile`, 72MB image):
```
node:22-alpine → npm install → turbo build --filter=@rfp-hub/web...
                → runner: node apps/web/server.js (Next.js standalone)
```

**Docs** (`apps/docs/Dockerfile`, 54MB image):
```
node:22-alpine + git → npm install → turbo build --filter=@rfp-hub/docs
                      → runner: serve dist/ -s (static files)
```

### Health Checks

| App | Path | Interval | Timeout |
|---|---|---|---|
| API | `/health` | 30s | 5s |
| Web | `/` | 30s | 5s |
| Docs | `/` | 30s | 5s |

### Deploy Commands

```bash
# Set secrets (first time only)
fly secrets set DATABASE_URL="..." REDIS_URL="..." -a rfp-hub-api
fly secrets set API_URL="https://rfp-hub-api.fly.dev" NEXT_PUBLIC_API_URL="https://rfp-hub-api.fly.dev" -a rfp-hub-web

# Deploy
fly deploy -a rfp-hub-api                          # API
fly deploy -a rfp-hub-web -c fly.web.toml           # Web
fly deploy -a rfp-hub-docs --config fly.docs.toml   # Docs
```

---

## 16. CI/CD

**Platform:** GitHub Actions
**Trigger:** Push to any branch, PRs
**Node:** 22

### Pipeline

```yaml
Jobs:
  lint-and-typecheck:
    - npm ci
    - npx turbo build
    - npx turbo typecheck
    - npx turbo lint

  test:
    services: [postgres:16, redis:7]
    - npm ci
    - npx turbo build
    - npx turbo test
```

The docs build is included in the CI build step.

---

## 17. Environment Variables

| Variable | Required | Used By | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | API | Neon PostgreSQL connection string |
| `REDIS_URL` | Yes | API | Redis Cloud connection string |
| `PORT` | No | API | Server port (default: 3000) |
| `NODE_ENV` | No | All | `development` or `production` |
| `API_URL` | Yes (web) | Web | Internal API URL for SSR |
| `NEXT_PUBLIC_API_URL` | No | Web | Public API URL (client-side) |
| `NEXT_PUBLIC_DOCS_URL` | No | Web | Docs site URL (default: `https://rfp-hub-docs.fly.dev`) |

---

## 18. Development Setup

### Prerequisites
- Node.js 22+
- npm 10+
- Docker (optional, for local Postgres + Redis)

### Quick Start

```bash
git clone <repo>
cd rfp-hub
npm install

# Option A: Use Neon + Redis Cloud (copy real credentials)
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL

# Option B: Use local Docker
docker compose up -d
# .env will use localhost:5432 and localhost:6379

# Setup database
npm run db:push          # Push Drizzle schema to DB
npm run seed             # Seed 8 sources + 23 opportunities
npm run create-admin     # Bootstrap admin (prints API key)

# Development servers
npm run dev              # Starts all via Turborepo:
                         #   API  → http://localhost:3000
                         #   Web  → http://localhost:3001
                         #   Docs → http://localhost:5173
```

### Useful Commands

```bash
npm run dev              # Start all dev servers
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint all packages
npm run typecheck        # TypeScript type check
npm run format           # Prettier format
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema directly
npm run seed             # Seed database
npm run create-admin     # Create admin publisher
```

---

## 19. Seeded Data

8 funding sources, 23 real opportunities from live programs:

| Source | Opportunities | Types |
|---|---|---|
| Ethereum Foundation ESP | 6 | 2 RFP, 1 fellowship, 3 grant |
| Optimism Collective | 4 | 4 grant |
| Arbitrum Foundation | 4 | 4 grant |
| Gitcoin | 3 | 3 grant |
| Starknet Foundation | 2 | 2 grant |
| Uniswap Foundation | 2 | 2 grant |
| Polygon Labs | 1 | 1 grant |
| Protocol Guild | 1 | 1 fellowship |
| **Total** | **23** | **19 grant, 2 RFP, 2 fellowship** |

Status breakdown: 21 open, 2 closed

---

## 20. Milestone History

| Milestone | Scope | Key Deliverables |
|---|---|---|
| **M0: Foundation** | Monorepo, schema, DB, CI | Turborepo setup, 5 packages, Drizzle schema (5 tables), Docker Compose, GitHub Actions, Neon + Redis Cloud |
| **M1: Core API** | REST endpoints, search | FTS with GIN index, 12 filter params, cursor pagination, RSS/Atom feeds, bulk export, rate limiting, 13 tests |
| **M2: Ingestion & Publishers** | Auth, import, moderation | API key auth (SHA-256), publisher lifecycle, bulk import with dedup, 3 ingestion adapters, community submissions, admin moderation, audit log, 26 total tests |
| **M3: Conditional GET** | Caching, maintenance | ETag + If-Modified-Since → 304, stale entry auto-close cron, EF ESP live ingestion, 35 total tests |
| **M4: Frontend & Docs** | UI, documentation | Terminal Luxe redesign, 5 pages (home/detail/submit/404/error), Vocs docs site (9 pages), test data cleanup, SDK timeout fix |
| **M5: Production Deploy** | Fly.io, cleanup | 3 Fly.io apps deployed, Dockerfiles, .dockerignore, .env.example, README, test stability fixes, filter/URL fixes |

---

## 21. File Index

### Configuration (root)
| File | Purpose |
|---|---|
| `package.json` | Workspace root, scripts, engines |
| `turbo.json` | Task definitions, caching, dependencies |
| `tsconfig.json` | Root TypeScript config (ES2022, strict) |
| `docker-compose.yml` | Local Postgres 16 + Redis 7 |
| `Dockerfile` | API multi-stage production image |
| `.dockerignore` | Excludes node_modules, .git, .env, dist |
| `.env.example` | Environment variable documentation |
| `.env` | Local credentials (gitignored) |
| `fly.toml` | API Fly.io deployment config |
| `fly.web.toml` | Web Fly.io deployment config |
| `fly.docs.toml` | Docs Fly.io deployment config |
| `README.md` | Project overview + quick start |
| `LICENSE` | MIT license |

### API (`apps/api/`)
| File | Purpose |
|---|---|
| `src/app.ts` | Hono app, CORS, rate limiting, route mounting |
| `src/index.ts` | Server start, cron scheduling |
| `src/db.ts` | Drizzle PostgreSQL instance |
| `src/redis.ts` | Redis client initialization |
| `src/types.ts` | AppEnv type definition |
| `src/ingestion-config.ts` | Ingestion source configs |
| `src/routes/opportunities.ts` | Opportunity CRUD + search + ETag |
| `src/routes/sources.ts` | Funding source endpoints |
| `src/routes/submit.ts` | Community submission endpoint |
| `src/routes/feed.ts` | RSS/Atom feed generation |
| `src/routes/export.ts` | Bulk JSON/CSV export |
| `src/routes/publishers.ts` | Publisher management (admin) |
| `src/routes/bulk-import.ts` | Bulk import with dedup |
| `src/routes/admin.ts` | Moderation + audit log |
| `src/routes/health.ts` | Health check endpoint |
| `src/routes/schema.ts` | JSON Schema endpoint |
| `src/middleware/auth.ts` | API key validation + role check |
| `src/middleware/rate-limit.ts` | Redis sliding window limiter |
| `src/services/audit.ts` | Audit log writer (single + batch) |
| `src/services/dedup.ts` | Two-layer duplicate detection |
| `src/services/ingestion/normalize.ts` | Raw → standard opportunity format |
| `src/services/ingestion/rss-adapter.ts` | RSS/Atom feed fetcher |
| `src/services/ingestion/ef-esp-adapter.ts` | EF ESP HTML scraper |
| `src/services/ingestion/daoip5-adapter.ts` | DAOIP-5 JSON fetcher |
| `src/jobs/ingestion.ts` | Ingestion runner |
| `src/jobs/cleanup.ts` | Stale entry auto-close job |
| `src/lib/build-filters.ts` | Shared Drizzle filter builder |
| `src/__tests__/api.test.ts` | M1 integration tests (13) |
| `src/__tests__/m2.test.ts` | M2 integration tests (13) |
| `src/__tests__/m3.test.ts` | M3 integration tests (9) |
| `vitest.config.ts` | Test config (sequential file execution) |

### Web (`apps/web/`)
| File | Purpose |
|---|---|
| `app/page.tsx` | Home — search, filters, opportunity feed |
| `app/layout.tsx` | Root layout, nav, footer |
| `app/globals.css` | Terminal Luxe design system |
| `app/opportunity/[id]/page.tsx` | Opportunity detail page |
| `app/submit/page.tsx` | Community submission form |
| `app/error.tsx` | Error boundary with retry |
| `app/not-found.tsx` | Custom 404 page |
| `Dockerfile` | Next.js standalone production image |
| `next.config.ts` | Standalone output + transpile packages |

### Docs (`apps/docs/`)
| File | Purpose |
|---|---|
| `docs/pages/index.mdx` | Landing page |
| `docs/pages/getting-started.mdx` | Quick start guide |
| `docs/pages/api/index.mdx` | API overview |
| `docs/pages/api/opportunities.mdx` | Opportunities endpoint docs |
| `docs/pages/api/submit.mdx` | Submit endpoint docs |
| `docs/pages/api/sources.mdx` | Sources endpoint docs |
| `docs/pages/api/feeds.mdx` | RSS/Atom feed docs |
| `docs/pages/api/export.mdx` | Export endpoint docs |
| `docs/pages/standard/index.mdx` | RFP Object Standard |
| `docs/pages/sdk/index.mdx` | SDK reference |
| `Dockerfile` | Static site production image |
| `vocs.config.ts` | Navigation + sidebar config |

### Packages
| File | Purpose |
|---|---|
| `packages/schema/src/opportunity.ts` | Opportunity Zod schemas (5) |
| `packages/schema/src/submission.ts` | Submission Zod schemas (4) |
| `packages/schema/src/publisher.ts` | Publisher Zod schemas (5) |
| `packages/schema/src/source.ts` | Source Zod schemas (3) |
| `packages/schema/src/common.ts` | Shared utilities |
| `packages/schema/src/json-schema.ts` | Zod → JSON Schema converter |
| `packages/db/src/schema.ts` | Drizzle tables (5), enums (5), indexes (12+) |
| `packages/db/src/index.ts` | createDb() factory + re-exports |
| `packages/sdk/src/client.ts` | RfpHubClient class (7 methods) |

### Data
| File | Purpose |
|---|---|
| `data/seeds/seed.ts` | Seeds 8 sources + 23 opportunities |
| `data/create-admin.ts` | Bootstrap admin publisher script |
| `data/init.sql` | PG extensions, FTS/trgm indexes |

### Docs (content)
| File | Purpose |
|---|---|
| `docs/standard/v1.0.0.md` | RFP Object Standard specification |
| `docs/PROGRESS.md` | Milestone tracking & history |

---

## 22. Post-Launch Fixes (2026-03-13 → 2026-03-15)

Fixes applied after initial production deploy (M5).

### CI/CD Stabilization

| Commit | Fix |
|---|---|
| `28fedf2` | Remove `--env-file` from test script; replace `next lint` with `tsc` |
| `13e3085` | Add `--passWithNoTests` to packages without test files |
| `0f5a07e` | Pass `DATABASE_URL` and `REDIS_URL` through turbo to test tasks |
| `3e98ec9` | Push DB schema before running tests |
| `ae2d04a` | Run `init.sql` after drizzle push for `pg_trgm` extension and indexes |
| `ffd71d0` | Install `postgresql-client` for `init.sql` execution in CI |
| `a87170c` | Fix test cleanup: delete opportunities before funding source (FK order) |
| `d09f42c` | Make `api.test.ts` and `m3.test.ts` self-contained (no cross-test deps) |

### Bug Fixes

| Commit | Fix |
|---|---|
| `237eace` | Fix search crash caused by malformed query; match search bar sizing to filter dropdowns |
| `f55f7a3` | Fix search bar and button height mismatch with filter dropdowns — `.filters` now uses `display: contents` so all controls share the same flex row and height |

### Deployment Fixes

| Commit | Fix |
|---|---|
| `631596c` | Add `API_URL` to `fly.web.toml` (server-side data fetching was hitting `localhost`); add `NEXT_PUBLIC_DOCS_URL` as Dockerfile build `ARG`+`ENV` (Next.js inlines `NEXT_PUBLIC_*` at build time, not runtime) |
| `bd05839`, `f3a2051` | Fix docs link — was pointing to OpenAPI endpoint, now points to actual docs site (`https://rfp-hub-docs.fly.dev`) across `layout.tsx`, `Dockerfile`, `fly.web.toml`, and `.env.example` |

### Key Lessons

- **`NEXT_PUBLIC_*` env vars must be set at build time** — setting them in `fly.web.toml` `[env]` (runtime) has no effect. Use Dockerfile `ARG`/`ENV` before the build step.
- **Fly.io can overwrite CI deploys** — if a manual `fly deploy` runs after CI, the CI image gets replaced. Always deploy via CI only.
- **`API_URL` is needed for SSR** — Next.js server components use `API_URL` to reach the API; without it, they fall back to `localhost:3000`.
