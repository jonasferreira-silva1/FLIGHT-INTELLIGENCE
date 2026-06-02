import { PrismaService } from '../prisma/prisma.service';
import { FlightsGateway } from '../flights/flights.gateway';
export declare const AIRPORT_COORDINATES: Record<string, {
    lat: number;
    lon: number;
    city: string;
}>;
export declare class AlertsService {
    private readonly prisma;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, gateway: FlightsGateway);
    calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
    estimateTimeToTarget(distanceKm: number, velocityMs: number | null): number;
    processFlightState(flightId: string, currentState: any, previousState?: any): Promise<void>;
}
