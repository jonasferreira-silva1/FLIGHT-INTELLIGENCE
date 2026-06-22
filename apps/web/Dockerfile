# ==========================
# Base
# ==========================
FROM node:22-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN corepack enable && corepack prepare pnpm@10.34.1 --activate

# ==========================
# Dependencies
# ==========================
FROM base AS deps

COPY . .

RUN --mount=type=cache,id=pnpm-web,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ==========================
# Build
# ==========================
FROM base AS builder

COPY --from=deps /app .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=true
ENV NEXT_PUBLIC_API_URL=http://api:3001

RUN pnpm --filter web build

# ==========================
# Runtime
# ==========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat

RUN addgroup -S nodejs
RUN adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

RUN mkdir -p apps/web/.next

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]