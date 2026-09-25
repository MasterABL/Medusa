'use client';

import React, { useState } from 'react';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { playFeedback } from '@/lib/audioFeedback';

interface TenseComparison {
  id: string;
  name: string;
  formula: string;
  example: string;
  temporalFocus: string;
  timeVector: 'past_only' | 'past_result' | 'past_to_now';
  soundFreqs: number[];
}

const TENSES: TenseComparison[] = [
  {
    id: 'past_simple',
    name: 'Simple Past',
    formula: 'Subject + Verb-ed',
    example: 'I studied for 3 hours yesterday.',
    temporalFocus: 'Ação 100% terminada no passado. Não há conexão ativa com o presente.',
    timeVector: 'past_only',
    soundFreqs: [320, 260],
  },
  {
    id: 'pres_perf',
    name: 'Present Perfect',
    formula: 'Subject + have/has + Past Participle',
    example: 'I have studied this subject already.',
    temporalFocus: 'Foco no resultado ou experiência. O momento exato no passado é irrelevante.',
    timeVector: 'past_result',
    soundFreqs: [300, 360, 420],
  },
  {
    id: 'pres_perf_cont',
    name: 'Present Perfect Continuous',
    formula: 'Subject + have/has been + Verb-ing',
    example: 'I have been studying for 3 hours now.',
    temporalFocus: 'Foco na duração contínua de um processo que começou no passado e ainda continua.',
    timeVector: 'past_to_now',
    soundFreqs: [280, 340, 440, 520],
  },
];

const BUILDER_STEPS = [
  { level: 1, text: 'I', label: 'Sujeito', phonetics: '/aɪ/' },
  { level: 2, text: 'I have', label: '+ Auxiliar', phonetics: '/aɪ hæv/ → /aɪv/' },
  { level: 3, text: 'I have been', label: '+ Marcador Contínuo', phonetics: '/aɪv bɪn/' },
  { level: 4, text: 'I have been studying', label: '+ Ação Principal', phonetics: '/aɪv bɪn ˈstʌdi.ɪŋ/' },
  { level: 5, text: 'I have been studying for 3 hours.', label: '+ Âncora Temporal', phonetics: '/aɪv bɪn ˈstʌdi.ɪŋ fər θriː ˈaʊərz/' },
];

export function InteractiveEnglishTimelineGrammar() {
  const [activeTenseId, setActiveTenseId] = useState<string>('pres_perf_cont');
  const [builderStep, setBuilderStep] = useState<number>(4);
  const [isPlayingRhythm, setIsPlayingRhythm] = useState<boolean>(false);

  const activeTense = TENSES.find((t) => t.id === activeTenseId) || TENSES[2];

  const handleSelectTense = (id: string) => {
    setActiveTenseId(id);
    playFeedback('navigation');
  };

  const handleStepChange = (step: number) => {
    setBuilderStep(step);
    playFeedback('toggle');
  };

  // Síntese acústica do ritmo da fala conectada (/aɪv bɪn ˈstʌdi.ɪŋ/)
  const handlePlayRhythm = () => {
    playFeedback('action');
    setIsPlayingRhythm(true);

    try {
      if (typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});

          const freqs = activeTense.soundFreqs;
          const now = ctx.currentTime;

          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + i * 0.12;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + 0.12);
          });

          setTimeout(() => setIsPlayingRhythm(false), freqs.length * 120 + 100);
        }
      }
    } catch {
      setIsPlayingRhythm(false);
    }
  };

  return (
    <div
      id="english-timeline-grammar-block"
      className="w-full bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-calm flex flex-col gap-6 mt-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-medusa-primary/20 border border-medusa-primary/40 text-medusa-primary flex items-center justify-center flex-shrink-0">
            <AnimatedIcon name="record_voice_over" size={17} />
          </span>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-medusa-primary font-bold block">
              Gramática Visual & Fala Conectada (Inglês)
            </span>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              Linha do Tempo dos Tempos Verbais & Construção Progressiva de Frases
            </h3>
          </div>
        </div>

        <button
          type="button"
          id="btn-listen-english-cadence"
          onClick={handlePlayRhythm}
          disabled={isPlayingRhythm}
          className="btn-interactive group px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-surface-secondary border border-border/70 text-text-primary hover:border-medusa-primary flex items-center gap-1.5 shadow-subtle self-start sm:self-auto"
        >
          <AnimatedIcon name="volume" size={15} state={isPlayingRhythm ? 'active' : 'idle'} />
          <span>{isPlayingRhythm ? 'Ouvindo Ritmo...' : 'Ouvir Ritmo da Frase'}</span>
        </button>
      </div>

      {/* Seletor Comparativo de Tempos Verbais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {TENSES.map((t) => {
          const isSelected = t.id === activeTense.id;
          return (
            <button
              key={t.id}
              type="button"
              id={`btn-tense-${t.id}`}
              onClick={() => handleSelectTense(t.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-medusa-primary/10 border-medusa-primary text-text-primary shadow-subtle scale-[1.02]'
                  : 'bg-surface border-border/70 text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold">{t.name}</span>
                {isSelected && <AnimatedIcon name="check" size={14} state="success" />}
              </div>
              <span className="text-[10.5px] font-mono text-text-muted">{t.formula}</span>
            </button>
          );
        })}
      </div>

      {/* Visualizador de Linha do Tempo Vetorial */}
      <div className="bg-surface-secondary/40 p-4 sm:p-5 rounded-xl border border-border/70 flex flex-col gap-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted border-b border-border/50 pb-2">
          <span>PASSADO (Ontem)</span>
          <span className="font-bold text-medusa-primary">PRESENTE (Agora)</span>
          <span>FUTURO (Amanhã)</span>
        </div>

        {/* Linha do Tempo Interativa SVG */}
        <div className="relative w-full h-16 flex items-center">
          <div className="absolute left-0 right-0 h-1 bg-border/80 rounded-full" />

          {/* Marcador Temporal da Frase Atual */}
          {activeTense.timeVector === 'past_only' && (
            <div
              className="absolute left-[20%] w-6 h-6 rounded-full bg-medusa-accent border-2 border-surface flex items-center justify-center -ml-3 shadow-subtle animate-fadeRise"
              title="Ação Pontual Encerrada"
            >
              <span className="w-2 h-2 rounded-full bg-[#1C2420]" />
            </div>
          )}

          {activeTense.timeVector === 'past_result' && (
            <div className="absolute left-[30%] right-[50%] h-2.5 bg-medusa-tertiary/40 border border-medusa-tertiary rounded-full animate-fadeRise">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-medusa-tertiary border-2 border-surface" />
            </div>
          )}

          {activeTense.timeVector === 'past_to_now' && (
            <div className="absolute left-[15%] right-[50%] h-3 bg-medusa-primary/30 border-2 border-medusa-primary rounded-full flex items-center justify-end animate-fadeRise">
              <span className="w-2 h-2 rounded-full bg-medusa-primary mr-1 living-pulse" />
              <div className="absolute right-0 -top-6 text-[10px] font-mono font-bold text-medusa-primary whitespace-nowrap">
                Continua agora!
              </div>
            </div>
          )}

          {/* Linha divisória do Agora */}
          <div className="absolute left-[50%] top-0 bottom-0 w-0.5 bg-medusa-primary/70 border-r border-dashed border-medusa-primary" />
        </div>

        <div className="flex flex-col gap-1 text-[13px] bg-surface p-3.5 rounded-xl border border-border/70">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-medusa-primary uppercase">Exemplo:</span>
            <span className="font-semibold text-text-primary">{activeTense.example}</span>
          </div>
          <p className="text-[12px] text-text-secondary leading-relaxed pt-1">
            {activeTense.temporalFocus}
          </p>
        </div>
      </div>

      {/* Construtor Progressivo de Frase (Sentence Morphing) */}
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-secondary/40 border border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold flex items-center gap-1.5">
            <AnimatedIcon name="tune" size={14} className="text-medusa-primary" />
            Construção Progressiva da Estrutura (Passo {builderStep} de 5)
          </span>
          <span className="text-[11px] font-mono text-medusa-primary font-bold">
            {BUILDER_STEPS[builderStep - 1].phonetics}
          </span>
        </div>

        {/* Display Dinâmico da Frase */}
        <div className="p-4 rounded-xl bg-surface border border-border font-mono text-[16px] sm:text-[18px] font-bold text-text-primary shadow-subtle min-h-[58px] flex items-center justify-between">
          <span>{BUILDER_STEPS[builderStep - 1].text}</span>
          <span className="text-[11px] font-sans font-normal text-text-muted ml-2">
            {BUILDER_STEPS[builderStep - 1].label}
          </span>
        </div>

        {/* Botões dos 5 Passos Progressivos */}
        <div className="grid grid-cols-5 gap-1.5">
          {BUILDER_STEPS.map((step) => (
            <button
              key={step.level}
              type="button"
              id={`btn-builder-step-${step.level}`}
              onClick={() => handleStepChange(step.level)}
              className={`p-2 rounded-lg text-center font-mono text-[11px] font-bold transition-all ${
                builderStep === step.level
                  ? 'bg-medusa-primary text-[#1C2420] shadow-subtle'
                  : 'bg-surface border border-border/70 text-text-muted hover:text-text-primary'
              }`}
            >
              Etapa {step.level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
