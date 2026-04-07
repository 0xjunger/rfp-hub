FROM node:22-alpine AS base

RUN apk add --no-cache git

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY turbo.json ./
COPY apps/docs/package.json ./apps/docs/

RUN npm install

# Build
COPY . .
RUN npx turbo build --filter=@rfp-hub/docs

# Serve with lightweight static server
FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g serve

COPY --from=base /app/apps/docs/docs/dist ./dist

ENV PORT=3000
EXPOSE 3000

CMD ["serve", "dist", "-l", "3000"]
