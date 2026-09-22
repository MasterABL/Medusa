'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useShell } from '@/context/ShellContext';
import { TrackDefinition } from './types';

interface VoiceExerciseViewProps {
  trackDef: TrackDefinition;
  onFinish: () => void;
}

type VoicePhase = 'idle' | 'listening' | 'processing' | 'response';

/**
 * Exercício de Voz — etapa dedicada do fluxo de Inglês (Aula -> Exercício de Voz -> Live
 * Immersion -> Exercícios -> Flashcards -> Resultado). Reaproveita o MESMO mecanismo de
 * encolhimento/pulsação do Dynamic Island já usado pelo TutorDrawer (isVoiceActive + os
 * estados canônicos `processing`/`success` de islandFixtures.ts) — não um sistema paralelo.
 *
 * PROTÓTIPO DE VOZ: o ciclo Idle -> Listening -> Processing -> Resposta -> Idle é simulado em
 * memória (Local State), sem STT/TTS real no backend. A linguagem exposta ao usuário é sempre
 * humana ("Boa pronúncia.", "Você foi compreendido.") — nunca métricas técnicas.
 */
export function VoiceExerciseView({ trackDef, onFinish }: VoiceExerciseViewProps) {
  const { setVoiceActive, setIslandState } = useShell();
  const prompts = trackDef.voicePrompts || [];
  const [promptIndex, setPromptIndex] = useState(0);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');

  const currentPrompt = prompts[promptIndex];
  const isLastPrompt = promptIndex === prompts.length - 1;

  // Garantir que o Island volte ao normal se o usuário sair desta etapa no meio do ciclo
  useEffect(() => {
    return () => {
      setVoiceActive(false);
    };
  }, [setVoiceActive]);

  const handleSpeak = useCallback(() => {
    if (!currentPrompt) return;
    setPhase('listening');
    setTranscript('Ouvindo...');
    setVoiceActive(true);

    window.setTimeout(() => {
      setTranscript(currentPrompt.simulatedTranscript);
      setPhase('processing');
      setVoiceActive(false);
      setIslandState('processing');

      window.setTimeout(() => {
        setPhase('response');
        setIslandState('success');
      }, 900);
    }, 1800);
  }, [currentPrompt, setVoiceActive, setIslandState]);

  const handleTryAgain = useCallback(() => {
    setPhase('idle');
    setTranscript('');
    setIslandState('idle');
  }, [setIslandState]);

  const handleContinue = useCallback(() => {
    if (isLastPrompt) {
      setIslandState('idle');
      onFinish();
      return;
    }
    setPromptIndex((prev) => prev + 1);
    setPhase('idle');
    setTranscript('');
    setIslandState('idle');
  }, [isLastPrompt, onFinish, setIslandState]);

  if (!currentPrompt) {
    // Sem prompts de voz definidos para a trilha — não deveria ser alcançável (o container só
    // monta esta etapa quando `trackDef.voicePrompts` existe), mas evita uma tela em branco.
    return null;
  }

  return (
    <div
      id="voice-exercise-container"
      className="study-stage-enter w-full flex flex-col gap-4 max-w-3xl mx-auto pb-14"
    >
      <div className="flex flex-col gap-1 border-b border-border/70 pb-4">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30 w-fit">
          Exercício de Voz · {promptIndex + 1} de {prompts.length}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          Prática de Pronúncia
        </h1>
      </div>

      <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-border/70 shadow-calm flex flex-col items-center text-center gap-6">
        <p className="text-[13px] text-text-secondary max-w-md">{currentPrompt.instruction}</p>

        <div className="w-full max-w-lg p-4 rounded-xl bg-surface-secondary/70 border border-border/60">
          <p className="text-[16px] font-medium text-text-primary leading-relaxed">
            &ldquo;{currentPrompt.targetPhrase}&rdquo;
          </p>
        </div>

        {/* Botão central de fala com estado visual claro */}
        <button
          type="button"
          id="btn-voice-exercise-speak"
          onClick={handleSpeak}
          disabled={phase === 'listening' || phase === 'processing'}
          aria-label="Falar"
          className={`btn-interactive w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
            phase === 'listening' ? 'bg-medusa-primary island-voice-active' : 'bg-medusa-primary/90 hover:bg-medusa-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[30px] text-[#1C2420]">
            {phase === 'listening' ? 'mic' : phase === 'processing' ? 'more_horiz' : 'mic_none'}
          </span>
        </button>

        <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
          {phase === 'idle' && 'Toque para falar'}
          {phase === 'listening' && 'Ouvindo...'}
          {phase === 'processing' && 'Analisando sua resposta...'}
          {phase === 'response' && 'Pronto'}
        </span>

        {/* Transcrição — permanece visível durante e após a fala, nunca escondida */}
        {transcript && (
          <div
            id="voice-exercise-transcript"
            className="w-full max-w-lg p-3 rounded-xl bg-surface-secondary/50 border border-border/50 text-[13px] text-text-secondary italic"
          >
            {transcript}
          </div>
        )}

        {/* Feedback humano — nunca métricas técnicas (latência, % de inteligibilidade, etc.) */}
        {phase === 'response' && (
          <div
            id="voice-exercise-feedback"
            className="w-full max-w-lg p-4 rounded-xl bg-medusa-support/15 border border-medusa-support/40 text-[13px] text-text-primary font-medium flex items-center gap-2 justify-center"
          >
            <span className="material-symbols-outlined text-[18px] text-[#1B502C] dark:text-medusa-support">
              check_circle
            </span>
            <span>{currentPrompt.feedback}</span>
          </div>
        )}

        {phase === 'response' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-voice-exercise-retry"
              onClick={handleTryAgain}
              className="btn-interactive bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-4 py-2 rounded-full text-[12px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              id="btn-voice-exercise-continue"
              onClick={handleContinue}
              className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-5 py-2 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span>{isLastPrompt ? 'Continuar para Live Immersion' : 'Próxima frase'}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
