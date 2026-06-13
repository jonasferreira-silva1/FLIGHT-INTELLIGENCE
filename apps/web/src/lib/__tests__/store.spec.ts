import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fcDirect from 'fast-check';
import { useFlightStore } from '../store';
import { api } from '../api';
import {
  arbFlight,
  arbFlightPosition,
  arbFlightAlert,
  arbFlightStatus,
} from './arbitraries';
import type { Flight, FlightStatus } from '../types';

// Mock do cliente de API para isolar a store
vi.mock('../api', () => {
  return {
    api: {
      getFlights: vi.fn(),
      getPositions: vi.fn(),
      getAlerts: vi.fn(),
      markAlertRead: vi.fn(),
      clearAlerts: vi.fn(),
      getFlightById: vi.fn(),
      getFlightStates: vi.fn(),
      getAnalyticsSummary: vi.fn(),
      getAirlineStats: vi.fn(),
      getDelayHeatmap: vi.fn(),
    },
  };
});

// Helper de filtragem idêntico ao da FlightsPage
function filterFlights(
  flights: Flight[],
  searchQuery: string,
  statusFilter: FlightStatus | 'all',
  directionFilter: string
): Flight[] {
  let result = [...flights];

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      (f) =>
        f.callsign.toLowerCase().includes(query) ||
        f.airline.toLowerCase().includes(query) ||
        f.origin.toLowerCase().includes(query) ||
        f.destination.toLowerCase().includes(query)
    );
  }

  if (statusFilter !== 'all') {
    result = result.filter((f) => f.status === statusFilter);
  }

  if (directionFilter === 'arrivals') {
    result = result.filter((f) => f.destination === 'REC');
  } else if (directionFilter === 'departures') {
    result = result.filter((f) => f.origin === 'REC');
  }

  return result;
}

describe('REC Flight Intelligence - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reseta o estado da store antes de cada teste
    const store = useFlightStore.getState();
    useFlightStore.setState({
      flights: [],
      positions: [],
      alerts: [],
      dailyStats: null,
      selectedFlight: null,
      isConnected: false,
      lastUpdate: null,
    });
  });

  // 1. Propriedade 1: Integridade da estrutura do estado do store
  it('Propriedade 1: Integridade da estrutura do estado do store', () => {
    const store = useFlightStore.getState();
    
    expect(store).toHaveProperty('flights');
    expect(store).toHaveProperty('positions');
    expect(store).toHaveProperty('alerts');
    expect(store).toHaveProperty('dailyStats');
    expect(store).toHaveProperty('selectedFlight');
    expect(store).toHaveProperty('isConnected');
    expect(store).toHaveProperty('lastUpdate');

    expect(Array.isArray(store.flights)).toBe(true);
    expect(Array.isArray(store.positions)).toBe(true);
    expect(Array.isArray(store.alerts)).toBe(true);
    expect(typeof store.isConnected).toBe('boolean');
  });

  // 2. Propriedade 2: Falha REST preserva dados anteriores
  it('Propriedade 2: Falha REST preserva dados anteriores', async () => {
    const store = useFlightStore.getState();

    // Estado inicial preenchido
    const initialFlights = [{ id: '1', callsign: 'GLO1234', airline: 'GOL', origin: 'GRU', destination: 'REC', status: 'airborne' as FlightStatus, delayMinutes: 0, icao24: 'A', airlineCode: 'G3', originCity: 'SP', destinationCity: 'Recife', scheduledDeparture: '', scheduledArrival: '' }];
    useFlightStore.setState({ flights: initialFlights });

    // Mock falhando
    vi.mocked(api.getFlights).mockRejectedValue(new Error('Erro de Conectividade'));

    try {
      await store.loadFlights();
    } catch (e) {
      // Ignora erro esperado
    }

    // O estado deve ser preservado intacto
    expect(useFlightStore.getState().flights).toEqual(initialFlights);
  });

  // 3. Propriedade 3: Ação de conexão atualiza estado
  it('Propriedade 3: Ação de conexão atualiza estado', () => {
    fcDirect.assert(
      fcDirect.property(fcDirect.boolean(), (connected) => {
        const store = useFlightStore.getState();
        store.setConnected(connected);
        expect(useFlightStore.getState().isConnected).toBe(connected);
      }),
      { numRuns: 100 }
    );
  });

  // 4. Propriedade 4: Ação de desconexão atualiza estado
  it('Propriedade 4: Ação de desconexão atualiza estado', () => {
    const store = useFlightStore.getState();
    store.setConnected(true);
    expect(useFlightStore.getState().isConnected).toBe(true);
    store.setConnected(false);
    expect(useFlightStore.getState().isConnected).toBe(false);
  });

  // 5. Propriedade 5: handleFlightUpdate atualiza apenas o voo alvo
  it('Propriedade 5: handleFlightUpdate atualiza apenas o voo alvo', () => {
    fcDirect.assert(
      fcDirect.property(
        fcDirect.array(arbFlight(), { minLength: 2, maxLength: 10 }),
        arbFlightPosition(),
        (initialFlights, updatePosition) => {
          // Garante que o voo que está sendo atualizado existe na lista inicial
          const targetFlight = initialFlights[0];
          const positionUpdate = {
            ...updatePosition,
            flightId: targetFlight.id,
            callsign: targetFlight.callsign,
          };

          useFlightStore.setState({
            flights: initialFlights,
            positions: [],
          });

          const store = useFlightStore.getState();
          store.handleFlightUpdate(positionUpdate);

          const updatedState = useFlightStore.getState();
          
          // Verifica se a posição foi adicionada/atualizada
          const pos = updatedState.positions.find((p) => p.flightId === targetFlight.id);
          expect(pos).toBeDefined();
          expect(pos?.latitude).toBe(positionUpdate.latitude);

          // Verifica se o status do voo atualizado mudou na lista de voos
          const flight = updatedState.flights.find((f) => f.id === targetFlight.id);
          expect(flight?.status).toBe(positionUpdate.status);

          // Verifica se os outros voos permaneceram inalterados
          updatedState.flights.slice(1).forEach((otherFlight) => {
            const original = initialFlights.find((f) => f.id === otherFlight.id);
            expect(otherFlight.status).toBe(original?.status);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // 6. Propriedade 6: Lista de alertas limitada a 50, ordem LIFO
  it('Propriedade 6: Lista de alertas é limitada a 50 e mantém ordem LIFO', () => {
    fcDirect.assert(
      fcDirect.property(
        fcDirect.array(arbFlightAlert(), { minLength: 40, maxLength: 60 }),
        arbFlightAlert(),
        (alerts, newAlert) => {
          useFlightStore.setState({ alerts });
          const store = useFlightStore.getState();
          store.handleFlightAlert(newAlert);

          const updatedAlerts = useFlightStore.getState().alerts;

          // A lista não pode estourar 50 itens
          expect(updatedAlerts.length).toBeLessThanOrEqual(50);
          // O mais novo deve estar no topo (LIFO)
          expect(updatedAlerts[0].id).toBe(newAlert.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  // 7. Propriedade 7: Filtro textual retorna apenas resultados correspondentes
  it('Propriedade 7: Filtro de busca textual retorna apenas resultados correspondentes', () => {
    fcDirect.assert(
      fcDirect.property(
        fcDirect.array(arbFlight(), { minLength: 1, maxLength: 20 }),
        fcDirect.string({ minLength: 2, maxLength: 5 }),
        (flights, query) => {
          const filtered = filterFlights(flights, query, 'all', 'all');

          // Todo item retornado deve conter a query em algum dos campos buscados
          filtered.forEach((f) => {
            const match =
              f.callsign.toLowerCase().includes(query.toLowerCase()) ||
              f.airline.toLowerCase().includes(query.toLowerCase()) ||
              f.origin.toLowerCase().includes(query.toLowerCase()) ||
              f.destination.toLowerCase().includes(query.toLowerCase());
            expect(match).toBe(true);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // 8. Propriedade 8: Filtro de status retorna apenas voos com status correto
  it('Propriedade 8: Filtro de status retorna apenas voos com o status correspondente', () => {
    fcDirect.assert(
      fcDirect.property(
        fcDirect.array(arbFlight(), { minLength: 1, maxLength: 20 }),
        arbFlightStatus(),
        (flights, status) => {
          const filtered = filterFlights(flights, '', status, 'all');

          filtered.forEach((f) => {
            expect(f.status).toBe(status);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // 9. Propriedade 9: Filtro de chegadas/partidas
  it('Propriedade 9: Filtro de chegadas retorna apenas destination === REC e partidas origin === REC', () => {
    fcDirect.assert(
      fcDirect.property(
        fcDirect.array(arbFlight(), { minLength: 1, maxLength: 20 }),
        fcDirect.constantFrom('arrivals', 'departures'),
        (flights, direction) => {
          const filtered = filterFlights(flights, '', 'all', direction);

          filtered.forEach((f) => {
            if (direction === 'arrivals') {
              expect(f.destination).toBe('REC');
            } else {
              expect(f.origin).toBe('REC');
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // 10. Propriedade 10: Distribuição de status soma total de voos
  it('Propriedade 10: Distribuição de status soma o total de voos', () => {
    fcDirect.assert(
      fcDirect.property(
        fcDirect.array(arbFlight(), { minLength: 1, maxLength: 30 }),
        (flights) => {
          const airB = flights.filter((f) => f.status === 'airborne').length;
          const landed = flights.filter((f) => f.status === 'landed').length;
          const scheduled = flights.filter((f) => f.status === 'scheduled').length;
          const delayed = flights.filter((f) => f.status === 'delayed').length;
          const others = flights.filter((f) => !['airborne', 'landed', 'scheduled', 'delayed'].includes(f.status)).length;

          const totalSum = airB + landed + scheduled + delayed + others;
          expect(totalSum).toBe(flights.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // 11. Propriedade 11: lastUpdate é ISO 8601 válido após refresh
  it('Propriedade 11: lastUpdate é sempre uma string ISO 8601 válida após refresh bem-sucedido', async () => {
    vi.mocked(api.getFlights).mockResolvedValue([]);
    vi.mocked(api.getPositions).mockResolvedValue([]);
    vi.mocked(api.getAlerts).mockResolvedValue([]);

    const store = useFlightStore.getState();
    await store.refreshData();

    const lastUpdate = useFlightStore.getState().lastUpdate;
    expect(lastUpdate).not.toBeNull();
    expect(typeof lastUpdate).toBe('string');
    expect(isNaN(Date.parse(lastUpdate as string))).toBe(false);
  });
});
