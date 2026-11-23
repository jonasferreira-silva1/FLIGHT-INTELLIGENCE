"use client";

import { useEffect, useState, useRef } from "react";
import { useFlightStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface RadarPlane {
  id: string;
  x: number;
  y: number;
  angle: number; // Ângulo de trajetória (heading) em graus: 0 = Leste, 90 = Sul, 180 = Oeste, 270 = Norte
  speed: number;
  airline: string;
  flightNumber: string;
  altitude: number;
  type: "arrival" | "departure";
}

export function AirTrafficRadar() {
  const { flights, positions } = useFlightStore();
  const [planes, setPlanes] = useState<RadarPlane[]>([]);
  const [sweepAngle, setSweepAngle] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializa aeronaves respeitando o sentido real de chegada (entrando no aeroporto) e partida (saindo)
  useEffect(() => {
    const initialPlanes: RadarPlane[] = flights.slice(0, 12).map((flight, index) => {
      const isArrival = flight.destination === "REC";
      const theta = (index * 30 + Math.random() * 15) % 360;
      const radians = (theta * Math.PI) / 180;

      const position = positions.find((p) => p.flightId === flight.id);
      const altitude = position?.altitude ?? 10000 + Math.random() * 25000;

      if (isArrival) {
        // Chegando: nasce no perímetro externo e viaja em direção ao centro (SBRF: 50, 50)
        const distance = 38 + Math.random() * 6;
        const x = 50 + Math.cos(radians) * distance;
        const y = 50 + Math.sin(radians) * distance;
        const heading = (theta + 180) % 360; // Aponta diretamente para o centro

        return {
          id: flight.id,
          x,
          y,
          angle: heading,
          speed: 0.02 + Math.random() * 0.02,
          airline: flight.airline,
          flightNumber: flight.callsign,
          altitude,
          type: "arrival" as const,
        };
      } else {
        // Partindo: nasce próximo ao centro (pista) e decola afastando-se do aeroporto
        const distance = 6 + Math.random() * 5;
        const x = 50 + Math.cos(radians) * distance;
        const y = 50 + Math.sin(radians) * distance;
        const heading = theta; // Aponta diretamente para fora

        return {
          id: flight.id,
          x,
          y,
          angle: heading,
          speed: 0.025 + Math.random() * 0.025,
          airline: flight.airline,
          flightNumber: flight.callsign,
          altitude,
          type: "departure" as const,
        };
      }
    });

    setPlanes(initialPlanes);
  }, [flights, positions]);

  // Anima aeronaves e varredura do radar de forma consistente (voo sempre para frente)
  useEffect(() => {
    let lastTime = 0;

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      setSweepAngle((prev) => (prev + 0.5) % 360);

      setPlanes((prevPlanes) =>
        prevPlanes.map((plane) => {
          const headingRad = (plane.angle * Math.PI) / 180;
          const moveX = Math.cos(headingRad) * plane.speed * (delta / 16);
          const moveY = Math.sin(headingRad) * plane.speed * (delta / 16);

          let newX = plane.x + moveX;
          let newY = plane.y + moveY;

          const distFromCenter = Math.hypot(newX - 50, newY - 50);

          // Chegada: quando chega ao centro (< 5), completa o pouso e reaparece na borda
          if (plane.type === "arrival" && distFromCenter < 5) {
            const newTheta = Math.random() * 360;
            const newRad = (newTheta * Math.PI) / 180;
            newX = 50 + Math.cos(newRad) * 44;
            newY = 50 + Math.sin(newRad) * 44;
            return {
              ...plane,
              x: newX,
              y: newY,
              angle: (newTheta + 180) % 360,
              altitude: 12000 + Math.random() * 18000,
            };
          }

          // Partida: quando sai do alcance do radar (> 47), sai de cena e reinicia decolagem do centro
          if (plane.type === "departure" && distFromCenter > 47) {
            const newTheta = Math.random() * 360;
            const newRad = (newTheta * Math.PI) / 180;
            newX = 50 + Math.cos(newRad) * 6;
            newY = 50 + Math.sin(newRad) * 6;
            return {
              ...plane,
              x: newX,
              y: newY,
              angle: newTheta,
              altitude: 2000 + Math.random() * 6000,
            };
          }

          return { ...plane, x: newX, y: newY };
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const arrivals = planes.filter((p) => p.type === "arrival").length;
  const departures = planes.filter((p) => p.type === "departure").length;

  return (
    <div className="relative bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between">
      {/* Header do radar */}
      <div className="flex items-center justify-between p-4 pb-2 z-10">
        <div>
          <h3 className="text-sm font-semibold text-foreground font-sans">Radar de Tráfego Aéreo</h3>
          <p className="text-xs text-muted-foreground font-sans">Raio de 150km do SBRF</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-muted-foreground font-sans">{arrivals} Chegando</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span className="text-xs text-muted-foreground font-sans">{departures} Partindo</span>
          </div>
        </div>
      </div>

      {/* Escopo do radar limpo (sem sombra sobreposta) */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square max-h-[360px] sm:max-h-[380px] mx-auto p-2"
        style={{ background: "radial-gradient(circle, hsl(var(--card)) 0%, hsl(142 76% 12% / 0.15) 100%)" }}
      >
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Anéis de distância concêntricos */}
          {[20, 35, 50, 65, 80, 95].map((r) => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r / 2}
              fill="none"
              stroke="hsl(142 76% 36% / 0.15)"
              strokeWidth="0.3"
            />
          ))}

          {/* Radiais dos quadrantes */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
            const radians = (angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1="50"
                y1="50"
                x2={50 + Math.cos(radians) * 47}
                y2={50 + Math.sin(radians) * 47}
                stroke="hsl(142 76% 36% / 0.08)"
                strokeWidth="0.3"
              />
            );
          })}

          {/* Pontos Cardeais */}
          <text x="50" y="4" textAnchor="middle" className="fill-muted-foreground text-[3px] font-sans font-medium">N</text>
          <text x="97" y="51" textAnchor="middle" className="fill-muted-foreground text-[3px] font-sans font-medium">E</text>
          <text x="50" y="99" textAnchor="middle" className="fill-muted-foreground text-[3px] font-sans font-medium">S</text>
          <text x="3" y="51" textAnchor="middle" className="fill-muted-foreground text-[3px] font-sans font-medium">W</text>

          {/* Feixe de varredura (Sweep Beam) */}
          <defs>
            <linearGradient id="radarSweepGradient" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="hsl(142 76% 36% / 0)" />
              <stop offset="100%" stopColor="hsl(142 76% 36% / 0.35)" />
            </linearGradient>
          </defs>
          <path
            d={`M 50 50 L ${50 + Math.cos((sweepAngle * Math.PI) / 180) * 47} ${50 + Math.sin((sweepAngle * Math.PI) / 180) * 47} A 47 47 0 0 0 ${50 + Math.cos(((sweepAngle - 25) * Math.PI) / 180) * 47} ${50 + Math.sin(((sweepAngle - 25) * Math.PI) / 180) * 47} Z`}
            fill="url(#radarSweepGradient)"
          />
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((sweepAngle * Math.PI) / 180) * 47}
            y2={50 + Math.sin((sweepAngle * Math.PI) / 180) * 47}
            stroke="hsl(142 76% 45% / 0.8)"
            strokeWidth="0.5"
          />

          {/* Aeroporto Central (SBRF / REC) */}
          <circle cx="50" cy="50" r="1.8" fill="hsl(142 76% 36%)" className="animate-pulse" />
          <text x="50" y="54" textAnchor="middle" className="fill-emerald-400 text-[2.5px] font-bold font-sans">
            SBRF
          </text>

          {/* Aeronaves em Voo */}
          {planes.map((plane) => {
            const angleFromCenter = (Math.atan2(plane.y - 50, plane.x - 50) * 180) / Math.PI;
            const diffAngle = Math.abs(((sweepAngle - angleFromCenter + 360) % 360));
            const isHighlighted = diffAngle < 30;

            const color = plane.type === "arrival" ? "hsl(142 76% 40%)" : "hsl(199 89% 50%)";
            const trailAngleRad = (plane.angle * Math.PI) / 180;

            return (
              <g key={plane.id}>
                {/* Rastro da aeronave estritamente atrás da cauda */}
                {[1, 2, 3].map((step) => (
                  <circle
                    key={step}
                    cx={plane.x - Math.cos(trailAngleRad) * (step * 1.3)}
                    cy={plane.y - Math.sin(trailAngleRad) * (step * 1.3)}
                    r={0.45 - step * 0.1}
                    fill={color}
                    opacity={0.4 - step * 0.1}
                  />
                ))}

                {/* Ícone da aeronave orientado para a frente de voo */}
                <g
                  transform={`translate(${plane.x}, ${plane.y}) rotate(${plane.angle + 90})`}
                  className={cn(
                    "transition-opacity duration-300",
                    isHighlighted ? "opacity-100" : "opacity-80"
                  )}
                >
                  {/* Fuselagem */}
                  <rect x="-0.35" y="-1.5" width="0.7" height="2.8" rx="0.35" fill={color} />
                  {/* Asas principais */}
                  <path d="M -0.35 -0.2 L -2.2 0.9 L -2.2 1.3 L -0.35 0.6 Z" fill={color} />
                  <path d="M 0.35 -0.2 L 2.2 0.9 L 2.2 1.3 L 0.35 0.6 Z" fill={color} />
                  {/* Leme de cauda */}
                  <path d="M -0.35 1.1 L -1.1 1.8 L -1.1 2.1 L -0.35 1.7 Z" fill={color} />
                  <path d="M 0.35 1.1 L 1.1 1.8 L 1.1 2.1 L 0.35 1.7 Z" fill={color} />
                  {/* Destaque do bico */}
                  <ellipse cx="0" cy="-1.3" rx="0.2" ry="0.3" fill="white" opacity="0.6" />
                </g>

                {/* Halo de detecção na passagem da varredura */}
                {isHighlighted && (
                  <circle
                    cx={plane.x}
                    cy={plane.y}
                    r="2.6"
                    fill="none"
                    stroke={color}
                    strokeWidth="0.35"
                    opacity="0.7"
                  />
                )}

                {/* Etiqueta de voo na varredura */}
                {isHighlighted && (
                  <g>
                    <rect
                      x={plane.x + 2}
                      y={plane.y - 3}
                      width="14"
                      height="5.5"
                      rx="0.5"
                      fill="hsl(var(--card) / 0.95)"
                      stroke={color}
                      strokeWidth="0.25"
                    />
                    <text
                      x={plane.x + 2.8}
                      y={plane.y - 0.8}
                      className="fill-foreground font-sans"
                      fontSize="1.9"
                      fontWeight="600"
                    >
                      ✈ {plane.flightNumber}
                    </text>
                    <text
                      x={plane.x + 2.8}
                      y={plane.y + 1.5}
                      className="fill-muted-foreground font-sans"
                      fontSize="1.4"
                    >
                      {Math.round(plane.altitude / 1000)}km alt
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Painel inferior de estatísticas limpo (sem sombra sobreposta ao radar) */}
      <div className="border-t border-border bg-secondary/30 px-4 py-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-base sm:text-lg font-bold text-foreground font-sans">{planes.length}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Aeronaves</p>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-emerald-400 font-sans">{arrivals}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Chegando</p>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-sky-400 font-sans">{departures}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Partindo</p>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-foreground font-sans">150km</p>
            <p className="text-[10px] text-muted-foreground font-sans">Alcance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
