import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Função responsável por inicializar a nossa aplicação NestJS (API Backend)
async function bootstrap() {
  // Cria uma instância da aplicação baseada no módulo principal (AppModule)
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para permitir conexões do frontend
  app.enableCors();

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('REC Flight Intelligence API')
    .setDescription('Plataforma Full-Stack de Monitoramento Aeroportuário em Tempo Real — Recife (REC/SBRF)')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // A API vai escutar na porta 3001, conforme definimos no docker-compose e variáveis de ambiente
  // Isso evita conflito com o frontend (Next.js) que roda na porta 3000
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
