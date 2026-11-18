# Etapa 0 — Diagnóstico Inicial e Baseline de Segurança

> **Projeto:** REC Flight Intelligence  
> **Data:** Novembro de 2026  
> **Objetivo:** Estabelecer o marco zero (baseline) de segurança da aplicação, mapear a superfície de ataque e registrar as fragilidades iniciais encontradas no código antes de iniciar as correções.

---

## 1. Conceitos Fundamentais

### O que é Superfície de Ataque (*Attack Surface*)?
A **superfície de ataque** é a soma de todos os pontos de entrada por onde um usuário não autorizado (ou atacante) pode tentar injetar dados, extrair informações ou quebrar o fluxo normal de uma aplicação.

* **Analogia didática:** Imagine uma casa. Cada porta destrancada, janela de vidro simples, entrada de ar-condicionado ou portão da garagem representa um ponto da superfície de ataque da casa. Quanto mais portas você abre sem conferir quem tem a chave, maior é a sua superfície de ataque.
* **No nosso software:** Cada rota HTTP da API, conexão WebSocket, porta aberta no Docker Compose e campo de entrada no frontend compõe a nossa superfície de ataque digital.

### O que é Baseline de Segurança?
O **baseline** (ou linha de base) é o registro do estado atual de segurança de um sistema no início de um ciclo. Ele serve como um "exame de sangue inicial": antes de começar o tratamento ou aplicar hardening, nós precisamos saber com precisão quais problemas já existem no ambiente.

Sem um baseline:
1. Você não sabe se uma vulnerabilidade surgiu agora ou se já existia há meses.
2. Você não consegue provar quantitativamente a evolução da segurança (por exemplo, sair de 239 dependências vulneráveis para zero).
3. O time fica corrigindo coisas sem foco e sem entender as prioridades de risco.

---

## 2. Inventário de Componentes do REC Flight Intelligence

Para proteger um sistema, a regra número 1 do DevSecOps é: **você só protege aquilo que você conhece**. Nosso monorepo é estruturado da seguinte forma:

| Componente | Tecnologia | Porta / Comunicação | Função no Sistema |
| :--- | :--- | :--- | :--- |
| **apps/web** | Next.js 14, React, MapLibre | Porta `3000` (HTTP) | Interface visual de monitoramento de voos, mapa em tempo real e painel de alertas. |
| **apps/api** | NestJS, Prisma, Socket.io | Porta `3001` (HTTP / WS) | Backend principal, ingestão periódica da OpenSky API, controle de salas WebSocket e persistência de dados. |
| **apps/ml** | FastAPI, scikit-learn, joblib | Porta `8000` (HTTP) | Microserviço interno de inteligência artificial para inferência e previsão de atraso de voos. |
| **db** | PostgreSQL 16 (Alpine) | Porta `5432` (TCP) | Banco de dados relacional para armazenamento de voos, companhias, aeronaves e histórico. |
| **cache** | Redis 7 (Alpine) | Porta `6379` (TCP) | Cache em memória de alta performance para deduplicação e estado rápido de voos. |
| **CI/CD** | GitHub Actions | Execução remota no GitHub | Pipeline de integração contínua (atualmente executa linter e testes automatizados). |

---

## 3. Mapeamento da Superfície de Ataque e Riscos Identificados

Durante a análise exploratória inicial do repositório, inspecionamos o código fonte, configurações de infraestrutura e pipelines. Identificamos as seguintes fragilidades críticas:

### 3.1. API NestJS: CORS Aberto e Falta de Proteção de Cabeçalhos HTTP
* **Onde:** `apps/api/src/main.ts` (linhas 10-11)
* **Evidência no código:**
  ```typescript
  // Habilita CORS para permitir conexões do frontend
  app.enableCors();
  ```
* **Severidade:** Média
* **Como poderia ser explorado:** O comando `app.enableCors()` sem parâmetros permite requisições originadas de **qualquer domínio** (`Access-Control-Allow-Origin: *`). Se um usuário autenticado ou um operador abrir um site malicioso em outra aba do navegador, esse site pode disparar requisições em nome do usuário para a nossa API. Além disso, a aplicação não utiliza a biblioteca `helmet`, deixando de enviar cabeçalhos essenciais como `X-Frame-Options` (proteção contra clickjacking) e `Content-Security-Policy`.

---

### 3.2. Infraestrutura Docker: Credenciais em Texto Puro e Portas Expostas
* **Onde:** `docker-compose.yml` (linhas 27, 48-49, 54-58)
* **Evidência no código:**
  ```yaml
  environment:
    - POSTGRES_USER=rec
    - POSTGRES_PASSWORD=rec
    - DATABASE_URL=postgresql://rec:rec@db:5432/rec_flight?schema=public
  ```
* **Severidade:** Alta
* **Como poderia ser explorado:**
  1. **Vazamento de credenciais:** Usuários e senhas padrões (`rec:rec`) estão comitados diretamente no repositório. Qualquer pessoa com acesso ao código sabe a senha do banco.
  2. **Exposição desnecessária:** As portas do banco (`5432:5432`) e do cache Redis (`6379:6379`) estão mapeadas diretamente para a máquina host (`0.0.0.0`).
  3. **Redis sem autenticação:** O serviço Redis não possui senha configurada (`requirepass`), permitindo leitura e escrita arbitrária em memória por qualquer processo que alcance a porta 6379.

---

### 3.3. Container de Machine Learning Executando como Root
* **Onde:** `apps/ml/Dockerfile` (linhas 1-22)
* **Evidência no código:** Diferente de `apps/api/Dockerfile` (que define `USER nestjs`) e `apps/web/Dockerfile` (que define `USER nextjs`), o Dockerfile do serviço FastAPI não declara nenhum usuário sem privilégios.
* **Severidade:** Alta
* **Como poderia ser explorado:** O container roda com o usuário padrão `root` (UID 0). O serviço expõe um endpoint `/predict` que desserializa modelos treinados usando `joblib.load()` (`apps/ml/app/main.py:L33-34`). Se um invasor conseguir substituir ou injetar um arquivo `.joblib` malicioso, ele alcançará execução remota de código (RCE) dentro do container como **root**, facilitando técnicas de *container escape* para comprometer a máquina hospedeira.

---

### 3.4. Auditoria de Dependências de Terceiros (SCA Inicial)
* **Como foi encontrado:** Execução do comando `pnpm audit` na raiz do monorepo.
* **Evidência encontrada:**
  ```text
  239 vulnerabilities found
  Severity: 17 low | 109 moderate | 105 high | 8 critical
  ```
* **Severidade:** Alta
* **Contexto no projeto:** A maior parte dessas vulnerabilidades reside em dependências transitivas de ferramentas de build e desenvolvimento (como versões antigas de `vite`, `hono`, `ajv` e `webpack`). Na etapa de SCA, iremos filtrar o que afeta o bundle de produção e atualizar as bibliotecas vulneráveis.

---

### 3.5. Pipeline CI/CD sem Barreiras de Segurança (Security Gates)
* **Onde:** `.github/workflows/ci.yml` (linhas 1-87)
* **Evidência no código:** O workflow executa apenas `pnpm run lint` e testes unitários/E2E.
* **Severidade:** Média
* **Como poderia ser explorado:** Se um desenvolvedor introduzir inadvertidamente uma chave de API secreta, uma dependência com vulnerabilidade crítica conhecida ou um código com falha de injeção (SQL/NoSQL/Command), o pipeline continuará ficando verde ("passando com sucesso").

---

## 4. Plano de Evolução para as Próximas Etapas

Com o diagnóstico concluído, os próximos passos da nossa trilha de DevSecOps estão traçados:

1. **Etapa 1 — Modelagem de Ameaças (Threat Modeling com STRIDE) & Abertura do Registro Vivo:**
   * Criar formalmente o arquivo `docs/security/vulnerabilidades.md` importando todos os achados deste baseline.
   * Modelar ameaças usando a metodologia STRIDE para o fluxo de ingestão e predição de voos.
2. **Etapa 2 — Gestão Segura de Segredos e Hardening de Infraestrutura:**
   * Isolar portas internas no Docker Compose (remoção de portas públicas de banco e cache).
   * Migrar credenciais para arquivos `.env` ignorados pelo Git e implementar autenticação no Redis.
3. **Etapa 3 — Hardening de Containers:**
   * Ajustar o Dockerfile do serviço de Machine Learning para rodar com usuário não-privilegiado (`non-root`).
   * Configurar healthchecks e permissões de leitura restrita.
4. **Etapa 4 — Hardening da API NestJS:**
   * Restringir CORS apenas para o domínio oficial da aplicação web.
   * Integrar cabeçalhos de segurança com `helmet`.
   * Ativar `ValidationPipe` global com sanitização de campos (`whitelist: true`).
5. **Etapa 5 — Pipeline DevSecOps (SAST, SCA e Secret Scanning no CI/CD):**
   * Adicionar scanners automatizados no GitHub Actions (Gitleaks, Semgrep, Trivy / pnpm audit).

---

## 5. Glossário Didático

* **Baseline:** Fotografia inicial das condições de segurança de um sistema antes de aplicar melhorias.
* **Superfície de Ataque:** Conjunto de todas as portas, rotas e dados de entrada que um invasor pode alcançar.
* **Root / Non-Root:** O usuário `root` tem permissão total no sistema operacional; rodar um container como `non-root` impede que falhas na aplicação deem controle total da máquina ao atacante.
* **CORS (Cross-Origin Resource Sharing):** Mecanismo de segurança do navegador que controla quais sites externos podem requisitar recursos da sua API.
* **SCA (Software Composition Analysis):** Prática e ferramentas voltadas para identificar vulnerabilidades conhecidas em bibliotecas e dependências de código aberto importadas pelo projeto.
