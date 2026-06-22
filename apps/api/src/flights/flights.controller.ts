import { Controller, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FlightsService } from './flights.service';

/**
 * Controller que expõe os endpoints HTTP de consulta de voos e trajetórias.
 */
@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  private readonly logger = new Logger(FlightsController.name);

  constructor(private readonly flightsService: FlightsService) {}

  /**
   * Retorna todos os voos cadastrados no banco.
   * GET /flights
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todos os voos',
    description:
      'Retorna a lista completa de voos cadastrados no banco com seus estados mais recentes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de voos retornada com sucesso.',
  })
  async getFlights() {
    this.logger.debug('Requisitando todos os voos...');
    return this.flightsService.getFlights();
  }

  /**
   * Retorna a lista de voos ativos com atualizações recentes (últimos 10 minutos).
   * GET /flights/live
   */
  @Get('live')
  @ApiOperation({
    summary: 'Listar voos ativos',
    description:
      'Retorna apenas os voos que receberam telemetria nos últimos 10 minutos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de voos ativos retornada com sucesso.',
  })
  async getLiveFlights() {
    this.logger.debug('Requisitando lista de voos ativos...');
    return this.flightsService.getLiveFlights();
  }

  /**
   * Retorna apenas as coordenadas geográficas de telemetria dos voos no ar para o radar/mapa.
   * GET /flights/positions
   */
  @Get('positions')
  @ApiOperation({
    summary: 'Obter posições geográficas em tempo real',
    description:
      'Retorna a telemetria geográfica de todas as aeronaves que estão em voo no momento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Posições geográficas retornadas com sucesso.',
  })
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
  @ApiOperation({
    summary: 'Obter detalhes de um voo',
    description:
      'Retorna os detalhes planejados e os metadados de um voo a partir do seu ID.',
  })
  @ApiParam({ name: 'id', description: 'ID do voo (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do voo retornados com sucesso.',
  })
  @ApiResponse({ status: 404, description: 'Voo não encontrado.' })
  async getFlightById(@Param('id') id: string) {
    this.logger.debug(`Requisitando detalhes do voo ID: ${id}`);
    return this.flightsService.getFlightById(id);
  }

  /**
   * Retorna o histórico geográfico das posições já reportadas de um determinado voo.
   * GET /flights/:id/states
   */
  @Get(':id/states')
  @ApiOperation({
    summary: 'Obter histórico de trajetórias de um voo',
    description:
      'Retorna a lista das últimas posições geográficas já reportadas para a aeronave.',
  })
  @ApiParam({ name: 'id', description: 'ID do voo (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Histórico de trajetórias retornado com sucesso.',
  })
  @ApiResponse({ status: 404, description: 'Voo não encontrado.' })
  async getFlightStates(@Param('id') id: string) {
    this.logger.debug(`Requisitando histórico de trajetórias do voo ID: ${id}`);
    return this.flightsService.getFlightStates(id);
  }

  /**
   * Retorna a predição de atraso da IA para um voo específico.
   * GET /flights/:id/prediction
   */
  @Get(':id/prediction')
  @ApiOperation({
    summary: 'Obter predição de atraso via IA',
    description:
      'Retorna a estimativa de atraso calculada pelo modelo de Machine Learning.',
  })
  @ApiParam({ name: 'id', description: 'ID do voo (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Predição de atraso retornada com sucesso.',
  })
  @ApiResponse({ status: 404, description: 'Voo não encontrado.' })
  async getFlightPrediction(@Param('id') id: string) {
    this.logger.debug(`Requisitando predição de IA do voo ID: ${id}`);
    return this.flightsService.getFlightPrediction(id);
  }
}
