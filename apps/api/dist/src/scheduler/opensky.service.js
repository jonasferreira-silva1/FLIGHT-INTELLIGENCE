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
let OpenskyService = OpenskyService_1 = class OpenskyService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(OpenskyService_1.name);
        this.baseUrl = 'https://opensky-network.org/api/states/all';
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
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, config));
            return response.data.states || [];
        }
        catch (error) {
            this.logger.error('Erro ao buscar dados do OpenSky', error.message);
            return [];
        }
    }
};
exports.OpenskyService = OpenskyService;
exports.OpenskyService = OpenskyService = OpenskyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], OpenskyService);
//# sourceMappingURL=opensky.service.js.map