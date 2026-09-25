'use client';

import React, { useState } from 'react';
import { TrackDefinition, LessonBlock, ExplanationMode, ExplanationModeInfo } from './types';
import { getTrackAccent } from './trackAccent';
import { InteractiveSimulationHooke } from './InteractiveSimulationHooke';
import { InteractiveStiffnessComparison } from './InteractiveStiffnessComparison';
import { InteractiveWaveBlock } from './InteractiveWaveBlock';
import { InteractiveEnemElectromagneticSpectrum } from './InteractiveEnemElectromagneticSpectrum';
import { InteractiveEnglishBlock } from './InteractiveEnglishBlock';
import { InteractiveEnglishTimelineGrammar } from './InteractiveEnglishTimelineGrammar';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { playFeedback } from '@/lib/audioFeedback';

interface LessonWrittenContentProps {
  trackDef: TrackDefinition;
  onAskTutor: () => void;
}

const EXPLANATION_MODES: ExplanationModeInfo[] = [
  {
    id: 'essencial',
    label: 'Essencial',
    tagline: 'Intuição & Conceito',
    description: 'Vocabulário direto, foco no comportamento físico e intuição sem excesso de fórmulas.',
    icon: 'auto_stories',
  },
  {
    id: 'explicativo',
    label: 'Explicativo',
    tagline: 'Causa & Efeito',
    description: 'Equilíbrio, proporcionalidade das grandezas e relação causal passo a passo.',
    icon: 'school',
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    tagline: 'Analítico & Vetorial',
    description: 'Equações diferenciais, formalismo de Newton e dedução matemática rigorosa.',
    icon: 'functions',
  },
  {
    id: 'aprofundado',
    label: 'Aprofundado',
    tagline: 'Energia & Espaço de Fase',
    description: 'Conservação de energia mecânica, hipótese do regime elástico e análise avançada.',
    icon: 'psychology',
  },
];

/**
 * AULA DIGITAL INTERATIVA (Modo Resumo / Aula Escrita)
 *
 * Supera a limitação de "cards empilhados": a experiência é estruturada como um fluxo pedagógico
 * contínuo com simulações físicas e linguísticas interativas integradas diretamente ao texto.
 *
 * Inclui Seletor de Profundidade da Aula (Modos de Explicação: Essencial, Explicativo, Técnico, Aprofundado)
 * que adapta o vocabulário, rigor e detalhes sem duplicar o conteúdo.
 */
export function LessonWrittenContent({ trackDef, onAskTutor }: LessonWrittenContentProps) {
  const accent = getTrackAccent(trackDef.id);
  const writtenLesson = trackDef.writtenLesson;
  const [selectedMode, setSelectedMode] = useState<ExplanationMode>('explicativo');

  if (!writtenLesson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
        <AnimatedIcon name="auto_stories" size={28} className="text-text-muted" />
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

  const modeContent = writtenLesson.explanationModes?.[selectedMode];
  const activeIntro = modeContent?.intro || writtenLesson.intro;

  const handleModeChange = (mode: ExplanationMode) => {
    setSelectedMode(mode);
    playFeedback('navigation');
  };

  return (
    <div id="lesson-written-content" className="flex-1 overflow-y-auto w-full">
      <article className="py-6 px-4 sm:px-8 max-w-4xl mx-auto flex flex-col gap-8">
        {/* 1. Header Editorial da Aula Digital */}
        <header className="stagger-item flex flex-col gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${accent.text}`}>
                {trackDef.lesson.discipline} · Aula Digital Interativa
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] font-mono text-text-muted">
                {trackDef.lesson.estimatedDuration}
              </span>
            </div>

            {/* Tag de Modo de Explicação Ativo */}
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-medusa-primary/10 text-medusa-primary border border-medusa-primary/20">
              Modo: {EXPLANATION_MODES.find((m) => m.id === selectedMode)?.label}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary leading-tight">
            {trackDef.lesson.topic}
          </h1>

          {/* CONTROLE DE PROFUNDIDADE / MODO DE EXPLICAÇÃO */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold flex items-center gap-1.5">
                <AnimatedIcon name="tune" size={14} className="text-medusa-primary" />
                Profundidade da Explicação
              </span>
              <span className="text-[11px] text-text-muted hidden sm:inline">
                {EXPLANATION_MODES.find((m) => m.id === selectedMode)?.description}
              </span>
            </div>

            <div
              id="explanation-mode-selector"
              role="radiogroup"
              aria-label="Selecionar profundidade de explicação da aula"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-surface-secondary/70 border border-border/80 rounded-xl"
            >
              {EXPLANATION_MODES.map((mode) => {
                const isSelected = selectedMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    id={`btn-explanation-mode-${mode.id}`}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleModeChange(mode.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg text-center transition-all ${
                      isSelected
                        ? 'bg-surface text-text-primary font-bold shadow-subtle border border-border scale-[1.02]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
                    }`}
                  >
                    <span className="text-[12px] font-semibold flex items-center gap-1">
                      {mode.label}
                    </span>
                    <span className="text-[9.5px] font-mono text-text-muted/80 block mt-0.5">
                      {mode.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Introdução Dinâmica conforme o Modo Selecionado */}
          <p className="text-[14px] sm:text-[15px] text-text-secondary leading-relaxed font-normal pt-1">
            {activeIntro}
          </p>

          {/* Destaque Pedagógico do Modo Selecionado */}
          {modeContent && (
            <div className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/60 flex flex-col gap-2 animate-fadeRise">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-medusa-primary" />
                <span className="text-[11.5px] font-bold text-text-primary">
                  {modeContent.conceptSummary}
                </span>
              </div>
              <p className="text-[12.5px] text-text-secondary leading-relaxed">
                {modeContent.keyTakeaway}
              </p>
              {modeContent.depthNotes && modeContent.depthNotes.length > 0 && (
                <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
                  {modeContent.depthNotes.map((note, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-text-muted">
                      <span className="text-medusa-primary font-bold">•</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        {/* 2. Bloco Conceitual Editorial (sem bordas pesadas de card) */}
        {writtenLesson.blocks.find((b) => b.type === 'concept') && (
          <section className="flex flex-col gap-3 pl-4 border-l-2 border-medusa-primary/60">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-medusa-primary">
              Fundamento Teórico ({EXPLANATION_MODES.find((m) => m.id === selectedMode)?.label})
            </span>
            <h2 className="text-lg font-bold text-text-primary">
              {writtenLesson.blocks.find((b) => b.type === 'concept')?.title}
            </h2>
            <p className="text-[13.5px] text-text-secondary leading-relaxed">
              {writtenLesson.blocks.find((b) => b.type === 'concept')?.body}
            </p>
          </section>
        )}

        {/* 3. SIMULAÇÕES E LABORATÓRIOS PEDAGÓGICOS MULTI-TRILHA (Human Visual Gate 2 - Cobertura das 3 Trilhas) */}
        <section aria-label="Visualização e Laboratório Pedagógico" className="flex flex-col gap-6">
          {isFaculdade && (
            <>
              <InteractiveSimulationHooke accentColor={accent.solidBg} />
              <InteractiveStiffnessComparison />
            </>
          )}
          {isVestibular && (
            <>
              <InteractiveWaveBlock />
              <InteractiveEnemElectromagneticSpectrum />
            </>
          )}
          {isIngles && (
            <>
              <InteractiveEnglishBlock />
              <InteractiveEnglishTimelineGrammar />
            </>
          )}
        </section>

        {/* 4. Dedução da Fórmula / Estrutura Analítica Adaptativa */}
        {writtenLesson.blocks.find((b) => b.type === 'formula') && (
          <section className="flex flex-col gap-3.5 bg-surface-secondary/40 p-5 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] flex items-center justify-center text-[14px]">
                <AnimatedIcon name="functions" size={15} />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-primary">
                {modeContent?.formulaDisplay?.label || writtenLesson.blocks.find((b) => b.type === 'formula')?.title}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border font-mono text-[18px] font-bold text-medusa-primary tracking-wide shadow-subtle flex items-baseline justify-between flex-wrap gap-2">
              <span>{modeContent?.formulaDisplay?.raw || writtenLesson.blocks.find((b) => b.type === 'formula')?.formula}</span>
              <span className="text-[11px] font-sans font-normal text-text-muted">
                {modeContent?.formulaDisplay?.label || writtenLesson.blocks.find((b) => b.type === 'formula')?.formulaLabel}
              </span>
            </div>

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
            <span className="text-[10px] font-mono uppercase tracking-wider text-medusa-primary font-bold block flex items-center gap-1.5">
              <AnimatedIcon name="tutor" size={14} />
              Dúvidas sobre o conteúdo no modo {EXPLANATION_MODES.find((m) => m.id === selectedMode)?.label}?
            </span>
            <p className="text-[12.5px] text-text-secondary leading-relaxed">
              O Tutor Inteligente tem o contexto integral desta aula, dos gráficos e dos experimentos acima.
            </p>
          </div>
          <button
            type="button"
            id="btn-ask-tutor-from-lesson"
            onClick={onAskTutor}
            className={`btn-interactive flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-semibold ${accent.solidBg} ${accent.solidText} shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0 hover:opacity-95`}
          >
            <AnimatedIcon name="tutor" size={16} interactive />
            <span>Perguntar ao Tutor</span>
          </button>
        </div>
      </article>
    </div>
  );
}
