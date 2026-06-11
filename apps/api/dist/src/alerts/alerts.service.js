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
var AlertsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsService = exports.AIRPORT_COORDINATES = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const flights_gateway_1 = require("../flights/flights.gateway");
exports.AIRPORT_COORDINATES = {
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
let AlertsService = AlertsService_1 = class AlertsService {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.logger = new common_1.Logger(AlertsService_1.name);
    }
    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
                Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    estimateTimeToTarget(distanceKm, velocityMs) {
        const speed = !velocityMs || velocityMs < 5 ? 200 : velocityMs;
        const distanceMeters = distanceKm * 1000;
        return distanceMeters / speed;
    }
    async processFlightState(flightId, currentState, previousState, flightEntity) {
        const flight = flightEntity ||
            (await this.prisma.flight.findUnique({
                where: { id: flightId },
            }));
        if (!flight) {
            this.logger.warn(`Voo com ID ${flightId} não foi encontrado no banco.`);
            return;
        }
        const { callsign, origin, destination, scheduledArr, scheduledDep } = flight;
        const formatHHMM = (date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        };
        const hasDeparted = origin === 'REC' &&
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
            this.gateway.emitDeparted({
                id: alert.id,
                flightId,
                callsign,
                type: 'departed',
                message,
                timestamp: alert.timestamp.toISOString(),
                read: false,
            });
            return;
        }
        const hasLanded = destination === 'REC' &&
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
        if (!currentState.onGround && destination === 'REC' && scheduledArr) {
            const recCoords = exports.AIRPORT_COORDINATES.REC;
            const distance = this.calculateHaversineDistance(currentState.latitude, currentState.longitude, recCoords.lat, recCoords.lon);
            const timeToTargetSeconds = this.estimateTimeToTarget(distance, currentState.velocity);
            const eta = new Date(currentState.timestamp.getTime() + timeToTargetSeconds * 1000);
            const delayMs = eta.getTime() - scheduledArr.getTime();
            const delayMinutes = Math.floor(delayMs / 60000);
            if (delayMinutes > 15) {
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
                    generateNewAlert = true;
                }
                else {
                    const timeSinceLastAlertMs = currentState.timestamp.getTime() -
                        latestDelayAlert.timestamp.getTime();
                    const parsedMessage = latestDelayAlert.message.match(/atraso previsto de (\d+) minutos/);
                    const previousDelayMinutes = parsedMessage
                        ? parseInt(parsedMessage[1], 10)
                        : 0;
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
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = AlertsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        flights_gateway_1.FlightsGateway])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map