import { OpenskyService } from './opensky.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { FlightsGateway } from '../flights/flights.gateway';
import { FlightsService } from '../flights/flights.service';
export declare class FlightSyncService {
    private readonly openskyService;
    private readonly prisma;
    private readonly alertsService;
    private readonly gateway;
    private readonly flightsService;
    private readonly logger;
    constructor(openskyService: OpenskyService, prisma: PrismaService, alertsService: AlertsService, gateway: FlightsGateway, flightsService: FlightsService);
    handleCron(): Promise<void>;
}
