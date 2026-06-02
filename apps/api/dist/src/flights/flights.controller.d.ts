import { FlightsService } from './flights.service';
export declare class FlightsController {
    private readonly flightsService;
    constructor(flightsService: FlightsService);
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
