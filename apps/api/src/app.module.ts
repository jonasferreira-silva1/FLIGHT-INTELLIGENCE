import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// O AppModule é o módulo raiz da nossa API.
// Aqui nós registramos todos os outros módulos, controladores e provedores que compõem o sistema.
@Module({
  imports: [], // Outros módulos serão importados aqui (ex: PrismaModule, FlightsModule)
  controllers: [AppController], // Controladores responsáveis por expor as rotas HTTP (ex: GET /health)
  providers: [AppService], // Serviços contendo a regra de negócios injetável
})
export class AppModule {}
