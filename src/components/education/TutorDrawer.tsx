'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TutorMessage, TrackDefinition } from './types';

interface TutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trackDef?: TrackDefinition;
  contextQuestion?: {
    id: number;
    topic: string;
    question: string;
    confusionDiagnosis: string;
  } | null;
  videoTimestamp?: number;
}

export function TutorDrawer({
  isOpen,
  onClose,
  trackDef,
  contextQuestion,
  videoTimestamp = 0,
}: TutorDrawerProps) {
  const initialGreeting =
    trackDef?.tutorGreeting ||
    'Olá! Estou acompanhando sua sessão de estudo. Posso esclarecer dúvidas sobre a teoria, equações fundamentais ou passos dos exercícios.';

  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'msg-init',
      sender: 'tutor',
      text: initialGreeting,
      timestamp: 'Agora',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reiniciar mensagem inicial quando a trilha mudar
  useEffect(() => {
    if (trackDef) {
      setMessages([
        {
          id: `msg-init-${trackDef.id}`,
          sender: 'tutor',
          text: trackDef.tutorGreeting,
          timestamp: 'Agora',
        },
      ]);
    }
  }, [trackDef?.id, trackDef?.tutorGreeting]);

  // Auto-scroll ao receber nova mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceStatus]);

  // Se o usuário solicitou "Entender meu erro" em uma questão, injetamos o contexto pedagógico
  useEffect(() => {
    if (contextQuestion && isOpen) {
      const existingContextMsg = messages.find(
        (m) => m.contextQuestionId === contextQuestion.id
      );
      if (!existingContextMsg) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-ctx-${contextQuestion.id}`,
            sender: 'tutor',
            text: `Percebi que você teve dúvida na Questão ${contextQuestion.id} (${contextQuestion.topic}).\n\nDiagnóstico conceitual:\n${contextQuestion.confusionDiagnosis}\n\nQuer que eu explique a dedução passo a passo ou prefere ver outro exemplo prático?`,
            timestamp: 'Agora',
            contextQuestionId: contextQuestion.id,
          },
        ]);
      }
    }
  }, [contextQuestion, isOpen, messages]);

  // PROTÓTIPO DE VOZ: Máquina de estados de frontend para validação de UX.
  // AUDITORIA ANTI-FICÇÃO: Backend Whisper / WebRTC TTS / STT nativo NÃO ESTÁ IMPLEMENTADO.
  // O ciclo demonstra a contenção de estados e anti-autoescuta (STT pausado durante TTS) via flags de interface.
  const toggleVoiceMode = () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      setVoiceStatus('idle');
      setTranscription('');
      return;
    }

    setIsVoiceActive(true);
    setVoiceStatus('listening');
    setTranscription(
      trackDef?.id === 'ingles'
        ? 'Listening to your spoken practice...'
        : 'Ouvindo sua dúvida...'
    );

    // Simulação de fala do usuário
    const listenTimeout = setTimeout(() => {
      setTranscription(
        trackDef?.id === 'ingles'
          ? '"Could you explain the difference between come up with and run out of?"'
          : '"Poderia detalhar a dedução analítica das equações?"'
      );
      setVoiceStatus('speaking');

      // Simulação de resposta sintetizada
      const speakTimeout = setTimeout(() => {
        const simulatedVoiceResponse: TutorMessage = {
          id: `voice-msg-${Date.now()}`,
          sender: 'tutor',
          text:
            trackDef?.id === 'ingles'
              ? 'Great question! "Come up with" refers to producing or suggesting an idea/solution, while "run out of" means depleting a physical or abstract supply (e.g., running out of coffee or time).'
              : 'Com certeza! Analisando a conservação de energia e as condições de contorno, a frequência permanece invariante enquanto a velocidade varia com o meio.',
          timestamp: 'Agora',
          isVoice: true,
        };
        setMessages((prev) => [...prev, simulatedVoiceResponse]);
        setVoiceStatus('idle');
        setTranscription('');
        setIsVoiceActive(false);
      }, 2600);

      return () => clearTimeout(speakTimeout);
    }, 2200);

    return () => clearTimeout(listenTimeout);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: TutorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
      timestamp: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Resposta contextual simulada
    setTimeout(() => {
      const tutorReply: TutorMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: 'tutor',
        text:
          trackDef?.id === 'ingles'
            ? `That's a very natural conversational query. In spoken interaction, focusing on clear turn-taking and linking words will help your delivery sound much more native.`
            : `Excelente colocação sobre ${trackDef?.lesson.topic || 'o tema'}. A compreensão analítica desse ponto é fundamental para garantir o domínio conceitual completo.`,
        timestamp: 'Agora',
      };
      setMessages((prev) => [...prev, tutorReply]);
    }, 900);
  };

  if (!isOpen) return null;

  return (
    <div
      id="tutor-drawer"
      aria-label="Tutor Contextual da Sessão"
      className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-surface border-l border-border/80 shadow-2xl z-50 flex flex-col drawer-slide-in animate-slideLeft"
    >
      {/* Header do Tutor */}
      <div className="p-4 border-b border-border/70 flex items-center justify-between bg-surface-secondary/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] flex items-center justify-center shadow-subtle">
            <span className="material-symbols-outlined text-[18px]">
              {trackDef?.id === 'ingles' ? 'record_voice_over' : 'neurology'}
            </span>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
              <span>{trackDef?.id === 'ingles' ? 'Tutor & Conversação B1' : `Tutor · ${trackDef?.name || 'Estudo'}`}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
            </h3>
            <span className="text-[10px] font-mono text-text-muted">
              {trackDef?.lesson.topic || 'Sessão Ativa'} · Posição {Math.floor(videoTimestamp / 60)}:{(videoTimestamp % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <button
          type="button"
          id="btn-close-tutor"
          onClick={onClose}
          aria-label="Fechar Tutor"
          className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Destaque para Inglês / Prática Oral */}
      {trackDef?.voiceEmphasis && (
        <div className="px-4 py-2 bg-medusa-primary/10 border-b border-medusa-primary/20 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-text-primary">
            <span className="material-symbols-outlined text-[15px] text-medusa-primary">mic</span>
            <span className="font-semibold">Prática Oral &amp; Escuta Ativa</span>
          </div>
          <span className="text-[9px] font-mono text-text-muted">Protótipo UX (Voz Local)</span>
        </div>
      )}

      {/* Banner de Estado de Voz */}
      {isVoiceActive && (
        <div className="p-3 bg-medusa-primary/15 border-b border-medusa-primary/30 flex items-center justify-between text-[12px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse" />
            <span className="text-text-primary">
              {voiceStatus === 'listening' ? 'Ouvindo...' : 'Sintetizando fala...'}
            </span>
          </div>
          <span className="text-[10px] text-text-muted">Anti-Autoescuta Ativo</span>
        </div>
      )}

      {transcription && (
        <div className="p-2.5 bg-surface-secondary text-[11px] font-mono text-text-secondary border-b border-border/50 italic px-4">
          {transcription}
        </div>
      )}

      {/* Lista de Mensagens */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-[13px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl shadow-subtle ${
                msg.sender === 'user'
                  ? 'bg-medusa-primary text-[#1C2420] rounded-br-none font-medium'
                  : 'bg-surface-secondary text-text-primary rounded-bl-none border border-border/60 whitespace-pre-line'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] font-mono text-text-muted mt-1 px-1">
              {msg.sender === 'user' ? 'Você' : 'Tutor'} · {msg.timestamp}
              {msg.isVoice ? ' (Voz)' : ''}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Rodapé / Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3.5 border-t border-border/70 bg-surface-secondary/30 flex items-center gap-2"
      >
        <button
          type="button"
          id="btn-tutor-voice-toggle"
          onClick={toggleVoiceMode}
          title={isVoiceActive ? 'Pausar modo de voz' : 'Iniciar modo de voz'}
          className={`btn-interactive p-2 rounded-full border transition-all flex items-center justify-center ${
            isVoiceActive
              ? 'bg-medusa-primary border-medusa-primary text-[#1C2420]'
              : 'bg-surface border-border/70 text-text-secondary hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isVoiceActive ? 'mic' : 'mic_none'}
          </span>
        </button>

        <input
          type="text"
          id="tutor-input-field"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Tire uma dúvida sobre ${trackDef?.lesson.topic || 'o estudo'}...`}
          className="flex-1 bg-surface border border-border/70 rounded-full px-4 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-medusa-primary/80 focus:ring-1 focus:ring-medusa-primary/60 transition-all"
        />

        <button
          type="submit"
          id="btn-send-tutor-msg"
          disabled={!inputText.trim()}
          aria-label="Enviar mensagem"
          className="btn-interactive p-2 rounded-full bg-medusa-primary text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none hover:opacity-90 transition-all flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
        </button>
      </form>
    </div>
  );
}
