import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { FlightsModule } from '../flights/flights.module';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Módulo NestJS que agrupa toda a lógica do Sistema de Alertas em tempo real.
 */
@Module({
  imports: [
    PrismaModule,     // Banco de dados (Prisma client)
    FlightsModule,    // Acesso ao gateway WebSocket e service de voos
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService], // Exporta o AlertsService para ser consumido pelo módulo scheduler
})
export class AlertsModule {}
