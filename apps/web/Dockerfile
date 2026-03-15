FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/schema/package.json ./packages/schema/
COPY packages/sdk/package.json ./packages/sdk/

RUN npm install

# Build
COPY . .
ARG NEXT_PUBLIC_DOCS_URL="https://rfp-hub-docs.fly.dev"
ENV NEXT_PUBLIC_DOCS_URL=$NEXT_PUBLIC_DOCS_URL
RUN npx turbo build --filter=@rfp-hub/web...

# Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Next.js standalone copies only what it needs
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
