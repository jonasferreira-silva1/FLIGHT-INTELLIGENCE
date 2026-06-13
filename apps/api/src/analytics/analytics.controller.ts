import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

/**
 * Controller que expõe os endpoints de analytics do aeroporto.
 */
@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Estatísticas diárias resumidas (total de voos, chegadas, partidas, pontualidade, atraso médio, passageiros).
   * GET /analytics/summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Obter resumo de analytics diário', description: 'Retorna estatísticas agregadas do tráfego aéreo de hoje no Recife (voos totais, taxa de pontualidade, atraso médio, etc).' })
  @ApiResponse({ status: 200, description: 'Resumo estatístico gerado com sucesso.' })
  async getSummary() {
    this.logger.debug('Requisitando resumo de analytics...');
    return this.analyticsService.getSummary();
  }

  /**
   * Ranking de companhias aéreas por número de voos e pontualidade.
   * GET /analytics/airlines
   */
  @Get('airlines')
  @ApiOperation({ summary: 'Obter ranking de companhias aéreas', description: 'Retorna a lista de companhias aéreas ativas no aeroporto com o número total de voos e pontualidade percentual.' })
  @ApiResponse({ status: 200, description: 'Ranking de companhias retornado com sucesso.' })
  async getAirlineStats() {
    this.logger.debug('Requisitando estatísticas por companhia aérea...');
    return this.analyticsService.getAirlineStats();
  }

  /**
   * Heatmap de atraso médio por hora do dia.
   * GET /analytics/delay-heatmap
   */
  @Get('delay-heatmap')
  @ApiOperation({ summary: 'Obter heatmap de atrasos', description: 'Retorna dados em matriz representando o atraso médio de voos agrupados por hora do dia e dia da semana.' })
  @ApiResponse({ status: 200, description: 'Matriz de heatmap retornada com sucesso.' })
  async getDelayHeatmap() {
    this.logger.debug('Requisitando heatmap de atrasos...');
    return this.analyticsService.getDelayHeatmap();
  }
}
