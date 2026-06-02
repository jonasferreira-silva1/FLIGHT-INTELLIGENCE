import { PrismaService } from '../prisma/prisma.service';
export declare class AlertsController {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getRecentAlerts(): Promise<({
        flight: {
            callsign: string;
            origin: string | null;
            destination: string | null;
            airline: string | null;
        };
    } & {
        id: string;
        timestamp: Date;
        flightId: string;
        type: string;
        message: string;
        read: boolean;
    })[]>;
    markAsRead(id: string): Promise<{
        id: string;
        timestamp: Date;
        flightId: string;
        type: string;
        message: string;
        read: boolean;
    }>;
    clearAllAlerts(): Promise<{
        status: string;
        message: string;
    }>;
}
