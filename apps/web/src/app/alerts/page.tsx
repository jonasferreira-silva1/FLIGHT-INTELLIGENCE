'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Clock,
  AlertTriangle,
  PlaneLanding,
  PlaneTakeoff,
  MapPin,
  XCircle,
  Check,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlightStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { FlightAlert } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

const alertConfig: Record<
  FlightAlert['type'],
  { icon: typeof Bell; color: string; bgColor: string; label: string }
> = {
  delay: {
    icon: Clock,
    color: 'text-[var(--warning)]',
    bgColor: 'bg-[var(--warning)]/10',
    label: 'Atraso',
  },
  gate_change: {
    icon: MapPin,
    color: 'text-[var(--info)]',
    bgColor: 'bg-[var(--info)]/10',
    label: 'Mudança de Portão',
  },
  landed: {
    icon: PlaneLanding,
    color: 'text-[var(--success)]',
    bgColor: 'bg-[var(--success)]/10',
    label: 'Pouso',
  },
  departed: {
    icon: PlaneTakeoff,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    label: 'Decolagem',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Cancelamento',
  },
};

export default function AlertsPage() {
  const { alerts, markAlertRead, markAllAlertsRead, clearAlerts } = useFlightStore();
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  const unreadCount = alerts.filter((a) => !a.read).length;
  const todayAlerts = alerts.filter((a) => {
    const alertDate = new Date(a.timestamp);
    const today = new Date();
    return alertDate.toDateString() === today.toDateString();
  });

  const handleMarkRead = async (alertId: string) => {
    setDismissing((prev) => new Set(prev).add(alertId));
    setTimeout(async () => {
      await api.markAlertRead(alertId);
      markAlertRead(alertId);
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }, 350);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = alerts.filter((a) => !a.read).map((a) => a.id);
    setDismissing(new Set(unreadIds));
    setTimeout(async () => {
      await api.markAllAlertsRead();
      markAllAlertsRead();
      setDismissing(new Set());
    }, 350);
  };

  const handleClearAlerts = async () => {
    setDismissing(new Set(alerts.map((a) => a.id)));
    setTimeout(async () => {
      await api.clearAlerts();
      clearAlerts();
      setDismissing(new Set());
    }, 350);
  };

  // Mostra apenas alertas não lidos + os que estão em animação de saída
  const displayAlerts = alerts.filter((a) => !a.read || dismissing.has(a.id));

  const groupedAlerts = displayAlerts.reduce(
    (acc, alert) => {
      const date = new Date(alert.timestamp).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(alert);
      return acc;
    },
    {} as Record<string, FlightAlert[]>,
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1">
        <Header title="Alertas" subtitle="Central de notificações em tempo real" />

        <div className="space-y-6 p-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Alertas</p>
                  <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Não Lidos</p>
                  <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--success)]/10">
                  <Check className="h-6 w-6 text-[var(--success)]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alertas Hoje</p>
                  <p className="text-2xl font-bold text-foreground">{todayAlerts.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Alertas Não Lidos</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                <Check className="mr-1.5 h-4 w-4" />
                Marcar tudo como lido
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAlerts}
                disabled={alerts.length === 0}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Limpar alertas
              </Button>
            </div>
          </div>

          {/* Alerts List */}
          <Card>
            <CardContent className="p-0">
              {displayAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Check className="h-12 w-12 text-[var(--success)]/50" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">Tudo em dia!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Não há alertas não lidos no momento.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-border">
                    {Object.entries(groupedAlerts).map(([date, dateAlerts]) => (
                      <div key={date}>
                        <div className="sticky top-0 bg-secondary px-4 py-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            {new Date(date).toDateString() === new Date().toDateString()
                              ? 'Hoje'
                              : format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="divide-y divide-border">
                          {dateAlerts.map((alert) => (
                            <AlertItem
                              key={alert.id}
                              alert={alert}
                              isDismissing={dismissing.has(alert.id)}
                              onMarkRead={() => handleMarkRead(alert.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Alert Types Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipos de Alerta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(alertConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-3 rounded-lg bg-secondary p-3"
                    >
                      <div className={cn('rounded-lg p-2', config.bgColor)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function AlertItem({
  alert,
  isDismissing,
  onMarkRead,
}: {
  alert: FlightAlert;
  isDismissing: boolean;
  onMarkRead: () => void;
}) {
  const config = alertConfig[alert.type] ?? alertConfig.delay;
  const Icon = config.icon;

  return (
    <div
      style={{
        transition: 'opacity 0.3s ease, transform 0.3s ease, max-height 0.35s ease, padding 0.35s ease',
        opacity: isDismissing ? 0 : 1,
        transform: isDismissing ? 'translateX(32px)' : 'translateX(0)',
        maxHeight: isDismissing ? '0px' : '160px',
        overflow: 'hidden',
        padding: isDismissing ? '0 1rem' : undefined,
      }}
      className="flex items-start gap-4 p-4 bg-primary/5 hover:bg-secondary/50"
    >
      <div className={cn('rounded-lg p-2 shrink-0', config.bgColor)}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-mono text-sm font-semibold text-foreground">{alert.callsign}</p>
          <Badge className={cn('text-xs', config.bgColor, config.color)}>{config.label}</Badge>
          <span className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <p className="mt-1 text-sm text-foreground">{alert.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(alert.timestamp), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onMarkRead}
        title="Marcar como lido"
        className="shrink-0"
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
