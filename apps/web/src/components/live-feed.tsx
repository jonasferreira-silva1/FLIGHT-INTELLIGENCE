'use client';

import { useFlightStore } from '@/lib/store';
import { FlightCard } from './flight-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlaneLanding, PlaneTakeoff } from 'lucide-react';

export function LiveFeed() {
  const { flights, setSelectedFlight } = useFlightStore();

  const arrivals = flights.filter(f => f.destination === 'REC');
  const departures = flights.filter(f => f.origin === 'REC');

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="all" className="flex h-full flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="all">Todos ({flights.length})</TabsTrigger>
          <TabsTrigger value="arrivals" className="flex items-center gap-1.5">
            <PlaneLanding className="h-3.5 w-3.5" />
            Chegadas ({arrivals.length})
          </TabsTrigger>
          <TabsTrigger value="departures" className="flex items-center gap-1.5">
            <PlaneTakeoff className="h-3.5 w-3.5" />
            Partidas ({departures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 flex-1">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {flights.map((flight) => (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  compact
                  onClick={() => setSelectedFlight(flight)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="arrivals" className="mt-4 flex-1">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {arrivals.map((flight) => (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  compact
                  onClick={() => setSelectedFlight(flight)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="departures" className="mt-4 flex-1">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {departures.map((flight) => (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  compact
                  onClick={() => setSelectedFlight(flight)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
