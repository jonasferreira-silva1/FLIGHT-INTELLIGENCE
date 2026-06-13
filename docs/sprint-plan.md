# Plano de Sprints Consolidado (5 Sprints)

Com base na análise do estado atual da base de código em relação ao `README.md` e aos requisitos detalhados de frontend da Sprint 5B, consolidamos o cronograma do projeto em **5 Sprints** para cobrir todas as entregas do produto.

---

## Análise do Estado Atual da Base de Código

| Requisito do README | Status no Código | Observações |
| :--- | :--- | :--- |
| **Sprint 1**: Setup Docker, Prisma, Seed | **100% Concluído** | Dockerfiles, compose, banco de dados Postgres e seeds funcionais. |
| **Sprint 2**: Ingestão OpenSky e endpoints REST | **100% Concluído** | Sincronizador cron executando a cada 30s e salvando no banco. Endpoints do `flights` expostos e documentados no Swagger. |
| **Sprint 3**: WebSocket Gateway e Real-time UI | **Parcialmente Concluído (Em andamento)** | O gateway socket do NestJS está pronto. No frontend (`apps/web`), a UI do modelo de referência foi portada (páginas de voos, alertas, analytics, mapa com MapLibre e radar). Faltam escrever os testes unitários e de propriedade (Vitest + fast-check) e ajustar a build standalone para evitar erros no Windows. |
| **Sprint 4**: Microserviço de ML (FastAPI + ANAC) | **Não Iniciado** | O serviço Python em `apps/ml` não existe, assim como o modelo Random Forest e o cliente HTTP de predição na API NestJS. |
| **Sprint 5**: Testes E2E, CI/CD e Deploy | **Não Iniciado** | Falta configurar GitHub Actions e arquivos de implantação final para Railway + Vercel. |

---

## Novo Cronograma de 5 Sprints

O cronograma de 5 Sprints mapeia as entregas de ponta a ponta:

- **Sprint 1: Core Backend & Database Infrastructure** (Docker Setup, Prisma Models, migrations, database seeding, basic flight ingestion from OpenSky API). (Status: 100% Concluído)
- **Sprint 2: Real-time Ingestion, Scheduler & REST APIs** (OpenSky API scheduling, cache logic, `GET /flights/live`, `GET /flights/positions`, alerts database structure, initial analytics services). (Status: 100% Concluído)
- **Sprint 3: Frontend Integration & Real-Time Connection** (Porting template UI, Zustand store real-time hooks, Socket.io connection, MapLibre map, Alerts & Analytics display, and frontend unit/property tests). (Status: Em Andamento - arquivos UI portados, mas faltam os testes e depuração da build do Next.js)
- **Sprint 4: Machine Learning Integration** (FastAPI microservice, Random Forest Classifier trained on ANAC delay data, `/predict` API, backend HTTP integration client). (Status: Não Iniciado)
- **Sprint 5: CI/CD, Docker Compose Finalization & Deployment** (Multi-stage Dockerfiles, GitHub Actions CI pipelines, Railway + Vercel deploy integration, end-to-end testing, final documentation). (Status: Não Iniciado)

---

### Detalhamento da Sprint 3 (Foco Atual)

**Objetivo**: Validar e finalizar a integração do `apps/web` com a API NestJS, removendo dependências de mocks, corrigindo a build Next.js em ambientes Windows, e escrevendo a suíte de testes de propriedade.

1. **Ajuste na Configuração do Next.js**:
   - Modificar `apps/web/next.config.mjs` para habilitar `output: 'standalone'` condicionalmente (apenas fora do Windows/em Docker) para evitar o erro `EPERM` de links simbólicos na build de desenvolvimento local.
2. **Framework de Testes**:
   - Criar `apps/web/vitest.config.ts` para habilitar testes no frontend com ambiente `jsdom` e resolução de caminhos `@/*`.
3. **Testes de Propriedade (`apps/web/src/lib/__tests__`)**:
   - Implementar testes property-based com `fast-check` para garantir a robustez da store Zustand perante atualizações WebSocket e erros HTTP.
4. **Verificação Manual**:
   - Levantar a stack local completa com Docker/npm e verificar a integridade visual e de rede de todos os módulos portados.
