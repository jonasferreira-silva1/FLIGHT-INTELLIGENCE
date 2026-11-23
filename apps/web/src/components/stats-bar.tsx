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

  const isDelayHigh = dailyStats ? dailyStats.averageDelay > 15 : false;

  const stats = [
    {
      label: 'Total de Voos',
      value: dailyStats?.totalFlights ?? flights.length,
      icon: Plane,
      iconColor: 'text-foreground/70',
      bgColor: 'bg-secondary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Chegadas',
      value: dailyStats?.arrivals ?? flights.filter(f => f.destination === 'REC').length,
      icon: PlaneLanding,
      iconColor: 'text-foreground/70',
      bgColor: 'bg-secondary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Partidas',
      value: dailyStats?.departures ?? flights.filter(f => f.origin === 'REC').length,
      icon: PlaneTakeoff,
      iconColor: 'text-foreground/70',
      bgColor: 'bg-secondary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Pontualidade',
      value: dailyStats ? `${dailyStats.onTimePercentage.toFixed(0)}%` : '--',
      icon: Clock,
      iconColor: 'text-[var(--success)]',
      bgColor: 'bg-[var(--success)]/10',
      valueColor: 'text-[var(--success)]',
    },
    {
      label: 'Passageiros Est.',
      value: dailyStats 
        ? new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(dailyStats.passengers)
        : '--',
      icon: Users,
      iconColor: 'text-foreground/70',
      bgColor: 'bg-secondary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Atraso Médio',
      value: dailyStats ? `${dailyStats.averageDelay.toFixed(0)} min` : '--',
      icon: TrendingUp,
      iconColor: isDelayHigh ? 'text-[var(--warning)]' : 'text-foreground/70',
      bgColor: isDelayHigh ? 'bg-[var(--warning)]/10' : 'bg-secondary',
      valueColor: isDelayHigh ? 'text-[var(--warning)]' : 'text-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card border-border hover:border-border/80 transition-colors">
          <CardContent className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4">
            <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-xl sm:text-2xl font-bold truncate ${stat.valueColor}`}>{stat.value}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
