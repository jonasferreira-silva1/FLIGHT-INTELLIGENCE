import { Test, TestingModule } from '@nestjs/testing';
import { FlightsService } from './flights.service';
import { PrismaService } from '../prisma/prisma.service';
import { MlClientService } from '../ml-client/ml-client.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';

describe('FlightsService', () => {
  let service: FlightsService;
  let prismaService: any;
  let mlClientService: any;

  const mockPrismaService = {
    flight: {
      findUnique: jest.fn(),
    },
  };

  const mockMlClientService = {
    predictDelay: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlightsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MlClientService, useValue: mockMlClientService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<FlightsService>(FlightsService);
    prismaService = module.get<PrismaService>(PrismaService);
    mlClientService = module.get<MlClientService>(MlClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFlightPrediction', () => {
    it('deve retornar a predição mapeada para camelCase quando o microserviço responde', async () => {
      const flightId = 'some-uuid';
      const flightData = {
        id: flightId,
        callsign: 'GLO1234',
        scheduledDep: new Date('2026-06-14T10:00:00.000Z'),
        origin: 'GRU',
        destination: 'REC',
      };

      prismaService.flight.findUnique.mockResolvedValue(flightData);
      mlClientService.predictDelay.mockResolvedValue({
        delay_predicted: true,
        delay_minutes_estimate: 25,
        confidence: 0.85,
        model_version: 'v1.3.0',
      });

      const result = await service.getFlightPrediction(flightId);

      expect(prismaService.flight.findUnique).toHaveBeenCalledWith({
        where: { id: flightId },
      });
      expect(mlClientService.predictDelay).toHaveBeenCalledWith({
        callsign: 'GLO1234',
        scheduled_dep: flightData.scheduledDep.toISOString(),
        origin: 'GRU',
        destination: 'REC',
        airline: 'G3',
      });
      expect(result).toEqual({
        flightId,
        delayPredicted: true,
        delayMinutesEstimate: 25,
        confidence: 0.85,
        modelVersion: 'v1.3.0',
      });
    });

    it('deve lançar NotFoundException se o voo não existir', async () => {
      prismaService.flight.findUnique.mockResolvedValue(null);

      await expect(service.getFlightPrediction('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve retornar predição offline (fallback) se o microserviço falhar', async () => {
      const flightId = 'some-uuid';
      const flightData = {
        id: flightId,
        callsign: 'GLO1234',
        scheduledDep: new Date('2026-06-14T10:00:00.000Z'),
        origin: 'GRU',
        destination: 'REC',
      };

      prismaService.flight.findUnique.mockResolvedValue(flightData);
      mlClientService.predictDelay.mockResolvedValue(null);

      const result = await service.getFlightPrediction(flightId);

      expect(result).toEqual({
        flightId,
        delayPredicted: false,
        delayMinutesEstimate: 0,
        confidence: 0.0,
        modelVersion: 'fallback-offline',
      });
    });
  });
});
