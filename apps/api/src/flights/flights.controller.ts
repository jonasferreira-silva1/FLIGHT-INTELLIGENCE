import { Controller, Get, Param, Logger } from '@nestjs/common';
import { FlightsService } from './flights.service';

/**
 * Controller que expõe os endpoints HTTP de consulta de voos e trajetórias.
 */
@Controller('flights')
export class FlightsController {
  private readonly logger = new Logger(FlightsController.name);

  constructor(private readonly flightsService: FlightsService) {}

  /**
   * Retorna todos os voos cadastrados no banco.
   * GET /flights
   */
  @Get()
  async getFlights() {
    this.logger.debug('Requisitando todos os voos...');
    return this.flightsService.getFlights();
  }

  /**
   * Retorna a lista de voos ativos com atualizações recentes (últimos 10 minutos).
   * GET /flights/live
   */
  @Get('live')
  async getLiveFlights() {
    this.logger.debug('Requisitando lista de voos ativos...');
    return this.flightsService.getLiveFlights();
  }

  /**
   * Retorna apenas as coordenadas geográficas de telemetria dos voos no ar para o radar/mapa.
   * GET /flights/positions
   */
  @Get('positions')
  async getLivePositions() {
    this.logger.debug(
      'Requisitando posições geográficas de voos em tempo real...',
    );
    return this.flightsService.getLivePositions();
  }

  /**
   * Retorna os detalhes planejados e metadados de um voo específico.
   * GET /flights/:id
   */
  @Get(':id')
  async getFlightById(@Param('id') id: string) {
    this.logger.debug(`Requisitando detalhes do voo ID: ${id}`);
    return this.flightsService.getFlightById(id);
  }

  /**
   * Retorna o histórico geográfico das posições já reportadas de um determinado voo.
   * GET /flights/:id/states
   */
  @Get(':id/states')
  async getFlightStates(@Param('id') id: string) {
    this.logger.debug(`Requisitando histórico de trajetórias do voo ID: ${id}`);
    return this.flightsService.getFlightStates(id);
  }
}
