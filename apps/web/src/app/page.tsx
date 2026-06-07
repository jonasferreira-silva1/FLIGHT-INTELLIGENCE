'use client';

import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { StatsBar } from '@/components/stats-bar';
import { LiveFeed } from '@/components/live-feed';
import { FlightDetailsModal } from '@/components/flight-details-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AirTrafficRadar } from '@/components/air-traffic-radar';
import { useFlightPolling } from '@/hooks/use-flight-polling';

// FlightMap usa maplibre-gl que requer window/document — importação dinâmica com ssr: false
const FlightMap = dynamic(
  () => import('@/components/flight-map').then((m) => m.FlightMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-lg bg-card" />
    ),
  },
);

export default function Dashboard() {
  // Carga inicial + polling REST de 30s (WebSocket via SocketProvider no layout)
  useFlightPolling();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1">
        <Header
          title="Dashboard"
          subtitle="Monitoramento em tempo real do Aeroporto do Recife"
        />

        <div className="space-y-6 p-6">
          {/* Stats Bar */}
          <StatsBar />

          {/* Radar + Operações */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AirTrafficRadar />

            <Card className="bg-gradient-to-br from-card to-emerald-950/20 border-emerald-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operações em Andamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <p className="text-3xl font-bold text-emerald-400">12</p>
                      <p className="text-sm text-muted-foreground">Em aproximação final</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <p className="text-3xl font-bold text-sky-400">8</p>
                      <p className="text-sm text-muted-foreground">Aguardando decolagem</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <p className="text-3xl font-bold text-amber-400">3</p>
                      <p className="text-sm text-muted-foreground">Em holding pattern</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-border">
                      <p className="text-3xl font-bold text-purple-400">2</p>
                      <p className="text-sm text-muted-foreground">Pistas ativas</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium text-foreground mb-3">
                      Condições da Pista
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pista 18/36</span>
                        <span className="text-sm font-medium text-emerald-400">Operacional</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Visibilidade</span>
                        <span className="text-sm font-medium text-foreground">10km+</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Vento</span>
                        <span className="text-sm font-medium text-foreground">12kt SE</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Teto de nuvens</span>
                        <span className="text-sm font-medium text-foreground">CAVOK</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mapa + Live Feed */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Mapa de Voos ao Vivo</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px]">
                  <FlightMap />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Voos em Tempo Real</CardTitle>
              </CardHeader>
              <CardContent>
                <LiveFeed />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <FlightDetailsModal />
    </div>
  );
}
