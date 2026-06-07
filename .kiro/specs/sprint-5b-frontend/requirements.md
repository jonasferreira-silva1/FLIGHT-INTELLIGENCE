# Requirements Document

## Introduction

A Sprint 5B tem como objetivo substituir o frontend padrão do Next.js em `apps/web` pela UI completa do `modelo-referencia`, conectada integralmente aos dados reais do backend da Sprint 5A. O sistema resultante é um painel de monitoramento de tráfego aéreo em tempo real para o Aeroporto Internacional do Recife (REC/SBRF), consumindo dados via WebSocket (Socket.io) e REST API (NestJS na porta 3001), sem qualquer dado mockado.

O frontend é uma aplicação Next.js 14 com App Router, Tailwind CSS e shadcn/ui. Todos os componentes visuais existem no `modelo-referencia` e devem ser portados para `apps/web` com suas fontes de dados substituídas: o `store.ts` (Zustand) deve abandonar as funções de mock e passar a consumir o backend real. Nenhum novo componente visual precisa ser criado — apenas a camada de dados deve ser trocada.

---

## Glossary

- **Frontend**: A aplicação Next.js 14 em `apps/web` que será construída nesta sprint.
- **Backend**: A API NestJS em `apps/api`, porta 3001, com REST e WebSocket já implementados.
- **WebSocket_Client**: Instância de `socket.io-client` que o Frontend mantém para receber eventos em tempo real.
- **REST_Client**: Camada de funções `fetch` no Frontend responsável por chamar os endpoints HTTP do Backend.
- **Store**: Estado global Zustand (`lib/store.ts`) no Frontend que centraliza voos, posições, alertas e UI state.
- **Live_Feed**: Componente `live-feed.tsx` que exibe a lista de voos em abas (Todos / Chegadas / Partidas).
- **Flight_Map**: Componente `flight-map.tsx` que renderiza o mapa MapLibre GL com posições de aeronaves ao vivo.
- **Air_Traffic_Radar**: Componente `air-traffic-radar.tsx` que exibe radar SVG animado de tráfego aéreo.
- **Stats_Bar**: Componente `stats-bar.tsx` que exibe métricas agregadas do dia (total de voos, chegadas, partidas, pontualidade, atraso médio, passageiros).
- **Flight_Details_Modal**: Componente `flight-details-modal.tsx` que exibe detalhes completos de um voo selecionado, incluindo telemetria em tempo real.
- **Sidebar**: Componente `sidebar.tsx` com navegação entre páginas e indicador de status de conexão WebSocket.
- **Header**: Componente `header.tsx` com título, horário da última atualização e contador de alertas não lidos.
- **Dashboard_Page**: Página principal (`/`) com radar, mapa, live feed e stats bar.
- **Flights_Page**: Página `/flights` com listagem completa e filtros de busca.
- **Alerts_Page**: Página `/alerts` com histórico de alertas, marcação como lido e limpeza.
- **Analytics_Page**: Página `/analytics` com gráficos de distribuição, tendência semanal e rotas frequentes.
- **Flight**: Objeto de dados de um voo com campos: `id`, `callsign`, `icao24`, `airline`, `airlineCode`, `origin`, `originCity`, `destination`, `destinationCity`, `status`, `scheduledDeparture`, `scheduledArrival`, `gate`, `terminal`, `aircraft`, `delayMinutes`.
- **FlightPosition**: Objeto de telemetria com campos: `flightId`, `callsign`, `latitude`, `longitude`, `altitude`, `velocity`, `heading`, `onGround`, `status`, `origin`, `destination`, `capturedAt`.
- **FlightAlert**: Objeto de alerta com campos: `id`, `flightId`, `callsign`, `type`, `message`, `timestamp`, `read`.
- **DailyStats**: Objeto com métricas agregadas: `totalFlights`, `arrivals`, `departures`, `onTimePercentage`, `averageDelay`, `passengers`.
- **FlightStatus**: Union type: `scheduled | boarding | departed | airborne | landed | delayed | cancelled`.
- **AlertType**: Union type: `delay | gate_change | landed | departed | cancelled`.
- **rec:live**: Sala WebSocket global para receber todos os eventos de voos do REC.
- **flight:{callsign}**: Sala WebSocket individual para acompanhar um voo específico.

---

## Requirements

### Requirement 1: Configuração de Dependências do Frontend

**User Story:** Como desenvolvedor, quero que o `apps/web` tenha todas as dependências necessárias instaladas, para que os componentes do modelo-referencia funcionem corretamente sem erros de módulo ausente.

#### Acceptance Criteria

1. THE Frontend SHALL incluir `socket.io-client`, `zustand`, `maplibre-gl`, `lucide-react`, `date-fns`, `recharts`, `next-themes`, `sonner`, `class-variance-authority`, `clsx`, `tailwind-merge` e todos os pacotes `@radix-ui` usados pelos componentes shadcn/ui no `package.json`.
2. THE Frontend SHALL incluir `shadcn/ui` configurado via `components.json` com o mesmo preset visual do `modelo-referencia` (tema dark, Tailwind CSS v4 com variáveis CSS).
3. WHEN o comando `npm install` for executado em `apps/web`, THE Frontend SHALL instalar todas as dependências sem erros de resolução de pacote.
4. THE Frontend SHALL ter `tailwind.config.ts` e `globals.css` equivalentes aos do `modelo-referencia`, com as variáveis CSS de tema (`--success`, `--warning`, `--info`, `--sidebar`, etc.) definidas.

---

### Requirement 2: Store Global com Conexão Real ao Backend

**User Story:** Como operador do aeroporto, quero que o painel consuma dados reais do backend, para que as informações exibidas reflitam o tráfego aéreo atual e não dados simulados.

#### Acceptance Criteria

1. THE Store SHALL manter o estado de: `flights: Flight[]`, `positions: FlightPosition[]`, `alerts: FlightAlert[]`, `dailyStats: DailyStats | null`, `selectedFlight: Flight | null`, `isConnected: boolean`, `lastUpdate: string | null`.
2. WHEN o Frontend for montado, THE Store SHALL chamar `GET /flights/live` via REST_Client para carregar a lista inicial de voos.
3. WHEN o Frontend for montado, THE Store SHALL chamar `GET /flights/positions` via REST_Client para carregar as posições iniciais dos voos.
4. WHEN o Frontend for montado, THE Store SHALL chamar `GET /alerts` via REST_Client para carregar o histórico inicial de alertas.
5. THE Store SHALL remover completamente as funções `initializeMockData`, `simulateUpdate` e quaisquer importações de `mock-data.ts`.
6. IF a chamada REST_Client para o Backend retornar um erro HTTP, THEN THE Store SHALL registrar o erro no console e manter o estado anterior sem travar a aplicação.

---

### Requirement 3: Conexão WebSocket em Tempo Real

**User Story:** Como operador do aeroporto, quero receber atualizações de voos e alertas em tempo real sem precisar recarregar a página, para que o painel sempre reflita o estado mais recente do tráfego aéreo.

#### Acceptance Criteria

1. THE WebSocket_Client SHALL conectar ao Backend em `ws://localhost:3001` (ou URL configurável via variável de ambiente `NEXT_PUBLIC_API_WS_URL`) usando `socket.io-client`.
2. WHEN a conexão WebSocket for estabelecida com sucesso, THE Store SHALL atualizar `isConnected` para `true` e registrar a conexão no console.
3. WHEN a conexão WebSocket for perdida ou encerrada, THE Store SHALL atualizar `isConnected` para `false`.
4. WHEN a conexão WebSocket for estabelecida, THE WebSocket_Client SHALL emitir o evento `join:room` com payload `{ room: "rec:live" }` para se inscrever no feed global.
5. WHEN o evento `flight:update` for recebido via WebSocket, THE Store SHALL atualizar o Flight correspondente na lista `flights` com os novos dados e atualizar `positions` com a nova posição.
6. WHEN o evento `flight:alert` for recebido via WebSocket, THE Store SHALL adicionar o novo FlightAlert ao início da lista `alerts`, limitando o total a 50 itens.
7. WHEN o evento `flight:landed` for recebido via WebSocket, THE Store SHALL atualizar o status do Flight correspondente para `landed` e adicionar um FlightAlert do tipo `landed` à lista `alerts`.
8. WHEN o evento `flight:departed` for recebido via WebSocket, THE Store SHALL atualizar o status do Flight correspondente para `departed` e adicionar um FlightAlert do tipo `departed` à lista `alerts`.
9. IF o WebSocket_Client não conseguir conectar ao Backend, THEN THE Store SHALL manter `isConnected` como `false` e continuar exibindo os dados carregados via REST.
10. WHILE `isConnected` for `true`, THE WebSocket_Client SHALL reemitir `join:room` automaticamente após reconexão para garantir continuidade da assinatura na sala `rec:live`.

---

### Requirement 4: Polling de Atualização Periódica

**User Story:** Como operador do aeroporto, quero que os dados de voo sejam periodicamente recarregados do backend, para que mesmo sem eventos WebSocket o painel mantenha os dados razoavelmente atualizados.

#### Acceptance Criteria

1. WHILE a aplicação estiver aberta no navegador, THE REST_Client SHALL re-chamar `GET /flights/live` e `GET /flights/positions` a cada 30 segundos para atualizar o estado.
2. WHEN a página for desmontada ou fechada, THE Frontend SHALL cancelar o intervalo de polling para evitar vazamento de memória.
3. WHEN o polling retornar dados com sucesso, THE Store SHALL atualizar `lastUpdate` com o timestamp atual em ISO 8601.

---

### Requirement 5: Dashboard Page (Página Principal)

**User Story:** Como operador do aeroporto, quero uma página de dashboard com visão geral do tráfego aéreo, para que eu possa monitorar a situação operacional do aeroporto de forma rápida.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL renderizar os componentes: `Sidebar`, `Header`, `StatsBar`, `Air_Traffic_Radar`, `Flight_Map`, `Live_Feed` e `Flight_Details_Modal`.
2. WHEN o Dashboard_Page for carregado, THE Stats_Bar SHALL exibir os valores de `dailyStats` do Store; se `dailyStats` for `null`, THE Stats_Bar SHALL exibir `--` como placeholder.
3. WHEN o Dashboard_Page for carregado, THE Flight_Map SHALL exibir marcadores para cada FlightPosition presente em `positions` do Store.
4. WHEN o Dashboard_Page for carregado, THE Air_Traffic_Radar SHALL exibir aeronaves animadas com base nos dados de `flights` do Store.
5. THE Dashboard_Page SHALL remover quaisquer chamadas a `initializeMockData` ou `simulateUpdate` que existiam no modelo-referencia.
6. WHEN o usuário clicar em um voo no Live_Feed, THE Dashboard_Page SHALL atualizar `selectedFlight` no Store para exibir o Flight_Details_Modal.

---

### Requirement 6: Mapa de Voos ao Vivo (FlightMap)

**User Story:** Como operador do aeroporto, quero visualizar em um mapa as posições geográficas dos voos ativos, para que eu possa ter contexto espacial do tráfego ao redor do Recife.

#### Acceptance Criteria

1. THE Flight_Map SHALL inicializar um mapa MapLibre GL centralizado nas coordenadas do Aeroporto do Recife (-34.9232, -8.1264) com zoom 6.
2. THE Flight_Map SHALL renderizar um marcador fixo para o aeroporto REC com animação de `ping` na posição (-34.9232, -8.1264).
3. WHEN `positions` no Store for atualizado, THE Flight_Map SHALL atualizar os marcadores de aeronaves no mapa, movendo os existentes e removendo os que não estão mais em `positions`.
4. WHEN o usuário clicar em um marcador de aeronave no mapa, THE Flight_Map SHALL chamar `setSelectedFlight` no Store com o Flight correspondente.
5. THE Flight_Map SHALL colorir marcadores de aeronaves em verde (`--success`) para status normal e amarelo (`--warning`) para status `delayed`.
6. WHEN `positions` estiver vazia, THE Flight_Map SHALL exibir somente o marcador do aeroporto REC, sem erros.

---

### Requirement 7: Modal de Detalhes do Voo (FlightDetailsModal)

**User Story:** Como operador do aeroporto, quero visualizar os detalhes completos de um voo ao clicar nele, para que eu possa obter informações de status, rota, portão, aeronave e telemetria em tempo real.

#### Acceptance Criteria

1. WHEN `selectedFlight` no Store não for `null`, THE Flight_Details_Modal SHALL abrir exibindo: callsign, companhia aérea, status, rota (origem → destino), portão, terminal, aeronave e horários programados.
2. WHEN `selectedFlight` for um voo com FlightPosition correspondente em `positions`, THE Flight_Details_Modal SHALL exibir altitude (em metros) e velocidade (convertida para km/h) em tempo real.
3. WHEN `selectedFlight` tiver `delayMinutes > 0`, THE Flight_Details_Modal SHALL exibir o aviso de atraso com a quantidade de minutos e o novo horário previsto de chegada.
4. WHEN o usuário fechar o modal, THE Flight_Details_Modal SHALL chamar `setSelectedFlight(null)` no Store.
5. THE Flight_Details_Modal SHALL exibir a timeline do voo (Programado → Embarque → Decolagem → Em Voo → Pouso) com indicadores visuais de etapas concluídas e etapa atual, baseados no `status` do Flight.

---

### Requirement 8: Página de Voos com Filtros (FlightsPage)

**User Story:** Como operador do aeroporto, quero listar todos os voos com filtros de busca, para que eu possa localizar rapidamente um voo específico por callsign, companhia, status ou direção.

#### Acceptance Criteria

1. THE Flights_Page SHALL exibir todos os voos da lista `flights` do Store em um grid de cards, usando o componente `FlightCard`.
2. WHEN o usuário digitar no campo de busca, THE Flights_Page SHALL filtrar `flights` em tempo real exibindo apenas os voos cujo `callsign`, `airline`, `origin` ou `destination` contenham o texto digitado (case-insensitive).
3. WHEN o usuário selecionar um filtro de status, THE Flights_Page SHALL exibir apenas os voos com o `FlightStatus` correspondente.
4. WHEN o usuário selecionar o filtro "Chegadas", THE Flights_Page SHALL exibir apenas os voos com `destination === 'REC'`.
5. WHEN o usuário selecionar o filtro "Partidas", THE Flights_Page SHALL exibir apenas os voos com `origin === 'REC'`.
6. WHEN nenhum voo corresponder aos filtros ativos, THE Flights_Page SHALL exibir um estado vazio com mensagem e botão para limpar os filtros.
7. WHEN o usuário clicar em um FlightCard, THE Flights_Page SHALL atualizar `selectedFlight` no Store para abrir o Flight_Details_Modal.
8. THE Flights_Page SHALL exibir a contagem de resultados filtrados em relação ao total (ex: "Mostrando 12 de 30 voos").

---

### Requirement 9: Página de Alertas (AlertsPage)

**User Story:** Como operador do aeroporto, quero visualizar e gerenciar todos os alertas de voo, para que eu possa acompanhar eventos importantes como pousos, decolagens, atrasos e cancelamentos.

#### Acceptance Criteria

1. THE Alerts_Page SHALL exibir todos os alertas da lista `alerts` do Store, agrupados por data, ordenados do mais recente para o mais antigo.
2. THE Alerts_Page SHALL exibir cards de resumo com: total de alertas, quantidade de alertas não lidos e quantidade de alertas do dia corrente.
3. WHEN o usuário clicar em "Marcar tudo como lido", THE Alerts_Page SHALL chamar `markAlertRead` no Store para cada alerta com `read === false`.
4. WHEN o usuário clicar em "Limpar alertas", THE Alerts_Page SHALL chamar `DELETE /alerts` via REST_Client no Backend e, após confirmação de sucesso, chamar `clearAlerts` no Store.
5. WHEN um alerta não estiver lido (`read === false`), THE Alerts_Page SHALL destacá-lo visualmente com fundo diferenciado e um indicador de ponto azul.
6. WHEN o usuário clicar no botão de check em um alerta individual, THE Alerts_Page SHALL chamar `PUT /alerts/:id/read` via REST_Client no Backend e atualizar o estado `read` do alerta no Store.
7. THE Alerts_Page SHALL exibir ícone e cor de acordo com o `AlertType` do alerta (delay: amarelo, gate_change: azul, landed: verde, departed: accent, cancelled: vermelho).
8. WHEN `alerts` estiver vazia, THE Alerts_Page SHALL exibir um estado vazio com mensagem explicativa.

---

### Requirement 10: Página de Analytics (AnalyticsPage)

**User Story:** Como gestor do aeroporto, quero visualizar gráficos e métricas analíticas sobre o tráfego aéreo, para que eu possa identificar tendências, horários de pico e desempenho das companhias aéreas.

#### Acceptance Criteria

1. THE Analytics_Page SHALL exibir cards de resumo com os valores de `dailyStats` do Store: total de voos, pontualidade, atraso médio e estimativa de passageiros.
2. THE Analytics_Page SHALL exibir um gráfico de área (`AreaChart`) com o tráfego por hora (chegadas e partidas), derivado dos dados de `flights` do Store agrupados por hora de `scheduledDeparture` e `scheduledArrival`.
3. THE Analytics_Page SHALL exibir um gráfico de pizza (`PieChart`) com a distribuição de voos por `FlightStatus`, calculada a partir da lista `flights` do Store.
4. THE Analytics_Page SHALL exibir um gráfico de barras horizontais com o ranking de companhias aéreas por número de voos, derivado de `flights` agrupados por `airlineCode`.
5. THE Analytics_Page SHALL exibir um gráfico de linhas com a tendência semanal, usando dados históricos derivados de `flights` do Store.
6. THE Analytics_Page SHALL exibir as rotas mais frequentes (origem → REC e REC → destino) derivadas dos dados de `flights`, ordenadas por frequência decrescente.
7. IF `dailyStats` no Store for `null` e `flights` estiver vazia, THEN THE Analytics_Page SHALL exibir `--` nos cards de resumo e gráficos vazios sem erros de runtime.

---

### Requirement 11: Indicador de Status de Conexão (Sidebar)

**User Story:** Como operador do aeroporto, quero ver claramente se o painel está conectado ao backend em tempo real, para que eu saiba se os dados exibidos estão sendo atualizados ou não.

#### Acceptance Criteria

1. WHILE `isConnected` no Store for `true`, THE Sidebar SHALL exibir um indicador verde com animação de pulse ao lado do texto "Conectado em tempo real".
2. WHILE `isConnected` no Store for `false`, THE Sidebar SHALL exibir o texto "Desconectado" sem o indicador animado.
3. THE Sidebar SHALL exibir um badge com a contagem de alertas não lidos no item de navegação "Alertas" quando `alerts.filter(a => !a.read).length > 0`.
4. WHEN a contagem de alertas não lidos for zero, THE Sidebar SHALL ocultar o badge de alertas.

---

### Requirement 12: Configuração de Variáveis de Ambiente

**User Story:** Como desenvolvedor, quero que as URLs do backend sejam configuráveis via variáveis de ambiente, para que o frontend funcione tanto em desenvolvimento local quanto em ambientes de produção/staging sem alterações de código.

#### Acceptance Criteria

1. THE Frontend SHALL ler a URL base da REST API a partir da variável de ambiente `NEXT_PUBLIC_API_URL` (padrão: `http://localhost:3001`).
2. THE Frontend SHALL ler a URL do WebSocket a partir da variável de ambiente `NEXT_PUBLIC_API_WS_URL` (padrão: `http://localhost:3001`).
3. THE Frontend SHALL incluir um arquivo `.env.local.example` em `apps/web` com as variáveis de ambiente necessárias documentadas.
4. IF as variáveis de ambiente não estiverem definidas, THEN THE Frontend SHALL utilizar os valores padrão apontando para `localhost:3001` sem erros de runtime.

---

### Requirement 13: Estrutura de Arquivos e Portabilidade dos Componentes

**User Story:** Como desenvolvedor, quero que os componentes do modelo-referencia sejam portados para apps/web de forma organizada, para que o projeto siga as convenções do Next.js App Router e seja fácil de manter.

#### Acceptance Criteria

1. THE Frontend SHALL organizar os arquivos portados seguindo a estrutura: `apps/web/src/app/` (páginas), `apps/web/src/components/` (componentes), `apps/web/src/lib/` (store, types, utils), `apps/web/src/hooks/` (hooks customizados).
2. THE Frontend SHALL portar todos os componentes shadcn/ui para `apps/web/src/components/ui/`, preservando os arquivos exatamente como no modelo-referencia.
3. THE Frontend SHALL portar os arquivos `lib/types.ts` e `lib/utils.ts` sem alterações do modelo-referencia.
4. THE Frontend SHALL substituir o arquivo `lib/store.ts` por uma versão que elimina mocks e implementa a conexão real com o Backend.
5. THE Frontend SHALL portar o arquivo `lib/mock-data.ts` para `apps/web/src/lib/` mas NÃO importá-lo em nenhum componente de produção — ele pode permanecer apenas para referência de tipos ou ser removido.
6. THE Frontend SHALL garantir que todos os paths de importação relativos (`@/components`, `@/lib`, `@/hooks`) estejam configurados via `tsconfig.json` com o alias `@` apontando para `apps/web/src`.

---

### Requirement 14: Build e Compilação sem Erros

**User Story:** Como desenvolvedor, quero que o frontend compile sem erros de TypeScript e passe no lint, para que o código entregue tenha qualidade verificável e seja implantável.

#### Acceptance Criteria

1. WHEN o comando `npm run build` for executado em `apps/web`, THE Frontend SHALL compilar sem erros de TypeScript nem warnings críticos de ESLint.
2. THE Frontend SHALL tipar corretamente todos os dados recebidos do Backend usando os tipos de `lib/types.ts`, sem uso de `any` em interfaces públicas.
3. IF um dado recebido do Backend não corresponder ao tipo esperado, THEN THE Frontend SHALL aplicar um guard de runtime ou valor padrão para evitar erros de renderização.
4. THE Frontend SHALL utilizar o `next.config.mjs` com configurações de CORS/proxy adequadas caso necessário para comunicação com o Backend em `localhost:3001`.
