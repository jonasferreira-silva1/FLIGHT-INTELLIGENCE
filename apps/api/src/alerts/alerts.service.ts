import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FlightsGateway } from '../flights/flights.gateway';

// Coordenadas geográficas dos principais aeroportos brasileiros para cálculo do ETA
export const AIRPORT_COORDINATES: Record<
  string,
  { lat: number; lon: number; city: string }
> = {
  REC: { lat: -8.1264, lon: -34.9232, city: 'Recife' },
  GRU: { lat: -23.4356, lon: -46.4731, city: 'São Paulo (Guarulhos)' },
  CGH: { lat: -23.6261, lon: -46.6564, city: 'São Paulo (Congonhas)' },
  GIG: { lat: -22.81, lon: -43.2506, city: 'Rio de Janeiro (Galeão)' },
  SDU: { lat: -22.91, lon: -43.1625, city: 'Rio de Janeiro (Santos Dumont)' },
  BSB: { lat: -15.8697, lon: -47.9172, city: 'Brasília' },
  CNF: { lat: -19.6244, lon: -43.9719, city: 'Belo Horizonte (Confins)' },
  SSA: { lat: -12.9086, lon: -38.3225, city: 'Salvador' },
  FOR: { lat: -3.7763, lon: -38.5326, city: 'Fortaleza' },
  POA: { lat: -29.9939, lon: -51.1711, city: 'Porto Alegre' },
  CWB: { lat: -25.5317, lon: -49.1761, city: 'Curitiba' },
  MAO: { lat: -3.0386, lon: -60.0497, city: 'Manaus' },
  NAT: { lat: -5.9114, lon: -35.2478, city: 'Natal' },
  MCZ: { lat: -9.5108, lon: -35.7917, city: 'Maceió' },
  JPA: { lat: -7.1483, lon: -34.9503, city: 'João Pessoa' },
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: FlightsGateway,
  ) {}

  /**
   * Calcula a distância geodésica entre duas coordenadas usando a fórmula de Haversine.
   * Retorna a distância em quilômetros.
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estima o tempo restante de voo em segundos.
   * Recebe a distância em quilômetros e a velocidade em m/s.
   */
  estimateTimeToTarget(distanceKm: number, velocityMs: number | null): number {
    // Se a velocidade for nula ou muito baixa, assume velocidade média de cruzeiro comercial (200 m/s ~ 720 km/h)
    const speed = !velocityMs || velocityMs < 5 ? 200 : velocityMs;
    const distanceMeters = distanceKm * 1000;
    return distanceMeters / speed;
  }

  /**
   * Processa o estado atual de um voo, compara com o estado anterior e gera alertas se necessário.
   */
  async processFlightState(
    flightId: string,
    currentState: any, // FlightState do Prisma
    previousState?: any, // FlightState do Prisma anterior (opcional)
    flightEntity?: any, // Voo pré-carregado para evitar query N+1 (opcional)
  ) {
    // 1. Busca os metadados planejados do voo (ou usa o objeto pré-carregado)
    const flight =
      flightEntity ||
      (await this.prisma.flight.findUnique({
        where: { id: flightId },
      }));

    if (!flight) {
      this.logger.warn(`Voo com ID ${flightId} não foi encontrado no banco.`);
      return;
    }

    const { callsign, origin, destination, scheduledArr } = flight;

    // Formata a hora para representação visual simples (HH:MM)
    const formatHHMM = (date: Date): string => {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // 2. DETECÇÃO DE DECOLAGEM (Departed)
    const hasDeparted =
      origin === 'REC' &&
      !currentState.onGround &&
      previousState &&
      previousState.onGround;

    if (hasDeparted) {
      const dest = AIRPORT_COORDINATES[destination];
      const destCity = dest?.city ?? destination;
      const message = `✈️ ${callsign} decolou de Recife (REC) com destino a ${destCity} (${destination}) às ${formatHHMM(currentState.timestamp)}.`;

      const alert = await this.prisma.alert.create({
        data: { flightId, type: 'departed', message, timestamp: currentState.timestamp },
      });

      this.logger.log(`Alerta de Decolagem: ${callsign} → ${destination}`);
      this.gateway.emitDeparted({
        id: alert.id, flightId, callsign, type: 'departed',
        message, timestamp: alert.timestamp.toISOString(), read: false,
      });
      return;
    }

    // 3. DETECÇÃO DE POUSO (Landed)
    const hasLanded =
      destination === 'REC' &&
      currentState.onGround &&
      previousState &&
      !previousState.onGround;

    if (hasLanded) {
      const orig = AIRPORT_COORDINATES[origin];
      const origCity = orig?.city ?? origin;
      const message = `🛬 ${callsign} pousou em Recife (REC) às ${formatHHMM(currentState.timestamp)}. Voo procedente de ${origCity} (${origin}).`;

      const alert = await this.prisma.alert.create({
        data: { flightId, type: 'landed', message, timestamp: currentState.timestamp },
      });

      this.logger.log(`Alerta de Pouso: ${callsign} ← ${origin}`);
      this.gateway.emitLanded({
        id: alert.id, flightId, callsign, type: 'landed',
        message, timestamp: alert.timestamp.toISOString(), read: false,
      });
      return;
    }

    // 4. DETECÇÃO DE ATRASO + APROXIMAÇÃO FINAL
    if (!currentState.onGround && destination === 'REC' && scheduledArr) {
      const recCoords = AIRPORT_COORDINATES.REC;
      const origInfo = AIRPORT_COORDINATES[origin];
      const origCity = origInfo?.city ?? origin;

      const distance = this.calculateHaversineDistance(
        currentState.latitude,
        currentState.longitude,
        recCoords.lat,
        recCoords.lon,
      );

      const timeToTargetSeconds = this.estimateTimeToTarget(distance, currentState.velocity);
      const eta = new Date(currentState.timestamp.getTime() + timeToTargetSeconds * 1000);
      const delayMs = eta.getTime() - scheduledArr.getTime();
      const delayMinutes = Math.floor(delayMs / 60000);

      // Alerta de APROXIMAÇÃO FINAL (< 80km de REC)
      if (distance < 80) {
        const approachKey = `approach_${flightId}`;
        const recentApproach = await this.prisma.alert.findFirst({
          where: { flightId, type: 'landed' },
          orderBy: { timestamp: 'desc' },
        });
        // Só gera 1 alerta de aproximação por voo (se ainda não pousou)
        const alreadyApproached = await this.prisma.alert.findFirst({
          where: { flightId, message: { contains: 'aproximação final' } },
        });
        if (!alreadyApproached && !recentApproach) {
          const distKm = Math.round(distance);
          const etaStr = formatHHMM(eta);
          const delayStr = delayMinutes > 5 ? ` (${delayMinutes}min de atraso)` : '';
          const message = `🔵 ${callsign} em aproximação final de ${origCity} (${origin}) — ${distKm}km de REC. Pouso previsto às ${etaStr}${delayStr}.`;

          const alert = await this.prisma.alert.create({
            data: { flightId, type: 'landed', message, timestamp: currentState.timestamp },
          });

          this.logger.log(`Alerta de Aproximação: ${callsign} a ${distKm}km`);
          this.gateway.emitAlert({
            id: alert.id, flightId, callsign, type: 'landed',
            message, timestamp: alert.timestamp.toISOString(), read: false,
          });
        }
      }

      // Alerta de ATRASO (> 15 min)
      if (delayMinutes > 15) {
        const latestDelayAlert = await this.prisma.alert.findFirst({
          where: { flightId, type: 'delay' },
          orderBy: { timestamp: 'desc' },
        });

        let generateNewAlert = false;
        if (!latestDelayAlert) {
          generateNewAlert = true;
        } else {
          const timeSinceLastAlertMs =
            currentState.timestamp.getTime() - latestDelayAlert.timestamp.getTime();
          const parsedMessage = latestDelayAlert.message.match(/(\d+)\s*min/);
          const previousDelayMinutes = parsedMessage ? parseInt(parsedMessage[1], 10) : 0;
          const delayDifference = Math.abs(delayMinutes - previousDelayMinutes);
          if (delayDifference >= 5 || timeSinceLastAlertMs > 10 * 60 * 1000) {
            generateNewAlert = true;
          }
        }

        if (generateNewAlert) {
          const etaStr = formatHHMM(eta);
          const scheduledStr = formatHHMM(scheduledArr);
          const message = `⚠️ ${callsign} (${origCity} → REC) com atraso de ${delayMinutes}min. Previsto ${scheduledStr}, novo ETA ${etaStr}.`;

          const alert = await this.prisma.alert.create({
            data: { flightId, type: 'delay', message, timestamp: currentState.timestamp },
          });

          this.logger.log(`Alerta de Atraso: ${callsign} — ${delayMinutes}min`);
          this.gateway.emitAlert({
            id: alert.id, flightId, callsign, type: 'delay',
            message, timestamp: alert.timestamp.toISOString(), read: false, delayMinutes,
          });
        }
      }
    }
  }
}
