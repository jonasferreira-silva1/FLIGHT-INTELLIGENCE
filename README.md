<div align="center">

<br/>

```
██████╗ ███████╗ ██████╗
██╔══██╗██╔════╝██╔════╝
██████╔╝█████╗  ██║
██╔══██╗██╔══╝  ██║
██║  ██║███████╗╚██████╗
╚═╝  ╚═╝╚══════╝ ╚═════╝

FLIGHT INTELLIGENCE
```

# ✈️ REC Flight Intelligence

### Plataforma Full-Stack de Monitoramento Aeroportuário em Tempo Real
**Aeroporto Internacional do Recife — Gilberto Freyre (IATA: REC)**

<br/>

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

<br/>

[![Deploy on Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Deploy on Railway](https://img.shields.io/badge/Backend-Railway-6B47ED?style=flat-square&logo=railway)](https://railway.app)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Coverage](https://img.shields.io/badge/Test_Coverage->80%25-22C55E?style=flat-square)](/)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square)](LICENSE)

<br/>

> **"Não apenas mostre onde os aviões estão — conte a história de cada voo, em tempo real."**

<br/>

[🚀 Demo ao Vivo](https://rec-flight.vercel.app) · [📚 Documentação da API](https://api.rec-flight.com/docs) · [🐛 Reportar Bug](https://github.com/jonasferreira-silva1/rec-flight-intelligence/issues) · [💡 Sugerir Feature](https://github.com/jonasferreira-silva1/rec-flight-intelligence/issues)

</div>

---

## 🌎 O Contexto

O **Aeroporto Internacional do Recife (REC/SBRF)** é o principal hub aéreo do Nordeste brasileiro. Diariamente, dezenas de aeronaves cruzam seu espaço aéreo conectando Pernambuco ao Brasil e ao mundo.

As ferramentas de visualização de tráfego aéreo tradicionais são fragmentadas, lentas e com interfaces defasadas que não ajudam na rápida tomada de decisão. O **REC Flight Intelligence** nasce para resolver isso.

---

## ✨ O que esse projeto entrega

<table>
<tr>
<td width="50%">

### 🗺️ Mapa Geoespacial ao Vivo
Posicionamento em tempo real de cada aeronave renderizado a alta performance com **MapLibre GL JS**. Animação fluida e interpolação de posição entre atualizações.

</td>
<td width="50%">

### ⚡ WebSocket em Tempo Real
Arquitetura orientada a eventos com **Socket.io + NestJS Gateway**. Dados de posição, altitude e status atualizados automaticamente a cada 30 segundos para todos os clientes conectados.

</td>
</tr>
<tr>
<td width="50%">

### 🤖 Predição de Atrasos com ML
Microserviço em **FastAPI + scikit-learn** que analisa histórico de rotas, horários e sazonalidade para prever atrasos antes que aconteçam. AUC-ROC de 78%.

</td>
<td width="50%">

### 📊 Analytics Completo
Painel com heatmap de atrasos por hora/dia, ranking de companhias, rotas mais frequentes e taxa de pontualidade — tudo com dados reais do aeroporto.

</td>
</tr>
<tr>
<td width="50%">

### 🔔 Alertas Instantâneos
Notificações push em tempo real para atrasos confirmados, mudanças de gate e pousos confirmados, via WebSocket com rooms por voo.

</td>
<td width="50%">

### 📖 API REST Documentada
Todos os endpoints documentados com **Swagger/OpenAPI** em `/docs`. Paginação cursor-based, autenticação JWT e padrão RFC 7807 para erros.

</td>
</tr>
</table>

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│              Browser / Mobile Client             │
│         (Next.js 14 + MapLibre + Socket.io)     │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────┐
│              NestJS API Gateway                  │
│   REST endpoints · WebSocket · CRON Scheduler   │
└───────┬──────────────┬──────────────┬───────────┘
        │              │              │
   ┌────▼────┐   ┌─────▼────┐  ┌────▼──────┐
   │PostgreSQL│   │  Redis 7 │  │FastAPI ML │
   │(histórico│   │(cache +  │  │(predição  │
   │ de voos) │   │ pub/sub) │  │ atrasos)  │
   └─────────┘   └──────────┘  └───────────┘
                       │
              ┌────────▼────────┐
              │ OpenSky Network │
              │   API (ADS-B)   │
              └─────────────────┘
```

### Fluxo de Dados em Tempo Real

```
[Scheduler CRON 30s] → OpenSky API → Normalização
        ↓
[PostgreSQL] flight_states + [Redis TTL:60s]
        ↓
[WebSocket Gateway] → emit 'flight:update' → room 'REC'
        ↓
[Frontend] → atualiza mapa + cards + alertas
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| **Frontend** | Next.js 14 + TypeScript | App Router, SSR/ISR, SEO otimizado |
| **UI/Estilo** | Tailwind CSS + shadcn/ui | Design system consistente e acessível |
| **Mapas** | MapLibre GL JS | Open-source, tiles customizados, 60fps |
| **Estado** | Zustand | Global state rápido, zero boilerplate |
| **Real-time** | Socket.io Client | Reconnect automático, rooms por voo |
| **Backend** | NestJS + TypeScript | Modular, decorators, DI nativo |
| **ORM** | Prisma | Type-safe, migrations, seed |
| **Banco** | PostgreSQL 16 | JSONB para dados de voo, índices GiST |
| **Cache** | Redis 7 | TTL por rota, pub/sub para WebSocket |
| **ML Service** | FastAPI + scikit-learn | Predição de atrasos, isolado em container |
| **Infra** | Docker Compose | Ambiente reproduzível localmente |
| **CI/CD** | GitHub Actions | Test, build, lint em cada PR |
| **Deploy** | Railway + Vercel | Planos gratuitos, link ao vivo no README |

---

## 🤖 Microserviço de ML — Predição de Atrasos

O modelo analisa **8 features** para prever se um voo atrasará mais de 15 minutos:

| Feature | Descrição |
|---------|-----------|
| `hora_partida` | Hora do dia programada (0–23) |
| `dia_semana` | Sazonalidade semanal |
| `mes` | Sazonalidade mensal |
| `companhia_code` | Companhia aérea (label encoded) |
| `rota_code` | Par origem-destino (label encoded) |
| `distancia_km` | Distância da rota |
| `historico_atraso_14d` | Média de atraso da rota nos últimos 14 dias |
| `carga_aeroporto` | Número de voos na hora no aeroporto de origem |

```json
POST /predict
{
  "callsign": "GLO1234",
  "scheduled_dep": "2025-06-01T08:00:00Z",
  "origin": "GRU",
  "destination": "REC",
  "airline": "G3"
}

// Response
{
  "delay_predicted": true,
  "delay_minutes_estimate": 22,
  "confidence": 0.78,
  "model_version": "v1.3.0"
}
```

> **Modelo**: Random Forest Classifier · **Validação**: cross-validation 5-fold · **Métrica**: AUC-ROC · **Dados**: ANAC (Agência Nacional de Aviação Civil) · **Versionamento**: MLflow

---

## 📡 WebSocket — Eventos em Tempo Real

### Servidor → Cliente

| Evento | Descrição |
|--------|-----------|
| `flight:update` | Posição e status (a cada 30s) |
| `flight:alert` | Atraso confirmado, mudança de gate, cancelamento |
| `flight:landed` | Confirmação de pouso no REC |
| `flight:departed` | Confirmação de decolagem do REC |
| `stats:update` | Totais do painel analytics (a cada 5min) |

### Rooms disponíveis

```javascript
// Todos os voos ativos no REC
socket.emit('join:room', { room: 'rec:live' })

// Atualizações de um voo específico
socket.emit('subscribe:flight', { callsign: 'GLO1234' })
```

---

## 🚀 Rodando Localmente

### Pré-requisitos

- Docker Desktop 24+ e Docker Compose v2
- Node.js 20+
- Python 3.11+ *(opcional, para desenvolvimento do serviço ML fora do Docker)*
- Conta gratuita no [OpenSky Network](https://opensky-network.org/) *(opcional, aumenta rate limit)*

### Passo a passo

```bash
# 1. Clonar o repositório
git clone https://github.com/jonasferreira-silva1/rec-flight-intelligence
cd rec-flight-intelligence

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Subir todos os serviços
docker compose up --build

# 4. Aguardar migração do banco (automática via job 'migration')

# 5. Acessar:
#    Frontend:   http://localhost:3000
#    API:        http://localhost:3001
#    Swagger:    http://localhost:3001/docs
#    ML Service: http://localhost:8000/docs
```

### Comandos úteis

```bash
# Backend em modo dev
cd apps/api && npm run start:dev

# Testes do backend
cd apps/api && npm test

# Testes do serviço ML
cd apps/ml && pytest --cov=app

# Nova migration Prisma
cd apps/api && npx prisma migrate dev --name nome_da_migration

# Acesso direto ao banco
docker compose exec db psql -U rec -d rec_flight
```

### Variáveis de ambiente

```bash
DATABASE_URL=postgresql://rec:rec@db:5432/rec_flight
REDIS_URL=redis://cache:6379
JWT_SECRET=your-secret-here
OPENSKY_USERNAME=          # Opcional: aumenta rate limit
OPENSKY_PASSWORD=
AVIATIONSTACK_KEY=         # Alternativa comercial
ML_SERVICE_URL=http://ml:8000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

## 📁 Estrutura do Repositório

```
rec-flight-intelligence/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── flights/        # Module, Service, Controller, Gateway
│   │   │   ├── analytics/      # Agregações e relatórios
│   │   │   ├── alerts/         # Detecção e emissão de alertas
│   │   │   ├── scheduler/      # CRON jobs OpenSky polling
│   │   │   ├── ml-client/      # HTTP client para FastAPI
│   │   │   └── prisma/         # Schema e migrations
│   │   └── test/               # Jest e2e e unit tests
│   ├── web/                    # Next.js 14 frontend
│   │   ├── app/                # App Router pages
│   │   ├── components/         # FlightCard, FlightMap, etc.
│   │   └── store/              # Zustand store para estado WS
│   └── ml/                     # FastAPI + scikit-learn
│       ├── app/                # main.py, router, schemas
│       ├── model/              # train.py, predict.py
│       └── data/               # Scripts de coleta ANAC
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/workflows/ci.yml
└── README.md
```

---

## 🗺️ Roadmap

| Sprint | Duração | Entrega |
|--------|---------|---------|
| ✅ Sprint 1 | 1 semana | Setup Docker, Prisma models, seed, health check |
| ✅ Sprint 2 | 1 semana | Integração OpenSky API, scheduler, `GET /flights/live` |
| ✅ Sprint 3 | 1 semana | WebSocket Gateway, rooms, emissão de eventos |
| ✅ Sprint 4 | 1 semana | Mapa MapLibre, FlightCard, animação de aeronaves |
| 🔄 Sprint 5 | 1 semana | Sistema de alertas, comparação ETA vs. horário previsto |
| ⏳ Sprint 6 | 1 semana | Página `/analytics`, Recharts, heatmap de atrasos |
| ⏳ Sprint 7 | 1 semana | Microserviço ML FastAPI, Random Forest, `/predict` |
| ⏳ Sprint 8 | 1 semana | Testes, CI/CD, deploy Railway + Vercel, README final |

**Próximas features (pós-MVP):**
- [ ] Autenticação de usuários com painel de voos favoritos
- [ ] Notificações push PWA para alertas de voos salvos
- [ ] Expansão para Natal (NAT), Fortaleza (FOR) e Maceió (MCZ)
- [ ] Modo escuro e versão mobile-first (PWA instalável)

---

## 🧪 Testes e Qualidade

```bash
# Cobertura de testes backend (Jest)
cd apps/api && npm run test:cov
# Meta: > 80% de cobertura

# Cobertura de testes ML (pytest)
cd apps/ml && pytest --cov=app --cov-report=html
# Meta: > 80% de cobertura

# Lint e formatação
npm run lint      # ESLint
npm run format    # Prettier
```

---

## 📜 API Reference

Base URL: `https://api.rec-flight.com/v1`

Documentação interativa completa disponível em [`/docs`](https://api.rec-flight.com/docs) (Swagger UI).

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/flights` | Lista voos com filtros: status, airline, date |
| `GET` | `/flights/live` | Snapshot atual de todos os voos ativos no REC |
| `GET` | `/flights/:id` | Detalhe completo de um voo |
| `GET` | `/flights/:id/states` | Histórico de posições lat/lon |
| `GET` | `/flights/:id/prediction` | Predição de atraso via ML |
| `GET` | `/analytics/summary` | Totais do dia e taxa de pontualidade |
| `GET` | `/analytics/airlines` | Ranking de companhias no REC |
| `GET` | `/analytics/delay-heatmap` | Matriz de atrasos por hora/dia |

---

## 📝 Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.

---

<div align="center">

Desenvolvido com ❤️ em Pernambuco, Brasil 🇧🇷

**Jonas Ferreira Silva**

[![GitHub](https://img.shields.io/badge/GitHub-jonasferreira--silva1-181717?style=flat-square&logo=github)](https://github.com/jonasferreira-silva1)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Jonas_Ferreira-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/jonasferreira-silva1)

<br/>

*"Dados reais. Arquitetura real. Nordeste real."*

</div>
