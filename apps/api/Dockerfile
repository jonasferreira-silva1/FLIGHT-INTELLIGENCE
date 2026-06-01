FROM node:20-alpine

WORKDIR /usr/src/app

# Instalar dependências globais
RUN npm install -g pnpm

# Copiar arquivos de lock e package.json root
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./

# Copiar apenas o package.json e dependências do api
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Instalar dependências do workspace e gerar cliente Prisma
RUN pnpm install --filter api...
RUN cd apps/api && npx prisma generate

# Copiar o resto do código da API
COPY apps/api ./apps/api

WORKDIR /usr/src/app/apps/api

EXPOSE 3001

CMD ["pnpm", "run", "start:dev"]
