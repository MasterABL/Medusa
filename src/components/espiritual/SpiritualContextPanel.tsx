'use client';

import React, { useState, useEffect } from 'react';
import { ESPIRITUAL_DATA } from './spiritualFixtures';

export function SpiritualContextPanel() {
  const data = ESPIRITUAL_DATA;
  const [silenceMinutes, setSilenceMinutes] = useState<number>(15);
  const [silenceSeconds, setSilenceSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSilenceSeconds((prev) => {
        if (prev === 0) {
          setSilenceMinutes((m) => {
            if (m === 0) {
              setTimerRunning(false);
              return 0;
            }
            return m - 1;
          });
          return 59;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  return (
    <div className="space-y-6">
      {/* 1. Vigília & Hora Canônica */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Vigília Contínua
          </span>
          <span className="text-[11px] font-mono text-[#D4A373] font-semibold tabular-nums">
            Dia {data.sanctuaryState.vigilDays}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-serif font-bold tracking-tight text-text-primary">
            {data.sanctuaryState.currentHourName}
          </span>
          <span className="text-[11px] text-[#D4A373] font-mono">Luz Serena</span>
        </div>
        <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#D4A373] h-full w-[82%]" />
        </div>
        <div className="text-[10px] text-text-muted font-mono pt-0.5 flex justify-between">
          <span>{data.sanctuaryState.cycleName}</span>
          <span className="font-semibold text-text-secondary">Ofício das Vésperas</span>
        </div>
      </div>

      {/* 2. Temporizador de Silêncio / Hesicasmo */}
      <div className="bg-surface-secondary border border-[#D4A373]/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Recolhimento Silencioso
          </span>
          <span className="material-symbols-outlined text-[16px] text-[#D4A373]">
            spa
          </span>
        </div>

        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-text-primary tabular-nums">
            {String(silenceMinutes).padStart(2, '0')}:{String(silenceSeconds).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-mono text-text-secondary mt-0.5">
            Oração do Coração
          </div>
        </div>

        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setTimerRunning(!timerRunning)}
            className="px-4 py-1 rounded-full bg-[#D4A373] text-[#1C2420] text-[11px] font-mono font-bold hover:opacity-90 transition-all shadow-subtle"
          >
            {timerRunning ? 'Pausar Silêncio' : 'Iniciar 15 min'}
          </button>
        </div>
      </div>

      {/* 3. Caderno de Intenções de Oração */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Caderno de Intenções
          </span>
          <span className="text-[10px] font-mono text-text-muted tabular-nums">
            {data.intentionsLedger.length} Ativas
          </span>
        </div>

        <div className="space-y-2">
          {data.intentionsLedger.map((item) => (
            <div key={item.id} className="bg-surface-elevated border border-border/70 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="uppercase text-[#D4A373] font-bold">{item.category}</span>
                <span className="text-text-muted">{item.day}</span>
              </div>
              <p className="text-[11px] font-serif text-text-primary leading-snug">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
