/**
 * Medusa — Custom Time Picker Component
 *
 * Seletor de horário integrado aos tokens visuais e tipografia do Medusa (Epilogue).
 * Substitui o componente nativo cru do navegador com:
 * - Digitação direta de horas (00–23) e minutos (00–59)
 * - Botões de incremento/decremento rápido e presets (+15m, +30m, +1h, +1h30)
 * - Visualização contínua do início, fim e duração total calculada
 * - Conformidade com temas Claro e Escuro, bordas suaves e foco acessível
 */

'use client';

import React, { useState, useEffect } from 'react';
import { calculateDurationMinutes } from './agendaHelpers';

interface MedusaTimePickerProps {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
}

export function MedusaTimePicker({
  startTime,
  endTime,
  onChange,
  disabled = false,
}: MedusaTimePickerProps) {
  const [startH, setStartH] = useState('10');
  const [startM, setStartM] = useState('00');
  const [endH, setEndH] = useState('11');
  const [endM, setEndM] = useState('00');

  useEffect(() => {
    if (startTime && startTime.includes(':')) {
      const [h, m] = startTime.split(':');
      setStartH(h.padStart(2, '0'));
      setStartM(m.padStart(2, '0'));
    }
  }, [startTime]);

  useEffect(() => {
    if (endTime && endTime.includes(':')) {
      const [h, m] = endTime.split(':');
      setEndH(h.padStart(2, '0'));
      setEndM(m.padStart(2, '0'));
    }
  }, [endTime]);

  const updateTimes = (newStartH: string, newStartM: string, newEndH: string, newEndM: string) => {
    const sH = Math.min(23, Math.max(0, parseInt(newStartH, 10) || 0)).toString().padStart(2, '0');
    const sM = Math.min(59, Math.max(0, parseInt(newStartM, 10) || 0)).toString().padStart(2, '0');
    let eH = Math.min(23, Math.max(0, parseInt(newEndH, 10) || 0)).toString().padStart(2, '0');
    let eM = Math.min(59, Math.max(0, parseInt(newEndM, 10) || 0)).toString().padStart(2, '0');

    // Garantir que fim seja após o início
    const startTotal = parseInt(sH, 10) * 60 + parseInt(sM, 10);
    const endTotal = parseInt(eH, 10) * 60 + parseInt(eM, 10);
    if (endTotal <= startTotal) {
      const newEndTotal = Math.min(24 * 60 - 1, startTotal + 60);
      eH = Math.floor(newEndTotal / 60).toString().padStart(2, '0');
      eM = (newEndTotal % 60).toString().padStart(2, '0');
    }

    setStartH(sH);
    setStartM(sM);
    setEndH(eH);
    setEndM(eM);
    onChange(`${sH}:${sM}`, `${eH}:${eM}`);
  };

  const handleApplyPresetDuration = (extraMinutes: number) => {
    const sTotal = parseInt(startH, 10) * 60 + parseInt(startM, 10);
    const newEndTotal = Math.min(24 * 60 - 1, sTotal + extraMinutes);
    const nEH = Math.floor(newEndTotal / 60).toString().padStart(2, '0');
    const nEM = (newEndTotal % 60).toString().padStart(2, '0');
    setEndH(nEH);
    setEndM(nEM);
    onChange(`${startH}:${startM}`, `${nEH}:${nEM}`);
  };

  const durationMin = calculateDurationMinutes(`${startH}:${startM}`, `${endH}:${endM}`);

  return (
    <div
      id="medusa-time-picker"
      className={`space-y-3 p-3.5 bg-surface-secondary/50 rounded-2xl border border-border/70 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Início */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Horário de Início
          </span>
          <div className="flex items-center gap-1 bg-surface border border-border/80 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-focus-ring">
            <span className="material-symbols-outlined text-[15px] text-text-muted">schedule</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={startH}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setStartH(val);
                if (val.length === 2) updateTimes(val, startM, endH, endM);
              }}
              onBlur={() => updateTimes(startH, startM, endH, endM)}
              className="w-7 text-center font-mono font-semibold text-[13px] text-text-primary bg-transparent focus:outline-none"
              aria-label="Hora de início"
            />
            <span className="font-mono text-text-muted text-[13px]">:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={startM}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setStartM(val);
                if (val.length === 2) updateTimes(startH, val, endH, endM);
              }}
              onBlur={() => updateTimes(startH, startM, endH, endM)}
              className="w-7 text-center font-mono font-semibold text-[13px] text-text-primary bg-transparent focus:outline-none"
              aria-label="Minuto de início"
            />
          </div>
        </div>

        {/* Término */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Horário de Término
          </span>
          <div className="flex items-center gap-1 bg-surface border border-border/80 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-focus-ring">
            <span className="material-symbols-outlined text-[15px] text-text-muted">flag</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={endH}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setEndH(val);
                if (val.length === 2) updateTimes(startH, startM, val, endM);
              }}
              onBlur={() => updateTimes(startH, startM, endH, endM)}
              className="w-7 text-center font-mono font-semibold text-[13px] text-text-primary bg-transparent focus:outline-none"
              aria-label="Hora de término"
            />
            <span className="font-mono text-text-muted text-[13px]">:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={endM}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setEndM(val);
                if (val.length === 2) updateTimes(startH, startM, endH, val);
              }}
              onBlur={() => updateTimes(startH, startM, endH, endM)}
              className="w-7 text-center font-mono font-semibold text-[13px] text-text-primary bg-transparent focus:outline-none"
              aria-label="Minuto de término"
            />
          </div>
        </div>
      </div>

      {/* Duração & Presets Rápidos */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary">
          <span className="text-text-muted">Duração calculada:</span>
          <span className="px-2 py-0.5 rounded-full bg-medusa-primary/15 text-[#18534B] dark:text-[#71DBD2] font-semibold border border-medusa-primary/30 tabular-nums">
            {Math.floor(durationMin / 60) > 0 ? `${Math.floor(durationMin / 60)}h` : ''}
            {durationMin % 60 > 0 ? ` ${durationMin % 60}m` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {[
            { label: '+30m', min: 30 },
            { label: '+45m', min: 45 },
            { label: '+1h', min: 60 },
            { label: '+1h30', min: 90 },
            { label: '+2h', min: 120 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPresetDuration(preset.min)}
              className="btn-interactive px-2 py-0.5 text-[10px] font-mono text-text-muted hover:text-text-primary bg-surface hover:bg-surface-secondary border border-border/60 rounded-lg transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
