'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SCRIPTURE_PASSAGES, ScripturePassage, ScriptureVerse } from './spiritualFixtures';
import { playFeedback } from '@/lib/audioFeedback';

type SpiritualMode = 'leitura' | 'memoria' | 'oracao';

export function SpiritualContainer() {
  const [selectedPassageId, setSelectedPassageId] = useState<string>('romanos-8');
  const [mode, setMode] = useState<SpiritualMode>('leitura');
  const [focusedVerseNumber, setFocusedVerseNumber] = useState<number | null>(31);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());
  const [userNotes, setUserNotes] = useState<Record<number, string>>({});
  const [editingNoteVerse, setEditingNoteVerse] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');

  // Estados de Oração / Silêncio
  const [breathPhase, setBreathPhase] = useState<'inspira' | 'retém' | 'expira'>('inspira');
  const [silenceSeconds, setSilenceSeconds] = useState<number>(0);
  const [silenceRunning, setSilenceRunning] = useState<boolean>(false);

  const passage: ScripturePassage = useMemo(() => {
    return SCRIPTURE_PASSAGES.find((p) => p.id === selectedPassageId) || SCRIPTURE_PASSAGES[0];
  }, [selectedPassageId]);

  // Se trocar de passagem, redefine o versículo em foco para o primeiro da lista
  useEffect(() => {
    if (passage.verses[0]) {
      setFocusedVerseNumber(passage.verses[0].number);
    }
    setRevealedWords(new Set());
  }, [passage]);

  // Ciclo da Respiração Contemplativa no modo oração
  useEffect(() => {
    if (mode !== 'oracao' || !silenceRunning) return;

    const breathInterval = setInterval(() => {
      setBreathPhase((prev) => {
        if (prev === 'inspira') return 'retém';
        if (prev === 'retém') return 'expira';
        return 'inspira';
      });
    }, 4000);

    const timerInterval = setInterval(() => {
      setSilenceSeconds((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(breathInterval);
      clearInterval(timerInterval);
    };
  }, [mode, silenceRunning]);

  const focusedVerse: ScriptureVerse | undefined = useMemo(() => {
    return passage.verses.find((v) => v.number === focusedVerseNumber);
  }, [passage, focusedVerseNumber]);

  // Ações do modo memória
  const toggleWordReveal = useCallback((wordKey: string) => {
    setRevealedWords((prev) => {
      const next = new Set(prev);
      if (next.has(wordKey)) next.delete(wordKey);
      else next.add(wordKey);
      return next;
    });
    playFeedback('press');
  }, []);

  const revealAllVerseWords = useCallback((verseNum: number) => {
    const v = passage.verses.find((x) => x.number === verseNum);
    if (!v) return;
    setRevealedWords((prev) => {
      const next = new Set(prev);
      v.keyWords.forEach((w) => next.add(`${verseNum}-${w}`));
      return next;
    });
    playFeedback('action');
  }, [passage]);

  // Salvar anotação reflexiva
  const handleSaveNote = useCallback((verseNum: number) => {
    if (!noteDraft.trim()) return;
    setUserNotes((prev) => ({ ...prev, [verseNum]: noteDraft }));
    setEditingNoteVerse(null);
    setNoteDraft('');
    playFeedback('success');
  }, [noteDraft]);

  return (
    <main
      className={`w-full pb-24 px-4 sm:px-8 max-w-4xl mx-auto flex flex-col gap-8 pt-6 flex-1 transition-colors duration-700 study-stage-enter ${
        mode === 'oracao' ? 'bg-[#101513] text-[#FAFDF5] rounded-3xl p-6 sm:p-10 shadow-2xl' : ''
      }`}
      aria-label="Escritura Viva · Leitura Espiritual"
    >
      {/* 1. CABEÇALHO CONTEMPLATIVO E MODOS DE PRÁTICA */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                mode === 'oracao' ? 'bg-[#ADE4B5] animate-pulse' : 'bg-[#71DBD2]'
              }`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-mono tracking-wider uppercase opacity-75">
              Escritura Viva · {passage.theme}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {passage.reference}
            </h1>

            {/* Alternador de Passagem */}
            <div className="flex items-center gap-1.5 ml-2">
              {SCRIPTURE_PASSAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPassageId(p.id);
                    playFeedback('press');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                    p.id === selectedPassageId
                      ? 'bg-surface font-bold text-text-primary shadow-subtle border border-border/60'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {p.book} {p.chapter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BARRINHA DE MODOS: LEITURA, MEMÓRIA, ORAÇÃO */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/70 shadow-subtle">
          <button
            type="button"
            onClick={() => {
              setMode('leitura');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 ${
              mode === 'leitura'
                ? 'bg-[#FAFDF5] text-[#1C2420] shadow-sm font-bold border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Leitura</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('memoria');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 ${
              mode === 'memoria'
                ? 'bg-[#FAFDF5] text-[#1C2420] shadow-sm font-bold border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Memória</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('oracao');
              setSilenceRunning(true);
              playFeedback('action');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 ${
              mode === 'oracao'
                ? 'bg-[#101513] text-[#FAFDF5] shadow-sm font-bold border border-[#ADE4B5]/40'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">spa</span>
            <span>Oração</span>
          </button>
        </div>
      </header>

      {/* 2. MODO ORAÇÃO / SILÊNCIO CONTEMPLATIVO */}
      {mode === 'oracao' && (
        <section aria-label="Modo Oração e Silêncio" className="flex flex-col items-center text-center gap-6 py-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-mono tracking-widest uppercase opacity-70">
              Silêncio da Mente · Oração do Coração
            </span>
            <span className="opacity-40">•</span>
            <span className="text-[12px] font-mono text-[#ADE4B5] tabular-nums font-bold">
              {Math.floor(silenceSeconds / 60)}:
              {String(silenceSeconds % 60).padStart(2, '0')}
            </span>
          </div>

          {/* Círculo de Respiração Orgânica */}
          <div className="relative flex items-center justify-center my-4">
            <div
              className={`w-36 h-36 rounded-full border border-[#ADE4B5]/40 flex flex-col items-center justify-center transition-all duration-1000 shadow-2xl ${
                breathPhase === 'inspira'
                  ? 'scale-110 bg-[#ADE4B5]/15 border-[#ADE4B5]'
                  : breathPhase === 'retém'
                  ? 'scale-110 bg-[#FFF18C]/15 border-[#FFF18C]'
                  : 'scale-90 bg-transparent border-[#ADE4B5]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[28px] text-[#ADE4B5]">spa</span>
              <span className="text-[11px] font-mono uppercase tracking-widest mt-1 font-bold">
                {breathPhase === 'inspira'
                  ? 'Inspire'
                  : breathPhase === 'retém'
                  ? 'Retenha'
                  : 'Expire'}
              </span>
            </div>
          </div>

          {/* Versículo Âncora da Oração */}
          {focusedVerse && (
            <div className="max-w-xl space-y-3 bg-[#FAFDF5]/5 border border-[#FAFDF5]/10 p-6 rounded-2xl backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-[#FAFDF5]">
                &ldquo;{focusedVerse.text}&rdquo;
              </p>
              <span className="text-[11px] font-mono text-[#ADE4B5] tracking-widest uppercase block">
                {passage.book} {passage.chapter}:{focusedVerse.number}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSilenceRunning(!silenceRunning)}
              className="px-4 py-2 rounded-xl bg-[#FAFDF5]/10 hover:bg-[#FAFDF5]/20 text-[12px] font-mono transition-colors"
            >
              {silenceRunning ? 'Pausar Respiração' : 'Retomar Respiração'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('leitura');
                setSilenceRunning(false);
                playFeedback('press');
              }}
              className="px-4 py-2 rounded-xl bg-[#ADE4B5] text-[#1C2420] text-[12px] font-mono font-bold transition-all shadow-subtle"
            >
              Retornar à Leitura
            </button>
          </div>
        </section>
      )}

      {/* 3. A ESCRITURA PROTAGONISTA (MODOS LEITURA & MEMÓRIA) */}
      {mode !== 'oracao' && (
        <section aria-label="Texto Sagrado" className="flex flex-col gap-6">
          <div className="space-y-6 sm:space-y-8 font-serif leading-relaxed text-[17px] sm:text-[19px]">
            {passage.verses.map((verse) => {
              const isFocused = focusedVerseNumber === verse.number;
              const hasNote = !!userNotes[verse.number];

              // Renderização do texto no Modo Memória (com lacunas)
              const renderVerseContent = () => {
                if (mode !== 'memoria') {
                  return verse.text;
                }

                const words = verse.text.split(' ');
                return words.map((w, wIdx) => {
                  const clean = w.replace(/[,.;:?!]/g, '');
                  const isKey = verse.keyWords.includes(clean);
                  const wordKey = `${verse.number}-${clean}`;
                  const isRevealed = revealedWords.has(wordKey);

                  if (isKey) {
                    if (isRevealed) {
                      return (
                        <button
                          key={wIdx}
                          type="button"
                          onClick={() => toggleWordReveal(wordKey)}
                          className="inline px-1 mx-0.5 rounded bg-[#ADE4B5]/40 text-text-primary font-sans font-semibold underline decoration-[#71DBD2] transition-colors"
                          title="Clique para ocultar novamente"
                        >
                          {w}{' '}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={wIdx}
                        type="button"
                        onClick={() => toggleWordReveal(wordKey)}
                        className="inline-block px-2 py-0.5 mx-0.5 rounded-md bg-[#FAFDF5] border border-border/80 text-[13px] font-mono font-bold text-text-muted hover:border-[#71DBD2] hover:text-text-primary transition-all shadow-subtle"
                        title="Clique para revelar a palavra"
                      >
                        [ ••• ]
                      </button>
                    );
                  }
                  return w + ' ';
                });
              };

              return (
                <div
                  key={verse.number}
                  className={`relative p-5 sm:p-7 rounded-2xl border transition-all duration-300 ${
                    isFocused
                      ? 'bg-[#FAFDF5] border-[#71DBD2]/60 shadow-calm ring-1 ring-[#71DBD2]/30'
                      : 'bg-surface/60 border-border/40 opacity-75 hover:opacity-100 hover:bg-surface'
                  }`}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setFocusedVerseNumber(verse.number);
                      playFeedback('press');
                    }}
                  >
                    <span className="font-mono text-[12px] font-bold text-[#71DBD2] mr-3 select-none">
                      {verse.number}
                    </span>
                    <span className="text-text-primary select-text">
                      {renderVerseContent()}
                    </span>
                  </div>

                  {/* CONTROLES E NOTAS QUANDO O VERSÍCULO ESTÁ EM FOCO */}
                  {isFocused && (
                    <div className="mt-5 pt-4 border-t border-border/50 font-sans text-[13px] flex flex-col gap-3 animate-in fade-in duration-200">
                      {/* Modo Memória: Botões de Ajuda */}
                      {mode === 'memoria' && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-mono text-text-muted">
                            Toque nas lacunas ou revele todas
                          </span>
                          <button
                            type="button"
                            onClick={() => revealAllVerseWords(verse.number)}
                            className="px-3 py-1 rounded-lg bg-surface border border-border/70 hover:border-[#71DBD2] text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Revelar Versículo
                          </button>
                        </div>
                      )}

                      {/* Modo Leitura: Reflexão Contemplativa e Anotações */}
                      {mode === 'leitura' && (
                        <>
                          <div className="flex items-start gap-2.5 text-text-secondary bg-surface-secondary/40 p-3 rounded-xl border border-border/50">
                            <span className="material-symbols-outlined text-[17px] text-[#71DBD2] flex-shrink-0 mt-0.5">
                              lightbulb
                            </span>
                            <p className="leading-snug">{verse.reflection}</p>
                          </div>

                          {/* Anotação Pessoal salva */}
                          {hasNote && (
                            <div className="p-3 rounded-xl bg-[#FAFDF5] border border-[#ADE4B5]/60 flex items-start justify-between gap-3">
                              <div>
                                <span className="text-[10px] font-mono uppercase text-green-800 font-bold block mb-0.5">
                                  Minha Reflexão Guardada
                                </span>
                                <p className="text-[13px] text-text-primary leading-snug">
                                  {userNotes[verse.number]}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteVerse(verse.number);
                                  setNoteDraft(userNotes[verse.number]);
                                }}
                                className="text-[11px] font-mono text-text-muted hover:text-text-primary"
                              >
                                Editar
                              </button>
                            </div>
                          )}

                          {/* Formulário de Anotação */}
                          {editingNoteVerse === verse.number ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Escreva uma breve reflexão ou oração sobre este trecho..."
                                rows={2}
                                className="w-full p-3 rounded-xl bg-surface border border-border/80 text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-[#71DBD2]"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteVerse(null)}
                                  className="px-3 py-1 text-[12px] text-text-muted hover:text-text-primary"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveNote(verse.number)}
                                  className="px-3 py-1 rounded-lg bg-[#71DBD2] text-[#1C2420] text-[12px] font-semibold"
                                >
                                  Salvar Nota
                                </button>
                              </div>
                            </div>
                          ) : !hasNote ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteVerse(verse.number);
                                setNoteDraft('');
                              }}
                              className="self-start text-[11px] font-mono text-text-muted hover:text-text-primary flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit_note</span>
                              <span>Anotar reflexão sobre este versículo</span>
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
