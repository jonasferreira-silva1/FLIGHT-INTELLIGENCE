import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * Gateway WebSocket que expõe os eventos do tráfego aéreo e alertas em tempo real.
 * Utiliza o Socket.io e permite a assinatura em canais/salas específicas.
 */
@WebSocketGateway({
  cors: {
    origin: '*', // Habilita CORS para permitir conexões de qualquer origem no desenvolvimento
  },
})
export class FlightsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(FlightsGateway.name);

  // Instância do servidor Socket.io injetada automaticamente pelo NestJS
  @WebSocketServer()
  server: Server;

  /**
   * Chamado automaticamente pelo NestJS sempre que um novo cliente conecta.
   */
  handleConnection(client: Socket) {
    this.logger.log(`Novo cliente conectado via WebSocket: ${client.id}`);
  }

  /**
   * Chamado automaticamente pelo NestJS quando um cliente desconecta.
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado do WebSocket: ${client.id}`);
  }

  /**
   * Permite que um cliente se inscreva em uma sala (ex: 'rec:live' ou 'flight:GLO1234')
   */
  @SubscribeMessage('join:room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data && data.room) {
      client.join(data.room);
      this.logger.debug(
        `Cliente ${client.id} se inscreveu na sala: ${data.room}`,
      );
      return {
        status: 'ok',
        message: `Inscrito com sucesso na sala: ${data.room}`,
      };
    }
    return { status: 'error', message: 'Nome da sala inválido' };
  }

  /**
   * Permite que um cliente saia de uma sala anteriormente inscrita
   */
  @SubscribeMessage('leave:room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data && data.room) {
      client.leave(data.room);
      this.logger.debug(`Cliente ${client.id} saiu da sala: ${data.room}`);
      return {
        status: 'ok',
        message: `Saiu com sucesso da sala: ${data.room}`,
      };
    }
    return { status: 'error', message: 'Nome da sala inválido' };
  }

  /**
   * Envia uma atualização de estado/posição de voo para os inscritos.
   * Transmite tanto para o feed global ('rec:live') quanto para a sala individual do voo.
   */
  emitFlightUpdate(flightData: any) {
    if (!this.server) {
      this.logger.warn('Servidor Socket.io não inicializado. Ignorando emit.');
      return;
    }
    // Emite para a sala de monitoramento em tempo real do Recife
    this.server.to('rec:live').emit('flight:update', flightData);

    // Emite para a sala específica do voo (caso o cliente queira acompanhar apenas um voo)
    if (flightData.callsign) {
      this.server
        .to(`flight:${flightData.callsign}`)
        .emit('flight:update', flightData);
    }
  }

  /**
   * Transmite um alerta de alteração de status/atraso de voo em tempo real.
   */
  emitAlert(alertData: any) {
    if (!this.server) return;
    this.server.to('rec:live').emit('flight:alert', alertData);
    if (alertData.callsign) {
      this.server
        .to(`flight:${alertData.callsign}`)
        .emit('flight:alert', alertData);
    }
  }

  /**
   * Transmite a confirmação de pouso de um voo no REC.
   */
  emitLanded(landedData: any) {
    if (!this.server) return;
    this.server.to('rec:live').emit('flight:landed', landedData);
    if (landedData.callsign) {
      this.server
        .to(`flight:${landedData.callsign}`)
        .emit('flight:landed', landedData);
    }
  }

  /**
   * Transmite a confirmação de decolagem de um voo partindo do REC.
   */
  emitDeparted(departedData: any) {
    if (!this.server) return;
    this.server.to('rec:live').emit('flight:departed', departedData);
    if (departedData.callsign) {
      this.server
        .to(`flight:${departedData.callsign}`)
        .emit('flight:departed', departedData);
    }
  }
}
