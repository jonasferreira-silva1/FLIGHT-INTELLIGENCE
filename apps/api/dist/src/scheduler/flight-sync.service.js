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
let FlightSyncService = FlightSyncService_1 = class FlightSyncService {
    constructor(openskyService, prisma) {
        this.openskyService = openskyService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(FlightSyncService_1.name);
    }
    async handleCron() {
        this.logger.debug('Sincronizando voos da OpenSky...');
        const states = await this.openskyService.getFlightsInRecife();
        if (!states || states.length === 0) {
            this.logger.debug('Nenhum voo retornado nesta janela de tempo.');
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
            const flight = await this.prisma.flight.upsert({
                where: { callsign: callsign },
                update: { updatedAt: new Date() },
                create: {
                    callsign: callsign,
                },
            });
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
        prisma_service_1.PrismaService])
], FlightSyncService);
//# sourceMappingURL=flight-sync.service.js.map