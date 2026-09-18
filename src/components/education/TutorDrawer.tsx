'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TutorMessage } from './types';

interface TutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
  contextQuestion,
  videoTimestamp = 0,
}: TutorDrawerProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'msg-init',
      sender: 'tutor',
      text: 'Olá! Estou acompanhando sua sessão de Mecânica Ondulatória. Posso esclarecer dúvidas sobre a teoria, equações fundamentais ou passos dos exercícios.',
      timestamp: 'Agora',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setTranscription('Ouvindo sua dúvida...');

    // Simulação de fala do usuário
    const listenTimeout = setTimeout(() => {
      setTranscription('"Por que a frequência não muda na refração?"');
      
      const sendTimeout = setTimeout(() => {
        const userVoiceMsg: TutorMessage = {
          id: `msg-${Date.now()}`,
          sender: 'user',
          text: 'Por que a frequência da onda permanece constante quando ela passa de um meio para outro na refração?',
          timestamp: 'Agora',
          isVoice: true,
        };
        setMessages((prev) => [...prev, userVoiceMsg]);
        setTranscription('');
        
        // Fase TTS: STT estritamente pausado
        setVoiceStatus('speaking');

        const tutorResponseTimeout = setTimeout(() => {
          const tutorVoiceMsg: TutorMessage = {
            id: `msg-${Date.now() + 1}`,
            sender: 'tutor',
            text: 'Excelente pergunta! A frequência depende exclusivamente de quantas oscilações a fonte geradora produz por segundo. A fronteira entre os dois meios não armazena oscilações: cada crista que chega no meio 1 força imediatamente a criação de uma crista no meio 2. Por isso f é constante, e o que varia são a velocidade v e o comprimento λ.',
            timestamp: 'Agora',
            isVoice: true,
          };
          setMessages((prev) => [...prev, tutorVoiceMsg]);
          
          // Fim do TTS: retoma STT para escuta
          setVoiceStatus('listening');
          setTranscription('Ouvindo sua resposta...');
        }, 1800);

        return () => clearTimeout(tutorResponseTimeout);
      }, 1400);

      return () => clearTimeout(sendTimeout);
    }, 1800);

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
    const userQuery = inputText.trim();
    setInputText('');

    // Resposta pedagógica contextual
    setTimeout(() => {
      let reply = 'Compreendido. Essa propriedade é direta: na ondulatória, o meio dita a velocidade através da elasticidade e densidade linear, enquanto a fonte determina a frequência temporal.';
      if (userQuery.toLowerCase().includes('doppler')) {
        reply = 'No Efeito Doppler, note que a velocidade do som no ar permanece inalterada! A aproximação da fonte encurta a distância entre frentes de onda sucessivas, fazendo mais cristas atingirem o observador por unidade de tempo.';
      } else if (userQuery.toLowerCase().includes('nó') || userQuery.toLowerCase().includes('ventre')) {
        reply = 'Lembre-se da regra mnemônica: Nós = Nada (amplitude zero, interferência destrutiva). Ventres = Volume máximo (amplitude 2A, interferência construtiva).';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'tutor',
          text: reply,
          timestamp: 'Agora',
        },
      ]);
    }, 900);
  };

  if (!isOpen) return null;

  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="tutor-drawer-panel"
      role="region"
      aria-label="Tutor Pedagógico de Ondulatória"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-surface/98 backdrop-blur-xl border-l border-border/80 shadow-2xl flex flex-col transition-transform duration-300 ease-out"
    >
      {/* Header do Tutor */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/70 bg-surface-secondary/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-medusa-primary flex items-center justify-center text-[#1C2420] shadow-subtle">
            <span className="material-symbols-outlined text-[18px]">neurology</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-text-primary">
                Tutor Socrático Medusa
              </h3>
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
            </div>
            <p className="text-[11px] font-mono text-text-muted">
              Momento da aula: {formatVideoTime(videoTimestamp)}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-close-tutor"
          onClick={onClose}
          aria-label="Fechar Tutor"
          className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Indicador Ativo de Modo de Voz com Proteção Anti-Autoescuta */}
      {isVoiceActive && (
        <div
          id="voice-mode-banner"
          className={`px-4 py-3 border-b border-border/60 transition-colors flex items-center justify-between ${
            voiceStatus === 'listening'
              ? 'bg-medusa-primary/15 text-[#18534B] dark:text-[#71DBD2]'
              : 'bg-medusa-accent/20 text-[#614E00] dark:text-[#FFF18C]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-current living-pulse" />
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                {voiceStatus === 'listening' ? 'Ouvindo...' : 'Tutor falando (STT Pausado)'}
              </span>
              {transcription && (
                <p className="text-[12px] italic max-w-[260px] truncate">{transcription}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleVoiceMode}
            className="text-[11px] font-mono uppercase tracking-wider underline hover:opacity-80 focus-visible:ring-2 focus:outline-none"
          >
            Desligar Voz
          </button>
        </div>
      )}

      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-[13px] leading-relaxed">
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
          placeholder="Tire uma dúvida sobre Ondulatória..."
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
