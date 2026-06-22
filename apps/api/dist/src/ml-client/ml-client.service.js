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
var MlClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MlClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let MlClientService = MlClientService_1 = class MlClientService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(MlClientService_1.name);
        this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    }
    async predictDelay(payload) {
        try {
            this.logger.debug(`Sending prediction request to ML service: ${JSON.stringify(payload)}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.mlServiceUrl}/predict`, payload, {
                timeout: 5000,
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get prediction from ML service: ${error.message}`);
            return null;
        }
    }
};
exports.MlClientService = MlClientService;
exports.MlClientService = MlClientService = MlClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], MlClientService);
//# sourceMappingURL=ml-client.service.js.map