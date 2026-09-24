'use client';

import React from 'react';
import { LessonBlock, TrackDefinition } from './types';
import { getTrackAccent } from './trackAccent';

interface LessonWrittenContentProps {
  trackDef: TrackDefinition;
  onAskTutor: () => void;
}

/**
 * A AULA ESCRITA do Modo "Resumo" (Round 7 §6/§7/§9). Substitui, quando este modo está ativo, a
 * lista de "Pontos Chave" (feita para acompanhar o vídeo, não para ser lida sozinha) e removeu de
 * vez o aviso de sistema "Modo Resumo: a aula em texto estruturado, sem o vídeo..." — o usuário
 * está lendo uma aula, não recebendo metadata sobre o estado do player.
 *
 * Arquitetura de blocos (ConceptBlock/FormulaBlock/ExampleBlock/ApplicationBlock/ComparisonBlock,
 * ver types.ts) pensada para uma futura geração por IA preencher o mesmo contrato — o conteúdo
 * hoje é FIXTURE por trilha (`trackDef.writtenLesson`, ver educationFixtures.ts), nunca gerado em
 * tempo real. Não existe hoje nenhuma trilha sem esse campo, mas o fallback abaixo é honesto caso
 * uma trilha nova seja adicionada sem conteúdo ainda.
 */
export function LessonWrittenContent({ trackDef, onAskTutor }: LessonWrittenContentProps) {
  const accent = getTrackAccent(trackDef.id);
  const writtenLesson = trackDef.writtenLesson;

  if (!writtenLesson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
        <span className="material-symbols-outlined text-[28px] text-text-muted">subject</span>
        <p className="text-[12px] text-text-muted max-w-xs">
          A aula escrita desta trilha ainda não foi produzida. Volte para &quot;Aula&quot; ou &quot;Aula + Resumo&quot;.
        </p>
      </div>
    );
  }

  return (
    <div id="lesson-written-content" className="flex-1 overflow-y-auto">
      <article className="p-5 sm:p-7 max-w-2xl mx-auto flex flex-col gap-6">
        <header className="stagger-item flex flex-col gap-2">
          <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${accent.text}`}>
            {trackDef.lesson.discipline} · Aula Escrita
          </span>
          <h2 className="text-[19px] sm:text-[21px] font-bold tracking-tight text-text-primary leading-snug">
            {trackDef.lesson.topic}
          </h2>
          <p className="text-[13px] text-text-secondary leading-relaxed">{writtenLesson.intro}</p>
        </header>

        <div className="flex flex-col gap-4">
          {writtenLesson.blocks.map((block, i) => (
            <LessonBlockCard key={block.id} block={block} accent={accent} index={i} />
          ))}
        </div>

        <div
          className="stagger-item flex items-center justify-between gap-3 flex-wrap p-4 rounded-2xl bg-surface-secondary/50 border border-border/60"
          style={{ animationDelay: `${(writtenLesson.blocks.length + 1) * 45}ms` }}
        >
          <p className="text-[12px] text-text-secondary max-w-sm">
            Ficou alguma dúvida sobre {trackDef.lesson.topic.split('·')[0].trim()}? O Tutor está com todo o
            contexto desta aula.
          </p>
          <button
            type="button"
            id="btn-ask-tutor-from-lesson"
            onClick={onAskTutor}
            className={`btn-interactive flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold ${accent.solidBg} ${accent.solidText} shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0`}
          >
            <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
            <span>Perguntar ao Tutor</span>
          </button>
        </div>
      </article>
    </div>
  );
}

const BLOCK_ICON: Record<LessonBlock['type'], string> = {
  concept: 'lightbulb',
  formula: 'functions',
  example: 'science',
  application: 'bolt',
  comparison: 'compare_arrows',
};

const BLOCK_LABEL: Record<LessonBlock['type'], string> = {
  concept: 'Conceito',
  formula: 'Fórmula',
  example: 'Exemplo',
  application: 'Aplicação',
  comparison: 'Comparação',
};

function LessonBlockCard({
  block,
  accent,
  index,
}: {
  block: LessonBlock;
  accent: ReturnType<typeof getTrackAccent>;
  index: number;
}) {
  return (
    <section
      id={`lesson-block-${block.id}`}
      className={`stagger-item p-4 sm:p-5 rounded-2xl bg-surface border ${accent.softBorder} shadow-subtle flex flex-col gap-2.5`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-lg ${accent.softBg} ${accent.text} flex items-center justify-center flex-shrink-0`}>
          <span className="material-symbols-outlined text-[14px]">{BLOCK_ICON[block.type]}</span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          {BLOCK_LABEL[block.type]}
        </span>
      </div>

      <h3 className="text-[14px] font-semibold text-text-primary">{block.title}</h3>

      {block.formula && (
        <div
          className={`self-start px-4 py-2 rounded-xl bg-surface-secondary/70 border ${accent.softBorder} font-mono text-[15px] font-semibold ${accent.text} tracking-wide`}
        >
          {block.formula}
          {block.formulaLabel && (
            <span className="block text-[10px] font-sans font-normal text-text-muted mt-1 tracking-normal">
              {block.formulaLabel}
            </span>
          )}
        </div>
      )}

      <p className="text-[12.5px] text-text-secondary leading-relaxed">{block.body}</p>

      {block.items && block.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
          {block.items.map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-xl bg-surface-secondary/50 border border-border/50 flex flex-col gap-1"
            >
              <span className={`text-[10px] font-mono font-semibold uppercase tracking-wide ${accent.text}`}>
                {item.label}
              </span>
              <span className="text-[12px] text-text-secondary leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
