'use client';

import React from 'react';
import { WEEKDAY_LONG, WEEKDAY_SHORT } from './bodyLabels';

export interface WeeklyRhythmStreamProps {
  preferredDays: number[];
  todayIdx: number;
  activityLabel: string;
  durationMinutes: number;
}

/**
 * Fluxo Semanal Orgânico — substitui a grade rígida por uma onda de ritmo vivo.
 * Mostra dias de atividade como cristas de energia e dias de descanso como vales de recuperação reconstrutora.
 */
export function WeeklyRhythmStream({
  preferredDays,
  todayIdx,
  activityLabel,
  durationMinutes,
}: WeeklyRhythmStreamProps) {
  return (
    <div className="cor-stream-root" role="region" aria-label="Ritmo semanal orgânico">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="dm-h2">Ritmo & Fluxo da Semana</h3>
          <p className="dm-muted text-[13px] mt-0.5">Ondas de atividade intercaladas com descanso reparador sustentável.</p>
        </div>
        <span className="dm-chip" data-tone="support">
          {preferredDays.length} sessões na semana
        </span>
      </div>

      <div className="cor-stream-container">
        {/* Fita orgânica conectada */}
        <div className="cor-stream-track" role="list">
          {WEEKDAY_SHORT.map((day, idx) => {
            const isSession = preferredDays.includes(idx);
            const isToday = idx === todayIdx;

            return (
              <div
                key={day}
                role="listitem"
                className={`cor-stream-node ${isSession ? 'cor-node-energy' : 'cor-node-rest'} ${isToday ? 'cor-node-today' : ''}`}
                aria-label={`${WEEKDAY_LONG[idx]}: ${isSession ? `${activityLabel}, ${durationMinutes} minutos` : 'Descanso ativo'}${isToday ? ' (hoje)' : ''}`}
              >
                <div className="cor-node-pill">
                  <div className="cor-node-header">
                    <span className="cor-node-day">{day}</span>
                    {isToday && <span className="cor-today-badge">Hoje</span>}
                  </div>

                  <div className="cor-node-icon-wrap" aria-hidden="true">
                    <span className="material-symbols-outlined text-[18px]">
                      {isSession ? 'fitness_center' : 'self_improvement'}
                    </span>
                  </div>

                  <div className="cor-node-meta">
                    <span className="cor-node-type">{isSession ? `${durationMinutes}m` : 'Pausa'}</span>
                    <span className="cor-node-desc">{isSession ? 'Atividade' : 'Recuperação'}</span>
                  </div>
                </div>

                {/* Linha de conexão fluida */}
                {idx < 6 && <span className="cor-stream-link" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>

      <p className="dm-faint text-[12px] mt-3">
        Descansar com intenção é tão importante quanto o exercício: é no repouso que as adaptações musculares e metabólicas acontecem.
      </p>
    </div>
  );
}
