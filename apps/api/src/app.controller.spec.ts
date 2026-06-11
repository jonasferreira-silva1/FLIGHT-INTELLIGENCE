import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Bloco de testes unitários para o AppController
describe('AppController', () => {
  let appController: AppController;

  // Configuração executada antes de cada teste
  beforeEach(async () => {
    // Cria um módulo de teste falso (mock) contendo o controller e seus serviços dependentes
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    // Obtém a instância do AppController para testar seus métodos
    appController = app.get<AppController>(AppController);
  });

  // Teste específico para o método getHealth
  describe('getHealth', () => {
    it('deve retornar um objeto com status "ok"', () => {
      // Executa o método do controlador e verifica se o resultado tem a propriedade correta
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
