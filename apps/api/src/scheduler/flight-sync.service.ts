import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OpenskyService } from './opensky.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService, AIRPORT_COORDINATES } from '../alerts/alerts.service';
import { FlightsGateway } from '../flights/flights.gateway';
import { FlightsService, getAirlineInfo } from '../flights/flights.service';

@Injectable()
export class FlightSyncService {
  private readonly logger = new Logger(FlightSyncService.name);

  constructor(
    private readonly openskyService: OpenskyService,
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly gateway: FlightsGateway,
    private readonly flightsService: FlightsService,
  ) {}

  // Executa o sincronizador periodicamente a cada 30 segundos
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    this.logger.debug('Iniciando sincronização de voos da OpenSky...');

    const states = await this.openskyService.getFlightsInRecife();

    if (!states || states.length === 0) {
      this.logger.debug(
        'Nenhum voo retornado pela OpenSky na janela de tempo.',
      );
      return;
    }

    let updatedCount = 0;

    for (const state of states) {
      // Mapeamento dos campos do array de retorno da API do OpenSky:
      // state[0] = icao24
      // state[1] = callsign
      // state[5] = longitude
      // state[6] = latitude
      // state[7]/state[13] = altitude
      // state[8] = on_ground (booleano)
      // state[9] = velocity (velocidade em m/s)
      // state[10] = heading (direção true_track em graus)
      const icao24 = state[0];
      const callsign = state[1]?.trim() || icao24;
      const longitude = state[5];
      const latitude = state[6];
      const altitude = state[7] || state[13];
      const onGround = state[8] as boolean;
      const velocity = state[9];
      const heading = state[10];

      // Ignora registros de aeronaves sem dados válidos de latitude/longitude
      if (latitude === null || longitude === null) continue;

      // 1. Enriquecimento de Itinerário se o voo for inédito no banco
      const existingFlight = await this.prisma.flight.findUnique({
        where: { callsign: callsign },
      });

      let flight;
      if (!existingFlight) {
        // Determina se o voo está chegando ou partindo de Recife (REC)
        const isArrival = Math.random() > 0.5;

        // Sorteia outro aeroporto brasileiro como par de rota
        const otherAirports = Object.keys(AIRPORT_COORDINATES).filter(
          (code) => code !== 'REC',
        );
        const randomAirport =
          otherAirports[Math.floor(Math.random() * otherAirports.length)];

        const origin = isArrival ? randomAirport : 'REC';
        const destination = isArrival ? 'REC' : randomAirport;
        const airlineInfo = getAirlineInfo(callsign);

        // Define horários estimados baseados no horário atual do processamento
        const now = new Date();
        let scheduledDep: Date;
        let scheduledArr: Date;

        if (isArrival) {
          scheduledDep = new Date(now.getTime() - 60 * 60 * 1000); // Decolou há 1 hora
          scheduledArr = new Date(now.getTime() + 60 * 60 * 1000); // Chega em 1 hora
        } else {
          scheduledDep = new Date(now.getTime() - 15 * 60 * 1000); // Decolou há 15 minutos
          scheduledArr = new Date(now.getTime() + 90 * 60 * 1000); // Chega em 1.5 horas
        }

        flight = await this.prisma.flight.create({
          data: {
            callsign,
            origin,
            destination,
            airline: airlineInfo.name,
            scheduledDep,
            scheduledArr,
          },
        });
        this.logger.debug(
          `Novo voo cadastrado e enriquecido: ${callsign} (${origin} -> ${destination})`,
        );
      } else {
        // Se o voo já existe, apenas atualiza o timestamp de última modificação
        flight = await this.prisma.flight.update({
          where: { id: existingFlight.id },
          data: { updatedAt: new Date() },
        });
      }

      // 2. Recupera o último estado geográfico gravado antes de inserir o novo (para transições)
      const previousState = await this.prisma.flightState.findFirst({
        where: { flightId: flight.id },
        orderBy: { timestamp: 'desc' },
      });

      // 3. Grava a nova telemetria (FlightState) no banco
      const currentState = await this.prisma.flightState.create({
        data: {
          flightId: flight.id,
          latitude,
          longitude,
          altitude,
          velocity,
          heading,
          onGround,
        },
      });

      // 4. Executa a regra de alertas (delay, landed, departed)
      await this.alertsService.processFlightState(
        flight.id,
        currentState,
        previousState,
        flight,
      );

      // 5. Transmite a nova telemetria via WebSocket para os clientes conectados
      const positionData = this.flightsService.mapFlightStateToPosition(
        currentState,
        flight,
      );
      this.gateway.emitFlightUpdate(positionData);

      updatedCount++;
    }

    this.logger.log(
      `Sincronização concluída. ${updatedCount} posições processadas e transmitidas via WS.`,
    );
  }
}
