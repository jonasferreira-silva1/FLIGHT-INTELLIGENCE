"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const flights_service_1 = require("../flights/flights.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const flights = await this.prisma.flight.findMany({
            where: { createdAt: { gte: today } },
            include: {
                states: { orderBy: { timestamp: 'desc' }, take: 1 },
            },
        });
        const arrivals = flights.filter((f) => f.destination === 'REC').length;
        const departures = flights.filter((f) => f.origin === 'REC').length;
        const delayList = flights.map((f) => {
            const state = f.states[0] ?? null;
            return (0, flights_service_1.calculateDelayMinutes)(state, f);
        });
        const delayed = delayList.filter((d) => d > 0);
        const onTime = flights.length - delayed.length;
        const onTimePercentage = flights.length > 0 ? (onTime / flights.length) * 100 : 0;
        const averageDelay = delayed.length > 0
            ? delayed.reduce((s, d) => s + d, 0) / delayed.length
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
    async getAirlineStats() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const flights = await this.prisma.flight.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            include: {
                states: { orderBy: { timestamp: 'desc' }, take: 1 },
            },
        });
        const airlineMap = new Map();
        for (const flight of flights) {
            const info = (0, flights_service_1.getAirlineInfo)(flight.callsign);
            const state = flight.states[0] ?? null;
            const delay = (0, flights_service_1.calculateDelayMinutes)(state, flight);
            const entry = airlineMap.get(info.code) ?? {
                code: info.code,
                name: info.name,
                total: 0,
                onTime: 0,
            };
            entry.total += 1;
            if (delay === 0)
                entry.onTime += 1;
            airlineMap.set(info.code, entry);
        }
        return Array.from(airlineMap.values())
            .map((a) => ({
            code: a.code,
            name: a.name,
            flights: a.total,
            onTimePercentage: a.total > 0 ? Math.round((a.onTime / a.total) * 1000) / 10 : 0,
        }))
            .sort((a, b) => b.flights - a.flights);
    }
    async getDelayHeatmap() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const flights = await this.prisma.flight.findMany({
            where: {
                scheduledDep: { not: null },
                createdAt: { gte: thirtyDaysAgo }
            },
            include: {
                states: { orderBy: { timestamp: 'desc' }, take: 1 },
            },
        });
        const hourMap = new Map();
        for (const flight of flights) {
            if (!flight.scheduledDep)
                continue;
            const state = flight.states[0] ?? null;
            const delay = (0, flights_service_1.calculateDelayMinutes)(state, flight);
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
                averageDelay: entry && entry.count > 0
                    ? Math.round((entry.totalDelay / entry.count) * 10) / 10
                    : 0,
                flightCount: entry?.count ?? 0,
            };
        });
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map