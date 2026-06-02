import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FlightsModule } from './flights/flights.module';
import { SchedulerModule } from './scheduler/scheduler.module';

// O AppModule é o módulo raiz da nossa API.
// Aqui nós registramos todos os outros módulos, controladores e provedores que compõem o sistema.
@Module({
  imports: [
    ScheduleModule.forRoot(), // Habilita o uso de CRON Jobs (@Cron) na aplicação
    PrismaModule, // Módulo global de banco de dados
    FlightsModule, // Módulo da API REST de voos
    SchedulerModule, // Módulo que orquestra a coleta de dados externa
  ], 
  controllers: [AppController], // Controladores responsáveis por expor as rotas HTTP (ex: GET /health)
  providers: [AppService], // Serviços contendo a regra de negócios injetável
})
export class AppModule {}

