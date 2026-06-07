'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { FlightCard } from '@/components/flight-card';
import { FlightDetailsModal } from '@/components/flight-details-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { useFlightStore } from '@/lib/store';
import type { Flight, FlightStatus } from '@/lib/types';

const statusOptions: { value: FlightStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'scheduled', label: 'Programado' },
  { value: 'boarding', label: 'Embarque' },
  { value: 'departed', label: 'Decolou' },
  { value: 'airborne', label: 'Em Voo' },
  { value: 'landed', label: 'Pousou' },
  { value: 'delayed', label: 'Atrasado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const directionOptions = [
  { value: 'all', label: 'Todas as direções' },
  { value: 'arrivals', label: 'Chegadas' },
  { value: 'departures', label: 'Partidas' },
];

export default function FlightsPage() {
  const { flights, setSelectedFlight } = useFlightStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FlightStatus | 'all'>('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);

  useEffect(() => {
    let result = [...flights];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.callsign.toLowerCase().includes(query) ||
          f.airline.toLowerCase().includes(query) ||
          f.origin.toLowerCase().includes(query) ||
          f.destination.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((f) => f.status === statusFilter);
    }

    if (directionFilter === 'arrivals') {
      result = result.filter((f) => f.destination === 'REC');
    } else if (directionFilter === 'departures') {
      result = result.filter((f) => f.origin === 'REC');
    }

    setFilteredFlights(result);
  }, [flights, searchQuery, statusFilter, directionFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDirectionFilter('all');
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== 'all' || directionFilter !== 'all';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1">
        <Header title="Voos" subtitle="Lista completa de voos do Aeroporto do Recife" />

        <div className="space-y-6 p-6">
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por voo, companhia, origem ou destino..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as FlightStatus | 'all')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Direção" />
                  </SelectTrigger>
                  <SelectContent>
                    {directionOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Limpar filtros
                  </Button>
                )}
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                  {searchQuery && (
                    <Badge variant="secondary">Busca: {searchQuery}</Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary">
                      Status: {statusOptions.find((s) => s.value === statusFilter)?.label}
                    </Badge>
                  )}
                  {directionFilter !== 'all' && (
                    <Badge variant="secondary">
                      {directionOptions.find((d) => d.value === directionFilter)?.label}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredFlights.length} de {flights.length} voos
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredFlights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onClick={() => setSelectedFlight(flight)}
              />
            ))}
          </div>

          {filteredFlights.length === 0 && (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Search className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Nenhum voo encontrado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tente ajustar os filtros ou termos de busca.
                </p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <FlightDetailsModal />
    </div>
  );
}
