import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OpenskyService } from './opensky.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlightSyncService {
  private readonly logger = new Logger(FlightSyncService.name);

  constructor(
    private readonly openskyService: OpenskyService,
    private readonly prisma: PrismaService,
  ) {}

  // Executa a cada 30 segundos
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    this.logger.debug('Sincronizando voos da OpenSky...');

    const states = await this.openskyService.getFlightsInRecife();
    
    if (!states || states.length === 0) {
      this.logger.debug('Nenhum voo retornado nesta janela de tempo.');
      return;
    }

    let updatedCount = 0;

    for (const state of states) {
      // Formato da resposta do OpenSky:
      // [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
      const icao24 = state[0];
      const callsign = state[1]?.trim() || icao24; // Usa o callsign, se vazio usa o icao24 como fallback
      const longitude = state[5];
      const latitude = state[6];
      const altitude = state[7] || state[13]; // baro_altitude ou geo_altitude
      const onGround = state[8] as boolean;
      const velocity = state[9];
      const heading = state[10]; // true_track

      // Ignora voos sem posição
      if (latitude === null || longitude === null) continue;

      // 1. Atualiza ou Cria o voo (Flight)
      const flight = await this.prisma.flight.upsert({
        where: { callsign: callsign },
        update: { updatedAt: new Date() },
        create: {
          callsign: callsign,
          // Outros campos como origin e destination precisariam de outra API ou banco de rotas
        },
      });

      // 2. Insere o novo estado (FlightState)
      await this.prisma.flightState.create({
        data: {
          flightId: flight.id,
          latitude: latitude,
          longitude: longitude,
          altitude: altitude,
          velocity: velocity,
          heading: heading,
          onGround: onGround,
        },
      });

      updatedCount++;
    }

    this.logger.debug(`${updatedCount} posições de voos atualizadas com sucesso no banco de dados.`);
  }
}
