import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FlightsGateway } from '../flights/flights.gateway';

// Coordenadas geográficas dos principais aeroportos brasileiros para cálculo do ETA
export const AIRPORT_COORDINATES: Record<string, { lat: number; lon: number; city: string }> = {
  REC: { lat: -8.1264, lon: -34.9232, city: 'Recife' },
  GRU: { lat: -23.4356, lon: -46.4731, city: 'São Paulo (Guarulhos)' },
  CGH: { lat: -23.6261, lon: -46.6564, city: 'São Paulo (Congonhas)' },
  GIG: { lat: -22.8100, lon: -43.2506, city: 'Rio de Janeiro (Galeão)' },
  SDU: { lat: -22.9100, lon: -43.1625, city: 'Rio de Janeiro (Santos Dumont)' },
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
  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  ) {
    // 1. Busca os metadados planejados do voo
    const flight = await this.prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!flight) {
      this.logger.warn(`Voo com ID ${flightId} não foi encontrado no banco.`);
      return;
    }

    const { callsign, origin, destination, scheduledArr, scheduledDep } = flight;

    // Formata a hora para representação visual simples (HH:MM)
    const formatHHMM = (date: Date): string => {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // 2. DETECÇÃO DE DECOLAGEM (Departed)
    // Ocorre quando o avião sai do chão (onGround de true para false) e a origem é Recife (REC)
    const hasDeparted =
      origin === 'REC' &&
      !currentState.onGround &&
      previousState &&
      previousState.onGround;

    if (hasDeparted) {
      const message = `Voo ${callsign} decolou do Recife (REC) às ${formatHHMM(currentState.timestamp)}.`;
      
      const alert = await this.prisma.alert.create({
        data: {
          flightId,
          type: 'departed',
          message,
          timestamp: currentState.timestamp,
        },
      });

      this.logger.log(`Alerta de Decolagem gerado para o voo ${callsign}`);
      
      // Notifica via WebSocket
      this.gateway.emitDeparted({
        id: alert.id,
        flightId,
        callsign,
        type: 'departed',
        message,
        timestamp: alert.timestamp.toISOString(),
        read: false,
      });
      return; // Retorna pois pouso/decolagem são mutuamente exclusivos neste ping
    }

    // 3. DETECÇÃO DE POUSO (Landed)
    // Ocorre quando o avião toca o solo (onGround de false para true) e o destino é Recife (REC)
    const hasLanded =
      destination === 'REC' &&
      currentState.onGround &&
      previousState &&
      !previousState.onGround;

    if (hasLanded) {
      const message = `Voo ${callsign} pousou com sucesso no Recife (REC) às ${formatHHMM(currentState.timestamp)}.`;
      
      const alert = await this.prisma.alert.create({
        data: {
          flightId,
          type: 'landed',
          message,
          timestamp: currentState.timestamp,
        },
      });

      this.logger.log(`Alerta de Pouso gerado para o voo ${callsign}`);
      
      // Notifica via WebSocket
      this.gateway.emitLanded({
        id: alert.id,
        flightId,
        callsign,
        type: 'landed',
        message,
        timestamp: alert.timestamp.toISOString(),
        read: false,
      });
      return;
    }

    // 4. DETECÇÃO DE ATRASO (Delay) baseada no cálculo de ETA
    // Só faz sentido calcular ETA para voos que estão no ar e cujo destino seja Recife (REC)
    if (!currentState.onGround && destination === 'REC' && scheduledArr) {
      // Coordenadas de Recife
      const recCoords = AIRPORT_COORDINATES.REC;
      
      // Calcula a distância atual até Recife
      const distance = this.calculateHaversineDistance(
        currentState.latitude,
        currentState.longitude,
        recCoords.lat,
        recCoords.lon,
      );

      // Estima o tempo restante
      const timeToTargetSeconds = this.estimateTimeToTarget(distance, currentState.velocity);
      
      // Calcula o ETA (Estimated Time of Arrival)
      const eta = new Date(currentState.timestamp.getTime() + timeToTargetSeconds * 1000);
      
      // Compara o ETA com o horário de chegada programado
      const delayMs = eta.getTime() - scheduledArr.getTime();
      const delayMinutes = Math.floor(delayMs / 60000);

      // Dispara alerta se o atraso previsto for maior que 15 minutos
      if (delayMinutes > 15) {
        // Verifica se já enviamos um alerta de atraso recentemente para este voo para evitar spam de pings repetidos
        const latestDelayAlert = await this.prisma.alert.findFirst({
          where: {
            flightId,
            type: 'delay',
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        let generateNewAlert = false;
        
        if (!latestDelayAlert) {
          // Nenhum alerta anterior de atraso, cria o primeiro
          generateNewAlert = true;
        } else {
          // Se já existe um alerta de atraso, só cria outro se o atraso estimado variou significativamente (ex: mais de 5 minutos)
          // ou se o alerta anterior foi há mais de 10 minutos
          const timeSinceLastAlertMs = currentState.timestamp.getTime() - latestDelayAlert.timestamp.getTime();
          const parsedMessage = latestDelayAlert.message.match(/atraso previsto de (\d+) minutos/);
          const previousDelayMinutes = parsedMessage ? parseInt(parsedMessage[1], 10) : 0;
          const delayDifference = Math.abs(delayMinutes - previousDelayMinutes);

          if (delayDifference >= 5 || timeSinceLastAlertMs > 10 * 60 * 1000) {
            generateNewAlert = true;
          }
        }

        if (generateNewAlert) {
          const message = `Voo ${callsign} com atraso previsto de ${delayMinutes} minutos. Nova previsão de chegada: ${formatHHMM(eta)}.`;
          
          const alert = await this.prisma.alert.create({
            data: {
              flightId,
              type: 'delay',
              message,
              timestamp: currentState.timestamp,
            },
          });

          this.logger.log(`Alerta de Atraso de ${delayMinutes} min gerado para o voo ${callsign}`);

          // Emite o alerta via gateway
          this.gateway.emitAlert({
            id: alert.id,
            flightId,
            callsign,
            type: 'delay',
            message,
            timestamp: alert.timestamp.toISOString(),
            read: false,
            delayMinutes,
          });
        }
      }
    }
  }
}
