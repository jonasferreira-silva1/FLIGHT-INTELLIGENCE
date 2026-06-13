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
var FlightsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const flights_service_1 = require("./flights.service");
let FlightsController = FlightsController_1 = class FlightsController {
    constructor(flightsService) {
        this.flightsService = flightsService;
        this.logger = new common_1.Logger(FlightsController_1.name);
    }
    async getFlights() {
        this.logger.debug('Requisitando todos os voos...');
        return this.flightsService.getFlights();
    }
    async getLiveFlights() {
        this.logger.debug('Requisitando lista de voos ativos...');
        return this.flightsService.getLiveFlights();
    }
    async getLivePositions() {
        this.logger.debug('Requisitando posições geográficas de voos em tempo real...');
        return this.flightsService.getLivePositions();
    }
    async getFlightById(id) {
        this.logger.debug(`Requisitando detalhes do voo ID: ${id}`);
        return this.flightsService.getFlightById(id);
    }
    async getFlightStates(id) {
        this.logger.debug(`Requisitando histórico de trajetórias do voo ID: ${id}`);
        return this.flightsService.getFlightStates(id);
    }
};
exports.FlightsController = FlightsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos os voos', description: 'Retorna a lista completa de voos cadastrados no banco com seus estados mais recentes.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de voos retornada com sucesso.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FlightsController.prototype, "getFlights", null);
__decorate([
    (0, common_1.Get)('live'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar voos ativos', description: 'Retorna apenas os voos que receberam telemetria nos últimos 10 minutos.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de voos ativos retornada com sucesso.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FlightsController.prototype, "getLiveFlights", null);
__decorate([
    (0, common_1.Get)('positions'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter posições geográficas em tempo real', description: 'Retorna a telemetria geográfica de todas as aeronaves que estão em voo no momento.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Posições geográficas retornadas com sucesso.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FlightsController.prototype, "getLivePositions", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter detalhes de um voo', description: 'Retorna os detalhes planejados e os metadados de um voo a partir do seu ID.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID do voo (UUID)', type: 'string' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Detalhes do voo retornados com sucesso.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Voo não encontrado.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FlightsController.prototype, "getFlightById", null);
__decorate([
    (0, common_1.Get)(':id/states'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter histórico de trajetórias de um voo', description: 'Retorna a lista das últimas posições geográficas já reportadas para a aeronave.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID do voo (UUID)', type: 'string' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Histórico de trajetórias retornado com sucesso.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Voo não encontrado.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FlightsController.prototype, "getFlightStates", null);
exports.FlightsController = FlightsController = FlightsController_1 = __decorate([
    (0, swagger_1.ApiTags)('flights'),
    (0, common_1.Controller)('flights'),
    __metadata("design:paramtypes", [flights_service_1.FlightsService])
], FlightsController);
//# sourceMappingURL=flights.controller.js.map