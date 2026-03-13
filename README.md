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
cp .env.example .env  # Fill in DATABASE_URL, REDIS_URL
npm run db:push        # Push schema to database
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
```

## Documentation

Full API reference, SDK docs, and the RFP Object Standard are available at the [docs site](https://docs.rfphub.org).

## License

MIT — see [LICENSE](LICENSE).
