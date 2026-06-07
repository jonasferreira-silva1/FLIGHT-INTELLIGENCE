import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    private readonly logger;
    constructor(analyticsService: AnalyticsService);
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
