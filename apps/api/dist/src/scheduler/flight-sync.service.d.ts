import { OpenskyService } from './opensky.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class FlightSyncService {
    private readonly openskyService;
    private readonly prisma;
    private readonly logger;
    constructor(openskyService: OpenskyService, prisma: PrismaService);
    handleCron(): Promise<void>;
}
