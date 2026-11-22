FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.34.1 --activate

FROM base AS deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
# Instala as dependências da API respeitando rigorosamente o lockfile
# Não utilizamos flags de cache proprietárias para garantir compatibilidade segura com qualquer nuvem
RUN pnpm install --filter api... --frozen-lockfile

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

# Habilita o pnpm no container final para permitir comandos de gerenciamento do banco
RUN corepack enable && corepack prepare pnpm@10.34.1 --activate

# Criação de usuário e grupo de sistema sem privilégios (non-root)
# Motivo de segurança: se a API sofrer uma invasão, o atacante não terá acesso root ao container
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

# Executa a sincronização do banco de dados (Prisma db push) antes de iniciar a API NestJS
# Isso garante que as tabelas do PostgreSQL existam na nuvem antes da API receber tráfego
CMD ["sh", "-c", "pnpm --filter api exec prisma db push && node apps/api/dist/src/main.js"]