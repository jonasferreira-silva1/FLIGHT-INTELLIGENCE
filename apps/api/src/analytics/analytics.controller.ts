import { Controller, Get, Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/**
 * Controller que expõe os endpoints de analytics do aeroporto.
 */
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Estatísticas diárias resumidas (total de voos, chegadas, partidas, pontualidade, atraso médio, passageiros).
   * GET /analytics/summary
   */
  @Get('summary')
  async getSummary() {
    this.logger.debug('Requisitando resumo de analytics...');
    return this.analyticsService.getSummary();
  }

  /**
   * Ranking de companhias aéreas por número de voos e pontualidade.
   * GET /analytics/airlines
   */
  @Get('airlines')
  async getAirlineStats() {
    this.logger.debug('Requisitando estatísticas por companhia aérea...');
    return this.analyticsService.getAirlineStats();
  }

  /**
   * Heatmap de atraso médio por hora do dia.
   * GET /analytics/delay-heatmap
   */
  @Get('delay-heatmap')
  async getDelayHeatmap() {
    this.logger.debug('Requisitando heatmap de atrasos...');
    return this.analyticsService.getDelayHeatmap();
  }
}
