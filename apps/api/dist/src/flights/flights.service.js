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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightsService = void 0;
exports.getAirlineInfo = getAirlineInfo;
exports.getAirportCity = getAirportCity;
exports.calculateDelayMinutes = calculateDelayMinutes;
exports.getFlightStatus = getFlightStatus;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../prisma/prisma.service");
function getAirlineInfo(callsign) {
    const prefix3 = callsign.substring(0, 3).toUpperCase();
    const prefix2 = callsign.substring(0, 2).toUpperCase();
    if (prefix3 === 'GLO' || prefix2 === 'G3') {
        return { code: 'G3', name: 'Gol Linhas Aéreas' };
    }
    else if (prefix3 === 'AZU' || prefix2 === 'AD') {
        return { code: 'AD', name: 'Azul Linhas Aéreas' };
    }
    else if (prefix3 === 'TAM' ||
        prefix3 === 'LAN' ||
        prefix2 === 'LA' ||
        prefix2 === 'JJ') {
        return { code: 'LA', name: 'LATAM Airlines' };
    }
    else if (prefix3 === 'PTB' || prefix2 === '2Z') {
        return { code: '2Z', name: 'Voepass' };
    }
    else if (prefix3 === 'ONE' || prefix2 === 'O6') {
        return { code: 'O6', name: 'Avianca Brasil' };
    }
    const airlines = [
        { code: 'G3', name: 'Gol Linhas Aéreas' },
        { code: 'AD', name: 'Azul Linhas Aéreas' },
        { code: 'LA', name: 'LATAM Airlines' },
        { code: '2Z', name: 'Voepass' },
    ];
    let hash = 0;
    for (let i = 0; i < callsign.length; i++) {
        hash = callsign.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % airlines.length;
    return airlines[index];
}
function getAirportCity(code) {
    const cities = {
        REC: 'Recife',
        GRU: 'São Paulo (Guarulhos)',
        CGH: 'São Paulo (Congonhas)',
        GIG: 'Rio de Janeiro (Galeão)',
        SDU: 'Rio de Janeiro (Santos Dumont)',
        BSB: 'Brasília',
        CNF: 'Belo Horizonte (Confins)',
        SSA: 'Salvador',
        FOR: 'Fortaleza',
        POA: 'Porto Alegre',
        CWB: 'Curitiba',
        MAO: 'Manaus',
        NAT: 'Natal',
        MCZ: 'Maceió',
        JPA: 'João Pessoa',
    };
    return cities[code.toUpperCase()] || 'Outra Cidade';
}
function calculateDelayMinutes(state, flight) {
    if (!state ||
        state.onGround ||
        flight.destination !== 'REC' ||
        !flight.scheduledArr) {
        return 0;
    }
    const recCoords = { lat: -8.1264, lon: -34.9232 };
    const R = 6371;
    const lat1 = state.latitude;
    const lon1 = state.longitude;
    const lat2 = recCoords.lat;
    const lon2 = recCoords.lon;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    const speed = !state.velocity || state.velocity < 5 ? 200 : state.velocity;
    const timeToTargetSeconds = (distance * 1000) / speed;
    const eta = new Date(state.timestamp.getTime() + timeToTargetSeconds * 1000);
    const delayMs = eta.getTime() - flight.scheduledArr.getTime();
    return Math.max(0, Math.floor(delayMs / 60000));
}
function getFlightStatus(state, flight) {
    if (!state)
        return 'scheduled';
    if (state.onGround) {
        if (flight.destination === 'REC')
            return 'landed';
        return 'departed';
    }
    const delay = calculateDelayMinutes(state, flight);
    if (delay > 15)
        return 'delayed';
    return 'airborne';
}
let FlightsService = class FlightsService {
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
    }
    async getFlights() {
        const flights = await this.prisma.flight.findMany({
            include: {
                states: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        return flights.map((f) => this.mapFlightToFrontend(f));
    }
    async getLiveFlights() {
        const cacheKey = 'live_flights';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const flights = await this.prisma.flight.findMany({
            where: {
                states: {
                    some: {
                        timestamp: {
                            gte: tenMinutesAgo,
                        },
                    },
                },
            },
            include: {
                states: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 1,
                },
            },
        });
        const result = flights.map((f) => this.mapFlightToFrontend(f));
        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
    }
    async getLivePositions() {
        const cacheKey = 'live_positions';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const flights = await this.prisma.flight.findMany({
            where: {
                states: {
                    some: {
                        timestamp: {
                            gte: tenMinutesAgo,
                        },
                        onGround: false,
                    },
                },
            },
            include: {
                states: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 1,
                },
            },
        });
        const result = flights
            .filter((f) => f.states && f.states.length > 0)
            .map((f) => this.mapFlightStateToPosition(f.states[0], f));
        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
    }
    async getFlightById(id) {
        const flight = await this.prisma.flight.findUnique({
            where: { id },
            include: {
                states: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 1,
                },
            },
        });
        if (!flight) {
            throw new common_1.NotFoundException(`Voo com ID ${id} não encontrado.`);
        }
        return this.mapFlightToFrontend(flight);
    }
    async getFlightStates(id) {
        const flight = await this.prisma.flight.findUnique({
            where: { id },
        });
        if (!flight) {
            throw new common_1.NotFoundException(`Voo com ID ${id} não encontrado.`);
        }
        const states = await this.prisma.flightState.findMany({
            where: { flightId: id },
            orderBy: {
                timestamp: 'asc',
            },
            take: 200,
        });
        return states.map((s) => this.mapFlightStateToPosition(s, flight));
    }
    mapFlightToFrontend(flight) {
        const latestState = flight.states && flight.states.length > 0 ? flight.states[0] : null;
        const airlineInfo = getAirlineInfo(flight.callsign);
        return {
            id: flight.id,
            callsign: flight.callsign,
            icao24: flight.callsign,
            airline: flight.airline || airlineInfo.name,
            airlineCode: airlineInfo.code,
            origin: flight.origin || 'Desconhecido',
            originCity: getAirportCity(flight.origin || ''),
            destination: flight.destination || 'Desconhecido',
            destinationCity: getAirportCity(flight.destination || ''),
            status: getFlightStatus(latestState, flight),
            scheduledDeparture: flight.scheduledDep
                ? flight.scheduledDep.toISOString()
                : null,
            scheduledArrival: flight.scheduledArr
                ? flight.scheduledArr.toISOString()
                : null,
            actualDeparture: latestState && latestState.onGround === false
                ? flight.scheduledDep?.toISOString()
                : null,
            actualArrival: latestState &&
                latestState.onGround === true &&
                flight.destination === 'REC'
                ? latestState.timestamp.toISOString()
                : null,
            gate: flight.gate || 'A' + (Math.floor(Math.random() * 15) + 1),
            terminal: flight.terminal || '1',
            aircraft: flight.aircraft || 'Boeing 737-800',
            delayMinutes: calculateDelayMinutes(latestState, flight),
        };
    }
    mapFlightStateToPosition(state, flight) {
        const airlineInfo = getAirlineInfo(flight.callsign);
        return {
            flightId: flight.id,
            callsign: flight.callsign,
            airline: flight.airline || airlineInfo.name,
            latitude: state.latitude,
            longitude: state.longitude,
            altitude: state.altitude,
            velocity: state.velocity,
            heading: state.heading,
            onGround: state.onGround,
            status: getFlightStatus(state, flight),
            origin: flight.origin || 'Desconhecido',
            destination: flight.destination || 'Desconhecido',
            capturedAt: state.timestamp.toISOString(),
        };
    }
};
exports.FlightsService = FlightsService;
exports.FlightsService = FlightsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], FlightsService);
//# sourceMappingURL=flights.service.js.map