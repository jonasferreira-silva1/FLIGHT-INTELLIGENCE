import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OpenskyService {
  private readonly logger = new Logger(OpenskyService.name);
  
  // URL base para OpenSky
  private readonly baseUrl = 'https://opensky-network.org/api/states/all';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Busca estados de voos em uma Bounding Box ao redor de Recife (REC)
   * lamin, lomin, lamax, lomax
   * Coordenadas REC aproximadas: lat -8.1259, lon -34.9230
   */
  async getFlightsInRecife() {
    const lamin = -10.0;
    const lamax = -6.0;
    const lomin = -37.0;
    const lomax = -33.0;

    const url = `${this.baseUrl}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    // Configurando credenciais caso existam no .env
    const config: any = {};
    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      config.auth = {
        username: process.env.OPENSKY_USERNAME,
        password: process.env.OPENSKY_PASSWORD,
      };
    }

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      return response.data?.states ?? [];
    } catch (error) {
      this.logger.error('Erro ao buscar dados do OpenSky', error.message);
      return [];
    }
  }
}
