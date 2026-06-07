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
  scheduled: { label: 'Programado', color: 'bg-muted text-muted-foreground' },
  boarding: { label: 'Embarque', color: 'bg-[var(--info)] text-white' },
  departed: { label: 'Decolou', color: 'bg-accent text-accent-foreground' },
  airborne: { label: 'Em Voo', color: 'bg-[var(--success)] text-white' },
  landed: { label: 'Pousou', color: 'bg-primary text-primary-foreground' },
  cancelled: { label: 'Cancelado', color: 'bg-destructive text-destructive-foreground' },
  delayed: { label: 'Atrasado', color: 'bg-[var(--warning)] text-white' },
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
            <Badge className={cn('text-xs', status.color)}>
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
          <Badge className={cn('text-xs', status.color)}>
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
