'use client';

import { 
  Plane, 
  Clock, 
  MapPin, 
  AlertTriangle,
  ChevronRight 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Flight } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FlightCardProps {
  flight: Flight;
  compact?: boolean;
  onClick?: () => void;
}

const statusConfig = {
  scheduled: { label: 'Programado', color: 'bg-muted/80 text-muted-foreground border-border' },
  boarding: { label: 'Embarque', color: 'bg-[var(--info)]/15 text-[var(--info)] border-[var(--info)]/30' },
  departed: { label: 'Decolou', color: 'bg-accent/15 text-accent border-accent/30' },
  airborne: { label: 'Em Voo', color: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30' },
  landed: { label: 'Pousou', color: 'bg-primary/15 text-primary border-primary/30' },
  cancelled: { label: 'Cancelado', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  delayed: { label: 'Atrasado', color: 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30' },
};

interface AirlineConfig {
  name: string;
  badgeClass: string;
}

const airlines: Record<string, AirlineConfig> = {
  G3: { name: 'GOL', badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  AD: { name: 'AZUL', badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  LA: { name: 'LATAM', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  '2Z': { name: 'VOEPASS', badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  O6: { name: 'AVIANCA', badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export function AirlineBadge({ code, compact = false }: { code: string; compact?: boolean }) {
  const config = airlines[code] || { name: code, badgeClass: 'bg-secondary text-foreground/80 border-border' };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-sans font-bold tracking-wider select-none shrink-0 transition-colors',
        config.badgeClass,
        compact ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs'
      )}
    >
      <Plane className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <span>{config.name}</span>
    </div>
  );
}

export function FlightCard({ flight, compact = false, onClick }: FlightCardProps) {
  const status = statusConfig[flight.status] ?? { label: flight.status, color: 'bg-muted text-muted-foreground' };
  const isArrival = flight.destination === 'REC';
  const hasDelay = flight.delayMinutes > 0;

  if (compact) {
    return (
      <Card 
        className="cursor-pointer bg-card transition-colors hover:bg-secondary"
        onClick={onClick}
      >
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 min-w-0">
            <AirlineBadge code={flight.airlineCode} compact />
            <div className="min-w-0">
              <p className="font-mono text-sm font-medium text-foreground truncate">
                {flight.callsign}
              </p>
              <p className="text-xs text-muted-foreground truncate font-sans">
                {flight.origin} → {flight.destination}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn('text-xs font-medium border font-sans', status.color)}>
              {status.label}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer bg-card transition-all hover:bg-secondary hover:shadow-lg"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <AirlineBadge code={flight.airlineCode} />
            <div className="min-w-0">
              <p className="font-mono text-lg font-semibold text-foreground truncate">
                {flight.callsign}
              </p>
              <p className="text-sm text-muted-foreground truncate font-sans">{flight.airline}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs font-medium border font-sans shrink-0', status.color)}>
            {status.label}
          </Badge>
        </div>

        {/* Route */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground">{flight.origin}</p>
            <p className="text-xs text-muted-foreground">{flight.originCity}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Plane className={cn(
              "h-5 w-5",
              isArrival ? "rotate-90 text-[var(--success)]" : "-rotate-90 text-accent"
            )} />
            <div className="h-px w-16 bg-border" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-2xl font-bold text-foreground">{flight.destination}</p>
            <p className="text-xs text-muted-foreground">{flight.destinationCity}</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(flight.scheduledDeparture), 'HH:mm', { locale: ptBR })}
              </span>
            </div>
            {flight.gate && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Portão {flight.gate}</span>
              </div>
            )}
          </div>
          
          {hasDelay && (
            <div className="flex items-center gap-1 text-sm text-[var(--warning)]">
              <AlertTriangle className="h-4 w-4" />
              <span>+{flight.delayMinutes} min</span>
            </div>
          )}
        </div>

        {/* Aircraft */}
        {flight.aircraft && (
          <p className="mt-2 text-xs text-muted-foreground">
            {flight.aircraft}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
