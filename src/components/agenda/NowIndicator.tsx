/**
 * Medusa — Now Indicator
 *
 * Linha horizontal em tempo real com indicador de horário proporcional na timeline.
 * Atualiza dinamicamente a cada 60 segundos.
 */

'use client';

import React, { useState, useEffect } from 'react';

interface NowIndicatorProps {
  dayStartHour?: number; // padrão 6
  totalHours?: number;   // padrão 17 (06:00 às 23:00)
}

export function NowIndicator({
  dayStartHour = 6,
  totalHours = 17,
}: NowIndicatorProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000); // atualiza a cada 30 segundos
    return () => clearInterval(timer);
  }, []);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startLimit = dayStartHour * 60;
  const totalMinutes = totalHours * 60;

  // Se o horário estiver fora da visualização da timeline (ex: de madrugada), não renderizar
  if (currentMinutes < startLimit || currentMinutes > startLimit + totalMinutes) {
    return null;
  }

  const topPercentage = ((currentMinutes - startLimit) / totalMinutes) * 100;
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  return (
    <div
      aria-label={`Horário atual: ${timeString}`}
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center transition-all duration-500 ease-out"
      style={{ top: `${topPercentage}%` }}
    >
      {/* Marcador pontual e pill com o horário */}
      <div className="flex items-center -ml-2 sm:-ml-1">
        <span className="w-2.5 h-2.5 rounded-full bg-medusa-primary ring-4 ring-medusa-primary/20 shadow-sm flex-shrink-0 animate-pulse" />
        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-medusa-primary text-[#1C2420] shadow-sm tabular-nums">
          {timeString}
        </span>
      </div>

      {/* Linha discreta que corta toda a timeline */}
      <div className="flex-1 h-[1.5px] bg-medusa-primary/80 ml-2 shadow-[0_0_8px_rgba(113,219,210,0.4)]" />
    </div>
  );
}
