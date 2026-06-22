import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly mlServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  async predictDelay(payload: PredictRequest): Promise<PredictResponse | null> {
    try {
      this.logger.debug(
        `Sending prediction request to ML service: ${JSON.stringify(payload)}`,
      );
      const response = await firstValueFrom(
        this.httpService.post<PredictResponse>(
          `${this.mlServiceUrl}/predict`,
          payload,
          {
            timeout: 5000, // 5 segundos de timeout
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get prediction from ML service: ${error.message}`,
      );
      return null;
    }
  }
}
