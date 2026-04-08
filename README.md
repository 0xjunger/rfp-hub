# RFP Hub

Open, neutral aggregation platform for web3 funding opportunities — grants, RFPs, bounties, fellowships, and hackathons.

## Tech Stack

- **Monorepo**: Turborepo + npm workspaces
- **API**: Hono + Node 22, PostgreSQL (Neon), Redis, Drizzle ORM
- **Web**: Next.js 15 (App Router, server components)
- **Docs**: Vocs (MDX)
- **Schema**: Zod + JSON Schema + OpenAPI 3.1
- **Deploy**: Fly.io (API + Web), Neon (DB), Redis Cloud

## Quick Start

```bash
node -v  # Requires Node 22+
npm install
docker compose up -d   # Start local Postgres 16 + Redis 7
cp .env.example .env   # Fill in DATABASE_URL, REDIS_URL
npm run db:push        # Push schema to database
psql $DATABASE_URL -f data/init.sql  # FTS indexes + extensions
npm run seed           # Populate with real data
npm run create-admin   # Bootstrap first admin publisher
npm run dev            # API :3000, Web :3001, Docs :5173
```

## Project Structure

```
apps/
  api/       Hono REST API
  web/       Next.js frontend
  docs/      Vocs documentation site
packages/
  schema/    Zod schemas + JSON Schema export
  db/        Drizzle ORM schema + migrations
  sdk/       TypeScript client SDK
data/
  seeds/     Seed data (8 sources + 23 opportunities)
  init.sql   PostgreSQL extensions + FTS/trgm indexes
  create-admin.ts  Bootstrap admin publisher
```

## Testing

```bash
npm test  # 41 tests (requires DATABASE_URL + REDIS_URL in .env)
```

## Documentation

Full API reference, SDK docs, and the RFP Object Standard are available at the [docs site](https://rfp-hub-docs.fly.dev/).

## License

MIT — see [LICENSE](LICENSE).
