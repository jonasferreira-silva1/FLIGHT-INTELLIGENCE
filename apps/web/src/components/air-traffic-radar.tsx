"use client"

import { useEffect, useState, useRef } from "react"
import { useFlightStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface RadarPlane {
  id: string
  x: number
  y: number
  angle: number
  speed: number
  airline: string
  flightNumber: string
  altitude: number
  type: "arrival" | "departure"
}

export function AirTrafficRadar() {
  // ✅ Adaptado: usa campos reais (destination, callsign) em vez de mock (type, flightNumber, position)
  const { flights, positions } = useFlightStore()
  const [planes, setPlanes] = useState<RadarPlane[]>([])
  const [sweepAngle, setSweepAngle] = useState(0)
  const animationRef = useRef<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize planes based on flights
  useEffect(() => {
    const initialPlanes: RadarPlane[] = flights.slice(0, 12).map((flight, index) => {
      // ✅ Adaptado: isArrival usa destination em vez de flight.type
      const isArrival = flight.destination === 'REC'
      const angle = (index * 30) + Math.random() * 15
      const distance = isArrival ? 0.7 + Math.random() * 0.25 : 0.2 + Math.random() * 0.3
      const radians = (angle * Math.PI) / 180
      
      // ✅ Adaptado: altitude buscada em positions, fallback para 10000
      const position = positions.find(p => p.flightId === flight.id)
      const altitude = position?.altitude ?? 10000 + Math.random() * 25000

      return {
        id: flight.id,
        x: 50 + Math.cos(radians) * distance * 45,
        y: 50 + Math.sin(radians) * distance * 45,
        angle: isArrival ? angle + 180 : angle,
        speed: 0.02 + Math.random() * 0.03,
        airline: flight.airline,
        // ✅ Adaptado: usa callsign em vez de flightNumber
        flightNumber: flight.callsign,
        altitude,
        type: isArrival ? "arrival" : "departure",
      }
    })
    setPlanes(initialPlanes)
  }, [flights, positions])

  // Animate planes and radar sweep
  useEffect(() => {
    let lastTime = 0
    
    const animate = (time: number) => {
      const delta = time - lastTime
      lastTime = time

      setSweepAngle(prev => (prev + 0.5) % 360)

      setPlanes(prevPlanes => 
        prevPlanes.map(plane => {
          const radians = (plane.angle * Math.PI) / 180
          const moveX = Math.cos(radians) * plane.speed * (delta / 16)
          const moveY = Math.sin(radians) * plane.speed * (delta / 16)
          
          let newX = plane.x + (plane.type === "arrival" ? -moveX : moveX)
          let newY = plane.y + (plane.type === "arrival" ? -moveY : moveY)

          const distanceFromCenter = Math.sqrt(Math.pow(newX - 50, 2) + Math.pow(newY - 50, 2))
          
          if (plane.type === "arrival" && distanceFromCenter < 5) {
            const newAngle = Math.random() * 360
            const newRadians = (newAngle * Math.PI) / 180
            newX = 50 + Math.cos(newRadians) * 45
            newY = 50 + Math.sin(newRadians) * 45
            return { ...plane, x: newX, y: newY, angle: newAngle + 180 }
          }
          
          if (plane.type === "departure" && distanceFromCenter > 48) {
            const newAngle = Math.random() * 360
            const newRadians = (newAngle * Math.PI) / 180
            newX = 50 + Math.cos(newRadians) * 10
            newY = 50 + Math.sin(newRadians) * 10
            return { ...plane, x: newX, y: newY, angle: newAngle }
          }

          return { ...plane, x: newX, y: newY }
        })
      )

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const arrivals = planes.filter(p => p.type === "arrival").length
  const departures = planes.filter(p => p.type === "departure").length

  return (
    <div className="relative bg-card border border-border rounded-xl overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-sm font-semibold text-foreground">Radar de Tráfego Aéreo</h3>
        <p className="text-xs text-muted-foreground">Raio de 150km do SBRF</p>
      </div>
      
      <div className="absolute top-4 right-4 z-10 flex gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-muted-foreground">{arrivals} Chegando</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          <span className="text-xs text-muted-foreground">{departures} Partindo</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-square max-h-[400px] mx-auto"
        style={{ background: "radial-gradient(circle, hsl(var(--card)) 0%, hsl(142 76% 10% / 0.3) 100%)" }}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
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
          
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
            const radians = (angle * Math.PI) / 180
            return (
              <line
                key={angle}
                x1="50"
                y1="50"
                x2={50 + Math.cos(radians) * 47}
                y2={50 + Math.sin(radians) * 47}
                stroke="hsl(142 76% 36% / 0.1)"
                strokeWidth="0.3"
              />
            )
          })}

          <text x="50" y="4" textAnchor="middle" className="fill-muted-foreground text-[3px] font-medium">N</text>
          <text x="97" y="51" textAnchor="middle" className="fill-muted-foreground text-[3px] font-medium">E</text>
          <text x="50" y="99" textAnchor="middle" className="fill-muted-foreground text-[3px] font-medium">S</text>
          <text x="3" y="51" textAnchor="middle" className="fill-muted-foreground text-[3px] font-medium">W</text>

          <defs>
            <linearGradient id="sweepGradient" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="hsl(142 76% 36% / 0)" />
              <stop offset="100%" stopColor="hsl(142 76% 36% / 0.4)" />
            </linearGradient>
          </defs>
          <path
            d={`M 50 50 L ${50 + Math.cos((sweepAngle * Math.PI) / 180) * 47} ${50 + Math.sin((sweepAngle * Math.PI) / 180) * 47} A 47 47 0 0 0 ${50 + Math.cos(((sweepAngle - 30) * Math.PI) / 180) * 47} ${50 + Math.sin(((sweepAngle - 30) * Math.PI) / 180) * 47} Z`}
            fill="url(#sweepGradient)"
            className="opacity-60"
          />
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((sweepAngle * Math.PI) / 180) * 47}
            y2={50 + Math.sin((sweepAngle * Math.PI) / 180) * 47}
            stroke="hsl(142 76% 36% / 0.8)"
            strokeWidth="0.5"
          />

          <circle cx="50" cy="50" r="2" fill="hsl(142 76% 36%)" className="animate-pulse" />
          <text x="50" y="54" textAnchor="middle" className="fill-emerald-400 text-[2.5px] font-bold">SBRF</text>

          {planes.map((plane) => {
            const isHighlighted = Math.abs(((sweepAngle - Math.atan2(plane.y - 50, plane.x - 50) * 180 / Math.PI + 360) % 360)) < 30
            
            return (
              <g key={plane.id}>
                <line
                  x1={plane.x}
                  y1={plane.y}
                  x2={plane.x - Math.cos((plane.angle * Math.PI) / 180) * 3}
                  y2={plane.y - Math.sin((plane.angle * Math.PI) / 180) * 3}
                  stroke={plane.type === "arrival" ? "hsl(142 76% 36% / 0.5)" : "hsl(199 89% 48% / 0.5)"}
                  strokeWidth="0.4"
                />
                
                <g transform={`translate(${plane.x}, ${plane.y}) rotate(${plane.angle + 90})`}>
                  <path
                    d="M 0 -1.2 L 0.8 0.8 L 0 0.4 L -0.8 0.8 Z"
                    fill={plane.type === "arrival" ? "hsl(142 76% 36%)" : "hsl(199 89% 48%)"}
                    className={cn(
                      "transition-opacity duration-300",
                      isHighlighted ? "opacity-100" : "opacity-70"
                    )}
                  />
                </g>

                {isHighlighted && (
                  <g>
                    <rect
                      x={plane.x + 1.5}
                      y={plane.y - 2.5}
                      width="12"
                      height="5"
                      rx="0.5"
                      fill="hsl(var(--card) / 0.9)"
                      stroke={plane.type === "arrival" ? "hsl(142 76% 36% / 0.5)" : "hsl(199 89% 48% / 0.5)"}
                      strokeWidth="0.2"
                    />
                    <text 
                      x={plane.x + 2} 
                      y={plane.y - 0.5} 
                      className="fill-foreground text-[2px] font-medium"
                    >
                      {plane.flightNumber}
                    </text>
                    <text 
                      x={plane.x + 2} 
                      y={plane.y + 1.5} 
                      className="fill-muted-foreground text-[1.5px]"
                    >
                      {Math.round(plane.altitude).toLocaleString()}m
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `conic-gradient(from ${sweepAngle}deg at 50% 50%, transparent 0deg, hsl(142 76% 36% / 0.05) 20deg, transparent 30deg)`,
          }}
        />
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-card via-card/80 to-transparent p-4 pt-8">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{planes.length}</p>
            <p className="text-[10px] text-muted-foreground">Aeronaves</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-400">{arrivals}</p>
            <p className="text-[10px] text-muted-foreground">Chegando</p>
          </div>
          <div>
            <p className="text-lg font-bold text-sky-400">{departures}</p>
            <p className="text-[10px] text-muted-foreground">Partindo</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">150km</p>
            <p className="text-[10px] text-muted-foreground">Alcance</p>
          </div>
        </div>
      </div>
    </div>
  )
}
