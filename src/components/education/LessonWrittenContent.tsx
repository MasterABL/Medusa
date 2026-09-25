'use client';

import React from 'react';
import { TrackDefinition, LessonBlock } from './types';
import { getTrackAccent } from './trackAccent';
import { InteractiveSimulationHooke } from './InteractiveSimulationHooke';
import { InteractiveWaveBlock } from './InteractiveWaveBlock';
import { InteractiveEnglishBlock } from './InteractiveEnglishBlock';

interface LessonWrittenContentProps {
  trackDef: TrackDefinition;
  onAskTutor: () => void;
}

/**
 * AULA DIGITAL INTERATIVA (Modo Resumo / Aula Escrita)
 *
 * Supera a limitação de "cards empilhados": a experiência é estruturada como um fluxo pedagógico
 * contínuo com simulações físicas e linguísticas interativas integradas diretamente ao texto:
 * TÍTULO → INTRODUÇÃO EDITORIAL → CONCEITO → SIMULAÇÃO INTERATIVA → DEDUÇÃO DA FÓRMULA → APLICAÇÃO REAL → TUTOR
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

  // Identificação da disciplina para selecionar a simulação pedagógica correta
  const isFaculdade = trackDef.id === 'faculdade';
  const isVestibular = trackDef.id === 'vestibular';
  const isIngles = trackDef.id === 'ingles';

  return (
    <div id="lesson-written-content" className="flex-1 overflow-y-auto w-full">
      <article className="py-6 px-4 sm:px-8 max-w-4xl mx-auto flex flex-col gap-8">
        {/* 1. Header Editorial da Aula Digital */}
        <header className="stagger-item flex flex-col gap-3 border-b border-border/60 pb-6">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${accent.text}`}>
              {trackDef.lesson.discipline} · Aula Digital Interativa
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-muted">
              {trackDef.lesson.estimatedDuration}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary leading-tight">
            {trackDef.lesson.topic}
          </h1>
          <p className="text-[14px] sm:text-[15px] text-text-secondary leading-relaxed font-normal">
            {writtenLesson.intro}
          </p>
        </header>

        {/* 2. Bloco Conceitual Editorial (sem bordas pesadas de card) */}
        {writtenLesson.blocks.find((b) => b.type === 'concept') && (
          <section className="flex flex-col gap-3 pl-4 border-l-2 border-medusa-primary/60">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-medusa-primary">
              Fundamento Teórico
            </span>
            <h2 className="text-lg font-bold text-text-primary">
              {writtenLesson.blocks.find((b) => b.type === 'concept')?.title}
            </h2>
            <p className="text-[13.5px] text-text-secondary leading-relaxed">
              {writtenLesson.blocks.find((b) => b.type === 'concept')?.body}
            </p>
          </section>
        )}

        {/* 3. SIMULAÇÃO PEDAGÓGICA INTERATIVA EM TEMPO REAL */}
        <section aria-label="Visualização e Laboratório Pedagógico" className="flex flex-col gap-2">
          {isFaculdade && <InteractiveSimulationHooke accentColor={accent.solidBg} />}
          {isVestibular && <InteractiveWaveBlock />}
          {isIngles && <InteractiveEnglishBlock />}
        </section>

        {/* 4. Dedução da Fórmula / Estrutura Analítica */}
        {writtenLesson.blocks.find((b) => b.type === 'formula') && (
          <section className="flex flex-col gap-3.5 bg-surface-secondary/40 p-5 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] flex items-center justify-center text-[14px]">
                <span className="material-symbols-outlined text-[15px]">functions</span>
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-primary">
                {writtenLesson.blocks.find((b) => b.type === 'formula')?.title}
              </span>
            </div>

            {writtenLesson.blocks.find((b) => b.type === 'formula')?.formula && (
              <div className="p-4 rounded-xl bg-surface border border-border font-mono text-[18px] font-bold text-medusa-primary tracking-wide shadow-subtle flex items-baseline justify-between flex-wrap gap-2">
                <span>{writtenLesson.blocks.find((b) => b.type === 'formula')?.formula}</span>
                {writtenLesson.blocks.find((b) => b.type === 'formula')?.formulaLabel && (
                  <span className="text-[11px] font-sans font-normal text-text-muted">
                    {writtenLesson.blocks.find((b) => b.type === 'formula')?.formulaLabel}
                  </span>
                )}
              </div>
            )}

            <p className="text-[13px] text-text-secondary leading-relaxed">
              {writtenLesson.blocks.find((b) => b.type === 'formula')?.body}
            </p>
          </section>
        )}

        {/* 5. Aplicações no Cotidiano / Exemplos Práticos */}
        {writtenLesson.blocks.filter((b) => ['example', 'application', 'comparison'].includes(b.type)).map((block) => (
          <section key={block.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                {block.type === 'application' ? 'Aplicação Prática' : block.type === 'comparison' ? 'Análise Comparativa' : 'Exemplo Guiado'}
              </span>
            </div>
            <h3 className="text-base font-semibold text-text-primary">{block.title}</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">{block.body}</p>

            {block.items && block.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {block.items.map((item) => (
                  <div
                    key={item.label}
                    className="p-3.5 rounded-xl bg-surface border border-border/70 flex flex-col gap-1 shadow-subtle"
                  >
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${accent.text}`}>
                      {item.label}
                    </span>
                    <span className="text-[12.5px] text-text-secondary leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* 6. Ação de Conexão com o Tutor Pedagógico */}
        <div
          className="stagger-item flex items-center justify-between gap-4 flex-wrap p-5 rounded-2xl bg-surface border border-border/70 shadow-calm"
        >
          <div className="space-y-1 max-w-md">
            <span className="text-[10px] font-mono uppercase tracking-wider text-medusa-primary font-bold block">
              Dúvidas sobre o conteúdo?
            </span>
            <p className="text-[12.5px] text-text-secondary leading-relaxed">
              O Tutor Inteligente tem o contexto integral desta aula e dos experimentos acima.
            </p>
          </div>
          <button
            type="button"
            id="btn-ask-tutor-from-lesson"
            onClick={onAskTutor}
            className={`btn-interactive flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-semibold ${accent.solidBg} ${accent.solidText} shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0 hover:opacity-95`}
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>Perguntar ao Tutor</span>
          </button>
        </div>
      </article>
    </div>
  );
}
