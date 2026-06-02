import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class FlightsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger;
    server: Server;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(data: {
        room: string;
    }, client: Socket): {
        status: string;
        message: string;
    };
    handleLeaveRoom(data: {
        room: string;
    }, client: Socket): {
        status: string;
        message: string;
    };
    emitFlightUpdate(flightData: any): void;
    emitAlert(alertData: any): void;
    emitLanded(landedData: any): void;
    emitDeparted(departedData: any): void;
}
