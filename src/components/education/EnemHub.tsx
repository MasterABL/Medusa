'use client';

import React from 'react';
import { TrackDefinition, TrackModuleItem, CronogramaBlock } from './types';
import { TrackModuleList } from './TrackModuleList';

interface EnemHubProps {
  trackDef: TrackDefinition;
  trackItems: TrackModuleItem[];
}

const CRONOGRAMA_TYPE_STYLE: Record<CronogramaBlock['type'], { badge: string; label: string; dot: string }> = {
  estudo: { badge: 'bg-[#71DBD2]/15 text-[#18534B] dark:text-[#71DBD2] border-[#71DBD2]/30', label: 'Estudo', dot: 'bg-[#71DBD2]' },
  simulado: { badge: 'bg-[#FFF18C]/25 text-[#5C4A00] dark:text-[#FFF18C] border-[#FFF18C]/40', label: 'Simulado', dot: 'bg-[#FFF18C]' },
  revisao: { badge: 'bg-medusa-support/15 text-[#1B502C] dark:text-medusa-support border-medusa-support/30', label: 'Revisão', dot: 'bg-medusa-support' },
  prova: { badge: 'bg-[#D0EAA3]/25 text-[#3D4C1D] dark:text-[#D0EAA3] border-[#D0EAA3]/40', label: 'Prova', dot: 'bg-[#D0EAA3]' },
};

/**
 * Hub do ENEM — trilha orientada a PLANEJAMENTO. O Cronograma é a seção principal (não uma
 * lista genérica de tarefas): timeline com dimensão temporal explícita (data + dia da semana),
 * tipo do bloco (estudo/simulado/revisão/prova) e o que estudar em cada um.
 */
export function EnemHub({ trackDef, trackItems }: EnemHubProps) {
  const cronograma = trackDef.cronograma ?? [];

  return (
    <div className="flex flex-col gap-8">
      {cronograma.length > 0 && (
        <section id="enem-cronograma" aria-label="Cronograma de Preparação" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
                Cronograma · Preparação ENEM
              </span>
              <div className="h-px bg-border/60 w-16" />
            </div>
            <span className="text-[11px] font-mono text-text-muted">Próximos {cronograma.length} blocos</span>
          </div>

          <div className="relative pl-6 flex flex-col gap-3">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border/60" aria-hidden="true" />
            {cronograma.map((block, idx) => {
              const style = CRONOGRAMA_TYPE_STYLE[block.type];
              const isNext = idx === 0;
              return (
                <div key={block.id} className="relative flex items-start gap-4">
                  <span
                    className={`absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 border-surface ${style.dot} ${
                      isNext ? 'living-pulse' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <div
                    className={`flex-1 p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isNext ? 'bg-surface border-medusa-primary/50 shadow-calm' : 'bg-surface/70 border-border/60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex flex-col items-center flex-shrink-0 w-12">
                        <span className="text-[10px] font-mono uppercase text-text-muted">{block.weekday}</span>
                        <span className="text-[13px] font-bold text-text-primary tabular-nums">{block.date}</span>
                      </div>
                      <div className="space-y-0.5 min-w-0 border-l border-border/50 pl-3">
                        <h4 className="text-[13px] font-semibold text-text-primary tracking-tight truncate">
                          {block.label}
                        </h4>
                        <p className="text-[11px] text-text-secondary truncate">{block.description}</p>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border self-start sm:self-center ${style.badge}`}
                    >
                      {style.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <TrackModuleList
        title={`Conteúdos por Habilidade · ${trackDef.name}`}
        domainLabel={trackDef.domainLabel}
        items={trackItems}
      />
    </div>
  );
}
