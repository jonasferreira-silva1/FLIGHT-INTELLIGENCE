FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.34.1 --activate

FROM base AS deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm-api,target=/pnpm/store \
    pnpm install --filter api... --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-workspace.yaml package.json       ./
COPY apps/api                               ./apps/api
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api exec nest build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules          ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist         ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma       ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma.config.ts ./apps/api/
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/
COPY pnpm-workspace.yaml package.json ./

USER nestjs
EXPOSE 3001

CMD ["sh", "-c", "node apps/api/dist/src/main.js"]