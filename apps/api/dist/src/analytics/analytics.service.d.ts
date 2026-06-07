import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(): Promise<{
        totalFlights: number;
        arrivals: number;
        departures: number;
        onTimePercentage: number;
        averageDelay: number;
        passengers: number;
    }>;
    getAirlineStats(): Promise<{
        code: string;
        name: string;
        flights: number;
        onTimePercentage: number;
    }[]>;
    getDelayHeatmap(): Promise<{
        hour: number;
        averageDelay: number;
        flightCount: number;
    }[]>;
}
