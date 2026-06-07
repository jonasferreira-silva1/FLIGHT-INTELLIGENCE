'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useFlightStore } from '@/lib/store';

export function useSocket(): void {
  const store = useFlightStore();

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:3001';
    const socket = io(wsUrl, { autoConnect: true });

    socket.on('connect', () => {
      store.setConnected(true);
      socket.emit('join:room', { room: 'rec:live' });
      console.log('[Socket] Conectado ao servidor em tempo real');
    });

    socket.on('disconnect', () => {
      store.setConnected(false);
      console.log('[Socket] Desconectado do servidor');
    });

    socket.on('reconnect', () => {
      socket.emit('join:room', { room: 'rec:live' });
      console.log('[Socket] Reconectado — sala rec:live re-inscrita');
    });

    socket.on('flight:update', (data: unknown) => {
      store.handleFlightUpdate(data);
    });

    socket.on('flight:alert', (data: unknown) => {
      store.handleFlightAlert(data);
    });

    socket.on('flight:landed', (data: unknown) => {
      store.handleFlightLanded(data);
    });

    socket.on('flight:departed', (data: unknown) => {
      store.handleFlightDeparted(data);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
