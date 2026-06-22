import { HttpService } from '@nestjs/axios';
export interface PredictRequest {
    callsign: string;
    scheduled_dep: string;
    origin: string;
    destination: string;
    airline: string;
}
export interface PredictResponse {
    delay_predicted: boolean;
    delay_minutes_estimate: number;
    confidence: number;
    model_version: string;
}
export declare class MlClientService {
    private readonly httpService;
    private readonly logger;
    private readonly mlServiceUrl;
    constructor(httpService: HttpService);
    predictDelay(payload: PredictRequest): Promise<PredictResponse | null>;
}
