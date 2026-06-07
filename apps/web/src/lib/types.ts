// Flight status types
export type FlightStatus = 
  | 'scheduled' 
  | 'boarding' 
  | 'departed' 
  | 'airborne' 
  | 'landed' 
  | 'cancelled'
  | 'delayed';

// Flight interface
export interface Flight {
  id: string;
  callsign: string;
  icao24: string;
  airline: string;
  airlineCode: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  status: FlightStatus;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture?: string;
  actualArrival?: string;
  gate?: string;
  terminal?: string;
  aircraft?: string;
  delayMinutes: number;
}

// Flight position for map
export interface FlightPosition {
  flightId: string;
  callsign: string;
  airline: string;
  latitude: number;
  longitude: number;
  altitude: number; // meters
  velocity: number; // m/s
  heading: number; // degrees
  onGround: boolean;
  status: FlightStatus;
  origin: string;
  destination: string;
  capturedAt: string;
}

// Alert types
export type AlertType = 'delay' | 'gate_change' | 'landed' | 'departed' | 'cancelled';

export interface FlightAlert {
  id: string;
  flightId: string;
  callsign: string;
  type: AlertType;
  message: string;
  timestamp: string;
  read: boolean;
}

// Analytics data
export interface DailyStats {
  totalFlights: number;
  arrivals: number;
  departures: number;
  onTimePercentage: number;
  averageDelay: number;
  passengers: number;
}

export interface AirlineStats {
  code: string;
  name: string;
  flights: number;
  onTimePercentage: number;
}

export interface RouteStats {
  origin: string;
  destination: string;
  flights: number;
  averageDelay: number;
}

export interface DelayHeatmapData {
  hour: number;
  dayOfWeek: number;
  averageDelay: number;
}

// Delay prediction
export interface DelayPrediction {
  flightId: string;
  delayPredicted: boolean;
  delayMinutesEstimate: number;
  confidence: number;
  modelVersion: string;
}

// Runtime guards for WebSocket data
export function isValidFlightPosition(data: unknown): data is FlightPosition {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.flightId === 'string' &&
    typeof d.latitude === 'number' &&
    typeof d.longitude === 'number' &&
    typeof d.heading === 'number'
  );
}

export function isValidFlightAlert(data: unknown): data is FlightAlert {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.flightId === 'string' &&
    typeof d.callsign === 'string' &&
    typeof d.type === 'string' &&
    typeof d.message === 'string'
  );
}
