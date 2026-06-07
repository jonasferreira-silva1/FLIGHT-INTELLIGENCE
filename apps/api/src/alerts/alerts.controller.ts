import { Controller, Get, Patch, Delete, Param, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Controller responsável por expor os endpoints de gerenciamento de alertas.
 */
@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a lista de alertas recentes ordenados de forma decrescente por data/hora.
   * Limita a busca em 50 alertas para manter boa performance.
   * GET /alerts
   */
  @Get()
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

  /**
   * Marca um alerta específico como lido pelo usuário.
  /**
   * Marca TODOS os alertas como lidos.
   * PATCH /alerts/read-all
   */
  @Patch('read-all')
  async markAllAsRead() {
    this.logger.log('Marcando todos os alertas como lidos.');
    const result = await this.prisma.alert.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return {
      status: 'ok',
      message: `${result.count} alertas foram marcados como lidos.`,
    };
  }

  /**
   * Marca um alerta específico como lido pelo usuário.
   * PATCH /alerts/:id/read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    this.logger.debug(`Marcando alerta ${id} como lido.`);
    return this.prisma.alert.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Limpa todos os alertas salvos no banco de dados.
   * Útil para fins de teste ou reset de painel pelo usuário.
   * DELETE /alerts
   */
  @Delete()
  async clearAllAlerts() {
    this.logger.log('Limpando todo o histórico de alertas do banco de dados.');
    const result = await this.prisma.alert.deleteMany();
    return {
      status: 'ok',
      message: `${result.count} alertas foram removidos com sucesso.`,
    };
  }
}
