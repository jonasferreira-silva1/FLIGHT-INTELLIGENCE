'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useFlightStore } from '@/lib/store';
import type { FlightPosition } from '@/lib/types';

export function FlightMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { positions, setSelectedFlight, flights } = useFlightStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-34.9232, -8.1264], // Recife coordinates
      zoom: 6,
      minZoom: 3,
      maxZoom: 15,
    });

    // Add REC airport marker
    const recMarkerEl = document.createElement('div');
    recMarkerEl.className = 'rec-airport-marker';
    recMarkerEl.innerHTML = `
      <div class="relative">
        <div class="absolute inset-0 rounded-full bg-primary/30 animate-ping"></div>
        <div class="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
          REC
        </div>
      </div>
    `;

    new maplibregl.Marker({ element: recMarkerEl })
      .setLngLat([-34.9232, -8.1264])
      .addTo(map.current);

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when positions change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentIds = new Set(positions.map(p => p.flightId));
    
    // Remove markers for flights no longer in positions
    markers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Update or create markers
    positions.forEach((position) => {
      const existingMarker = markers.current.get(position.flightId);
      
      if (existingMarker) {
        // Update position
        existingMarker.setLngLat([position.longitude, position.latitude]);
        // Update rotation
        const el = existingMarker.getElement();
        const icon = el.querySelector('.plane-icon');
        if (icon) {
          (icon as HTMLElement).style.transform = `rotate(${position.heading}deg)`;
        }
      } else {
        // Create new marker
        const el = createPlaneMarker(position);
        
        el.addEventListener('click', () => {
          const flight = flights.find(f => f.id === position.flightId);
          if (flight) {
            setSelectedFlight(flight);
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([position.longitude, position.latitude])
          .addTo(map.current!);
        
        markers.current.set(position.flightId, marker);
      }
    });
  }, [positions, mapLoaded, flights, setSelectedFlight]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg bg-card/90 p-3 backdrop-blur">
        <h4 className="mb-2 text-xs font-medium text-foreground">Legenda</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span>Aeroporto REC</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-[var(--success)]" />
            <span>Em voo</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-[var(--warning)]" />
            <span>Com atraso</span>
          </div>
        </div>
      </div>

      {/* Flight count */}
      <div className="absolute right-4 top-4 rounded-lg bg-card/90 px-3 py-2 backdrop-blur">
        <p className="text-xs text-muted-foreground">Aeronaves rastreadas</p>
        <p className="text-lg font-bold text-foreground">{positions.length}</p>
      </div>
    </div>
  );
}

function createPlaneMarker(position: FlightPosition): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'plane-marker cursor-pointer';
  
  const isDelayed = position.status === 'delayed';
  const isArrival = position.destination === 'REC';
  const color = isDelayed ? '#f59e0b' : isArrival ? '#10b981' : '#38bdf8';
  const glowColor = isDelayed ? 'rgba(245,158,11,0.35)' : isArrival ? 'rgba(16,185,129,0.35)' : 'rgba(56,189,248,0.35)';

  el.innerHTML = `
    <div class="relative group" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      <!-- Glow pulse ring -->
      <div style="
        position:absolute;
        inset:-4px;
        border-radius:50%;
        background:${glowColor};
        animation:plane-pulse 2s ease-in-out infinite;
      "></div>
      <!-- Plane SVG -->
      <svg
        class="plane-icon"
        style="
          width:22px;
          height:22px;
          transform:rotate(${position.heading}deg);
          filter:drop-shadow(0 0 4px ${color});
          transition:transform 0.5s ease;
          position:relative;
          z-index:1;
        "
        viewBox="0 0 24 24"
        fill="${color}"
      >
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
      <!-- Tooltip -->
      <div style="
        position:absolute;
        bottom:calc(100% + 6px);
        left:50%;
        transform:translateX(-50%);
        white-space:nowrap;
        background:rgba(15,23,42,0.92);
        border:1px solid ${color}55;
        border-radius:6px;
        padding:4px 8px;
        font-size:11px;
        font-weight:600;
        color:#f1f5f9;
        opacity:0;
        pointer-events:none;
        transition:opacity 0.2s;
        box-shadow:0 4px 12px rgba(0,0,0,0.4);
      " class="plane-tooltip">
        ✈ ${position.callsign}
        <div style="font-size:10px;color:#94a3b8;font-weight:400;">${position.origin} → ${position.destination}</div>
        <div style="font-size:10px;color:${color};font-weight:500;">${isArrival ? '↓ Chegando' : '↑ Partindo'}</div>
      </div>
    </div>
    <style>
      @keyframes plane-pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.3); }
      }
      .plane-marker:hover .plane-tooltip { opacity: 1 !important; }
    </style>
  `;
  
  return el;
}
