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
      // Campos extras da simulação (undefined quando dados são reais da OpenSky)
      const simulatedDelayMinutes: number = state[14] ?? 0;
      const simulatedOrigin: string | undefined = state[15];
      const simulatedDest: string | undefined = state[16];

      // Ignora registros de aeronaves sem dados válidos de latitude/longitude
      if (latitude === null || longitude === null) continue;

      // 1. Enriquecimento de Itinerário se o voo for inédito no banco
      const existingFlight = await this.prisma.flight.findUnique({
        where: { callsign: callsign },
      });

      let flight;
      if (!existingFlight) {
        // Usa a rota da simulação se disponível, senão sorteia
        const isArrival = simulatedDest
          ? simulatedDest === 'REC'
          : Math.random() > 0.5;

        let origin: string;
        let destination: string;
        if (simulatedOrigin && simulatedDest) {
          origin = simulatedOrigin;
          destination = simulatedDest;
        } else {
          const otherAirports = Object.keys(AIRPORT_COORDINATES).filter(
            (code) => code !== 'REC',
          );
          const randomAirport =
            otherAirports[Math.floor(Math.random() * otherAirports.length)];
          origin = isArrival ? randomAirport : 'REC';
          destination = isArrival ? 'REC' : randomAirport;
        }

        const airlineInfo = getAirlineInfo(callsign);
        const now = new Date();

        // scheduledArr: hora planejada SEM o atraso
        // Se há atraso simulado, o horário planejado é mais cedo que o ETA real
        const baseArrivalMs = isArrival
          ? now.getTime() + 60 * 60 * 1000          // chegaria em 1h pontualmente
          : now.getTime() + 90 * 60 * 1000;
        const scheduledArr = new Date(baseArrivalMs - simulatedDelayMinutes * 60 * 1000);
        const scheduledDep = new Date(now.getTime() - 60 * 60 * 1000);

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
          `Novo voo cadastrado: ${callsign} (${origin} -> ${destination})${simulatedDelayMinutes > 0 ? ` | Atraso: ${simulatedDelayMinutes}min` : ''}`,
        );
      } else {
        // Se o voo já existe, verifica se o horário de chegada programado já passou há mais de 12 horas.
        // Se sim, considera que é uma nova operação/leg do mesmo voo e atualiza os horários programados.
        const now = new Date();
        const scheduledArr = existingFlight.scheduledArr;
        const needsUpdate = !scheduledArr || (now.getTime() - new Date(scheduledArr).getTime() > 12 * 60 * 60 * 1000);

        if (needsUpdate) {
          const isArrival = existingFlight.destination === 'REC';
          let scheduledDep: Date;
          let newScheduledArr: Date;

          if (isArrival) {
            scheduledDep = new Date(now.getTime() - 60 * 60 * 1000); // Decolou há 1 hora
            newScheduledArr = new Date(now.getTime() + 60 * 60 * 1000); // Chega em 1 hora
          } else {
            scheduledDep = new Date(now.getTime() - 15 * 60 * 1000); // Decolou há 15 minutos
            newScheduledArr = new Date(now.getTime() + 90 * 60 * 1000); // Chega em 1.5 horas
          }

          flight = await this.prisma.flight.update({
            where: { id: existingFlight.id },
            data: {
              scheduledDep,
              scheduledArr: newScheduledArr,
              updatedAt: now,
            },
          });
          this.logger.debug(
            `Voo ${callsign} identificado como nova perna. Horários programados atualizados para hoje.`,
          );
        } else {
          // Se o voo já existe e é da mesma perna, apenas atualiza o timestamp de última modificação
          flight = await this.prisma.flight.update({
            where: { id: existingFlight.id },
            data: { updatedAt: now },
          });
        }
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
