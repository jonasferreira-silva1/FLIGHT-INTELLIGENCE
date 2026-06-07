'use client';

import { 
  Plane, 
  PlaneTakeoff, 
  PlaneLanding, 
  Clock, 
  Users,
  TrendingUp 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useFlightStore } from '@/lib/store';

export function StatsBar() {
  const { dailyStats, flights } = useFlightStore();

  const stats = [
    {
      label: 'Total de Voos',
      value: dailyStats?.totalFlights ?? flights.length,
      icon: Plane,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Chegadas',
      value: dailyStats?.arrivals ?? flights.filter(f => f.destination === 'REC').length,
      icon: PlaneLanding,
      color: 'text-[var(--success)]',
      bgColor: 'bg-[var(--success)]/10',
    },
    {
      label: 'Partidas',
      value: dailyStats?.departures ?? flights.filter(f => f.origin === 'REC').length,
      icon: PlaneTakeoff,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Pontualidade',
      value: dailyStats ? `${dailyStats.onTimePercentage.toFixed(0)}%` : '--',
      icon: Clock,
      color: 'text-[var(--warning)]',
      bgColor: 'bg-[var(--warning)]/10',
    },
    {
      label: 'Passageiros Est.',
      value: dailyStats 
        ? new Intl.NumberFormat('pt-BR').format(dailyStats.passengers)
        : '--',
      icon: Users,
      color: 'text-[var(--info)]',
      bgColor: 'bg-[var(--info)]/10',
    },
    {
      label: 'Atraso Médio',
      value: dailyStats ? `${dailyStats.averageDelay.toFixed(0)} min` : '--',
      icon: TrendingUp,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
