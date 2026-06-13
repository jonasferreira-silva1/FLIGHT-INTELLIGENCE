import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

// Helper de mapeamento de companhias aéreas
export function getAirlineInfo(callsign: string): {
  code: string;
  name: string;
} {
  const prefix3 = callsign.substring(0, 3).toUpperCase();
  const prefix2 = callsign.substring(0, 2).toUpperCase();

  if (prefix3 === 'GLO' || prefix2 === 'G3') {
    return { code: 'G3', name: 'Gol Linhas Aéreas' };
  } else if (prefix3 === 'AZU' || prefix2 === 'AD') {
    return { code: 'AD', name: 'Azul Linhas Aéreas' };
  } else if (
    prefix3 === 'TAM' ||
    prefix3 === 'LAN' ||
    prefix2 === 'LA' ||
    prefix2 === 'JJ'
  ) {
    return { code: 'LA', name: 'LATAM Airlines' };
  } else if (prefix3 === 'PTB' || prefix2 === '2Z') {
    return { code: '2Z', name: 'Voepass' };
  } else if (prefix3 === 'ONE' || prefix2 === 'O6') {
    return { code: 'O6', name: 'Avianca Brasil' };
  }

  // Seleção determinística secundária baseada em hash para consistência
  const airlines = [
    { code: 'G3', name: 'Gol Linhas Aéreas' },
    { code: 'AD', name: 'Azul Linhas Aéreas' },
    { code: 'LA', name: 'LATAM Airlines' },
    { code: '2Z', name: 'Voepass' },
  ];
  let hash = 0;
  for (let i = 0; i < callsign.length; i++) {
    hash = callsign.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % airlines.length;
  return airlines[index];
}

// Helper para obter nome de cidade pelo ICAO/IATA
export function getAirportCity(code: string): string {
  const cities: Record<string, string> = {
    REC: 'Recife',
    GRU: 'São Paulo (Guarulhos)',
    CGH: 'São Paulo (Congonhas)',
    GIG: 'Rio de Janeiro (Galeão)',
    SDU: 'Rio de Janeiro (Santos Dumont)',
    BSB: 'Brasília',
    CNF: 'Belo Horizonte (Confins)',
    SSA: 'Salvador',
    FOR: 'Fortaleza',
    POA: 'Porto Alegre',
    CWB: 'Curitiba',
    MAO: 'Manaus',
    NAT: 'Natal',
    MCZ: 'Maceió',
    JPA: 'João Pessoa',
  };
  return cities[code.toUpperCase()] || 'Outra Cidade';
}

// Calcula os minutos de atraso com base na estimativa de ETA vs Planejado
export function calculateDelayMinutes(state: any, flight: any): number {
  if (
    !state ||
    state.onGround ||
    flight.destination !== 'REC' ||
    !flight.scheduledArr
  ) {
    return 0;
  }

  const recCoords = { lat: -8.1264, lon: -34.9232 };
  const R = 6371; // km
  const lat1 = state.latitude;
  const lon1 = state.longitude;
  const lat2 = recCoords.lat;
  const lon2 = recCoords.lon;

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  const speed = !state.velocity || state.velocity < 5 ? 200 : state.velocity;
  const timeToTargetSeconds = (distance * 1000) / speed;
  const eta = new Date(state.timestamp.getTime() + timeToTargetSeconds * 1000);

  const delayMs = eta.getTime() - flight.scheduledArr.getTime();
  return Math.max(0, Math.floor(delayMs / 60000));
}

// Determina a string de status de voo esperada pelo frontend
export function getFlightStatus(state: any, flight: any): string {
  if (!state) return 'scheduled';
  if (state.onGround) {
    if (flight.destination === 'REC') return 'landed';
    return 'departed';
  }

  const delay = calculateDelayMinutes(state, flight);
  if (delay > 15) return 'delayed';
  return 'airborne';
}

@Injectable()
export class FlightsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Retorna todos os voos cadastrados no banco com seus estados mais recentes
   * GET /flights
   */
  async getFlights() {
    const flights = await this.prisma.flight.findMany({
      include: {
        states: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return flights.map((f) => this.mapFlightToFrontend(f));
  }

  async getLiveFlights() {
    const cacheKey = 'live_flights';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const flights = await this.prisma.flight.findMany({
      where: {
        states: {
          some: {
            timestamp: {
              gte: tenMinutesAgo,
            },
          },
        },
      },
      include: {
        states: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    });

    const result = flights.map((f) => this.mapFlightToFrontend(f));
    await this.cacheManager.set(cacheKey, result, 60000); // cache por 60s (60000ms)
    return result;
  }

  /**
   * Retorna as posições geográficas atuais de todos os voos ativos para o mapa
   */
  async getLivePositions() {
    const cacheKey = 'live_positions';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const flights = await this.prisma.flight.findMany({
      where: {
        states: {
          some: {
            timestamp: {
              gte: tenMinutesAgo,
            },
            onGround: false, // O mapa plota apenas aeronaves voando
          },
        },
      },
      include: {
        states: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    });

    const result = flights
      .filter((f) => f.states && f.states.length > 0)
      .map((f) => this.mapFlightStateToPosition(f.states[0], f));

    await this.cacheManager.set(cacheKey, result, 60000); // cache por 60s (60000ms)
    return result;
  }

  /**
   * Busca os detalhes completos de um voo específico pelo ID do banco de dados
   */
  async getFlightById(id: string) {
    const flight = await this.prisma.flight.findUnique({
      where: { id },
      include: {
        states: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!flight) {
      throw new NotFoundException(`Voo com ID ${id} não encontrado.`);
    }

    return this.mapFlightToFrontend(flight);
  }

  /**
   * Retorna o histórico geográfico completo de posições (states) de um voo
   */
  async getFlightStates(id: string) {
    const flight = await this.prisma.flight.findUnique({
      where: { id },
    });

    if (!flight) {
      throw new NotFoundException(`Voo com ID ${id} não encontrado.`);
    }

    const states = await this.prisma.flightState.findMany({
      where: { flightId: id },
      orderBy: {
        timestamp: 'asc',
      },
      take: 200, // Limita histórico para não sobrecarregar
    });

    return states.map((s) => this.mapFlightStateToPosition(s, flight));
  }

  /**
   * Converte a entidade de banco de dados Flight para o formato JSON esperado pelo frontend
   */
  mapFlightToFrontend(flight: any) {
    const latestState =
      flight.states && flight.states.length > 0 ? flight.states[0] : null;
    const airlineInfo = getAirlineInfo(flight.callsign);

    return {
      id: flight.id,
      callsign: flight.callsign,
      icao24: flight.callsign, // fallback
      airline: flight.airline || airlineInfo.name,
      airlineCode: airlineInfo.code,
      origin: flight.origin || 'Desconhecido',
      originCity: getAirportCity(flight.origin || ''),
      destination: flight.destination || 'Desconhecido',
      destinationCity: getAirportCity(flight.destination || ''),
      status: getFlightStatus(latestState, flight),
      scheduledDeparture: flight.scheduledDep
        ? flight.scheduledDep.toISOString()
        : null,
      scheduledArrival: flight.scheduledArr
        ? flight.scheduledArr.toISOString()
        : null,
      actualDeparture:
        latestState && latestState.onGround === false
          ? flight.scheduledDep?.toISOString()
          : null,
      actualArrival:
        latestState &&
        latestState.onGround === true &&
        flight.destination === 'REC'
          ? latestState.timestamp.toISOString()
          : null,
      gate: flight.gate || 'A' + (Math.floor(Math.random() * 15) + 1),
      terminal: flight.terminal || '1',
      aircraft: flight.aircraft || 'Boeing 737-800',
      delayMinutes: calculateDelayMinutes(latestState, flight),
    };
  }

  /**
   * Converte um registro de estado em uma posição geográfica de telemetria
   */
  mapFlightStateToPosition(state: any, flight: any) {
    const airlineInfo = getAirlineInfo(flight.callsign);
    return {
      flightId: flight.id,
      callsign: flight.callsign,
      airline: flight.airline || airlineInfo.name,
      latitude: state.latitude,
      longitude: state.longitude,
      altitude: state.altitude,
      velocity: state.velocity,
      heading: state.heading,
      onGround: state.onGround,
      status: getFlightStatus(state, flight),
      origin: flight.origin || 'Desconhecido',
      destination: flight.destination || 'Desconhecido',
      capturedAt: state.timestamp.toISOString(),
    };
  }
}
