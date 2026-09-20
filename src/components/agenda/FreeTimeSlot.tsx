/**
 * Medusa — Free Time Slot
 *
 * Renderiza intervalos de tempo livre (>= 30 minutos) entre compromissos na timeline.
 * Visual sutil, discreto e não invasivo, sem fingir ser um card de evento falso.
 */

'use client';

import React from 'react';
import { FreeTimeSlot as FreeTimeSlotType } from '@/types/agenda';

interface FreeTimeSlotProps {
  slot: FreeTimeSlotType;
  topPercent: number;
  heightPercent: number;
  onSelectSlot?: (startTime: string, endTime: string) => void;
}

export function FreeTimeSlot({
  slot,
  topPercent,
  heightPercent,
  onSelectSlot,
}: FreeTimeSlotProps) {
  return (
    <div
      style={{
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
      }}
      className="absolute left-14 sm:left-20 right-2 z-0 group pointer-events-auto rounded-lg border border-dashed border-border/40 hover:border-border/80 bg-surface-subtle/30 hover:bg-surface-subtle/60 transition-colors duration-150 flex items-center justify-between px-3"
      title={`Intervalo livre: ${slot.start} às ${slot.end} (${slot.label})`}
    >
      <div className="flex items-center gap-2 text-text-muted/70 group-hover:text-text-secondary transition-colors">
        <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
        <span className="text-[11px] font-mono tracking-tight tabular-nums">
          {slot.label}
        </span>
        <span className="hidden sm:inline text-[10px] text-text-muted/50 font-mono">
          ({slot.start} — {slot.end})
        </span>
      </div>

      {onSelectSlot && (
        <button
          type="button"
          onClick={() => onSelectSlot(slot.start, slot.end)}
          aria-label={`Agendar no período livre das ${slot.start} às ${slot.end}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-medusa-primary hover:underline flex items-center gap-1 focus:opacity-100 focus:outline-none"
        >
          <span className="material-symbols-outlined text-[13px]">add</span>
          <span>Encaixar bloco</span>
        </button>
      )}
    </div>
  );
}
