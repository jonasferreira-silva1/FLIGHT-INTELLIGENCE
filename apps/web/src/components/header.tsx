'use client';

import { Bell, Search, RefreshCw, Clock, PlaneLanding, PlaneTakeoff, MapPin, XCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFlightStore } from '@/lib/store';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { FlightAlert } from '@/lib/types';
import { api } from '@/lib/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const alertIcons: Record<FlightAlert['type'], typeof Bell> = {
  delay: Clock,
  gate_change: MapPin,
  landed: PlaneLanding,
  departed: PlaneTakeoff,
  cancelled: XCircle,
};

const alertColors: Record<FlightAlert['type'], string> = {
  delay: 'text-[var(--warning)]',
  gate_change: 'text-[var(--info)]',
  landed: 'text-[var(--success)]',
  departed: 'text-accent',
  cancelled: 'text-destructive',
};

export function Header({ title, subtitle }: HeaderProps) {
  const { lastUpdate, alerts, refreshData, markAlertRead } = useFlightStore();
  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const recentUnread = alerts.filter((a) => !a.read).slice(0, 5);

  const handleMarkRead = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.markAlertRead(alertId);
    markAlertRead(alertId);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar voo..."
            className="w-64 bg-secondary pl-9"
          />
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span>Última atualização:</span>
            <span className="font-mono">
              {format(new Date(lastUpdate), 'HH:mm:ss', { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => refreshData()}
          className="h-9 w-9"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Notifications bell + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            {unreadAlerts > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {unreadAlerts}
              </span>
            )}
          </Button>

          {/* Dropdown panel */}
          {open && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Notificações</span>
                {unreadAlerts > 0 && (
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                    {unreadAlerts} não lidos
                  </span>
                )}
              </div>

              {/* Alert list */}
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {recentUnread.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Check className="h-8 w-8 text-[var(--success)]/60" />
                    <p className="mt-2 text-sm text-muted-foreground">Tudo em dia!</p>
                  </div>
                ) : (
                  recentUnread.map((alert) => {
                    const Icon = alertIcons[alert.type] ?? Bell;
                    const color = alertColors[alert.type] ?? 'text-muted-foreground';
                    return (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
                      >
                        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground font-mono">
                            {alert.callsign}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {alert.message}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {formatDistanceToNow(new Date(alert.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleMarkRead(alert.id, e)}
                          className="ml-1 shrink-0 rounded p-1 hover:bg-primary/10 transition-colors"
                          title="Marcar como lido"
                        >
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border p-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push('/alerts');
                  }}
                  className="w-full rounded-lg px-3 py-2 text-center text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  Ver todos os alertas →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
