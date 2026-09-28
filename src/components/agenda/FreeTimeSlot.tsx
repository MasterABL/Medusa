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
      id={`free-slot-${slot.start.replace(':', '-')}`}
      data-freetime-slot="true"
      style={{
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
      }}
      className="absolute left-1 sm:left-2 right-1 sm:right-2 z-0 group pointer-events-auto rounded-lg border border-dashed border-border/40 hover:border-border/80 bg-surface-subtle/30 hover:bg-surface-subtle/60 transition-colors duration-150 flex items-center justify-between px-3"
      title={`Intervalo livre: ${slot.start} às ${slot.end} (${slot.label})${slot.commuteNote ? ` · ${slot.commuteNote}` : ''}`}
    >
      <div className="flex items-center gap-2 text-text-muted/70 group-hover:text-text-secondary transition-colors overflow-hidden">
        <span className="material-symbols-outlined text-[14px] flex-shrink-0">hourglass_empty</span>
        <span id="freetime-usable-window" className="text-[11px] font-mono tracking-tight tabular-nums truncate">
          {slot.label}
        </span>
        {slot.commuteNote && (
          <span className="hidden xl:inline text-[10px] text-amber-700/80 dark:text-amber-300/80 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-400/20 truncate">
            {slot.commuteNote}
          </span>
        )}
      </div>

      {onSelectSlot && (
        <button
          type="button"
          onClick={() => onSelectSlot(slot.usableStart || slot.start, slot.usableEnd || slot.end)}
          aria-label={`Agendar no período livre das ${slot.start} às ${slot.end}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-medusa-primary hover:underline flex items-center gap-1 focus:opacity-100 focus:outline-none flex-shrink-0 ml-2"
        >
          <span className="material-symbols-outlined text-[13px]">add</span>
          <span>Encaixar bloco</span>
        </button>
      )}
    </div>
  );
}
