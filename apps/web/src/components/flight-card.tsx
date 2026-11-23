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

const airlineLogos: Record<string, string> = {
  G3: 'GOL',
  AD: 'AZUL',
  LA: 'LATAM',
  O6: 'AVN',
  '2Z': 'VP',
};

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
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary text-xs font-bold text-foreground">
              {airlineLogos[flight.airlineCode] || flight.airlineCode}
            </div>
            <div>
              <p className="font-mono text-sm font-medium text-foreground">
                {flight.callsign}
              </p>
              <p className="text-xs text-muted-foreground">
                {flight.origin} → {flight.destination}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs font-medium border', status.color)}>
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
              {airlineLogos[flight.airlineCode] || flight.airlineCode}
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-foreground">
                {flight.callsign}
              </p>
              <p className="text-sm text-muted-foreground">{flight.airline}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs font-medium border', status.color)}>
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
