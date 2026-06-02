import { HttpService } from '@nestjs/axios';
export declare class OpenskyService {
    private readonly httpService;
    private readonly logger;
    private readonly baseUrl;
    constructor(httpService: HttpService);
    getFlightsInRecife(): Promise<any>;
}
