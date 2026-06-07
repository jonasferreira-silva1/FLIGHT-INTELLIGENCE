'use client';

import { useEffect } from 'react';
import { useFlightStore } from '@/lib/store';

export function useFlightPolling(): void {
  const refreshData = useFlightStore((s) => s.refreshData);

  useEffect(() => {
    // Carga inicial ao montar
    refreshData();

    // Polling a cada 5 minutos (fallback de segurança caso o WebSocket falhe)
    const interval = setInterval(() => {
      refreshData();
    }, 300_000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
