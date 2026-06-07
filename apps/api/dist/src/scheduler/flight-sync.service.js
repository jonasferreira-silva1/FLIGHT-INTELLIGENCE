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
var FlightSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightSyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const opensky_service_1 = require("./opensky.service");
const prisma_service_1 = require("../prisma/prisma.service");
const alerts_service_1 = require("../alerts/alerts.service");
const flights_gateway_1 = require("../flights/flights.gateway");
const flights_service_1 = require("../flights/flights.service");
let FlightSyncService = FlightSyncService_1 = class FlightSyncService {
    constructor(openskyService, prisma, alertsService, gateway, flightsService) {
        this.openskyService = openskyService;
        this.prisma = prisma;
        this.alertsService = alertsService;
        this.gateway = gateway;
        this.flightsService = flightsService;
        this.logger = new common_1.Logger(FlightSyncService_1.name);
    }
    async handleCron() {
        this.logger.debug('Iniciando sincronização de voos da OpenSky...');
        const states = await this.openskyService.getFlightsInRecife();
        if (!states || states.length === 0) {
            this.logger.debug('Nenhum voo retornado pela OpenSky na janela de tempo.');
            return;
        }
        let updatedCount = 0;
        for (const state of states) {
            const icao24 = state[0];
            const callsign = state[1]?.trim() || icao24;
            const longitude = state[5];
            const latitude = state[6];
            const altitude = state[7] || state[13];
            const onGround = state[8];
            const velocity = state[9];
            const heading = state[10];
            if (latitude === null || longitude === null)
                continue;
            const existingFlight = await this.prisma.flight.findUnique({
                where: { callsign: callsign },
            });
            let flight;
            if (!existingFlight) {
                const isArrival = Math.random() > 0.5;
                const otherAirports = Object.keys(alerts_service_1.AIRPORT_COORDINATES).filter(code => code !== 'REC');
                const randomAirport = otherAirports[Math.floor(Math.random() * otherAirports.length)];
                const origin = isArrival ? randomAirport : 'REC';
                const destination = isArrival ? 'REC' : randomAirport;
                const airlineInfo = (0, flights_service_1.getAirlineInfo)(callsign);
                const now = new Date();
                let scheduledDep;
                let scheduledArr;
                if (isArrival) {
                    scheduledDep = new Date(now.getTime() - 60 * 60 * 1000);
                    scheduledArr = new Date(now.getTime() + 60 * 60 * 1000);
                }
                else {
                    scheduledDep = new Date(now.getTime() - 15 * 60 * 1000);
                    scheduledArr = new Date(now.getTime() + 90 * 60 * 1000);
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
                this.logger.debug(`Novo voo cadastrado e enriquecido: ${callsign} (${origin} -> ${destination})`);
            }
            else {
                flight = await this.prisma.flight.update({
                    where: { id: existingFlight.id },
                    data: { updatedAt: new Date() },
                });
            }
            const previousState = await this.prisma.flightState.findFirst({
                where: { flightId: flight.id },
                orderBy: { timestamp: 'desc' },
            });
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
            await this.alertsService.processFlightState(flight.id, currentState, previousState, flight);
            const positionData = this.flightsService.mapFlightStateToPosition(currentState, flight);
            this.gateway.emitFlightUpdate(positionData);
            updatedCount++;
        }
        this.logger.log(`Sincronização concluída. ${updatedCount} posições processadas e transmitidas via WS.`);
    }
};
exports.FlightSyncService = FlightSyncService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FlightSyncService.prototype, "handleCron", null);
exports.FlightSyncService = FlightSyncService = FlightSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [opensky_service_1.OpenskyService,
        prisma_service_1.PrismaService,
        alerts_service_1.AlertsService,
        flights_gateway_1.FlightsGateway,
        flights_service_1.FlightsService])
], FlightSyncService);
//# sourceMappingURL=flight-sync.service.js.map