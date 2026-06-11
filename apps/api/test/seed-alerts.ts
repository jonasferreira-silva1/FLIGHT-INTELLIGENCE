/**
 * Seed de Testes — Sprint 5A: Verificação Manual de Alertas
 *
 * Este script insere voos com dados determinísticos no banco de dados e
 * simula a progressão de estados de telemetria para forçar os três tipos
 * de alertas: delay, landed e departed.
 *
 * Pré-requisitos:
 *   1. Banco de dados PostgreSQL rodando (docker compose up -d postgres)
 *   2. Migrações aplicadas (npx prisma migrate dev)
 *   3. Variável DATABASE_URL configurada no .env
 *
 * Execução:
 *   npx ts-node -r tsconfig-paths/register test/seed-alerts.ts
 *
 * O script imprime um relatório final com os alertas gerados e se os eventos
 * chegaram via WebSocket. Para o teste WebSocket funcionar, suba a API antes:
 *   npm run start:dev
 */

import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();

// ─── Configuração ─────────────────────────────────────────────────────────────

const REC = { lat: -8.1264, lon: -34.9232 };
const GRU = { lat: -23.4356, lon: -46.4731 };
const SSA = { lat: -12.9086, lon: -38.3225 };

// Intervalo de sleep entre estados para simular passagem de tempo
const TICK_MS = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Interpola linearmente entre dois valores */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Fórmula de Haversine — retorna distância em km */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Formata Date para HH:MM */
function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Funções de inserção de estados ───────────────────────────────────────────

async function createFlight(params: {
  callsign: string;
  origin: string;
  destination: string;
  airline: string;
  scheduledDep: Date;
  scheduledArr: Date;
}) {
  // Remove voo anterior com mesmo callsign (idempotência do seed)
  const existing = await prisma.flight.findUnique({
    where: { callsign: params.callsign },
  });
  if (existing) {
    await prisma.alert.deleteMany({ where: { flightId: existing.id } });
    await prisma.flightState.deleteMany({ where: { flightId: existing.id } });
    await prisma.flight.delete({ where: { id: existing.id } });
  }

  return prisma.flight.create({ data: params });
}

async function insertState(params: {
  flightId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  velocity?: number;
  heading?: number;
  onGround: boolean;
  timestamp: Date;
}) {
  return prisma.flightState.create({ data: params });
}

// ─── Cenários ─────────────────────────────────────────────────────────────────

/**
 * Cenário 1 — DELAY
 * Voo GRU→REC em rota, mas com velocidade baixa suficiente para gerar ETA
 * que ultrapassa o scheduledArr em mais de 15 minutos.
 *
 * Estratégia: colocamos o avião a ~700 km de Recife (posição de Salvador ~400 km)
 * com velocidade de 100 m/s (~360 km/h) e scheduledArr = agora + 30 min.
 * ETA real ≈ 700*1000/100 s = 7000 s ≈ 117 min → atraso ≈ 87 min.
 */
async function scenarioDelay() {
  const now = new Date();
  const scheduledDep = new Date(now.getTime() - 2 * 60 * 60 * 1000); // -2h
  const scheduledArr = new Date(now.getTime() + 30 * 60 * 1000); // +30 min

  const flight = await createFlight({
    callsign: 'SEED_DELAY',
    origin: 'GRU',
    destination: 'REC',
    airline: 'Gol Linhas Aéreas',
    scheduledDep,
    scheduledArr,
  });

  // Posição: próxima a Salvador, bem acima de Recife — ~700 km de distância
  const state = await insertState({
    flightId: flight.id,
    latitude: SSA.lat,
    longitude: SSA.lon,
    altitude: 10000,
    velocity: 100, // m/s lento propositalmente
    heading: 45,
    onGround: false,
    timestamp: now,
  });

  return { flight, state };
}

/**
 * Cenário 2 — LANDED
 * Voo SSA→REC. O avião primeiro aparece voando próximo ao REC,
 * depois "pousa" (onGround muda de false → true).
 */
async function scenarioLanded() {
  const now = new Date();
  const scheduledDep = new Date(now.getTime() - 90 * 60 * 1000);
  const scheduledArr = new Date(now.getTime() + 5 * 60 * 1000);

  const flight = await createFlight({
    callsign: 'SEED_LAND',
    origin: 'SSA',
    destination: 'REC',
    airline: 'LATAM Airlines',
    scheduledDep,
    scheduledArr,
  });

  const t0 = new Date(now.getTime() - 30 * 1000); // 30s atrás

  // Estado 1: voando, a 5 km de Recife
  const stateFlying = await insertState({
    flightId: flight.id,
    latitude: REC.lat - 0.05,
    longitude: REC.lon - 0.05,
    altitude: 300,
    velocity: 80,
    heading: 90,
    onGround: false,
    timestamp: t0,
  });

  await sleep(TICK_MS);

  // Estado 2: pousou
  const stateLanded = await insertState({
    flightId: flight.id,
    latitude: REC.lat,
    longitude: REC.lon,
    altitude: 0,
    velocity: 20,
    heading: 90,
    onGround: true,
    timestamp: now,
  });

  return { flight, stateFlying, stateLanded };
}

/**
 * Cenário 3 — DEPARTED
 * Voo REC→BSB. O avião primeiro aparece no solo do REC,
 * depois decola (onGround muda de true → false).
 */
async function scenarioDeparted() {
  const now = new Date();
  const scheduledDep = new Date(now.getTime() + 2 * 60 * 1000); // daqui a 2 min
  const scheduledArr = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const flight = await createFlight({
    callsign: 'SEED_DEP',
    origin: 'REC',
    destination: 'BSB',
    airline: 'Azul Linhas Aéreas',
    scheduledDep,
    scheduledArr,
  });

  const t0 = new Date(now.getTime() - 30 * 1000);

  // Estado 1: no solo
  const stateGround = await insertState({
    flightId: flight.id,
    latitude: REC.lat,
    longitude: REC.lon,
    altitude: 0,
    velocity: 0,
    heading: 0,
    onGround: true,
    timestamp: t0,
  });

  await sleep(TICK_MS);

  // Estado 2: decolou
  const stateDeparted = await insertState({
    flightId: flight.id,
    latitude: REC.lat + 0.05,
    longitude: REC.lon + 0.05,
    altitude: 500,
    velocity: 120,
    heading: 270,
    onGround: false,
    timestamp: now,
  });

  return { flight, stateGround, stateDeparted };
}

// ─── Verificação de Alertas ───────────────────────────────────────────────────

async function verifyAlerts(
  flightId: string,
  expectedType: string,
  callsign: string,
) {
  // Aguarda até 2 segundos para o alerta aparecer (o AlertsService processa de forma assíncrona)
  for (let i = 0; i < 20; i++) {
    const alert = await prisma.alert.findFirst({
      where: { flightId, type: expectedType },
      orderBy: { timestamp: 'desc' },
    });

    if (alert) {
      return alert;
    }

    await sleep(100);
  }
  return null;
}

// ─── Invocação do AlertsService diretamente ──────────────────────────────────

/**
 * Como este script roda fora do contexto NestJS (sem injeção de dependência),
 * instanciamos o AlertsService manualmente com o PrismaService e um mock
 * do Gateway para verificar a geração de alertas no banco de dados.
 *
 * Para testar a emissão WebSocket, use o app rodando + um client Socket.io separado.
 */
async function runAlertProcessing() {
  // Importação dinâmica para evitar conflitos de inicialização do NestJS fora do contexto
  const { AlertsService } = await import('../src/alerts/alerts.service');
  const { PrismaService } = await import('../src/prisma/prisma.service');

  // Mock simples do gateway para capturar as emissões
  const emittedAlerts: { event: string; payload: any }[] = [];
  const mockGateway = {
    emitAlert: (p: any) =>
      emittedAlerts.push({ event: 'flight:alert', payload: p }),
    emitLanded: (p: any) =>
      emittedAlerts.push({ event: 'flight:landed', payload: p }),
    emitDeparted: (p: any) =>
      emittedAlerts.push({ event: 'flight:departed', payload: p }),
    emitFlightUpdate: () => {},
    server: null,
  } as any;

  // Cria instância do PrismaService para usar no AlertsService
  const prismaService = new PrismaService();
  const alertsService = new AlertsService(prismaService, mockGateway);

  return { alertsService, emittedAlerts };
}

// ─── Runner Principal ─────────────────────────────────────────────────────────

async function main() {
  console.log(
    '\n═══════════════════════════════════════════════════════════════',
  );
  console.log('  🛫  REC Flight Intelligence — Seed de Alertas (Sprint 5A)');
  console.log(
    '═══════════════════════════════════════════════════════════════\n',
  );

  const { alertsService, emittedAlerts } = await runAlertProcessing();

  // ── Cenário 1: DELAY ──────────────────────────────────────────────────────
  console.log('📌 Cenário 1: DELAY — Voo GRU→REC com ETA atrasado');
  const { flight: fDelay, state: sDelay } = await scenarioDelay();
  await alertsService.processFlightState(fDelay.id, sDelay, undefined);

  const delayAlert = await prisma.alert.findFirst({
    where: { flightId: fDelay.id, type: 'delay' },
  });

  if (delayAlert) {
    console.log(`  ✅ Alerta de atraso gerado: "${delayAlert.message}"`);
  } else {
    console.log('  ❌ FALHA: alerta de delay NÃO foi gerado.');
  }

  // ── Cenário 2: LANDED ─────────────────────────────────────────────────────
  console.log('\n📌 Cenário 2: LANDED — Voo SSA→REC aterrissando no REC');
  const { flight: fLand, stateFlying, stateLanded } = await scenarioLanded();
  await alertsService.processFlightState(fLand.id, stateLanded, stateFlying);

  const landedAlert = await prisma.alert.findFirst({
    where: { flightId: fLand.id, type: 'landed' },
  });

  if (landedAlert) {
    console.log(`  ✅ Alerta de pouso gerado: "${landedAlert.message}"`);
  } else {
    console.log('  ❌ FALHA: alerta de landed NÃO foi gerado.');
  }

  // ── Cenário 3: DEPARTED ───────────────────────────────────────────────────
  console.log('\n📌 Cenário 3: DEPARTED — Voo REC→BSB decolando do REC');
  const { flight: fDep, stateGround, stateDeparted } = await scenarioDeparted();
  await alertsService.processFlightState(fDep.id, stateDeparted, stateGround);

  const departedAlert = await prisma.alert.findFirst({
    where: { flightId: fDep.id, type: 'departed' },
  });

  if (departedAlert) {
    console.log(`  ✅ Alerta de decolagem gerado: "${departedAlert.message}"`);
  } else {
    console.log('  ❌ FALHA: alerta de departed NÃO foi gerado.');
  }

  // ── Resumo de Emissões WebSocket (mock) ───────────────────────────────────
  console.log(
    '\n──────────────────────────────────────────────────────────────',
  );
  console.log('📡 Eventos WebSocket emitidos (gateway mock):');
  if (emittedAlerts.length === 0) {
    console.log('  (nenhum evento capturado)');
  } else {
    emittedAlerts.forEach((e, i) => {
      console.log(
        `  ${i + 1}. [${e.event}] callsign=${e.payload.callsign}, type=${e.payload.type}`,
      );
    });
  }

  // ── Resumo do banco de dados ───────────────────────────────────────────────
  console.log(
    '\n──────────────────────────────────────────────────────────────',
  );
  console.log('🗄️  Alertas gravados no banco (todos os cenários de seed):');
  const allAlerts = await prisma.alert.findMany({
    where: {
      flightId: {
        in: [fDelay.id, fLand.id, fDep.id],
      },
    },
    orderBy: { timestamp: 'asc' },
    include: { flight: { select: { callsign: true } } },
  });

  if (allAlerts.length === 0) {
    console.log('  (nenhum alerta encontrado no banco)');
  } else {
    allAlerts.forEach((a) => {
      const ts = hhmm(a.timestamp);
      console.log(
        `  [${ts}] [${a.type.toUpperCase().padEnd(8)}] ${a.flight.callsign} — ${a.message}`,
      );
    });
  }

  // ── Resultado Final ────────────────────────────────────────────────────────
  const generated = [delayAlert, landedAlert, departedAlert].filter(
    Boolean,
  ).length;
  console.log(
    '\n═══════════════════════════════════════════════════════════════',
  );
  console.log(
    `  Resultado: ${generated}/3 cenários geraram alertas corretamente.`,
  );
  if (generated === 3) {
    console.log('  🎉 Sprint 5A — Verificação manual: PASSOU!');
  } else {
    console.log('  ⚠️  Alguns cenários falharam. Verifique os logs acima.');
    process.exitCode = 1;
  }
  console.log(
    '═══════════════════════════════════════════════════════════════\n',
  );
}

main()
  .catch((err) => {
    console.error('\n💥 Erro fatal no seed:\n', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
