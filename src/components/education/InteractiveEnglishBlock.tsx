'use client';

import React, { useState } from 'react';
import { playFeedback } from '@/lib/audioFeedback';

interface StressWord {
  id: number;
  word: string;
  syllables: string[];
  stressedIndex: number;
  impliedMeaning: string;
  pitchHz: number;
}

const SENTENCE_WORDS: StressWord[] = [
  {
    id: 1,
    word: 'I',
    syllables: ['I'],
    stressedIndex: 0,
    impliedMeaning: 'Alguém disse isso, mas não fui EU especificamente.',
    pitchHz: 280,
  },
  {
    id: 2,
    word: "didn't",
    syllables: ['did', "n't"],
    stressedIndex: 0,
    impliedMeaning: 'Eu nego enfaticamente ter dito qualquer coisa parecida.',
    pitchHz: 310,
  },
  {
    id: 3,
    word: 'say',
    syllables: ['say'],
    stressedIndex: 0,
    impliedMeaning: 'Posso ter insinuado ou pensado, mas não FALEI em voz alta.',
    pitchHz: 295,
  },
  {
    id: 4,
    word: 'you',
    syllables: ['you'],
    stressedIndex: 0,
    impliedMeaning: 'Eu disse que alguém fez isso, mas não VOCÊ.',
    pitchHz: 330,
  },
  {
    id: 5,
    word: 'stole',
    syllables: ['stole'],
    stressedIndex: 0,
    impliedMeaning: 'Você pegou emprestado ou perdeu, não que ROUBOU.',
    pitchHz: 350,
  },
  {
    id: 6,
    word: 'the',
    syllables: ['the'],
    stressedIndex: 0,
    impliedMeaning: 'Foi um dinheiro qualquer, não ESSE dinheiro específico.',
    pitchHz: 260,
  },
  {
    id: 7,
    word: 'money',
    syllables: ['mon', 'ey'],
    stressedIndex: 0,
    impliedMeaning: 'Você roubou outra coisa (documentos, chaves), mas não o DINHEIRO.',
    pitchHz: 340,
  },
];

export function InteractiveEnglishBlock() {
  const [selectedWordId, setSelectedWordId] = useState<number>(5); // default: 'stole'

  const activeWord = SENTENCE_WORDS.find((w) => w.id === selectedWordId) || SENTENCE_WORDS[4];

  const handleSelectWord = (word: StressWord) => {
    setSelectedWordId(word.id);
    playFeedback('action');

    // Reprodução acústica sintética de entonação (glide de tom f0) via Web Audio API pura
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'running') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const now = ctx.currentTime;
            osc.frequency.setValueAtTime(word.pitchHz * 0.85, now);
            osc.frequency.exponentialRampToValueAtTime(word.pitchHz * 1.25, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(word.pitchHz * 0.75, now + 0.22);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.26);
          }
        }
      }
    } catch {
      // Silencioso em caso de restrição do navegador
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 my-2">
      <div className="w-full rounded-2xl bg-[#111915] dark:bg-[#0B100E] border border-[#D0EAA3]/30 p-5 sm:p-7 shadow-calm flex flex-col gap-6 text-white relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #D0EAA3 0%, transparent 70%)' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#D0EAA3]/20 border border-[#D0EAA3]/40 text-[#D0EAA3] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#D0EAA3] block font-semibold">
                Laboratório de Ritmo & Entonação Oral
              </span>
              <h3 className="text-[16px] font-bold tracking-tight text-white">
                Sentence Stress & Contornos de Entonação
              </h3>
            </div>
          </div>

          <span className="text-[11px] font-mono text-[#D0EAA3] bg-white/[0.06] border border-[#D0EAA3]/30 px-3 py-1 rounded-full self-start sm:self-auto">
            Clique em cada palavra para ouvir a entonação
          </span>
        </div>

        {/* Construtor Interativo de Frase */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-mono uppercase text-white/60">
            Frase Modelo: &quot;I didn&apos;t say you stole the money&quot;
          </span>

          <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl bg-black/40 border border-white/10">
            {SENTENCE_WORDS.map((w) => {
              const isStressed = w.id === selectedWordId;
              return (
                <button
                  key={w.id}
                  type="button"
                  id={`btn-stress-word-${w.id}`}
                  onClick={() => handleSelectWord(w)}
                  className={`btn-interactive px-3.5 py-2 rounded-xl text-[16px] sm:text-[18px] font-bold transition-all flex flex-col items-center gap-0.5 focus:outline-none ${
                    isStressed
                      ? 'bg-[#D0EAA3] text-[#142314] shadow-md scale-105 ring-2 ring-[#D0EAA3]/50'
                      : 'bg-white/[0.05] text-white/80 hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  <span>{w.word}</span>
                  <span
                    className={`h-1 rounded-full transition-all ${
                      isStressed ? 'w-full bg-[#142314]' : 'w-2 bg-white/20'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Diagnóstico Semântico da Mudança de Sentido */}
        <div className="p-4 rounded-xl bg-white/[0.04] border border-[#D0EAA3]/25 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[12px] font-mono text-[#D0EAA3]">
            <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
            <span className="uppercase font-semibold tracking-wider">
              Enfase em: &quot;{activeWord.word.toUpperCase()}&quot;
            </span>
          </div>

          <div className="p-3 rounded-lg bg-black/30 border border-white/10 text-[13px] text-white/90 leading-relaxed">
            <span className="text-[#FFF18C] font-semibold">Significado transmitido ao interlocutor: </span>
            {activeWord.impliedMeaning}
          </div>

          <p className="text-[11.5px] text-white/60 leading-relaxed">
            No inglês falado natural, a palavra que recebe o pico de entonação (Pitch Accent) carrega o foco semântico da
            frase inteira. Alterar a palavra tônica muda completamente o subtexto comunicado.
          </p>
        </div>
      </div>
    </div>
  );
}
