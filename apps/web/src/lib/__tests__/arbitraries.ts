import * as fc from 'fast-check';
import type { Flight, FlightPosition, FlightAlert, FlightStatus, AlertType } from '../types';

export const arbFlightStatus = (): fc.Arbitrary<FlightStatus> =>
  fc.constantFrom('scheduled', 'boarding', 'departed', 'airborne', 'landed', 'cancelled', 'delayed');

export const arbAlertType = (): fc.Arbitrary<AlertType> =>
  fc.constantFrom('delay', 'gate_change', 'landed', 'departed', 'cancelled');

export const arbFlight = (): fc.Arbitrary<Flight> =>
  fc.record({
    id: fc.uuid(),
    callsign: fc.stringMatching(/^[A-Z]{3}\d{4}$/),
    icao24: fc.stringMatching(/^[0-9a-fA-F]{6}$/),
    airline: fc.constantFrom('Gol Linhas Aéreas', 'Azul Linhas Aéreas', 'LATAM Airlines', 'Voepass'),
    airlineCode: fc.constantFrom('G3', 'AD', 'LA', '2Z'),
    origin: fc.constantFrom('REC', 'GRU', 'CGH', 'GIG', 'BSB', 'SSA', 'FOR'),
    originCity: fc.string({ minLength: 3 }),
    destination: fc.constantFrom('REC', 'GRU', 'CGH', 'GIG', 'BSB', 'SSA', 'FOR'),
    destinationCity: fc.string({ minLength: 3 }),
    status: arbFlightStatus(),
    scheduledDeparture: fc.integer({ min: 1767225600000, max: 1798761600000 }).map((t) => new Date(t).toISOString()),
    scheduledArrival: fc.integer({ min: 1767225600000, max: 1798761600000 }).map((t) => new Date(t).toISOString()),
    actualDeparture: fc.option(fc.integer({ min: 1767225600000, max: 1798761600000 }).map((t) => new Date(t).toISOString())),
    actualArrival: fc.option(fc.integer({ min: 1767225600000, max: 1798761600000 }).map((t) => new Date(t).toISOString())),
    gate: fc.option(fc.string({ minLength: 2, maxLength: 4 })),
    terminal: fc.option(fc.string({ minLength: 1, maxLength: 2 })),
    aircraft: fc.option(fc.constantFrom('Boeing 737-800', 'Airbus A320', 'ATR 72')),
    delayMinutes: fc.integer({ min: 0, max: 120 }),
  });

export const arbFlightPosition = (): fc.Arbitrary<FlightPosition> =>
  fc.record({
    flightId: fc.uuid(),
    callsign: fc.stringMatching(/^[A-Z]{3}\d{4}$/),
    airline: fc.constantFrom('Gol Linhas Aéreas', 'Azul Linhas Aéreas', 'LATAM Airlines', 'Voepass'),
    latitude: fc.double({ min: -90, max: 90 }),
    longitude: fc.double({ min: -180, max: 180 }),
    altitude: fc.double({ min: 0, max: 12000 }),
    velocity: fc.double({ min: 0, max: 300 }),
    heading: fc.double({ min: 0, max: 360 }),
    onGround: fc.boolean(),
    status: arbFlightStatus(),
    origin: fc.constantFrom('REC', 'GRU', 'CGH', 'GIG', 'BSB', 'SSA', 'FOR'),
    destination: fc.constantFrom('REC', 'GRU', 'CGH', 'GIG', 'BSB', 'SSA', 'FOR'),
    capturedAt: fc.integer({ min: 1767225600000, max: 1798761600000 }).map((t) => new Date(t).toISOString()),
  });

export const arbFlightAlert = (): fc.Arbitrary<FlightAlert> =>
  fc.record({
    id: fc.uuid(),
    flightId: fc.uuid(),
    callsign: fc.stringMatching(/^[A-Z]{3}\d{4}$/),
    type: arbAlertType(),
    message: fc.string({ minLength: 10 }),
    timestamp: fc.integer({ min: 1767225600000, max: 1798761600000 }).map((t) => new Date(t).toISOString()),
    read: fc.boolean(),
  });
