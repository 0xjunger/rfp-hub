FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/schema/package.json ./packages/schema/
COPY packages/db/package.json ./packages/db/
COPY packages/sdk/package.json ./packages/sdk/

RUN npm install

# Build
COPY . .
RUN npx turbo build --filter=@rfp-hub/api...

# Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/packages/schema/dist ./packages/schema/dist
COPY --from=base /app/packages/schema/package.json ./packages/schema/
COPY --from=base /app/packages/db/dist ./packages/db/dist
COPY --from=base /app/packages/db/package.json ./packages/db/
COPY --from=base /app/package.json ./

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
