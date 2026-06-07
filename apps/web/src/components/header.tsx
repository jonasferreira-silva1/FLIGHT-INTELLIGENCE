'use client';

import { Bell, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFlightStore } from '@/lib/store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { lastUpdate, alerts, refreshData } = useFlightStore();
  const unreadAlerts = alerts.filter(a => !a.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
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
              {format(new Date(lastUpdate), "HH:mm:ss", { locale: ptBR })}
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

        {/* Notifications */}
        <Button variant="outline" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadAlerts > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadAlerts}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
