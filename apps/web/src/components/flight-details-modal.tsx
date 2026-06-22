'use client';

import { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Plane, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Calendar,
  Navigation,
  Gauge,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlightStore } from '@/lib/store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import type { DelayPrediction } from '@/lib/types';


const statusConfig = {
  scheduled: { label: 'Programado', color: 'bg-muted text-muted-foreground' },
  boarding: { label: 'Embarque', color: 'bg-[var(--info)] text-white' },
  departed: { label: 'Decolou', color: 'bg-accent text-accent-foreground' },
  airborne: { label: 'Em Voo', color: 'bg-[var(--success)] text-white' },
  landed: { label: 'Pousou', color: 'bg-primary text-primary-foreground' },
  cancelled: { label: 'Cancelado', color: 'bg-destructive text-destructive-foreground' },
  delayed: { label: 'Atrasado', color: 'bg-[var(--warning)] text-white' },
};

export function FlightDetailsModal() {
  const { selectedFlight, setSelectedFlight, positions } = useFlightStore();

  const [prediction, setPrediction] = useState<DelayPrediction | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedFlight) {
      setPrediction(null);
      return;
    }

    if (['landed', 'cancelled'].includes(selectedFlight.status)) {
      setPrediction(null);
      return;
    }

    let isMounted = true;
    setLoadingPrediction(true);
    api.getFlightPrediction(selectedFlight.id)
      .then((data) => {
        if (isMounted) {
          setPrediction(data);
        }
      })
      .catch((err) => {
        console.error('Error loading prediction:', err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingPrediction(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedFlight]);
  
  if (!selectedFlight) return null;

  const status = statusConfig[selectedFlight.status] ?? { label: selectedFlight.status, color: 'bg-muted text-muted-foreground' };
  const isArrival = selectedFlight.destination === 'REC';
  const position = positions.find(p => p.flightId === selectedFlight.id);
  
  const progress = selectedFlight.status === 'landed' ? 100 
    : selectedFlight.status === 'airborne' ? 65 
    : selectedFlight.status === 'departed' ? 30 
    : selectedFlight.status === 'boarding' ? 10 
    : 0;

  return (
    <Dialog open={!!selectedFlight} onOpenChange={() => setSelectedFlight(null)}>
      <DialogContent className="max-w-lg bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-2xl">{selectedFlight.callsign}</span>
              <Badge className={cn('text-xs', status.color)}>
                {status.label}
              </Badge>
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setSelectedFlight(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{selectedFlight.airline}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Route */}
          <div className="rounded-lg bg-secondary p-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{selectedFlight.origin}</p>
                <p className="text-sm text-muted-foreground">{selectedFlight.originCity}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(selectedFlight.scheduledDeparture), 'HH:mm', { locale: ptBR })}
                </p>
              </div>
              
              <div className="flex-1 px-4">
                <div className="relative">
                  <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-border" />
                  <Progress value={progress} className="h-1" />
                  <Plane className={cn(
                    "absolute top-1/2 h-6 w-6 -translate-y-1/2 text-primary transition-all",
                    isArrival ? "" : "rotate-180"
                  )} style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%) ${isArrival ? '' : 'rotate(180deg)'}` }} />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {progress}% do trajeto
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{selectedFlight.destination}</p>
                <p className="text-sm text-muted-foreground">{selectedFlight.destinationCity}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(selectedFlight.scheduledArrival), 'HH:mm', { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Delay Warning */}
          {selectedFlight.delayMinutes > 0 && (
            <div className="flex items-center gap-3 rounded-lg bg-[var(--warning)]/10 p-3">
              <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
              <div>
                <p className="font-medium text-foreground">
                  Atraso de {selectedFlight.delayMinutes} minutos
                </p>
                <p className="text-sm text-muted-foreground">
                  Novo horário previsto: {format(
                    new Date(new Date(selectedFlight.scheduledArrival).getTime() + selectedFlight.delayMinutes * 60000),
                    'HH:mm',
                    { locale: ptBR }
                  )}
                </p>
              </div>
            </div>
          )}

          {/* AI Delay Prediction */}
          {!['landed', 'cancelled'].includes(selectedFlight.status) && (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5 animate-pulse text-[var(--accent)]" />
                <h4 className="font-semibold text-foreground">Previsão de Atraso por IA</h4>
                <Badge variant="outline" className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground border-border bg-background/50">
                  {loadingPrediction ? 'Analisando...' : prediction?.modelVersion || 'Modelo Off'}
                </Badge>
              </div>

              {loadingPrediction ? (
                <div className="space-y-2 py-1">
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-full rounded bg-muted animate-pulse" />
                </div>
              ) : prediction ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">
                        {prediction.delayPredicted ? (
                          <span className="text-[var(--warning)] flex items-center gap-1.5">
                            Atraso Estimado: {prediction.delayMinutesEstimate} min
                          </span>
                        ) : (
                          <span className="text-[var(--success)]">
                            Voo Pontual Estimado
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {prediction.delayPredicted 
                          ? 'O modelo identificou risco de atraso baseado no histórico e tráfego.' 
                          : 'As variáveis analisadas indicam alta probabilidade de cumprimento do horário.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground">
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                      <p className="text-[10px] text-muted-foreground">Confiança</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          prediction.delayPredicted ? "bg-[var(--warning)]" : "bg-[var(--success)]"
                        )} 
                        style={{ width: `${prediction.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Serviço de inteligência artificial temporariamente indisponível.
                </p>
              )}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Portão:</span>
                <span className="font-medium text-foreground">{selectedFlight.gate || '--'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Terminal:</span>
                <span className="font-medium text-foreground">{selectedFlight.terminal || '--'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Partida:</span>
                <span className="font-medium text-foreground">
                  {format(new Date(selectedFlight.scheduledDeparture), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Aeronave:</span>
                <span className="font-medium text-foreground">{selectedFlight.aircraft || '--'}</span>
              </div>
              {position && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Altitude:</span>
                    <span className="font-medium text-foreground">
                      {Math.round(position.altitude).toLocaleString('pt-BR')} m
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Velocidade:</span>
                    <span className="font-medium text-foreground">
                      {Math.round(position.velocity * 3.6)} km/h
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h4 className="mb-3 font-medium text-foreground">Timeline do Voo</h4>
            <div className="relative space-y-3 pl-6">
              <div className="absolute left-2 top-1 h-full w-0.5 bg-border" />
              
              <TimelineItem 
                label="Programado" 
                time={format(new Date(selectedFlight.scheduledDeparture), 'HH:mm', { locale: ptBR })}
                active={selectedFlight.status === 'scheduled'}
                completed={['boarding', 'departed', 'airborne', 'landed'].includes(selectedFlight.status)}
              />
              <TimelineItem 
                label="Embarque" 
                active={selectedFlight.status === 'boarding'}
                completed={['departed', 'airborne', 'landed'].includes(selectedFlight.status)}
              />
              <TimelineItem 
                label="Decolagem" 
                active={selectedFlight.status === 'departed'}
                completed={['airborne', 'landed'].includes(selectedFlight.status)}
              />
              <TimelineItem 
                label="Em Voo" 
                active={selectedFlight.status === 'airborne'}
                completed={selectedFlight.status === 'landed'}
              />
              <TimelineItem 
                label="Pouso" 
                time={format(new Date(selectedFlight.scheduledArrival), 'HH:mm', { locale: ptBR })}
                active={selectedFlight.status === 'landed'}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimelineItem({ 
  label, 
  time, 
  active, 
  completed 
}: { 
  label: string; 
  time?: string; 
  active?: boolean; 
  completed?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-3">
      <div className={cn(
        "absolute -left-4 h-3 w-3 rounded-full border-2",
        active ? "border-primary bg-primary" : 
        completed ? "border-primary bg-primary" : "border-muted bg-background"
      )} />
      <span className={cn(
        "text-sm",
        active ? "font-medium text-foreground" : 
        completed ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
      {time && (
        <span className="text-xs text-muted-foreground">{time}</span>
      )}
    </div>
  );
}
