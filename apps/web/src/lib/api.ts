import type { Flight, FlightPosition, FlightAlert, AlertType, DelayPrediction } from '@/lib/types';

const API_BASE =
  typeof window !== 'undefined'
    ? '/api'
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');

async function fetchSafe<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[api] HTTP ${res.status} at ${url}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[api] Network error at ${url}:`, err);
    return fallback;
  }
}

interface ApiAlertRaw {
  id: string;
  flightId: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  flight: {
    callsign: string;
    origin: string;
    destination: string;
    airline: string;
  } | null;
}

function mapAlertFromApi(raw: ApiAlertRaw): FlightAlert {
  return {
    id: raw.id,
    flightId: raw.flightId,
    callsign: raw.flight?.callsign ?? '',
    type: raw.type as AlertType,
    message: raw.message,
    timestamp: raw.timestamp,
    read: raw.read,
  };
}

export const api = {
  async getFlights(): Promise<Flight[]> {
    return fetchSafe<Flight[]>(`${API_BASE}/flights`, []);
  },

  async getPositions(): Promise<FlightPosition[]> {
    return fetchSafe<FlightPosition[]>(`${API_BASE}/flights/positions`, []);
  },

  async getAlerts(): Promise<FlightAlert[]> {
    const raw = await fetchSafe<ApiAlertRaw[]>(`${API_BASE}/alerts`, []);
    return raw.map(mapAlertFromApi);
  },

  async markAlertRead(id: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/read`, { method: 'PATCH' });
      if (!res.ok) {
        console.error(`[api] HTTP ${res.status} marking alert ${id} as read`);
      }
    } catch (err) {
      console.error(`[api] Network error marking alert ${id} as read:`, err);
    }
  },

  async markAllAlertsRead(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/alerts/read-all`, { method: 'PATCH' });
      if (!res.ok) {
        console.error(`[api] HTTP ${res.status} marking all alerts as read`);
      }
    } catch (err) {
      console.error(`[api] Network error marking all alerts as read:`, err);
    }
  },

  async clearAlerts(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/alerts`, { method: 'DELETE' });
      if (!res.ok) {
        console.error(`[api] HTTP ${res.status} clearing alerts`);
      }
    } catch (err) {
      console.error(`[api] Network error clearing alerts:`, err);
    }
  },

  async getFlightById(id: string): Promise<Flight | null> {
    return fetchSafe<Flight | null>(`${API_BASE}/flights/${id}`, null);
  },

  async getFlightStates(id: string): Promise<FlightPosition[]> {
    return fetchSafe<FlightPosition[]>(`${API_BASE}/flights/${id}/states`, []);
  },

  async getFlightPrediction(id: string): Promise<DelayPrediction | null> {
    return fetchSafe<DelayPrediction | null>(`${API_BASE}/flights/${id}/prediction`, null);
  },

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getAnalyticsSummary(): Promise<{
    totalFlights: number;
    arrivals: number;
    departures: number;
    onTimePercentage: number;
    averageDelay: number;
    passengers: number;
  } | null> {
    return fetchSafe(`${API_BASE}/analytics/summary`, null);
  },

  async getAirlineStats(): Promise<Array<{
    code: string;
    name: string;
    flights: number;
    onTimePercentage: number;
  }>> {
    return fetchSafe(`${API_BASE}/analytics/airlines`, []);
  },

  async getDelayHeatmap(): Promise<Array<{
    hour: number;
    averageDelay: number;
    flightCount: number;
  }>> {
    return fetchSafe(`${API_BASE}/analytics/delay-heatmap`, []);
  },
};
