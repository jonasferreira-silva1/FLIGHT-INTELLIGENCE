import { PrismaService } from '../prisma/prisma.service';
export declare class FlightsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLiveFlights(): Promise<({
        states: {
            id: string;
            onGround: boolean;
            timestamp: Date;
            flightId: string;
            latitude: number;
            longitude: number;
            altitude: number | null;
            velocity: number | null;
            heading: number | null;
        }[];
    } & {
        id: string;
        callsign: string;
        origin: string | null;
        destination: string | null;
        airline: string | null;
        scheduledDep: Date | null;
        scheduledArr: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
}
