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
var FlightsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let FlightsGateway = FlightsGateway_1 = class FlightsGateway {
    constructor() {
        this.logger = new common_1.Logger(FlightsGateway_1.name);
    }
    handleConnection(client) {
        this.logger.log(`Novo cliente conectado via WebSocket: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Cliente desconectado do WebSocket: ${client.id}`);
    }
    handleJoinRoom(data, client) {
        if (data && data.room) {
            client.join(data.room);
            this.logger.debug(`Cliente ${client.id} se inscreveu na sala: ${data.room}`);
            return {
                status: 'ok',
                message: `Inscrito com sucesso na sala: ${data.room}`,
            };
        }
        return { status: 'error', message: 'Nome da sala inválido' };
    }
    handleLeaveRoom(data, client) {
        if (data && data.room) {
            client.leave(data.room);
            this.logger.debug(`Cliente ${client.id} saiu da sala: ${data.room}`);
            return {
                status: 'ok',
                message: `Saiu com sucesso da sala: ${data.room}`,
            };
        }
        return { status: 'error', message: 'Nome da sala inválido' };
    }
    emitFlightUpdate(flightData) {
        if (!this.server) {
            this.logger.warn('Servidor Socket.io não inicializado. Ignorando emit.');
            return;
        }
        this.server.to('rec:live').emit('flight:update', flightData);
        if (flightData.callsign) {
            this.server
                .to(`flight:${flightData.callsign}`)
                .emit('flight:update', flightData);
        }
    }
    emitAlert(alertData) {
        if (!this.server)
            return;
        this.server.to('rec:live').emit('flight:alert', alertData);
        if (alertData.callsign) {
            this.server
                .to(`flight:${alertData.callsign}`)
                .emit('flight:alert', alertData);
        }
    }
    emitLanded(landedData) {
        if (!this.server)
            return;
        this.server.to('rec:live').emit('flight:landed', landedData);
        if (landedData.callsign) {
            this.server
                .to(`flight:${landedData.callsign}`)
                .emit('flight:landed', landedData);
        }
    }
    emitDeparted(departedData) {
        if (!this.server)
            return;
        this.server.to('rec:live').emit('flight:departed', departedData);
        if (departedData.callsign) {
            this.server
                .to(`flight:${departedData.callsign}`)
                .emit('flight:departed', departedData);
        }
    }
};
exports.FlightsGateway = FlightsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], FlightsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:room'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], FlightsGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave:room'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], FlightsGateway.prototype, "handleLeaveRoom", null);
exports.FlightsGateway = FlightsGateway = FlightsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    })
], FlightsGateway);
//# sourceMappingURL=flights.gateway.js.map