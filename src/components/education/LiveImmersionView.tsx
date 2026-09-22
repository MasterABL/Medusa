'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useShell } from '@/context/ShellContext';
import { TrackDefinition } from './types';

interface LiveImmersionViewProps {
  trackDef: TrackDefinition;
  onFinish: () => void;
}

type TurnPhase = 'idle' | 'listening' | 'processing' | 'response';

/**
 * Live Immersion — cenário de conversação guiada, sempre alcançado DEPOIS do Exercício de Voz
 * (nunca como ponto de entrada direto, por instrução de produto). Reaproveita o mesmo ciclo de
 * voz (Island encolhe/pulsa) já usado em VoiceExerciseView e no TutorDrawer.
 *
 * PROTÓTIPO: o "NPC" da conversa é um roteiro fixo (Fixture), não um interlocutor de IA real.
 */
export function LiveImmersionView({ trackDef, onFinish }: LiveImmersionViewProps) {
  const { setVoiceActive, setIslandState } = useShell();
  const scenario = trackDef.immersionScenario;
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState<TurnPhase>('idle');
  const [transcript, setTranscript] = useState('');

  const turn = scenario?.turns[turnIndex];
  const isLastTurn = scenario ? turnIndex === scenario.turns.length - 1 : true;

  useEffect(() => {
    return () => {
      setVoiceActive(false);
    };
  }, [setVoiceActive]);

  const handleRespond = useCallback(() => {
    if (!turn) return;
    setPhase('listening');
    setTranscript('Ouvindo sua resposta...');
    setVoiceActive(true);

    window.setTimeout(() => {
      setTranscript(turn.simulatedTranscript);
      setPhase('processing');
      setVoiceActive(false);
      setIslandState('processing');

      window.setTimeout(() => {
        setPhase('response');
        setIslandState('success');
      }, 900);
    }, 1800);
  }, [turn, setVoiceActive, setIslandState]);

  const handleContinue = useCallback(() => {
    if (isLastTurn) {
      setIslandState('idle');
      onFinish();
      return;
    }
    setTurnIndex((prev) => prev + 1);
    setPhase('idle');
    setTranscript('');
    setIslandState('idle');
  }, [isLastTurn, onFinish, setIslandState]);

  if (!scenario || !turn) return null;

  return (
    <div
      id="live-immersion-container"
      className="study-stage-enter w-full flex flex-col gap-4 max-w-3xl mx-auto pb-14"
    >
      <div className="flex flex-col gap-1 border-b border-border/70 pb-4">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30 w-fit">
          Live Immersion · Etapa {turnIndex + 1} de {scenario.turns.length}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          {scenario.title}
        </h1>
        <p className="text-[12px] text-text-secondary">{scenario.setting}</p>
      </div>

      <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-border/70 shadow-calm flex flex-col gap-5">
        {/* Fala do interlocutor do cenário */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-secondary border border-border/60 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[16px] text-text-secondary">forum</span>
          </div>
          <div className="p-3.5 rounded-2xl rounded-tl-none bg-surface-secondary/70 border border-border/60 text-[14px] text-text-primary max-w-md">
            {turn.speakerLine}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-medusa-primary/10 border border-medusa-primary/25 text-[12px] text-text-secondary ml-11">
          <span className="font-semibold text-text-primary">Sua vez: </span>
          {turn.userPromptHint}
        </div>

        <div className="flex flex-col items-center gap-4 pt-2">
          <button
            type="button"
            id="btn-immersion-speak"
            onClick={handleRespond}
            disabled={phase === 'listening' || phase === 'processing'}
            aria-label="Falar"
            className={`btn-interactive w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
              phase === 'listening' ? 'bg-medusa-primary island-voice-active' : 'bg-medusa-primary/90 hover:bg-medusa-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[26px] text-[#1C2420]">
              {phase === 'listening' ? 'mic' : phase === 'processing' ? 'more_horiz' : 'mic_none'}
            </span>
          </button>

          <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
            {phase === 'idle' && 'Toque para responder'}
            {phase === 'listening' && 'Ouvindo sua resposta...'}
            {phase === 'processing' && 'Analisando sua resposta...'}
            {phase === 'response' && 'Pronto'}
          </span>

          {transcript && (
            <div
              id="immersion-transcript"
              className="w-full max-w-lg p-3 rounded-xl bg-surface-secondary/50 border border-border/50 text-[13px] text-text-secondary italic text-center"
            >
              {transcript}
            </div>
          )}

          {phase === 'response' && (
            <>
              <div
                id="immersion-feedback"
                className="w-full max-w-lg p-4 rounded-xl bg-medusa-support/15 border border-medusa-support/40 text-[13px] text-text-primary font-medium flex items-center gap-2 justify-center"
              >
                <span className="material-symbols-outlined text-[18px] text-[#1B502C] dark:text-medusa-support">
                  check_circle
                </span>
                <span>{turn.feedback}</span>
              </div>

              <button
                type="button"
                id="btn-immersion-continue"
                onClick={handleContinue}
                className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-5 py-2 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span>{isLastTurn ? 'Continuar para Exercícios' : 'Próxima fala'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
