# Implementation Plan: Sprint 5B — Frontend

## Overview

Porta a interface do `modelo-referencia` para `apps/web`, substituindo toda a camada de dados simulados por conexão real ao backend NestJS. O trabalho é ordenado em seis etapas: infraestrutura Docker → configuração do projeto Next.js → camada de dados (store, API, hooks) → componentes e providers → páginas → testes.

## Tasks

- [-] 1. Corrigir infraestrutura Docker e criar migration Prisma
  - [x] 1.1 Corrigir `docker-compose.yml`
    - Remover o serviço `cache` (Redis) e todas as referências a ele (`depends_on: cache`, `REDIS_URL`)
    - Corrigir `DATABASE_URL` do serviço `api` para `postgresql://rec:rec@db:5432/rec_flight`
    - Adicionar variáveis de ambiente ao serviço `web`: `NEXT_PUBLIC_API_URL=http://api:3001` e `NEXT_PUBLIC_API_WS_URL=http://api:3001`
    - Adicionar `depends_on: db` (com health-check se possível) ao serviço `api`
    - _Requirements: 12.1, 12.2_

  - [x] 1.2 Corrigir `apps/api/Dockerfile` para rodar migrations antes de iniciar
    - Adicionar `RUN npx prisma generate` (já presente) e ajustar para build de produção
    - Substituir `CMD ["pnpm", "run", "start:dev"]` por script que executa `npx prisma migrate deploy && pnpm run start:prod`
    - Verificar que o schema Prisma usa `url = env("DATABASE_URL")` no datasource
    - _Requirements: 14.1_

  - [x] 1.3 Criar migration inicial do Prisma
    - Executar `npx prisma migrate dev --name init` no diretório `apps/api` (com banco PostgreSQL local acessível ou via Docker)
    - Verificar que o diretório `apps/api/prisma/migrations/` é gerado com o arquivo SQL da migration
    - Confirmar que o schema contém as tabelas `Flight`, `FlightState` e `Alert`
    - _Requirements: 14.1_

- [-] 2. Configurar `apps/web`: dependências, tsconfig, Tailwind e shadcn/ui

  - [ ] 2.1 Atualizar `apps/web/package.json` com todas as dependências do modelo-referencia
    - Adicionar ao bloco `dependencies`: `socket.io-client`, `zustand`, `maplibre-gl`, `lucide-react`, `date-fns`, `recharts`, `next-themes`, `sonner`, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `vaul`, `zod`, `react-hook-form`, `@hookform/resolvers`, todos os pacotes `@radix-ui/*` listados em `modelo-referencia/package.json`
    - Adicionar ao bloco `devDependencies`: `vitest`, `@vitest/coverage-v8`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
    - Manter versão do `next` em `14.2.3` (compatível com o monorepo)
    - _Requirements: 1.1, 1.2_

  - [ ] 2.2 Verificar `apps/web/tsconfig.json` — alias `@` já configurado
    - Confirmar que `"paths": { "@/*": ["./src/*"] }` está presente (já existe no arquivo atual)
    - Não é necessária alteração
    - _Requirements: 13.6_

  - [ ] 2.3 Substituir `apps/web/tailwind.config.ts` pelo equivalente ao modelo-referencia
    - Copiar `modelo-referencia/tailwind.config.ts` para `apps/web/tailwind.config.ts`, adaptando os caminhos de `content` para `./src/**/*.{js,ts,jsx,tsx,mdx}`
    - _Requirements: 1.4_

  - [ ] 2.4 Criar `apps/web/components.json` (configuração shadcn/ui)
    - Copiar `modelo-referencia/components.json` para `apps/web/components.json`
    - Ajustar o campo `tailwind.css` para `src/app/globals.css`
    - _Requirements: 1.2_

  - [ ] 2.5 Atualizar `apps/web/next.config.mjs` com output standalone e rewrite de proxy
    - Definir `output: 'standalone'`
    - Adicionar `async rewrites()` mapeando `/api/:path*` → `${NEXT_PUBLIC_API_URL}/:path*`
    - Adicionar `images: { unoptimized: true }`
    - _Requirements: 14.4_

  - [ ] 2.6 Criar `apps/web/.env.local.example` com variáveis documentadas
    - Incluir `NEXT_PUBLIC_API_URL=http://localhost:3001`
    - Incluir `NEXT_PUBLIC_API_WS_URL=http://localhost:3001`
    - _Requirements: 12.3, 12.4_

- [ ] 3. Criar a camada de dados: types, utils, api client e store

  - [ ] 3.1 Copiar `lib/types.ts` do modelo-referencia
    - Copiar `modelo-referencia/lib/types.ts` para `apps/web/src/lib/types.ts` sem alterações
    - Adicionar as funções guard de runtime ao final do arquivo: `isValidFlightPosition(data: unknown): data is FlightPosition` e `isValidFlightAlert(data: unknown): data is FlightAlert`
    - _Requirements: 13.3, 14.2, 14.3_

  - [ ] 3.2 Copiar `lib/utils.ts` do modelo-referencia
    - Copiar `modelo-referencia/lib/utils.ts` para `apps/web/src/lib/utils.ts` sem alterações
    - _Requirements: 13.3_

  - [ ] 3.3 Copiar `lib/mock-data.ts` do modelo-referencia (referência apenas)
    - Copiar `modelo-referencia/lib/mock-data.ts` para `apps/web/src/lib/mock-data.ts`
    - Este arquivo não deve ser importado em nenhum componente de produção
    - _Requirements: 13.5_

  - [ ] 3.4 Criar `apps/web/src/lib/api.ts` — cliente REST tipado
    - Definir `API_BASE`: `typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')`
    - Implementar helper interno `fetchSafe<T>(url, fallback)` com tratamento de erros HTTP e de rede
    - Implementar `interface ApiAlertRaw` (interno, não exportado)
    - Implementar `mapAlertFromApi(raw: ApiAlertRaw): FlightAlert`
    - Exportar objeto `api` com os métodos: `getFlights(): Promise<Flight[]>`, `getPositions(): Promise<FlightPosition[]>`, `getAlerts(): Promise<FlightAlert[]>`, `markAlertRead(id: string): Promise<void>`, `clearAlerts(): Promise<void>`, `getFlightById(id: string): Promise<Flight>`, `getFlightStates(id: string): Promise<FlightPosition[]>`
    - _Requirements: 2.2, 2.3, 2.4, 2.6, 9.4, 9.6_

  - [ ] 3.5 Reescrever `apps/web/src/lib/store.ts` — elimina mocks, conecta ao backend real
    - Implementar `deriveDailyStats(flights: Flight[]): DailyStats` como função pura local
    - Definir `interface FlightStore` com todos os campos obrigatórios: `flights`, `positions`, `alerts`, `dailyStats`, `selectedFlight`, `isConnected`, `lastUpdate`
    - Implementar actions REST: `loadFlights()`, `loadPositions()`, `loadAlerts()`, `refreshData()` usando `api.ts`
    - `setFlights` deve chamar `deriveDailyStats` automaticamente e atualizar `dailyStats` e `lastUpdate`
    - Implementar actions UI: `setSelectedFlight`, `markAlertRead`, `clearAlerts`, `setConnected`
    - Implementar actions WebSocket: `handleFlightUpdate(data: unknown)`, `handleFlightAlert(data: unknown)`, `handleFlightLanded(data)`, `handleFlightDeparted(data)` — todos com guards de runtime usando `isValidFlightPosition` e `isValidFlightAlert`
    - `handleFlightAlert` deve limitar `alerts` a 50 itens (LIFO)
    - Exportar `refreshData` também diretamente (para o `header.tsx`)
    - Remover completamente: `initializeMockData`, `simulateUpdate` e qualquer importação de `mock-data.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.5, 3.6, 3.7, 3.8, 4.3_

- [ ] 4. Criar hooks e SocketProvider

  - [ ] 4.1 Copiar `hooks/use-mobile.ts` e `hooks/use-toast.ts` do modelo-referencia
    - Copiar `modelo-referencia/hooks/use-mobile.ts` → `apps/web/src/hooks/use-mobile.ts`
    - Copiar `modelo-referencia/hooks/use-toast.ts` → `apps/web/src/hooks/use-toast.ts`
    - _Requirements: 13.1_

  - [ ] 4.2 Criar `apps/web/src/hooks/use-socket.ts`
    - Marcar com `'use client'`
    - Ler URL do socket via `process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:3001'`
    - No `useEffect`: criar instância `socket.io-client` com `autoConnect: true`
    - Registrar handler `connect`: chamar `store.setConnected(true)`, emitir `join:room` com `{ room: 'rec:live' }`, logar conexão no console
    - Registrar handler `disconnect`: chamar `store.setConnected(false)`
    - Registrar handler `flight:update`: chamar `store.handleFlightUpdate(data)`
    - Registrar handler `flight:alert`: chamar `store.handleFlightAlert(data)`
    - Registrar handler `flight:landed`: chamar `store.handleFlightLanded(data)`
    - Registrar handler `flight:departed`: chamar `store.handleFlightDeparted(data)`
    - Reemitir `join:room` automaticamente após reconexão (`reconnect` event)
    - Cleanup: `socket.disconnect()` no return do `useEffect`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ] 4.3 Criar `apps/web/src/hooks/use-flight-polling.ts`
    - Marcar com `'use client'`
    - No `useEffect`: chamar `store.refreshData()` imediatamente na montagem (carga inicial)
    - Configurar `setInterval` de 30.000 ms chamando `store.refreshData()`
    - Cleanup: `clearInterval` no return do `useEffect`
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 4.4 Criar `apps/web/src/components/socket-provider.tsx`
    - Marcar com `'use client'`
    - Chamar `useSocket()` internamente
    - Renderizar apenas `{children}` sem adicionar marcação HTML
    - _Requirements: 3.1_

- [ ] 5. Copiar componentes UI e portar componentes de apresentação

  - [ ] 5.1 Copiar `apps/web/src/app/globals.css` do modelo-referencia
    - Copiar `modelo-referencia/app/globals.css` para `apps/web/src/app/globals.css`
    - Este arquivo contém todas as variáveis CSS de tema (`--success`, `--warning`, `--info`, `--sidebar`, etc.)
    - _Requirements: 1.4_

  - [ ] 5.2 Copiar os 57 arquivos de `components/ui/` do modelo-referencia
    - Copiar todo o conteúdo de `modelo-referencia/components/ui/` para `apps/web/src/components/ui/` sem alterações
    - _Requirements: 13.2_

  - [ ] 5.3 Copiar componentes de apresentação sem alteração
    - Copiar `modelo-referencia/components/theme-provider.tsx` → `apps/web/src/components/theme-provider.tsx`
    - Copiar `modelo-referencia/components/flight-card.tsx` → `apps/web/src/components/flight-card.tsx`
    - Copiar `modelo-referencia/components/flight-details-modal.tsx` → `apps/web/src/components/flight-details-modal.tsx`
    - Copiar `modelo-referencia/components/live-feed.tsx` → `apps/web/src/components/live-feed.tsx`
    - Copiar `modelo-referencia/components/sidebar.tsx` → `apps/web/src/components/sidebar.tsx`
    - Copiar `modelo-referencia/components/stats-bar.tsx` → `apps/web/src/components/stats-bar.tsx`
    - _Requirements: 5.1, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 11.1, 11.2, 11.3, 11.4, 13.1_

  - [ ] 5.4 Portar `air-traffic-radar.tsx` com adaptação de campos
    - Copiar `modelo-referencia/components/air-traffic-radar.tsx` → `apps/web/src/components/air-traffic-radar.tsx`
    - Substituir `flight.type === "arrival"` por `flight.destination === 'REC'`
    - Substituir `flight.flightNumber` por `flight.callsign`
    - Substituir `flight.position?.altitude` por `positions.find(p => p.flightId === flight.id)?.altitude ?? 10000`
    - Importar `useFlightStore` para acessar `positions` além de `flights`
    - _Requirements: 5.4_

  - [ ] 5.5 Portar `flight-map.tsx` com `dynamic` import e `ssr: false`
    - Copiar `modelo-referencia/components/flight-map.tsx` → `apps/web/src/components/flight-map.tsx`
    - Adicionar `'use client'` no topo se ausente
    - Garantir que o componente é exportado como named export (`export function FlightMap`)
    - O wrapper `dynamic` será feito na página que o importa (task 6.1)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 5.6 Portar `header.tsx` removendo `simulateUpdate`
    - Copiar `modelo-referencia/components/header.tsx` → `apps/web/src/components/header.tsx`
    - Remover importação e uso de `simulateUpdate` do store
    - Substituir `onClick` do botão de refresh para chamar `refreshData()` do store
    - _Requirements: 5.5_

- [ ] 6. Criar páginas da aplicação

  - [ ] 6.1 Reescrever `apps/web/src/app/layout.tsx` com ThemeProvider e SocketProvider
    - Substituir o conteúdo atual pelo layout portado do modelo-referencia
    - Adicionar `ThemeProvider` (attribute="class", defaultTheme="dark", enableSystem={false}) e `SocketProvider` envolvendo `{children}`
    - Remover a dependência de `@vercel/analytics`
    - Atualizar `metadata` com título e descrição do REC Flight Intelligence
    - _Requirements: 5.1, 13.1_

  - [ ] 6.2 Reescrever `apps/web/src/app/page.tsx` — Dashboard sem mocks
    - Marcar com `'use client'`
    - Importar `FlightMap` com `dynamic(() => import('@/components/flight-map').then(m => m.FlightMap), { ssr: false, loading: () => <div ...> })`
    - Chamar `useFlightPolling()` para carga inicial e polling de 30s
    - Remover todas as chamadas a `initializeMockData` e `simulateUpdate`
    - Renderizar: `Sidebar`, `Header`, `StatsBar`, `AirTrafficRadar`, `FlightMap` (dinâmico), `LiveFeed`, `FlightDetailsModal`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 6.3 Portar `apps/web/src/app/flights/page.tsx`
    - Copiar `modelo-referencia/app/flights/page.tsx` → `apps/web/src/app/flights/page.tsx`
    - Remover `initializeMockData` e o `useEffect` associado
    - Os filtros de busca, status e direção são mantidos exatamente como estão (funcionam com store real)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ] 6.4 Criar diretório e portar `apps/web/src/app/alerts/page.tsx`
    - Copiar `modelo-referencia/app/alerts/page.tsx` → `apps/web/src/app/alerts/page.tsx`
    - Remover `initializeMockData` e o `useEffect` com verificação `flights.length === 0`
    - Substituir `clearAlerts()` direto por uma função que primeiro chama `api.clearAlerts()` (REST DELETE /alerts) e só então chama `store.clearAlerts()`
    - Substituir o handler de "marcar individual como lido" para chamar `api.markAlertRead(alert.id)` e depois `store.markAlertRead(alert.id)`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ] 6.5 Criar diretório e portar `apps/web/src/app/analytics/page.tsx`
    - Copiar `modelo-referencia/app/analytics/page.tsx` → `apps/web/src/app/analytics/page.tsx`
    - Remover `initializeMockData`, `generateMockAirlineStats`, `generateMockRouteStats`, `generateMockDelayHeatmap` e todas as importações de `mock-data`
    - Derivar `airlineStats` via `useMemo`: agrupar `flights` por `airlineCode`, mapear para `AirlineStats[]` ordenado por count decrescente
    - Derivar `routeStats` via `useMemo`: agrupar `flights` pelo par origem→destino envolvendo 'REC', mapear para `RouteStats[]`
    - Derivar `hourlyTraffic` via `useMemo` a partir de `flights`, agrupando por hora de `scheduledDeparture` / `scheduledArrival`
    - Manter `weeklyTrend` como constante estática (backend não expõe dados históricos)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 7. Checkpoint — Verificar build e tipagem
  - Executar `npm run build` em `apps/web` e corrigir todos os erros de TypeScript e ESLint encontrados
  - Verificar que não há uso de `any` em interfaces públicas (props de componentes, retornos de `api.ts`)
  - Verificar que o alias `@/` está resolvendo corretamente nos imports
  - Garantir que `FlightMap` nunca é renderizado no servidor (SSR: false confirmado)
  - Perguntar ao usuário se há dúvidas antes de prosseguir para os testes

- [ ] 8. Escrever testes com Vitest e fast-check

  - [ ] 8.1 Configurar Vitest em `apps/web`
    - Criar `apps/web/vitest.config.ts` com ambiente `jsdom` e configuração de aliases `@/`
    - Criar `apps/web/src/lib/__tests__/` e `apps/web/src/hooks/__tests__/` como diretórios de teste
    - _Requirements: 14.1_

  - [ ] 8.2 Criar geradores `fast-check` reutilizáveis
    - Criar `apps/web/src/lib/__tests__/arbitraries.ts` com: `arbFlightStatus()`, `arbFlight()`, `arbFlightPosition()`, `arbFlightAlert()`
    - Usar as definições exatas do design (`fc.record`, `fc.uuid`, `fc.constantFrom`, etc.)
    - _Requirements: 14.2_

  - [ ]* 8.3 Property test: invariante de forma do estado do store (Property 1)
    - **Property 1: Invariante de forma do estado do store**
    - Para qualquer sequência de ações no store, todas as chaves obrigatórias devem ter os tipos corretos
    - **Validates: Requirements 2.1**

  - [ ]* 8.4 Property test: falha REST não corrompe o estado (Property 2)
    - **Property 2: Falha REST não corrompe o estado**
    - Simular respostas de erro HTTP; verificar que `flights`, `positions`, `alerts` não são sobrescritos
    - **Validates: Requirements 2.6**

  - [ ]* 8.5 Property test: evento connect sempre ativa isConnected (Property 3)
    - **Property 3: Evento connect sempre ativa isConnected**
    - Para qualquer estado com `isConnected = false`, após `setConnected(true)`, verificar `isConnected === true`
    - **Validates: Requirements 3.2**

  - [ ]* 8.6 Property test: evento disconnect sempre desativa isConnected (Property 4)
    - **Property 4: Evento disconnect sempre desativa isConnected**
    - Para qualquer estado com `isConnected = true`, após `setConnected(false)`, verificar `isConnected === false`
    - **Validates: Requirements 3.3**

  - [ ]* 8.7 Property test: handleFlightUpdate atualiza apenas o voo alvo (Property 5)
    - **Property 5: handleFlightUpdate atualiza apenas o voo alvo**
    - Verificar: (a) `positions` contém exatamente um item com `flightId` do payload, (b) outros flightIds inalterados, (c) status do voo correspondente atualizado
    - **Validates: Requirements 3.5**

  - [ ]* 8.8 Property test: lista de alertas limitada a 50, ordem LIFO (Property 6)
    - **Property 6: Lista de alertas é limitada a 50 e mantém ordem LIFO**
    - Para qualquer lista de alertas e novo alerta via `handleFlightAlert`: verificar `alerts[0]` é o novo e `alerts.length <= 50`
    - **Validates: Requirements 3.6**

  - [ ]* 8.9 Property test: filtro textual retorna apenas resultados correspondentes (Property 7)
    - **Property 7: Filtro de busca textual retorna apenas resultados correspondentes**
    - Para qualquer lista de voos e string de busca não-vazia, nenhum resultado fora do filtro deve aparecer
    - **Validates: Requirements 8.2**

  - [ ]* 8.10 Property test: filtro de status retorna apenas voos com status correto (Property 8)
    - **Property 8: Filtro de status retorna apenas voos com o status correspondente**
    - Para qualquer lista e qualquer `FlightStatus`, apenas voos com esse status devem aparecer no resultado
    - **Validates: Requirements 8.3**

  - [ ]* 8.11 Property test: filtro de chegadas/partidas (Property 9)
    - **Property 9: Filtro de chegadas retorna apenas destination === 'REC' e partidas origin === 'REC'**
    - **Validates: Requirements 8.4, 8.5**

  - [ ]* 8.12 Property test: distribuição de status soma total de voos (Property 10)
    - **Property 10: Distribuição de status soma o total de voos**
    - Para qualquer lista de voos, a soma das contagens por status deve ser igual a `flights.length`
    - **Validates: Requirements 10.3**

  - [ ]* 8.13 Property test: lastUpdate é ISO 8601 válido após refresh (Property 11)
    - **Property 11: lastUpdate é sempre uma string ISO 8601 válida após refresh bem-sucedido**
    - Após `refreshData` com resposta de sucesso, `store.lastUpdate` deve ser parsável por `new Date()` sem `NaN`
    - **Validates: Requirements 4.3**

  - [ ]* 8.14 Testes de exemplo (unit tests) para comportamentos específicos
    - `useSocket` emite `join:room` com `{ room: 'rec:live' }` após conectar
    - Polling é cancelado no unmount do componente (`clearInterval` chamado)
    - `FlightDetailsModal` exibe velocidade convertida para km/h (`velocity * 3.6`)
    - Filtro limpo remove todos os badges de filtro ativo
    - `deriveDailyStats` retorna `onTimePercentage = 0` quando `flights` está vazio
    - _Requirements: 3.4, 4.2, 7.2_

- [ ] 9. Checkpoint final — Garantir que tudo funciona junto
  - Executar `npm run build` em `apps/web` e confirmar zero erros
  - Verificar que `docker compose up` sobe `db`, `api` e `web` sem erros fatais
  - Confirmar que a migration Prisma é aplicada automaticamente pelo `api` Dockerfile
  - Perguntar ao usuário se há dúvidas ou ajustes antes de encerrar a sprint

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- A ordem das tasks reflete dependências reais: infra → deps → dados → hooks → componentes → páginas → testes
- O `modelo-referencia` deve ser tratado como read-only durante toda a sprint
- Nunca importar `mock-data.ts` em componentes de produção
- O `FlightMap` deve sempre ser importado com `dynamic + ssr: false` para evitar erro de `window is not defined`
- O backend não expõe endpoint `/stats`; `DailyStats` é derivado localmente no store via `deriveDailyStats`
- Testes property-based usam `fast-check` com mínimo 100 iterações por propriedade
