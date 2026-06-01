import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Função responsável por inicializar a nossa aplicação NestJS (API Backend)
async function bootstrap() {
  // Cria uma instância da aplicação baseada no módulo principal (AppModule)
  const app = await NestFactory.create(AppModule);
  
  // A API vai escutar na porta 3001, conforme definimos no docker-compose e variáveis de ambiente
  // Isso evita conflito com o frontend (Next.js) que roda na porta 3000
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
