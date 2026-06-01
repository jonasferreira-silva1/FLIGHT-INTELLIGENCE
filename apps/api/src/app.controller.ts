import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// O AppController é responsável por lidar com requisições HTTP que chegam na raiz da API.
@Controller()
export class AppController {
  // Injeção de dependência do AppService, onde a regra de negócio deve ficar.
  constructor(private readonly appService: AppService) {}

  // Este decorator mapeia requisições do tipo GET para o endpoint '/health'
  // Útil para monitoramento de disponibilidade da aplicação no Docker/Cloud.
  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
