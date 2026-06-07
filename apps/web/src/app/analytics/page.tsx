'use client';

import { useEffect, useState, useMemo } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFlightStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { AirlineStats, RouteStats } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { Plane, TrendingUp, Clock, Users } from 'lucide-react';

const COLORS = ['#3ecf8e', '#4EB8D4', '#F5A623', '#E84D4D', '#9B7BE8'];

// Tendência semanal — dados estáticos (backend não expõe histórico semanal)
const weeklyTrend = [
  { day: 'Seg', voos: 145, pontualidade: 82 },
  { day: 'Ter', voos: 138, pontualidade: 78 },
  { day: 'Qua', voos: 152, pontualidade: 85 },
  { day: 'Qui', voos: 148, pontualidade: 80 },
  { day: 'Sex', voos: 165, pontualidade: 75 },
  { day: 'Sab', voos: 120, pontualidade: 88 },
  { day: 'Dom', voos: 132, pontualidade: 86 },
];

export default function AnalyticsPage() {
  const { dailyStats, flights } = useFlightStore();
  const [airlineStats, setAirlineStats] = useState<AirlineStats[]>([]);
  const [routeStats, setRouteStats] = useState<RouteStats[]>([]);

  // Busca dados de analytics do backend
  useEffect(() => {
    api.getAirlineStats().then(setAirlineStats);
  }, []);

  // Rotas frequentes — derivado dos flights do store
  const derivedRouteStats = useMemo((): RouteStats[] => {
    const routeMap = new Map<string, { origin: string; destination: string; total: number; totalDelay: number }>();
    for (const f of flights) {
      if (f.origin !== 'REC' && f.destination !== 'REC') continue;
      const key = `${f.origin}→${f.destination}`;
      const existing = routeMap.get(key) ?? { origin: f.origin, destination: f.destination, total: 0, totalDelay: 0 };
      existing.total += 1;
      existing.totalDelay += f.delayMinutes;
      routeMap.set(key, existing);
    }
    return Array.from(routeMap.values())
      .map((r) => ({
        origin: r.origin,
        destination: r.destination,
        flights: r.total,
        averageDelay: r.total > 0 ? r.totalDelay / r.total : 0,
      }))
      .sort((a, b) => b.flights - a.flights)
      .slice(0, 8);
  }, [flights]);

  // Tráfego por hora — derivado dos flights do store
  const hourlyTraffic = useMemo(() => {
    const chegadasPorHora = new Array(24).fill(0);
    const partidasPorHora = new Array(24).fill(0);

    for (const f of flights) {
      if (f.scheduledArrival && f.destination === 'REC') {
        const h = new Date(f.scheduledArrival).getHours();
        chegadasPorHora[h] += 1;
      }
      if (f.scheduledDeparture && f.origin === 'REC') {
        const h = new Date(f.scheduledDeparture).getHours();
        partidasPorHora[h] += 1;
      }
    }

    return Array.from({ length: 19 }, (_, i) => ({
      hour: `${(i + 5).toString().padStart(2, '0')}:00`,
      chegadas: chegadasPorHora[i + 5],
      partidas: partidasPorHora[i + 5],
    }));
  }, [flights]);

  // Distribuição de status — derivado do store
  const statusDistribution = useMemo(() => {
    return [
      { name: 'Em Voo',     value: flights.filter((f) => f.status === 'airborne').length },
      { name: 'Pousado',    value: flights.filter((f) => f.status === 'landed').length },
      { name: 'Programado', value: flights.filter((f) => f.status === 'scheduled').length },
      { name: 'Atrasado',   value: flights.filter((f) => f.status === 'delayed').length },
      { name: 'Outros',     value: flights.filter((f) => !['airborne','landed','scheduled','delayed'].includes(f.status)).length },
    ].filter((d) => d.value > 0);
  }, [flights]);

  const finalAirlineStats = airlineStats.length > 0 ? airlineStats : [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1">
        <Header title="Analytics" subtitle="Estatísticas e análises do Aeroporto do Recife" />

        <div className="space-y-6 p-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hoje</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dailyStats?.totalFlights ?? '--'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--success)]/10">
                  <TrendingUp className="h-6 w-6 text-[var(--success)]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pontualidade</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dailyStats ? `${dailyStats.onTimePercentage.toFixed(0)}%` : '--'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                  <Clock className="h-6 w-6 text-[var(--warning)]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atraso Médio</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dailyStats ? `${dailyStats.averageDelay.toFixed(0)} min` : '--'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--info)]/10">
                  <Users className="h-6 w-6 text-[var(--info)]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passageiros Est.</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dailyStats
                      ? new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(dailyStats.passengers)
                      : '--'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tráfego por hora */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tráfego por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyTraffic}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="hour" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="chegadas" name="Chegadas" stroke="#3ecf8e" fill="#3ecf8e" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="partidas" name="Partidas" stroke="#4EB8D4" fill="#4EB8D4" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição por status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: 'var(--muted-foreground)' }}
                      >
                        {statusDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ranking companhias */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Companhias Aéreas — Voos Diários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={finalAirlineStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis type="category" dataKey="code" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} width={50} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value, _, props) => [`${value} voos`, props.payload.name]}
                      />
                      <Bar dataKey="flights" fill="#3ecf8e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tendência semanal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendência Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="voos" name="Total Voos" stroke="#3ecf8e" strokeWidth={2} dot={{ fill: '#3ecf8e' }} />
                      <Line yAxisId="right" type="monotone" dataKey="pontualidade" name="Pontualidade %" stroke="#F5A623" strokeWidth={2} dot={{ fill: '#F5A623' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rotas Frequentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rotas Mais Frequentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {derivedRouteStats.map((route, index) => (
                  <div
                    key={`${route.origin}-${route.destination}`}
                    className="flex items-center justify-between rounded-lg bg-secondary p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {route.origin} → {route.destination}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {route.flights} voos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--warning)]">
                        {route.averageDelay.toFixed(0)} min
                      </p>
                      <p className="text-xs text-muted-foreground">atraso médio</p>
                    </div>
                  </div>
                ))}

                {derivedRouteStats.length === 0 && (
                  <p className="col-span-4 text-center text-sm text-muted-foreground py-4">
                    Sem dados de rotas disponíveis ainda.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
