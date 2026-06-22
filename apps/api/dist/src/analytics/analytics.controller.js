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
var AnalyticsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = AnalyticsController_1 = class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
        this.logger = new common_1.Logger(AnalyticsController_1.name);
    }
    async getSummary() {
        this.logger.debug('Requisitando resumo de analytics...');
        return this.analyticsService.getSummary();
    }
    async getAirlineStats() {
        this.logger.debug('Requisitando estatísticas por companhia aérea...');
        return this.analyticsService.getAirlineStats();
    }
    async getDelayHeatmap() {
        this.logger.debug('Requisitando heatmap de atrasos...');
        return this.analyticsService.getDelayHeatmap();
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obter resumo de analytics diário',
        description: 'Retorna estatísticas agregadas do tráfego aéreo de hoje no Recife (voos totais, taxa de pontualidade, atraso médio, etc).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resumo estatístico gerado com sucesso.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('airlines'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obter ranking de companhias aéreas',
        description: 'Retorna a lista de companhias aéreas ativas no aeroporto com o número total de voos e pontualidade percentual.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Ranking de companhias retornado com sucesso.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAirlineStats", null);
__decorate([
    (0, common_1.Get)('delay-heatmap'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obter heatmap de atrasos',
        description: 'Retorna dados em matriz representando o atraso médio de voos agrupados por hora do dia e dia da semana.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Matriz de heatmap retornada com sucesso.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDelayHeatmap", null);
exports.AnalyticsController = AnalyticsController = AnalyticsController_1 = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map