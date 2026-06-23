import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

// Coordenadas dos aeroportos para simular rotas realistas
const AIRPORTS: Record<string, { lat: number; lon: number }> = {
  REC: { lat: -8.1264, lon: -34.9232 },
  GRU: { lat: -23.4356, lon: -46.4731 },
  CGH: { lat: -23.6261, lon: -46.6564 },
  GIG: { lat: -22.8100, lon: -43.2506 },
  BSB: { lat: -15.8697, lon: -47.9172 },
  SSA: { lat: -12.9086, lon: -38.3225 },
  FOR: { lat: -3.7763, lon: -38.5326 },
  NAT: { lat: -5.9114, lon: -35.2478 },
  MCZ: { lat: -9.5108, lon: -35.7917 },
  JPA: { lat: -7.1483, lon: -34.9503 },
  CNF: { lat: -19.6244, lon: -43.9719 },
  POA: { lat: -29.9939, lon: -51.1711 },
};

// Callsigns simulados realistas para o nordeste brasileiro
const SIMULATED_FLIGHTS = [
  { icao24: 'e4955a', callsign: 'GLO1234', origin: 'GRU', dest: 'REC' },
  { icao24: 'e49b1c', callsign: 'AZU4501', origin: 'BSB', dest: 'REC' },
  { icao24: 'e4a210', callsign: 'TAM3087', origin: 'REC', dest: 'GIG' },
  { icao24: 'e4c301', callsign: 'GLO1847', origin: 'SSA', dest: 'REC' },
  { icao24: 'e4d102', callsign: 'AZU5923', origin: 'REC', dest: 'FOR' },
  { icao24: 'e4e205', callsign: 'TAM3401', origin: 'FOR', dest: 'REC' },
  { icao24: 'e4f308', callsign: 'GLO2210', origin: 'REC', dest: 'CGH' },
  { icao24: 'e50112', callsign: 'AZU6017', origin: 'CNF', dest: 'REC' },
];

@Injectable()
export class OpenskyService {
  private readonly logger = new Logger(OpenskyService.name);
  private readonly baseUrl = 'https://opensky-network.org/api/states/all';

  // Estado interno da simulação: progresso de cada voo (0.0 = origem, 1.0 = destino)
  private simulatedProgress: Record<string, number> = {};

  constructor(private readonly httpService: HttpService) {
    // Inicializa progresso aleatório para cada voo simulado
    for (const f of SIMULATED_FLIGHTS) {
      this.simulatedProgress[f.icao24] = Math.random() * 0.8 + 0.05;
    }
  }

  /**
   * Busca estados de voos em uma Bounding Box ao redor de Recife (REC).
   * Usa dados reais da OpenSky quando disponíveis; cai em simulação caso contrário.
   */
  async getFlightsInRecife(): Promise<any[]> {
    const lamin = -10.0;
    const lamax = -6.0;
    const lomin = -37.0;
    const lomax = -33.0;
    const url = `${this.baseUrl}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    const config: any = {};
    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      config.auth = {
        username: process.env.OPENSKY_USERNAME,
        password: process.env.OPENSKY_PASSWORD,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { ...config, timeout: 8000 }),
      );
      const states: any[] = response.data?.states ?? [];

      if (states.length > 0) {
        this.logger.debug(`OpenSky retornou ${states.length} voos reais.`);
        return states;
      }

      this.logger.warn('OpenSky retornou 0 voos — usando simulação de fallback.');
      return this.generateSimulatedStates();
    } catch (error) {
      this.logger.error(
        `Erro ao buscar dados do OpenSky (${error.message}) — usando simulação de fallback.`,
      );
      return this.generateSimulatedStates();
    }
  }

  /**
   * Gera estados simulados realistas de voos em trânsito ao redor de Recife.
   * Cada ciclo avança o progresso de cada aeronave ao longo da sua rota.
   */
  private generateSimulatedStates(): any[] {
    const states: any[] = [];

    for (const flight of SIMULATED_FLIGHTS) {
      const origin = AIRPORTS[flight.origin];
      const dest = AIRPORTS[flight.dest];
      if (!origin || !dest) continue;

      // Avança o progresso entre 1–3% por ciclo (cada ciclo = 30s)
      this.simulatedProgress[flight.icao24] =
        (this.simulatedProgress[flight.icao24] + 0.015 + Math.random() * 0.015) % 1.0;

      const t = this.simulatedProgress[flight.icao24];

      // Interpolação linear da posição ao longo da rota
      const lat = origin.lat + (dest.lat - origin.lat) * t;
      const lon = origin.lon + (dest.lon - origin.lon) * t;

      // Calcula heading (direção) entre os dois pontos
      const dLon = dest.lon - origin.lon;
      const dLat = dest.lat - origin.lat;
      const headingRad = Math.atan2(dLon, dLat);
      const heading = ((headingRad * 180) / Math.PI + 360) % 360;

      // Altitude realista: sobe até ~11000m e desce ao aproximar destino
      const altitudeCurve = Math.sin(t * Math.PI); // 0 -> 1 -> 0
      const altitude = 2000 + altitudeCurve * 9000 + (Math.random() - 0.5) * 200;

      // Velocidade de cruzeiro ~240 m/s (~860 km/h), mais lento na decolagem/pouso
      const velocity = 180 + altitudeCurve * 80 + (Math.random() - 0.5) * 10;

      // state array no mesmo formato do OpenSky:
      // [icao24, callsign, origin_country, time_position, last_contact,
      //  longitude, latitude, baro_altitude, on_ground, velocity,
      //  true_track, vertical_rate, sensors, geo_altitude, ...]
      states.push([
        flight.icao24,            // 0: icao24
        flight.callsign + ' ',    // 1: callsign (OpenSky sempre tem espaço no final)
        'Brazil',                 // 2: origin_country
        Math.floor(Date.now() / 1000), // 3: time_position
        Math.floor(Date.now() / 1000), // 4: last_contact
        lon,                      // 5: longitude
        lat,                      // 6: latitude
        altitude,                 // 7: baro_altitude
        false,                    // 8: on_ground
        velocity,                 // 9: velocity (m/s)
        heading,                  // 10: true_track (heading em graus)
        0,                        // 11: vertical_rate
        null,                     // 12: sensors
        altitude,                 // 13: geo_altitude
      ]);
    }

    this.logger.debug(`Simulação gerou ${states.length} voos.`);
    return states;
  }
}
