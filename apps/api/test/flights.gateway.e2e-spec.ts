import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { FlightsGateway } from '../src/flights/flights.gateway';
import { FlightsModule } from '../src/flights/flights.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Testes de Integração E2E para o FlightsGateway (WebSocket / Socket.io)
 *
 * Estes testes iniciam o servidor NestJS completo com o Gateway configurado,
 * conectam um cliente Socket.io real e validam o fluxo de salas e eventos.
 *
 * Dependências externas (Prisma/DB) são mockadas para garantir isolamento
 * e execução determinística em qualquer ambiente CI.
 */

// ─── Helpers de Sincronização ─────────────────────────────────────────────────

/** Aguarda a próxima emissão de um evento no socket com timeout configurável */
function waitForEvent<T = any>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(`Timeout aguardando evento '${event}' por ${timeoutMs}ms`),
      );
    }, timeoutMs);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

// PrismaService mockado para evitar dependência de banco de dados real
const mockPrismaService = {
  flight: { findMany: jest.fn().mockResolvedValue([]) },
  flightState: { findMany: jest.fn().mockResolvedValue([]) },
};

// ─── Suite de Testes ──────────────────────────────────────────────────────────

describe('FlightsGateway (E2E WebSocket)', () => {
  let app: INestApplication;
  let gateway: FlightsGateway;
  let clientA: ClientSocket;
  let clientB: ClientSocket;
  let serverPort: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, FlightsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0); // Porta 0 = SO escolhe uma porta livre automaticamente

    // Obtém a porta escolhida pelo SO para evitar conflito entre testes paralelos
    const addr = app.getHttpServer().address();
    serverPort = typeof addr === 'string' ? parseInt(addr) : addr.port;

    gateway = moduleFixture.get<FlightsGateway>(FlightsGateway);
  });

  afterAll(async () => {
    clientA?.disconnect();
    clientB?.disconnect();
    await app.close();
  });

  // Recria clientes frescos antes de cada teste para isolamento
  beforeEach((done) => {
    const url = `http://localhost:${serverPort}`;
    clientA = io(url, { transports: ['websocket'] });
    clientB = io(url, { transports: ['websocket'] });

    // Aguarda ambos conectarem antes de iniciar o teste
    let connected = 0;
    const onConnect = () => {
      connected += 1;
      if (connected === 2) done();
    };
    clientA.on('connect', onConnect);
    clientB.on('connect', onConnect);
  });

  afterEach(() => {
    clientA?.disconnect();
    clientB?.disconnect();
  });

  // ─── 1. Conexão e Desconexão ───────────────────────────────────────────────

  describe('Ciclo de vida da conexão', () => {
    it('deve aceitar uma nova conexão e atribuir um socket.id único', () => {
      expect(clientA.connected).toBe(true);
      expect(clientA.id).toBeDefined();
      expect(clientA.id).toHaveLength(20); // socket.io gera IDs com 20 chars
    });

    it('deve atribuir socket.ids diferentes para clientes distintos', () => {
      expect(clientA.id).not.toBe(clientB.id);
    });
  });

  // ─── 2. Gerenciamento de Salas ─────────────────────────────────────────────

  describe('join:room e leave:room', () => {
    it('deve inscrever o cliente na sala "rec:live" e retornar status ok', (done) => {
      clientA.emit('join:room', { room: 'rec:live' }, (response: any) => {
        expect(response.status).toBe('ok');
        expect(response.message).toContain('rec:live');
        done();
      });
    });

    it('deve inscrever o cliente na sala de um voo específico', (done) => {
      clientA.emit('join:room', { room: 'flight:GLO1234' }, (response: any) => {
        expect(response.status).toBe('ok');
        expect(response.message).toContain('flight:GLO1234');
        done();
      });
    });

    it('deve retornar status error se o nome da sala for inválido', (done) => {
      clientA.emit('join:room', { room: '' }, (response: any) => {
        expect(response.status).toBe('error');
        done();
      });
    });

    it('deve retornar status error se o payload de join:room não tiver o campo room', (done) => {
      clientA.emit('join:room', {}, (response: any) => {
        expect(response.status).toBe('error');
        done();
      });
    });

    it('deve remover o cliente da sala ao emitir leave:room', (done) => {
      // Entra primeiro
      clientA.emit('join:room', { room: 'rec:live' }, () => {
        // Depois sai
        clientA.emit('leave:room', { room: 'rec:live' }, (response: any) => {
          expect(response.status).toBe('ok');
          expect(response.message).toContain('rec:live');
          done();
        });
      });
    });
  });

  // ─── 3. emitFlightUpdate para rec:live ────────────────────────────────────

  describe('emitFlightUpdate → sala rec:live', () => {
    const mockFlightPayload = {
      callsign: 'TAM3456',
      latitude: -8.1264,
      longitude: -34.9232,
      altitude: 8534,
      velocity: 230,
      heading: 45,
      onGround: false,
      status: 'airborne',
    };

    it('deve receber flight:update após inscrição em rec:live', async () => {
      // Inscreve clientA na sala
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'rec:live' }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:update');

      // O servidor emite a atualização diretamente (simula o FlightSyncService)
      gateway.emitFlightUpdate(mockFlightPayload);

      const received = await eventPromise;
      expect(received.callsign).toBe('TAM3456');
      expect(received.latitude).toBe(-8.1264);
    });

    it('não deve receber flight:update sem estar inscrito na sala', async () => {
      // clientB NÃO se inscreve
      gateway.emitFlightUpdate(mockFlightPayload);

      // Aguarda 500ms e verifica que nenhum evento chegou
      await expect(waitForEvent(clientB, 'flight:update', 500)).rejects.toThrow(
        'Timeout',
      );
    });

    it('deve entregar o evento apenas para o cliente inscrito e não para outros', async () => {
      // clientA se inscreve; clientB não
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'rec:live' }, () => res()),
      );

      const receivedByA = waitForEvent(clientA, 'flight:update');
      const notReceivedByB = waitForEvent(clientB, 'flight:update', 400)
        .then(() => false) // se receber, falha
        .catch(() => true); // se timeout, passa

      gateway.emitFlightUpdate(mockFlightPayload);

      const [a, b] = await Promise.all([receivedByA, notReceivedByB]);
      expect(a.callsign).toBe('TAM3456');
      expect(b).toBe(true);
    });
  });

  // ─── 4. Sala específica de um voo ─────────────────────────────────────────

  describe('emitFlightUpdate → sala flight:{callsign}', () => {
    it('deve entregar flight:update para cliente inscrito na sala do voo específico', async () => {
      const callsign = 'AZU9988';
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: `flight:${callsign}` }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:update');

      gateway.emitFlightUpdate({ callsign, latitude: -10.0, longitude: -35.0 });

      const received = await eventPromise;
      expect(received.callsign).toBe(callsign);
    });

    it('não deve entregar flight:update de outro voo para sala do voo incorreto', async () => {
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'flight:AZU9988' }, () => res()),
      );

      // Emite evento de outro voo
      gateway.emitFlightUpdate({
        callsign: 'GLO5555',
        latitude: -12.0,
        longitude: -38.0,
      });

      await expect(waitForEvent(clientA, 'flight:update', 400)).rejects.toThrow(
        'Timeout',
      );
    });
  });

  // ─── 5. emitAlert ─────────────────────────────────────────────────────────

  describe('emitAlert → flight:alert', () => {
    const mockAlertPayload = {
      id: 'alert-uuid-test',
      flightId: 'flight-uuid-test',
      callsign: 'GOL1001',
      type: 'delay',
      message: 'Voo GOL1001 com atraso previsto de 25 minutos.',
      timestamp: new Date().toISOString(),
      read: false,
      delayMinutes: 25,
    };

    it('deve receber flight:alert na sala rec:live após emitAlert', async () => {
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'rec:live' }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:alert');
      gateway.emitAlert(mockAlertPayload);

      const received = await eventPromise;
      expect(received.type).toBe('delay');
      expect(received.callsign).toBe('GOL1001');
      expect(received.delayMinutes).toBe(25);
    });

    it('deve receber flight:alert na sala específica do voo', async () => {
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'flight:GOL1001' }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:alert');
      gateway.emitAlert(mockAlertPayload);

      const received = await eventPromise;
      expect(received.id).toBe('alert-uuid-test');
    });
  });

  // ─── 6. emitLanded ────────────────────────────────────────────────────────

  describe('emitLanded → flight:landed', () => {
    const mockLandedPayload = {
      id: 'alert-uuid-landed',
      flightId: 'flight-uuid-landed',
      callsign: 'LAT4477',
      type: 'landed',
      message: 'Voo LAT4477 pousou com sucesso no Recife (REC).',
      timestamp: new Date().toISOString(),
      read: false,
    };

    it('deve receber flight:landed na sala rec:live', async () => {
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'rec:live' }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:landed');
      gateway.emitLanded(mockLandedPayload);

      const received = await eventPromise;
      expect(received.type).toBe('landed');
      expect(received.callsign).toBe('LAT4477');
    });

    it('deve receber flight:landed na sala do voo específico', async () => {
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'flight:LAT4477' }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:landed');
      gateway.emitLanded(mockLandedPayload);

      const received = await eventPromise;
      expect(received.callsign).toBe('LAT4477');
    });
  });

  // ─── 7. emitDeparted ──────────────────────────────────────────────────────

  describe('emitDeparted → flight:departed', () => {
    const mockDepartedPayload = {
      id: 'alert-uuid-departed',
      flightId: 'flight-uuid-departed',
      callsign: 'AZU3322',
      type: 'departed',
      message: 'Voo AZU3322 decolou do Recife (REC).',
      timestamp: new Date().toISOString(),
      read: false,
    };

    it('deve receber flight:departed na sala rec:live', async () => {
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'rec:live' }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:departed');
      gateway.emitDeparted(mockDepartedPayload);

      const received = await eventPromise;
      expect(received.type).toBe('departed');
      expect(received.callsign).toBe('AZU3322');
    });

    it('deve receber flight:departed na sala do voo específico', async () => {
      await new Promise<void>((res) =>
        clientA.emit('join:room', { room: 'flight:AZU3322' }, () => res()),
      );

      const eventPromise = waitForEvent(clientA, 'flight:departed');
      gateway.emitDeparted(mockDepartedPayload);

      const received = await eventPromise;
      expect(received.id).toBe('alert-uuid-departed');
    });
  });

  // ─── 8. Múltiplos clientes ─────────────────────────────────────────────────

  describe('Múltiplos clientes na mesma sala', () => {
    it('deve entregar flight:update para todos os clientes inscritos em rec:live', async () => {
      // Ambos se inscrevem
      await Promise.all([
        new Promise<void>((res) =>
          clientA.emit('join:room', { room: 'rec:live' }, () => res()),
        ),
        new Promise<void>((res) =>
          clientB.emit('join:room', { room: 'rec:live' }, () => res()),
        ),
      ]);

      const payload = {
        callsign: 'VPB7890',
        latitude: -9.0,
        longitude: -35.5,
        onGround: false,
      };

      const [eventA, eventB] = await Promise.all([
        waitForEvent(clientA, 'flight:update'),
        waitForEvent(clientB, 'flight:update'),
        Promise.resolve(gateway.emitFlightUpdate(payload)),
      ]);

      expect(eventA.callsign).toBe('VPB7890');
      expect(eventB.callsign).toBe('VPB7890');
    });
  });
});
