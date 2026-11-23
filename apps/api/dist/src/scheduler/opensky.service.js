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
var OpenskyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenskyService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const AIRPORTS = {
    REC: { lat: -8.1264, lon: -34.9232 },
    GRU: { lat: -23.4356, lon: -46.4731 },
    CGH: { lat: -23.6261, lon: -46.6564 },
    GIG: { lat: -22.81, lon: -43.2506 },
    BSB: { lat: -15.8697, lon: -47.9172 },
    SSA: { lat: -12.9086, lon: -38.3225 },
    FOR: { lat: -3.7763, lon: -38.5326 },
    NAT: { lat: -5.9114, lon: -35.2478 },
    MCZ: { lat: -9.5108, lon: -35.7917 },
    JPA: { lat: -7.1483, lon: -34.9503 },
    CNF: { lat: -19.6244, lon: -43.9719 },
    POA: { lat: -29.9939, lon: -51.1711 },
};
const SIMULATED_FLIGHTS = [
    {
        icao24: 'e4955a',
        callsign: 'GLO1234',
        origin: 'GRU',
        dest: 'REC',
        delayMinutes: 35,
    },
    {
        icao24: 'e49b1c',
        callsign: 'AZU4501',
        origin: 'BSB',
        dest: 'REC',
        delayMinutes: 0,
    },
    {
        icao24: 'e4a210',
        callsign: 'TAM3087',
        origin: 'REC',
        dest: 'GIG',
        delayMinutes: 0,
    },
    {
        icao24: 'e4c301',
        callsign: 'GLO1847',
        origin: 'SSA',
        dest: 'REC',
        delayMinutes: 52,
    },
    {
        icao24: 'e4d102',
        callsign: 'AZU5923',
        origin: 'REC',
        dest: 'FOR',
        delayMinutes: 20,
    },
    {
        icao24: 'e4e205',
        callsign: 'TAM3401',
        origin: 'FOR',
        dest: 'REC',
        delayMinutes: 0,
    },
    {
        icao24: 'e4f308',
        callsign: 'GLO2210',
        origin: 'REC',
        dest: 'CGH',
        delayMinutes: 0,
    },
    {
        icao24: 'e50112',
        callsign: 'AZU6017',
        origin: 'CNF',
        dest: 'REC',
        delayMinutes: 18,
    },
];
let OpenskyService = OpenskyService_1 = class OpenskyService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(OpenskyService_1.name);
        this.baseUrl = 'https://opensky-network.org/api/states/all';
        this.simulatedProgress = {};
        for (const f of SIMULATED_FLIGHTS) {
            this.simulatedProgress[f.icao24] = Math.random() * 0.8 + 0.05;
        }
    }
    async getFlightsInRecife() {
        const lamin = -10.0;
        const lamax = -6.0;
        const lomin = -37.0;
        const lomax = -33.0;
        const url = `${this.baseUrl}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
        const config = {};
        if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
            config.auth = {
                username: process.env.OPENSKY_USERNAME,
                password: process.env.OPENSKY_PASSWORD,
            };
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, { ...config, timeout: 8000 }));
            const states = response.data?.states ?? [];
            if (states.length > 0) {
                this.logger.debug(`OpenSky retornou ${states.length} voos reais.`);
                return states;
            }
            this.logger.warn('OpenSky retornou 0 voos — usando simulação de fallback.');
            return this.generateSimulatedStates();
        }
        catch (error) {
            this.logger.error(`Erro ao buscar dados do OpenSky (${error.message}) — usando simulação de fallback.`);
            return this.generateSimulatedStates();
        }
    }
    generateSimulatedStates() {
        const states = [];
        for (const flight of SIMULATED_FLIGHTS) {
            const origin = AIRPORTS[flight.origin];
            const dest = AIRPORTS[flight.dest];
            if (!origin || !dest)
                continue;
            this.simulatedProgress[flight.icao24] =
                (this.simulatedProgress[flight.icao24] +
                    0.015 +
                    Math.random() * 0.015) %
                    1.0;
            const t = this.simulatedProgress[flight.icao24];
            const lat = origin.lat + (dest.lat - origin.lat) * t;
            const lon = origin.lon + (dest.lon - origin.lon) * t;
            const dLon = dest.lon - origin.lon;
            const dLat = dest.lat - origin.lat;
            const headingRad = Math.atan2(dLon, dLat);
            const heading = ((headingRad * 180) / Math.PI + 360) % 360;
            const altitudeCurve = Math.sin(t * Math.PI);
            const altitude = 2000 + altitudeCurve * 9000 + (Math.random() - 0.5) * 200;
            const velocity = 180 + altitudeCurve * 80 + (Math.random() - 0.5) * 10;
            states.push([
                flight.icao24,
                flight.callsign + ' ',
                'Brazil',
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000),
                lon,
                lat,
                altitude,
                false,
                velocity,
                heading,
                0,
                null,
                altitude,
                flight.delayMinutes,
                flight.origin,
                flight.dest,
            ]);
        }
        this.logger.debug(`Simulação gerou ${states.length} voos.`);
        return states;
    }
};
exports.OpenskyService = OpenskyService;
exports.OpenskyService = OpenskyService = OpenskyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], OpenskyService);
//# sourceMappingURL=opensky.service.js.map