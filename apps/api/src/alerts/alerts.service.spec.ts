import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlightsGateway } from '../flights/flights.gateway';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: PrismaService;
  let gateway: FlightsGateway;

  // Mock do PrismaService
  const mockPrismaService = {
    flight: {
      findUnique: jest.fn(),
    },
    alert: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  // Mock do FlightsGateway
  const mockFlightsGateway = {
    emitAlert: jest.fn(),
    emitLanded: jest.fn(),
    emitDeparted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FlightsGateway, useValue: mockFlightsGateway },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prisma = module.get<PrismaService>(PrismaService);
    gateway = module.get<FlightsGateway>(FlightsGateway);

    // Reseta todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('calculateHaversineDistance', () => {
    it('deve retornar 0 para a mesma coordenada geográfica', () => {
      const distance = service.calculateHaversineDistance(
        -8.1264,
        -34.9232,
        -8.1264,
        -34.9232,
      );
      expect(distance).toBeCloseTo(0);
    });

    it('deve retornar a distância correta em quilômetros entre Recife e Maceió', () => {
      // Coordenadas aproximadas REC: -8.1264, -34.9232 e MCZ: -9.5108, -35.7917
      const distance = service.calculateHaversineDistance(
        -8.1264,
        -34.9232,
        -9.5108,
        -35.7917,
      );
      expect(distance).toBeGreaterThan(170); // Aproximadamente 178 km
      expect(distance).toBeLessThan(190);
    });
  });

  describe('estimateTimeToTarget', () => {
    it('deve calcular o tempo correto baseado na distância e velocidade', () => {
      const timeSeconds = service.estimateTimeToTarget(100, 200); // 100km a 200m/s
      expect(timeSeconds).toBe(500); // 100,000 metros / 200 m/s = 500s
    });

    it('deve usar velocidade de cruzeiro padrão (200m/s) se velocidade for muito baixa ou nula', () => {
      const timeSeconds = service.estimateTimeToTarget(100, 0); // velocidade 0
      expect(timeSeconds).toBe(500); // 100,000 metros / 200 m/s = 500s
    });
  });

  describe('processFlightState', () => {
    const mockFlightData = {
      id: 'flight-uuid-1',
      callsign: 'GLO1234',
      origin: 'GRU',
      destination: 'REC',
      scheduledArr: new Date('2026-06-02T15:00:00Z'),
      scheduledDep: new Date('2026-06-02T13:00:00Z'),
    };

    it('deve gerar alerta de Pouso (Landed) quando o voo com destino REC mudar onGround de false para true', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue(mockFlightData);
      mockPrismaService.alert.create.mockResolvedValue({
        id: 'alert-uuid-landed',
        timestamp: new Date(),
      });

      const currentState = {
        latitude: -8.1264,
        longitude: -34.9232,
        onGround: true,
        timestamp: new Date(),
      };

      const previousState = {
        latitude: -8.11,
        longitude: -34.91,
        onGround: false,
        timestamp: new Date(Date.now() - 30000),
      };

      await service.processFlightState(
        mockFlightData.id,
        currentState,
        previousState,
      );

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'landed',
            flightId: mockFlightData.id,
          }),
        }),
      );
      expect(gateway.emitLanded).toHaveBeenCalled();
    });

    it('deve gerar alerta de Decolagem (Departed) quando o voo partindo do REC mudar onGround de true para false', async () => {
      const departingFlight = {
        ...mockFlightData,
        origin: 'REC',
        destination: 'GRU',
      };
      mockPrismaService.flight.findUnique.mockResolvedValue(departingFlight);
      mockPrismaService.alert.create.mockResolvedValue({
        id: 'alert-uuid-departed',
        timestamp: new Date(),
      });

      const currentState = {
        latitude: -8.11,
        longitude: -34.91,
        onGround: false,
        timestamp: new Date(),
      };

      const previousState = {
        latitude: -8.1264,
        longitude: -34.9232,
        onGround: true,
        timestamp: new Date(Date.now() - 30000),
      };

      await service.processFlightState(
        mockFlightData.id,
        currentState,
        previousState,
      );

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'departed',
            flightId: mockFlightData.id,
          }),
        }),
      );
      expect(gateway.emitDeparted).toHaveBeenCalled();
    });

    it('deve gerar alerta de atraso (Delay) se o ETA estimado atrasar mais de 15 minutos em relação ao scheduledArr', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue(mockFlightData);
      mockPrismaService.alert.findFirst.mockResolvedValue(null); // Nenhum alerta de atraso anterior
      mockPrismaService.alert.create.mockResolvedValue({
        id: 'alert-uuid-delay',
        timestamp: new Date(),
      });

      // Avião voando longe de Recife (ex: a 500 km de distância de Recife)
      // Com velocidade de 200 m/s, vai demorar 2500 segundos (~41 minutos) para chegar.
      // Definimos o timestamp atual igual ao horário programado de chegada de modo que a chegada com mais 41 minutos de voo represente atraso imediato.
      const testTimestamp = new Date(mockFlightData.scheduledArr.getTime());

      const currentState = {
        latitude: -12.63, // Coordenadas distantes de Recife
        longitude: -38.57,
        velocity: 200,
        onGround: false,
        timestamp: testTimestamp,
      };

      await service.processFlightState(mockFlightData.id, currentState, null);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'delay',
            flightId: mockFlightData.id,
          }),
        }),
      );
      expect(gateway.emitAlert).toHaveBeenCalled();
    });
  });
});
