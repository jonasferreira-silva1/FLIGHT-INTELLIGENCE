import { Injectable } from '@nestjs/common';

// O decorator @Injectable() marca esta classe como um provedor que pode ser injetado em outros componentes.
// Serviços são onde geralmente implementamos a lógica de negócios da nossa aplicação (acesso a BD, chamadas externas, etc).
@Injectable()
export class AppService {
  // Exemplo de método de serviço (atualmente não estamos usando pois o Controller responde o health check diretamente)
  getHello(): string {
    return 'Hello World!';
  }
}
