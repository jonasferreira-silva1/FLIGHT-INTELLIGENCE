import { create } from 'zustand';
import type { Flight, FlightPosition, FlightAlert, DailyStats } from '@/lib/types';
import { isValidFlightPosition, isValidFlightAlert } from '@/lib/types';
import { api } from '@/lib/api';

function deriveDailyStats(flights: Flight[]): DailyStats {
  const arrivals = flights.filter((f) => f.destination === 'REC');
  const departures = flights.filter((f) => f.origin === 'REC');

  const onTimeFlights = flights.filter((f) => f.delayMinutes === 0);
  const onTimePercentage =
    flights.length === 0 ? 0 : (onTimeFlights.length / flights.length) * 100;

  const delayedFlights = flights.filter((f) => f.delayMinutes > 0);
  const averageDelay =
    delayedFlights.length === 0
      ? 0
      : delayedFlights.reduce((sum, f) => sum + f.delayMinutes, 0) / delayedFlights.length;

  const passengers = Math.round(flights.length * 130);

  return {
    totalFlights: flights.length,
    arrivals: arrivals.length,
    departures: departures.length,
    onTimePercentage,
    averageDelay,
    passengers,
  };
}

interface FlightStore {
  // Data
  flights: Flight[];
  positions: FlightPosition[];
  alerts: FlightAlert[];
  dailyStats: DailyStats | null;

  // UI State
  selectedFlight: Flight | null;
  isConnected: boolean;
  lastUpdate: string | null;

  // REST Actions
  loadFlights: () => Promise<void>;
  loadPositions: () => Promise<void>;
  loadAlerts: () => Promise<void>;
  refreshData: () => Promise<void>;

  // UI Actions
  setSelectedFlight: (flight: Flight | null) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  clearAlerts: () => void;
  setConnected: (connected: boolean) => void;
  setFlights: (flights: Flight[]) => void;
  setPositions: (positions: FlightPosition[]) => void;

  // WebSocket Actions
  handleFlightUpdate: (data: unknown) => void;
  handleFlightAlert: (data: unknown) => void;
  handleFlightLanded: (data: unknown) => void;
  handleFlightDeparted: (data: unknown) => void;
}

export const useFlightStore = create<FlightStore>((set, get) => ({
  flights: [],
  positions: [],
  alerts: [],
  dailyStats: null,
  selectedFlight: null,
  isConnected: false,
  lastUpdate: null,

  loadFlights: async () => {
    const data = await api.getFlights();
    set({
      flights: data,
      dailyStats: deriveDailyStats(data),
      lastUpdate: new Date().toISOString(),
    });
  },

  loadPositions: async () => {
    const data = await api.getPositions();
    set({ positions: data });
  },

  loadAlerts: async () => {
    const data = await api.getAlerts();
    set({ alerts: data });
  },

  refreshData: async () => {
    await Promise.all([get().loadFlights(), get().loadPositions(), get().loadAlerts()]);
    set({ lastUpdate: new Date().toISOString() });
  },

  setSelectedFlight: (flight) => set({ selectedFlight: flight }),

  markAlertRead: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
    })),

  markAllAlertsRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
    })),

  clearAlerts: () => set({ alerts: [] }),

  setConnected: (isConnected) => set({ isConnected }),

  setFlights: (flights) =>
    set({
      flights,
      dailyStats: deriveDailyStats(flights),
      lastUpdate: new Date().toISOString(),
    }),

  setPositions: (positions) => set({ positions }),

  handleFlightUpdate: (data: unknown) => {
    if (!isValidFlightPosition(data)) return;
    set((state) => ({
      positions: state.positions.some((p) => p.flightId === data.flightId)
        ? state.positions.map((p) => (p.flightId === data.flightId ? data : p))
        : [...state.positions, data],
      flights: state.flights.map((f) =>
        f.id === data.flightId ? { ...f, status: data.status } : f,
      ),
    }));
  },

  handleFlightAlert: (data: unknown) => {
    if (!isValidFlightAlert(data)) return;
    set((state) => ({
      alerts: [data, ...state.alerts].slice(0, 50),
    }));
  },

  handleFlightLanded: (data: unknown) => {
    if (!isValidFlightAlert(data)) {
      // data might be a partial object from the server; attempt to build an alert from it
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>;
        const alert: FlightAlert = {
          id: typeof d.id === 'string' ? d.id : crypto.randomUUID(),
          flightId: typeof d.flightId === 'string' ? d.flightId : '',
          callsign: typeof d.callsign === 'string' ? d.callsign : '',
          type: 'landed',
          message:
            typeof d.message === 'string'
              ? d.message
              : `Voo ${typeof d.callsign === 'string' ? d.callsign : ''} pousou`,
          timestamp: typeof d.timestamp === 'string' ? d.timestamp : new Date().toISOString(),
          read: false,
        };
        get().handleFlightAlert(alert);
        if (typeof d.flightId === 'string') {
          set((state) => ({
            flights: state.flights.map((f) =>
              f.id === d.flightId ? { ...f, status: 'landed' } : f,
            ),
          }));
        }
      }
      return;
    }
    get().handleFlightAlert({ ...data, type: 'landed' });
    set((state) => ({
      flights: state.flights.map((f) =>
        f.id === data.flightId ? { ...f, status: 'landed' } : f,
      ),
    }));
  },

  handleFlightDeparted: (data: unknown) => {
    if (!isValidFlightAlert(data)) {
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>;
        const alert: FlightAlert = {
          id: typeof d.id === 'string' ? d.id : crypto.randomUUID(),
          flightId: typeof d.flightId === 'string' ? d.flightId : '',
          callsign: typeof d.callsign === 'string' ? d.callsign : '',
          type: 'departed',
          message:
            typeof d.message === 'string'
              ? d.message
              : `Voo ${typeof d.callsign === 'string' ? d.callsign : ''} decolou`,
          timestamp: typeof d.timestamp === 'string' ? d.timestamp : new Date().toISOString(),
          read: false,
        };
        get().handleFlightAlert(alert);
        if (typeof d.flightId === 'string') {
          set((state) => ({
            flights: state.flights.map((f) =>
              f.id === d.flightId ? { ...f, status: 'departed' } : f,
            ),
          }));
        }
      }
      return;
    }
    get().handleFlightAlert({ ...data, type: 'departed' });
    set((state) => ({
      flights: state.flights.map((f) =>
        f.id === data.flightId ? { ...f, status: 'departed' } : f,
      ),
    }));
  },
}));
