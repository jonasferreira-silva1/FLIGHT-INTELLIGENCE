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
var AlertsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AlertsController = AlertsController_1 = class AlertsController {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AlertsController_1.name);
    }
    async getRecentAlerts() {
        this.logger.debug('Buscando alertas recentes...');
        return this.prisma.alert.findMany({
            orderBy: {
                timestamp: 'desc',
            },
            take: 50,
            include: {
                flight: {
                    select: {
                        callsign: true,
                        origin: true,
                        destination: true,
                        airline: true,
                    },
                },
            },
        });
    }
    async markAsRead(id) {
        this.logger.debug(`Marcando alerta ${id} como lido.`);
        return this.prisma.alert.update({
            where: { id },
            data: { read: true },
        });
    }
    async clearAllAlerts() {
        this.logger.log('Limpando todo o histórico de alertas do banco de dados.');
        const result = await this.prisma.alert.deleteMany();
        return {
            status: 'ok',
            message: `${result.count} alertas foram removidos com sucesso.`,
        };
    }
};
exports.AlertsController = AlertsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "getRecentAlerts", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Delete)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "clearAllAlerts", null);
exports.AlertsController = AlertsController = AlertsController_1 = __decorate([
    (0, common_1.Controller)('alerts'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertsController);
//# sourceMappingURL=alerts.controller.js.map