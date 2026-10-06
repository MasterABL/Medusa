'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  SCRIPTURE_PASSAGES,
  READING_PLANS,
  MEMORY_CARDS,
  PRAYER_INTENTIONS,
  GRATITUDE_ENTRIES,
  ScripturePassage,
  ScriptureVerse,
  MemoryVerseCard,
} from './spiritualFixtures';
import { useShell } from '@/context/ShellContext';
import { playFeedback } from '@/lib/audioFeedback';

type SpiritualSubView = 'escritura' | 'planos' | 'memoria' | 'oracao' | 'gratidao';
type BreathPhase = 'inspira' | 'retém1' | 'expira' | 'retém2';

export function SpiritualContainer() {
  const [subView, setSubView] = useState<SpiritualSubView>('escritura');

  // Estados da Escritura Viva (Home)
  const [selectedPassageId, setSelectedPassageId] = useState<string>('romanos-8');
  const [focusedVerseNumber, setFocusedVerseNumber] = useState<number | null>(31);
  const [userNotes, setUserNotes] = useState<Record<number, string>>({});
  const [editingNoteVerse, setEditingNoteVerse] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');

  // Estados dos Planos de Leitura
  const [plans, setPlans] = useState(READING_PLANS);

  // Estados do Modo Memória & SRS
  const [selectedMemoryCardId, setSelectedMemoryCardId] = useState<string>('mem-1');
  const [hidePercent, setHidePercent] = useState<25 | 50 | 75 | 100>(50);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());

  // Estados de Oração & Respiração Contemplativa
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inspira');
  const [breathSeconds, setBreathSeconds] = useState<number>(4);
  const [silenceSeconds, setSilenceSeconds] = useState<number>(0);
  const [isMeditating, setIsMeditating] = useState<boolean>(false);
  const [intentions, setIntentions] = useState(PRAYER_INTENTIONS);

  // Estados do Diário de Gratidão
  const [gratitudeEntries, setGratitudeEntries] = useState(GRATITUDE_ENTRIES);
  const [newMotiveDraft, setNewMotiveDraft] = useState<string>('');

  const { triggerIslandNotification } = useShell();

  const passage: ScripturePassage = useMemo(() => {
    return SCRIPTURE_PASSAGES.find((p) => p.id === selectedPassageId) || SCRIPTURE_PASSAGES[0];
  }, [selectedPassageId]);

  const activeMemoryCard: MemoryVerseCard = useMemo(() => {
    return MEMORY_CARDS.find((m) => m.id === selectedMemoryCardId) || MEMORY_CARDS[0];
  }, [selectedMemoryCardId]);

  // Se trocar de passagem, redefine o foco para o primeiro versículo
  useEffect(() => {
    if (passage.verses[0]) {
      setFocusedVerseNumber(passage.verses[0].number);
    }
  }, [passage]);

  // Ciclo da Respiração Contemplativa de 4 Tempos (Inspira 4s -> Retém 4s -> Expira 4s -> Retém 4s)
  useEffect(() => {
    if (subView !== 'oracao' || !isMeditating) return;

    const timerInterval = setInterval(() => {
      setSilenceSeconds((s) => s + 1);
      setBreathSeconds((sec) => {
        if (sec <= 1) {
          setBreathPhase((prev) => {
            if (prev === 'inspira') return 'retém1';
            if (prev === 'retém1') return 'expira';
            if (prev === 'expira') return 'retém2';
            return 'inspira';
          });
          return 4;
        }
        return sec - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [subView, isMeditating]);

  const focusedVerse: ScriptureVerse | undefined = useMemo(() => {
    return passage.verses.find((v) => v.number === focusedVerseNumber);
  }, [passage, focusedVerseNumber]);

  // Salvar anotação reflexiva
  const handleSaveNote = useCallback(
    (verseNum: number) => {
      if (!noteDraft.trim()) return;
      setUserNotes((prev) => ({ ...prev, [verseNum]: noteDraft }));
      setEditingNoteVerse(null);
      setNoteDraft('');
      playFeedback('success');
      triggerIslandNotification({
        title: 'Reflexão Registrada',
        tag: 'ESCRITURA VIVA',
        description: `Nota salva no versículo ${verseNum}. Cifragem local mantida.`,
        badge: 'PRIVADO',
        state: 'active',
        durationMs: 3000,
      });
    },
    [noteDraft, triggerIslandNotification]
  );

  // Marcar leitura de plano como concluída
  const handleTogglePlanToday = useCallback(
    (planId: string) => {
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== planId) return p;
          const nextDone = !p.todayCompleted;
          playFeedback(nextDone ? 'action' : 'press');
          return {
            ...p,
            todayCompleted: nextDone,
            completedDays: nextDone ? p.completedDays + 1 : p.completedDays - 1,
          };
        })
      );
    },
    []
  );

  // Revelar/Ocultar palavra no modo memória
  const toggleWordReveal = useCallback((wordKey: string) => {
    setRevealedWords((prev) => {
      const next = new Set(prev);
      if (next.has(wordKey)) next.delete(wordKey);
      else next.add(wordKey);
      return next;
    });
    playFeedback('press');
  }, []);

  // Adicionar motivo de gratidão
  const handleAddGratitude = useCallback(() => {
    if (!newMotiveDraft.trim()) return;
    setGratitudeEntries((prev) => [
      {
        id: `grat-${Date.now()}`,
        date: 'Hoje',
        motives: [newMotiveDraft, ...(prev[0]?.motives || []).slice(0, 2)],
      },
      ...prev.slice(1),
    ]);
    setNewMotiveDraft('');
    playFeedback('success');
  }, [newMotiveDraft]);

  return (
    <main
      className={`w-full pb-24 px-4 sm:px-8 max-w-4xl mx-auto flex flex-col gap-8 pt-6 flex-1 transition-colors duration-700 study-stage-enter ${
        subView === 'oracao' ? 'bg-[#101513] text-[#FAFDF5] rounded-3xl p-6 sm:p-10 shadow-2xl' : ''
      }`}
      aria-label="Escritura Viva · Vida Espiritual"
    >
      {/* 1. CABEÇALHO CONTEXTUAL + NAVEGAÇÃO INTERNA DO DOMÍNIO */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                subView === 'oracao' ? 'bg-[#ADE4B5] animate-pulse' : 'bg-[#71DBD2]'
              }`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-mono tracking-wider uppercase opacity-75">
              Escritura Viva · Prática Espiritual
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {subView === 'escritura'
              ? passage.reference
              : subView === 'planos'
              ? 'Planos de Leitura Contínua'
              : subView === 'memoria'
              ? 'Memória Bíblica & Retenção'
              : subView === 'oracao'
              ? 'Oração Contemplativa & Silêncio'
              : 'Diário de Gratidão & Paz'}
          </h1>
        </div>

        {/* Subnav interna de Espiritual */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/70 shadow-subtle overflow-x-auto text-[#1C2420] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setSubView('escritura');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'escritura'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Escritura</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('planos');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'planos'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span>Planos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('memoria');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'memoria'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Memória</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('oracao');
              setIsMeditating(true);
              playFeedback('press');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'oracao'
                ? 'bg-[#1C2420] text-[#ADE4B5] shadow-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">spa</span>
            <span>Oração</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('gratidao');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'gratidao'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">favorite</span>
            <span>Gratidão</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SUBVIEW 1: ESCRITURA VIVA (HOME OFICIAL DE ESPIRITUAL)     */}
      {/* ========================================================= */}
      {subView === 'escritura' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          {/* Seletor de Livros & Passagens */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {SCRIPTURE_PASSAGES.map((p) => {
              const isSelected = p.id === selectedPassageId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPassageId(p.id);
                    playFeedback('press');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-[12px] font-mono transition-all border shadow-subtle ${
                    isSelected
                      ? 'bg-surface font-bold text-text-primary border-[#71DBD2] ring-1 ring-[#71DBD2]/40'
                      : 'bg-surface border-border/70 text-text-muted hover:text-text-primary'
                  }`}
                >
                  {p.book} {p.chapter} ({p.reference.split(' ')[1]})
                </button>
              );
            })}
          </div>

          {/* Texto Bíblico Formatado com Versículos Numerados */}
          <section
            aria-label="Texto da Escritura"
            className="p-6 sm:p-10 rounded-3xl bg-surface border border-border/70 shadow-calm flex flex-col gap-6"
          >
            <div className="border-b border-border/40 pb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">
                Tema: {passage.theme}
              </span>
              <p className="text-[13px] text-text-secondary leading-relaxed pt-1">
                {passage.summary}
              </p>
            </div>

            <div className="space-y-4 text-base sm:text-lg leading-relaxed text-text-primary font-serif">
              {passage.verses.map((v) => {
                const isFocused = v.number === focusedVerseNumber;

                return (
                  <div
                    key={v.number}
                    onClick={() => {
                      setFocusedVerseNumber(v.number);
                      playFeedback('press');
                    }}
                    className={`p-3 rounded-2xl transition-all duration-300 cursor-pointer flex items-baseline gap-3 ${
                      isFocused
                        ? 'bg-[#FAFDF5] border border-[#71DBD2]/50 shadow-calm ring-1 ring-[#71DBD2]/30 pl-4'
                        : 'hover:bg-surface-secondary/40'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold text-[#71DBD2] flex-shrink-0 select-none">
                      {v.number}
                    </span>
                    <p className={`flex-1 ${isFocused ? 'font-medium' : 'text-text-secondary'}`}>
                      {v.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Painel de Foco e Reflexão do Versículo Selecionado */}
            {focusedVerse && (
              <div className="mt-4 p-5 rounded-2xl bg-surface-secondary/40 border border-border/60 flex flex-col gap-3 font-sans animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-text-muted">
                    Reflexão · Versículo {focusedVerse.number}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoteVerse(focusedVerse.number);
                      setNoteDraft(userNotes[focusedVerse.number] || '');
                    }}
                    className="text-[11px] font-mono text-[#71DBD2] hover:underline"
                  >
                    {userNotes[focusedVerse.number] ? 'Editar reflexão' : 'Adicionar reflexão'}
                  </button>
                </div>

                <p className="text-[13px] text-text-secondary leading-relaxed">
                  {focusedVerse.reflection}
                </p>

                {/* Caixa de Anotação Reflexiva */}
                {editingNoteVerse === focusedVerse.number ? (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Escreva sua oração ou aplicação prática pessoal deste versículo..."
                      rows={3}
                      className="w-full p-3 rounded-xl bg-surface border border-border/70 text-[12px] text-text-primary focus:outline-none focus:border-[#71DBD2]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNoteVerse(null)}
                        className="px-3 py-1.5 text-[11px] font-mono text-text-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNote(focusedVerse.number)}
                        className="px-4 py-1.5 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-bold shadow-subtle"
                      >
                        Salvar Anotação
                      </button>
                    </div>
                  </div>
                ) : (
                  userNotes[focusedVerse.number] && (
                    <div className="p-3 rounded-xl bg-surface border border-border/50 text-[12px] text-text-primary italic">
                      &quot;{userNotes[focusedVerse.number]}&quot;
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 2: PLANOS DE LEITURA                             */}
      {/* ========================================================= */}
      {subView === 'planos' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Constância &amp; Continuidade Bíblica
              </span>
              <p className="text-[13px] text-text-secondary">
                Planos de leitura estruturados por livros temáticos e cronologia da fé.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {plans.map((plan) => {
              const progressPct = Math.round((plan.completedDays / plan.durationDays) * 100);

              return (
                <div
                  key={plan.id}
                  className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-secondary text-text-secondary">
                          {plan.category}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          Dia {plan.completedDays} de {plan.durationDays}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-text-primary">
                        {plan.title}
                      </h3>
                      <p className="text-[12px] text-text-secondary">
                        Leitura de hoje: <strong>{plan.currentReadingReference}</strong> ({plan.currentDayTitle})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePlanToday(plan.id)}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold font-mono transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-subtle ${
                        plan.todayCompleted
                          ? 'bg-[#ADE4B5] text-[#1C2420]'
                          : 'bg-surface border border-border/70 hover:border-[#71DBD2] text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {plan.todayCompleted ? 'check_circle' : 'circle'}
                      </span>
                      <span>{plan.todayCompleted ? 'Lido Hoje' : 'Marcar como Lido'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border/40">
                    <div className="w-full bg-surface-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#71DBD2] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-text-muted pt-0.5">
                      <span>Progresso: {progressPct}%</span>
                      <span>{plan.durationDays - plan.completedDays} dias restantes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 3: MEMÓRIA BÍBLICA & RETENÇÃO (SRS)               */}
      {/* ========================================================= */}
      {subView === 'memoria' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Ocultação Progressiva de Palavras
              </span>
              <p className="text-[13px] text-text-secondary">
                Guarde a Palavra no coração ocultando partes do versículo e revelando ao clique.
              </p>
            </div>

            {/* Seletor de Nível de Ocultação */}
            <div className="flex items-center gap-1">
              {([25, 50, 75, 100] as const).map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setHidePercent(pct);
                    setRevealedWords(new Set());
                    playFeedback('press');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                    hidePercent === pct
                      ? 'bg-[#1C2420] text-[#FAFDF5] font-bold shadow-subtle'
                      : 'bg-surface border-border/60 text-text-muted hover:text-text-primary'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Cartão de Memorização Ativo */}
          <div className="p-8 rounded-3xl bg-surface border border-border/70 shadow-calm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[#71DBD2] uppercase">
                {activeMemoryCard.reference} · {activeMemoryCard.theme}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-text-secondary">
                Nível: {activeMemoryCard.retentionLevel}
              </span>
            </div>

            {/* Texto com Palavras Ocultadas / Interativas */}
            <div className="text-xl sm:text-2xl font-serif leading-relaxed text-text-primary flex flex-wrap gap-2 py-4">
              {activeMemoryCard.fullText.split(' ').map((word, idx) => {
                const cleanWord = word.replace(/[^a-zA-ZÀ-ÿ]/g, '');
                const shouldHide = activeMemoryCard.keyWords.includes(cleanWord);
                const isRevealed = revealedWords.has(`${idx}-${cleanWord}`);

                if (shouldHide && !isRevealed) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWordReveal(`${idx}-${cleanWord}`)}
                      className="px-2 py-0.5 rounded-lg bg-surface-secondary/90 hover:bg-[#FFF18C]/60 text-transparent border border-border/70 select-none transition-all cursor-pointer font-sans text-sm inline-block"
                      title="Clique para revelar a palavra"
                    >
                      {word}
                    </button>
                  );
                }

                return (
                  <span
                    key={idx}
                    className={shouldHide && isRevealed ? 'text-[#18534B] dark:text-[#ADE4B5] font-bold' : ''}
                  >
                    {word}
                  </span>
                );
              })}
            </div>

            {/* Avaliação de Retenção Espaçada */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border/40">
              <span className="text-[11px] font-mono text-text-muted">
                Avalie sua retenção ao recitar mentalmente:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playFeedback('press');
                    triggerIslandNotification({
                      title: 'Revisão Agendada (1d)',
                      tag: 'MEMÓRIA SRS',
                      description: 'Versículo marcado para revisão amanhã.',
                      badge: 'REVISÃO',
                      state: 'active',
                      durationMs: 3000,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface border border-border/70 hover:border-border text-xs font-mono font-medium text-text-secondary"
                >
                  Difícil (1d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playFeedback('press');
                    triggerIslandNotification({
                      title: 'Revisão Agendada (3d)',
                      tag: 'MEMÓRIA SRS',
                      description: 'Retenção moderada. Revisão em 3 dias.',
                      badge: 'BOM',
                      state: 'active',
                      durationMs: 3000,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface border border-border/70 hover:border-border text-xs font-mono font-medium text-text-secondary"
                >
                  Bom (3d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playFeedback('success');
                    triggerIslandNotification({
                      title: 'Versículo Retido!',
                      tag: 'MEMÓRIA SRS',
                      description: 'Excelente fixação. Próxima revisão em 7 dias.',
                      badge: 'RETIDO',
                      state: 'active',
                      durationMs: 3000,
                    });
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#ADE4B5] hover:bg-[#ADE4B5]/90 text-[#1C2420] text-xs font-mono font-bold"
                >
                  Fácil (7d)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 4: ORAÇÃO CONTEMPLATIVA & SILÊNCIO                */}
      {/* ========================================================= */}
      {subView === 'oracao' && (
        <div className="flex flex-col items-center justify-center gap-8 py-6 text-center animate-in fade-in duration-700">
          {/* Versículo Âncora */}
          <div className="space-y-1 max-w-xl">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#ADE4B5] font-semibold">
              Versículo Âncora do Silêncio
            </span>
            <p className="text-xl sm:text-2xl font-serif italic text-[#FAFDF5]">
              &quot;Aquietai-vos e sabei que eu sou Deus.&quot;
            </p>
            <span className="text-xs font-mono opacity-60">Salmo 46:10</span>
          </div>

          {/* CÍRCULO VIVO DE RESPIRAÇÃO GUIADA (4 TEMPOS REAIS) */}
          <div className="relative w-64 h-64 flex items-center justify-center my-4">
            {/* Círculo Externo com Escala Suave */}
            <div
              className={`absolute rounded-full border border-[#ADE4B5]/30 transition-all duration-1000 ease-in-out ${
                breathPhase === 'inspira'
                  ? 'w-60 h-60 bg-[#ADE4B5]/10 scale-105'
                  : breathPhase === 'retém1'
                  ? 'w-60 h-60 bg-[#ADE4B5]/15 scale-105'
                  : breathPhase === 'expira'
                  ? 'w-44 h-44 bg-[#ADE4B5]/5 scale-90'
                  : 'w-44 h-44 bg-[#ADE4B5]/5 scale-90'
              }`}
            />

            {/* Núcleo Central de Respiração */}
            <div className="relative z-10 flex flex-col items-center justify-center space-y-1">
              <span className="text-sm font-mono font-bold tracking-widest uppercase text-[#ADE4B5]">
                {breathPhase === 'inspira'
                  ? 'INSPIRA'
                  : breathPhase === 'retém1'
                  ? 'RETÉM'
                  : breathPhase === 'expira'
                  ? 'EXPIRA'
                  : 'RETÉM'}
              </span>
              <span className="text-3xl font-extrabold font-mono text-[#FAFDF5] tabular-nums">
                {breathSeconds}s
              </span>
              <span className="text-[10px] font-mono opacity-60">
                Silêncio: {Math.floor(silenceSeconds / 60)}m {silenceSeconds % 60}s
              </span>
            </div>
          </div>

          {/* Intenções de Oração do Dia */}
          <div className="w-full max-w-xl text-left bg-[#18201D] border border-border/40 p-5 rounded-2xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#ADE4B5] font-bold block">
              Intenções Perante Deus
            </span>

            <div className="space-y-2">
              {intentions.map((intent) => (
                <div
                  key={intent.id}
                  className="p-3 rounded-xl bg-[#111614] border border-border/30 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase text-[#ADE4B5]">
                      {intent.category}
                    </span>
                    <p className="text-[#FAFDF5]">{intent.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIntentions((prev) =>
                        prev.map((i) =>
                          i.id === intent.id ? { ...i, isAnswered: !i.isAnswered } : i
                        )
                      );
                      playFeedback('success');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                      intent.isAnswered
                        ? 'bg-[#ADE4B5] text-[#1C2420] font-bold'
                        : 'bg-surface-secondary text-text-muted hover:text-[#FAFDF5]'
                    }`}
                  >
                    {intent.isAnswered ? 'Atendida ✓' : 'Interceder'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 5: DIÁRIO DE GRATIDÃO & REFLEXÕES                 */}
      {/* ========================================================= */}
      {subView === 'gratidao' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Coração Grato · Blindagem contra a Ansiedade
              </span>
              <p className="text-[13px] text-text-secondary">
                Registre os motivos diários de ação de graças perante a providência de Deus.
              </p>
            </div>
          </div>

          {/* Adicionar Motivo Rápido */}
          <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newMotiveDraft}
              onChange={(e) => setNewMotiveDraft(e.target.value)}
              placeholder="Pelo que você é grato a Deus hoje?"
              className="flex-1 px-4 py-2 rounded-xl bg-surface-secondary/40 border border-border/70 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#71DBD2]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddGratitude()}
            />
            <button
              type="button"
              onClick={handleAddGratitude}
              className="px-5 py-2 rounded-xl bg-[#ADE4B5] hover:bg-[#ADE4B5]/90 text-[#1C2420] text-xs font-bold font-mono transition-transform active:scale-95 shadow-subtle flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Agradecer</span>
            </button>
          </div>

          {/* Lista de Registros Preservados */}
          <div className="space-y-4">
            {gratitudeEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm space-y-3"
              >
                <span className="text-[11px] font-mono font-bold text-text-muted uppercase block">
                  {entry.date}
                </span>

                <div className="space-y-2">
                  {entry.motives.map((mot, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                      <span className="text-[#71DBD2] select-none font-bold">●</span>
                      <p className="leading-relaxed">{mot}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
