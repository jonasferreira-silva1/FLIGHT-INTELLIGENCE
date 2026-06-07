'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Plane, 
  LayoutDashboard, 
  List, 
  BarChart3, 
  Bell, 
  Settings,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlightStore } from '@/lib/store';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/flights', label: 'Voos', icon: List },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/alerts', label: 'Alertas', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected, alerts } = useFlightStore();
  const unreadAlerts = alerts.filter(a => !a.read).length;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">REC Flight</h1>
            <p className="text-xs text-muted-foreground">Intelligence</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="border-b border-sidebar-border px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="h-4 w-4 text-muted-foreground" />
              {isConnected && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--success)]">
                  <span className="absolute inset-0 rounded-full bg-[var(--success)] pulse-ring" />
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Conectado em tempo real' : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const showBadge = item.href === '/alerts' && unreadAlerts > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                {showBadge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                    {unreadAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-xs font-medium text-sidebar-foreground">
              Aeroporto Internacional do Recife
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gilberto Freyre (REC)
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Settings className="h-3.5 w-3.5" />
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
