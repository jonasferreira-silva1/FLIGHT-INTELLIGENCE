/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getAirlineInfo,
  calculateDelayMinutes,
} from '../flights/flights.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna estatísticas diárias resumidas do aeroporto.
   * GET /analytics/summary
   */
  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const flights: any[] = await this.prisma.flight.findMany({
      where: { createdAt: { gte: today } },
      include: {
        states: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    const arrivals = flights.filter((f: any) => f.destination === 'REC').length;
    const departures = flights.filter((f: any) => f.origin === 'REC').length;

    const delayList = flights.map((f: any) => {
      const state = f.states[0] ?? null;
      return calculateDelayMinutes(state, f);
    });

    const delayed = delayList.filter((d: number) => d > 0);
    const onTime = flights.length - delayed.length;
    const onTimePercentage =
      flights.length > 0 ? (onTime / flights.length) * 100 : 0;
    const averageDelay =
      delayed.length > 0
        ? delayed.reduce((s: number, d: number) => s + d, 0) / delayed.length
        : 0;

    return {
      totalFlights: flights.length,
      arrivals,
      departures,
      onTimePercentage: Math.round(onTimePercentage * 10) / 10,
      averageDelay: Math.round(averageDelay * 10) / 10,
      passengers: Math.round(flights.length * 130),
    };
  }

  /**
   * Retorna ranking de companhias aéreas por número de voos.
   * GET /analytics/airlines
   */
  async getAirlineStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const flights: any[] = await this.prisma.flight.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: {
        states: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    const airlineMap = new Map<
      string,
      { code: string; name: string; total: number; onTime: number }
    >();

    for (const flight of flights) {
      const info = getAirlineInfo(flight.callsign);
      const state = flight.states[0] ?? null;
      const delay = calculateDelayMinutes(state, flight);

      const entry = airlineMap.get(info.code) ?? {
        code: info.code,
        name: info.name,
        total: 0,
        onTime: 0,
      };
      entry.total += 1;
      if (delay === 0) entry.onTime += 1;
      airlineMap.set(info.code, entry);
    }

    return Array.from(airlineMap.values())
      .map((a) => ({
        code: a.code,
        name: a.name,
        flights: a.total,
        onTimePercentage:
          a.total > 0 ? Math.round((a.onTime / a.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.flights - a.flights);
  }

  /**
   * Retorna distribuição de atraso médio por hora do dia (0–23).
   * GET /analytics/delay-heatmap
   */
  async getDelayHeatmap() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const flights: any[] = await this.prisma.flight.findMany({
      where: {
        scheduledDep: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        states: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    const hourMap = new Map<number, { totalDelay: number; count: number }>();

    for (const flight of flights) {
      if (!flight.scheduledDep) continue;
      const state = flight.states[0] ?? null;
      const delay = calculateDelayMinutes(state, flight);
      const hour = new Date(flight.scheduledDep).getHours();

      const entry = hourMap.get(hour) ?? { totalDelay: 0, count: 0 };
      entry.totalDelay += delay;
      entry.count += 1;
      hourMap.set(hour, entry);
    }

    return Array.from({ length: 24 }, (_, hour) => {
      const entry = hourMap.get(hour);
      return {
        hour,
        averageDelay:
          entry && entry.count > 0
            ? Math.round((entry.totalDelay / entry.count) * 10) / 10
            : 0,
        flightCount: entry?.count ?? 0,
      };
    });
  }
}
