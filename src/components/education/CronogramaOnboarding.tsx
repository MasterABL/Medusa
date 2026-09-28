'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { getDisciplineColor } from './disciplineColor';
import { playFeedback } from '@/lib/audioFeedback';
import { useShell } from '@/context/ShellContext';
import {
  WEEKDAYS,
  WEEKDAY_LABEL,
  Weekday,
  DomainLevel,
  CRONOGRAMA_DISCIPLINES,
  CronogramaPlan,
  gerarPlano,
  gerarPlanoGenerico,
  INTENSIDADE_LABEL,
  INTENSIDADE_DESCRICAO,
  DIAGNOSTICO_QUESTOES_TEMPORAIS,
  DiagnosticoQuestaoTemporal,
  TemporalBlockCategory,
} from './cronogramaPlanner';

export type Step =
  | 'intro'
  | 'diagnostico'
  | 'dominio'
  | 'revelando'
  | 'resultado';

interface CronogramaOnboardingProps {
  onFinish: (plan: CronogramaPlan, diasReais?: Weekday[]) => void;
  onClose?: () => void;
}

const BLOCOS_INFO: Record<TemporalBlockCategory, { titulo: string; icone: string; descricao: string }> = {
  rotina_fixa: {
    titulo: 'Rotina & Obrigações',
    icone: 'work',
    descricao: 'Trabalho, deslocamentos, faculdade e compromissos fixos.',
  },
  disponibilidade_real: {
    titulo: 'Disponibilidade Real',
    icone: 'schedule',
    descricao: 'Dias úteis, fins de semana e faixa de pico cognitivo.',
  },
  restricoes_e_energia: {
    titulo: 'Restrições & Energia',
    icone: 'bolt',
    descricao: 'Horários impróprios, transições e margem de respiro.',
  },
  metas_e_prazos: {
    titulo: 'Metas & Prazos',
    icone: 'flag',
    descricao: 'Edição do ENEM, nota de corte, simulados e redação.',
  },
  ritmo_e_foco: {
    titulo: 'Ritmo & Foco',
    icone: 'timer',
    descricao: 'Duração contínua de sessão, pausas e proteção contra distrações.',
  },
  prioridades_e_tradeoffs: {
    titulo: 'Prioridades & Tradeoffs',
    icone: 'balance',
    descricao: 'Área de maior peso, reagendamento de imprevistos e cortes.',
  },
};

const BLOCOS_ORDER: TemporalBlockCategory[] = [
  'rotina_fixa',
  'disponibilidade_real',
  'restricoes_e_energia',
  'metas_e_prazos',
  'ritmo_e_foco',
  'prioridades_e_tradeoffs',
];

const STORAGE_KEY_ANSWERS = 'medusa_cronograma_diag_answers';
const STORAGE_KEY_MULTI = 'medusa_cronograma_diag_multi';
const STORAGE_KEY_CUSTOM = 'medusa_cronograma_diag_custom';
const STORAGE_KEY_STEP = 'medusa_cronograma_diag_step';
const STORAGE_KEY_BLOCO = 'medusa_cronograma_diag_bloco';

export function CronogramaOnboarding({ onFinish, onClose }: CronogramaOnboardingProps) {
  const { setActiveRoute, triggerIslandNotification } = useShell();
  const [step, setStep] = useState<Step>('intro');
  const [activeBlocoIndex, setActiveBlocoIndex] = useState(0);
  const [diagnosticoRespostas, setDiagnosticoRespostas] = useState<Record<string, number>>({});
  const [multiRespostas, setMultiRespostas] = useState<Record<string, number[]>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [dominio, setDominio] = useState<Partial<Record<string, DomainLevel>>>({});
  const [plano, setPlano] = useState<CronogramaPlan | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Referência para o container de rolagem real (100% zoom gate)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Hidratação persistente dos rascunhos de diagnóstico
  useEffect(() => {
    setMounted(true);
    try {
      const savedAnswers = localStorage.getItem(STORAGE_KEY_ANSWERS);
      if (savedAnswers) {
        setDiagnosticoRespostas(JSON.parse(savedAnswers));
      }
      const savedMulti = localStorage.getItem(STORAGE_KEY_MULTI);
      if (savedMulti) {
        setMultiRespostas(JSON.parse(savedMulti));
      }
      const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM);
      if (savedCustom) {
        setCustomTexts(JSON.parse(savedCustom));
      }
      const savedStep = localStorage.getItem(STORAGE_KEY_STEP) as Step | null;
      if (savedStep && ['intro', 'diagnostico', 'dominio', 'resultado'].includes(savedStep)) {
        if (savedStep === 'resultado') {
          setStep('intro');
        } else {
          setStep(savedStep);
        }
      }
      const savedBloco = localStorage.getItem(STORAGE_KEY_BLOCO);
      if (savedBloco !== null) {
        const b = parseInt(savedBloco, 10);
        if (!isNaN(b) && b >= 0 && b < BLOCOS_ORDER.length) {
          setActiveBlocoIndex(b);
        }
      }
    } catch (e) {
      console.warn('[CronogramaOnboarding] Erro ao carregar rascunho:', e);
    }

    // O Shell acompanha a entrada na experiência imersiva de planejamento temporal
    triggerIslandNotification({
      title: 'Planejador Temporal Medusa',
      description: 'Diagnóstico pedagógico e estratégico para o ENEM',
      badge: 'Cronograma',
      state: 'active',
      durationMs: 2200,
    });
  }, [triggerIslandNotification]);

  // Persiste rascunho de respostas e opções
  useEffect(() => {
    try {
      if (Object.keys(diagnosticoRespostas).length > 0) {
        localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(diagnosticoRespostas));
      }
    } catch {}
  }, [diagnosticoRespostas]);

  useEffect(() => {
    try {
      if (Object.keys(multiRespostas).length > 0) {
        localStorage.setItem(STORAGE_KEY_MULTI, JSON.stringify(multiRespostas));
      }
    } catch {}
  }, [multiRespostas]);

  useEffect(() => {
    try {
      if (Object.keys(customTexts).length > 0) {
        localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customTexts));
      }
    } catch {}
  }, [customTexts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STEP, step);
      localStorage.setItem(STORAGE_KEY_BLOCO, activeBlocoIndex.toString());
    } catch {}
  }, [step, activeBlocoIndex]);

  // Toda troca de bloco ou etapa força rolagem imediata para o topo (scrollTop = 0)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [step, activeBlocoIndex]);

  const activeBloco = BLOCOS_ORDER[activeBlocoIndex];
  const questoesDoBloco = useMemo(() => {
    return DIAGNOSTICO_QUESTOES_TEMPORAIS.filter((q) => q.bloco === activeBloco);
  }, [activeBloco]);

  const totalQuestoesRespondidas = Object.keys(diagnosticoRespostas).length;
  const totalQuestoes = DIAGNOSTICO_QUESTOES_TEMPORAIS.length;
  const isBlocoAtualCompleto = questoesDoBloco.every((q) => {
    const isMulti = q.type === 'multi';
    if (isMulti) {
      const hasOptions = (multiRespostas[q.id] || []).length > 0;
      const hasCustom = Boolean(customTexts[q.id]?.trim());
      return hasOptions || hasCustom || diagnosticoRespostas[q.id] !== undefined;
    }
    return diagnosticoRespostas[q.id] !== undefined || Boolean(customTexts[q.id]?.trim());
  });

  useEscapeKey(true, () => {
    if (onClose) onClose();
    else onFinish(gerarPlanoGenerico());
  });

  const handleSelectOpcao = (questaoId: string, opcaoIndex: number, isMulti = false) => {
    if (isMulti) {
      setMultiRespostas((prev) => {
        const current = prev[questaoId] || [];
        const updated = current.includes(opcaoIndex)
          ? current.filter((i) => i !== opcaoIndex)
          : [...current, opcaoIndex];
        return { ...prev, [questaoId]: updated };
      });
      // Mantém diagnosticoRespostas atualizado para cálculo do plano
      setDiagnosticoRespostas((prev) => ({ ...prev, [questaoId]: opcaoIndex }));
    } else {
      setDiagnosticoRespostas((prev) => ({ ...prev, [questaoId]: opcaoIndex }));
    }
    playFeedback('press');
  };

  const handleCustomTextChange = (questaoId: string, text: string) => {
    setCustomTexts((prev) => ({ ...prev, [questaoId]: text }));
    if (diagnosticoRespostas[questaoId] === undefined && text.trim().length > 0) {
      setDiagnosticoRespostas((prev) => ({ ...prev, [questaoId]: 0 }));
    }
  };

  const handleStartDiagnostic = () => {
    setIsTransitioning(true);
    playFeedback('checkpoint');
    setTimeout(() => {
      setStep('diagnostico');
      setActiveBlocoIndex(0);
      setIsTransitioning(false);
    }, 400);
  };

  const handleNextBloco = () => {
    if (activeBlocoIndex < BLOCOS_ORDER.length - 1) {
      setActiveBlocoIndex((prev) => prev + 1);
      playFeedback('checkpoint');
    } else {
      setStep('dominio');
      playFeedback('checkpoint');
    }
  };

  const handlePrevBloco = () => {
    if (activeBlocoIndex > 0) {
      setActiveBlocoIndex((prev) => prev - 1);
      playFeedback('press');
    } else {
      setStep('intro');
    }
  };

  const handlePreencherPerfilEquilibrado = () => {
    const presetRespostas: Record<string, number> = {};
    const presetMulti: Record<string, number[]> = {};
    const presetCustom: Record<string, string> = {};

    DIAGNOSTICO_QUESTOES_TEMPORAIS.forEach((q) => {
      presetRespostas[q.id] = 1;
      if (q.type === 'multi') {
        presetMulti[q.id] = [0, 1];
      }
      if (q.allowCustom) {
        presetCustom[q.id] = 'Rotina balanceada de estudos com pausas';
      }
    });

    setDiagnosticoRespostas(presetRespostas);
    setMultiRespostas(presetMulti);
    setCustomTexts(presetCustom);

    const presetDominio: Partial<Record<string, DomainLevel>> = {};
    CRONOGRAMA_DISCIPLINES.forEach((d) => {
      presetDominio[d] = 'medio';
    });
    presetDominio['Matemática'] = 'baixo';
    presetDominio['Física'] = 'baixo';
    setDominio(presetDominio);

    playFeedback('ready');
  };

  const handleCalcular = () => {
    setStep('revelando');
    playFeedback('processing');

    setTimeout(() => {
      const r08 = diagnosticoRespostas['dt_08'] ?? 1;
      let diasDisponiveis: Weekday[] = ['seg', 'ter', 'qua', 'qui', 'sex'];
      if (r08 === 0) diasDisponiveis = ['seg', 'ter', 'qui', 'sex'];
      else if (r08 === 2) diasDisponiveis = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      else if (r08 === 3) diasDisponiveis = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

      const r09 = diagnosticoRespostas['dt_09'] ?? 1;
      let horasPorDia = 3;
      if (r09 === 0) horasPorDia = 2;
      else if (r09 === 1) horasPorDia = 3.5;
      else if (r09 === 2) horasPorDia = 5;
      else if (r09 === 3) horasPorDia = 6.5;

      const hoje = new Date(2026, 8, 28);
      const anoAlvo = hoje.getMonth() >= 10 ? hoje.getFullYear() + 1 : hoje.getFullYear();
      const dataProva = `${anoAlvo}-11-08`;

      const plan = gerarPlano({
        diasDisponiveis,
        horasPorDia,
        dataProva,
        dominio,
        diagnosticoRespostas,
      }, hoje);

      setPlano(plan);
      setStep('resultado');
      playFeedback('celebration');
    }, 1000);
  };

  const handleApplyAndSync = (goToAgendaView: boolean) => {
    if (!plano) return;
    const diasReais: Weekday[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    onFinish(plano, diasReais);
    setAppliedBanner(true);
    playFeedback('success');

    triggerIslandNotification({
      title: 'Cronograma aplicado',
      description: '7 blocos de estudo sincronizados na sua Agenda',
      badge: 'Sincronizado',
      durationMs: 2400,
    });

    if (goToAgendaView) {
      setActiveRoute('agenda');
    }
  };

  const content = (
    <div
      id="cronograma-onboarding"
      className="fixed inset-0 z-[100] bg-[#F8FAF9] dark:bg-[#0E1311] text-text-primary flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.99] duration-300 w-screen h-screen"
    >
      {/* Luz ambiente de fundo sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-medusa-primary/10 via-medusa-primary/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* CABEÇALHO FIXO NO TOPO */}
      <header
        id="cronograma-fixed-header"
        className="flex-shrink-0 flex items-center justify-between px-5 sm:px-10 pt-4 sm:pt-5 pb-3 border-b border-border/60 bg-[#F8FAF9]/85 dark:bg-[#0E1311]/90 backdrop-blur-md z-20"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-medusa-primary/20 border border-medusa-primary/40 flex items-center justify-center text-medusa-primary shadow-subtle">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                Temporal OS · Cronograma ENEM
              </span>
              {step === 'diagnostico' && (
                <>
                  <span className="text-text-muted/40">•</span>
                  <span className="text-[11px] font-mono text-medusa-primary font-semibold">
                    {totalQuestoesRespondidas} de {totalQuestoes} respondidas
                  </span>
                </>
              )}
            </div>
            <h1 id="cronograma-block-title" className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
              {step === 'intro'
                ? 'Planejamento Cognitivo & Temporal'
                : step === 'diagnostico'
                ? `Bloco ${activeBlocoIndex + 1} de 6: ${BLOCOS_INFO[activeBloco].titulo}`
                : step === 'dominio'
                ? 'Autoavaliação por Disciplina'
                : step === 'revelando'
                ? 'Calculando seu plano...'
                : 'Seu Cronograma Personalizado'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step === 'diagnostico' && (
            <button
              type="button"
              id="btn-onboarding-preset"
              onClick={handlePreencherPerfilEquilibrado}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono text-text-secondary bg-surface-secondary/70 hover:bg-surface-secondary border border-border/60 transition-all hover:text-text-primary"
            >
              <span className="material-symbols-outlined text-[13px]">tune</span>
              Preencher perfil padrão
            </button>
          )}

          {step === 'intro' ? (
            <button
              type="button"
              onClick={() => onFinish(gerarPlanoGenerico())}
              className="text-[11.5px] font-mono text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg border border-border/40 hover:border-border/80 transition-all"
            >
              Pular diagnóstico
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                else setStep('intro');
              }}
              className="text-[11.5px] font-mono text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg border border-border/40 hover:border-border/80 transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">save</span>
              <span>Salvar & Sair</span>
            </button>
          )}
        </div>
      </header>

      {/* Barra de Progresso Contínua */}
      <div className="w-full bg-border/30 h-1 overflow-hidden flex-shrink-0">
        <div
          className="bg-medusa-primary h-full transition-all duration-300"
          style={{
            width: `${
              step === 'intro'
                ? 10
                : step === 'dominio'
                ? 90
                : step === 'resultado'
                ? 100
                : Math.max(10, (totalQuestoesRespondidas / totalQuestoes) * 85)
            }%`,
          }}
        />
      </div>

      {/* ÁREA DE CONTEÚDO REALMENTE SCROLLÁVEL A 100% ZOOM */}
      <div
        ref={scrollContainerRef}
        id="cronograma-questions-scroll"
        data-scroll-area="cronograma"
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col items-center relative z-10"
      >
        <div
          key={`${step}-${activeBlocoIndex}`}
          className={`w-full max-w-3xl flex flex-col gap-6 transition-all duration-400 ${
            isTransitioning ? 'opacity-0 scale-95 translate-y-3' : 'opacity-100 scale-100 translate-y-0 study-stage-enter'
          }`}
        >
          {/* STEP 1: INTRO (Boas-vindas cinematográfica e Experiência de Entrada em Tela Cheia) */}
          {step === 'intro' && (
            <div
              id="cronograma-onboarding-welcome"
              className="text-center flex flex-col items-center gap-7 py-6 sm:py-10"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-medusa-primary/20 border border-medusa-primary/40 flex items-center justify-center shadow-lg shadow-medusa-primary/10 animate-in fade-in zoom-in-95 duration-500">
                  <span className="material-symbols-outlined text-[40px] text-medusa-primary">school</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface border border-medusa-primary/60 flex items-center justify-center text-medusa-primary shadow-subtle">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>
                </div>
              </div>

              <div className="space-y-3 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono uppercase tracking-widest text-medusa-primary bg-medusa-primary/10 border border-medusa-primary/30">
                  <span>Temporal OS</span>
                  <span className="opacity-40">•</span>
                  <span>Diagnóstico Estratégico</span>
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-text-primary leading-tight">
                  Bem-vindo ao Planejador de Rotina para o ENEM.
                </h2>
                <p className="text-[14px] sm:text-[15px] text-text-secondary leading-relaxed">
                  Para que a sua Agenda funcione como um <strong>sistema operacional temporal</strong> e não apenas uma lista de tarefas teórica, investigamos sua rotina em 6 dimensões estratégicas.
                </p>
              </div>

              {/* Grid dos 6 Pilares do Diagnóstico */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full text-left pt-1">
                {BLOCOS_ORDER.map((blocoKey, idx) => (
                  <div
                    key={blocoKey}
                    className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 hover:border-medusa-primary/40 hover:bg-surface/80 transition-all flex flex-col gap-1.5 shadow-subtle group"
                  >
                    <div className="flex items-center gap-2 text-medusa-primary">
                      <div className="w-6 h-6 rounded-lg bg-medusa-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-medusa-primary/25 transition-all">
                        <span className="material-symbols-outlined text-[14px]">{BLOCOS_INFO[blocoKey].icone}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-text-primary truncate">
                        {idx + 1}. {BLOCOS_INFO[blocoKey].titulo}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-tight">
                      {BLOCOS_INFO[blocoKey].descricao}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted pt-1">
                <span className="material-symbols-outlined text-[14px] text-medusa-primary">schedule</span>
                <span>Tempo estimado: ~3 a 4 minutos · 26 variáveis · Salvo automaticamente</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full max-w-md">
                <button
                  type="button"
                  id="btn-onboarding-start-diagnostic"
                  onClick={handleStartDiagnostic}
                  className="btn-interactive flex-1 w-full bg-medusa-primary hover:opacity-95 text-[#1C2420] px-8 py-3.5 rounded-full text-[13.5px] font-semibold transition-all shadow-lg shadow-medusa-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Iniciar Diagnóstico</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                <button
                  type="button"
                  onClick={() => onFinish(gerarPlanoGenerico())}
                  className="btn-interactive text-[12px] text-text-muted hover:text-text-primary font-mono px-4 py-2 border border-transparent hover:border-border/60 rounded-full"
                >
                  Usar plano padrão
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DIAGNÓSTICO (26 PERGUNTAS ESTRUTURADAS COM MULTISELECT E RESPOSTAS PERSONALIZADAS) */}
          {step === 'diagnostico' && (
            <div className="flex flex-col gap-6 w-full pb-10">
              {/* Navegação Rápida entre os 6 Blocos */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar border-b border-border/50">
                {BLOCOS_ORDER.map((bKey, bIdx) => {
                  const isCurrent = bIdx === activeBlocoIndex;
                  const questoes = DIAGNOSTICO_QUESTOES_TEMPORAIS.filter((q) => q.bloco === bKey);
                  const respondidas = questoes.filter((q) => {
                    const isMulti = q.type === 'multi';
                    if (isMulti) {
                      const hasOptions = (multiRespostas[q.id] || []).length > 0;
                      const hasCustom = Boolean(customTexts[q.id]?.trim());
                      return hasOptions || hasCustom || diagnosticoRespostas[q.id] !== undefined;
                    }
                    return diagnosticoRespostas[q.id] !== undefined || Boolean(customTexts[q.id]?.trim());
                  }).length;
                  const allDone = respondidas === questoes.length;

                  return (
                    <button
                      key={bKey}
                      type="button"
                      onClick={() => {
                        setActiveBlocoIndex(bIdx);
                        playFeedback('press');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                        isCurrent
                          ? 'bg-surface text-text-primary border border-medusa-primary/60 shadow-subtle font-semibold'
                          : allDone
                          ? 'bg-surface-secondary/50 text-medusa-primary hover:bg-surface-secondary'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {allDone ? 'check_circle' : BLOCOS_INFO[bKey].icone}
                      </span>
                      <span>{BLOCOS_INFO[bKey].titulo}</span>
                      <span className="text-[9.5px] font-mono opacity-60">
                        ({respondidas}/{questoes.length})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Lista de Questões do Bloco Ativo */}
              <div className="flex flex-col gap-4">
                {questoesDoBloco.map((q) => {
                  const respostaSelecionada = diagnosticoRespostas[q.id];
                  const isMulti = q.type === 'multi';
                  const multiSelected = multiRespostas[q.id] || [];
                  const customTextValue = customTexts[q.id] || '';
                  const hasCustom = Boolean(customTextValue.trim());
                  const isAnswered = isMulti
                    ? (multiSelected.length > 0 || hasCustom || respostaSelecionada !== undefined)
                    : (respostaSelecionada !== undefined || hasCustom);

                  return (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 rounded-2xl bg-surface/80 border border-border/70 flex flex-col gap-3.5 shadow-subtle text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-medusa-primary font-semibold flex items-center gap-1.5">
                            <span>Questão {q.numero} de 26 · {BLOCOS_INFO[q.bloco].titulo}</span>
                            {isMulti && (
                              <span className="bg-medusa-primary/15 text-[#18534B] dark:text-[#71DBD2] px-2 py-0.5 rounded-full text-[9px] font-medium">
                                Múltipla escolha
                              </span>
                            )}
                          </span>
                          <h3 className="text-[13.5px] sm:text-[15px] font-semibold text-text-primary leading-snug">
                            {q.pergunta}
                          </h3>
                        </div>
                        {isAnswered && (
                          <span className="w-5 h-5 rounded-full bg-medusa-support/20 text-medusa-support flex items-center justify-center flex-shrink-0 mt-0.5" title="Respondida">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </span>
                        )}
                      </div>

                      {q.detalhe && (
                        <p className="text-[11.5px] text-text-secondary leading-relaxed">{q.detalhe}</p>
                      )}

                      {/* Opções de Resposta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.opcoes.map((opcao, oi) => {
                          const isSelected = isMulti
                            ? multiSelected.includes(oi)
                            : respostaSelecionada === oi;

                          return (
                            <button
                              key={oi}
                              type="button"
                              id={`opcao-${q.id}-${oi}`}
                              data-multiselect={isMulti ? "true" : undefined}
                              onClick={() => handleSelectOpcao(q.id, oi, isMulti)}
                              className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                                isSelected
                                  ? 'bg-medusa-primary/15 border-medusa-primary text-text-primary shadow-subtle ring-1 ring-medusa-primary/40'
                                  : 'bg-surface-elevated/80 border-border/70 hover:bg-surface-secondary/70 hover:border-border text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[12px] font-medium leading-tight">
                                  {opcao.texto}
                                </span>
                                {isMulti && (
                                  <span
                                    className={`w-4 h-4 rounded flex items-center justify-center border text-[11px] ${
                                      isSelected
                                        ? 'bg-medusa-primary text-[#1C2420] border-medusa-primary'
                                        : 'border-border/80'
                                    }`}
                                  >
                                    {isSelected && <span className="material-symbols-outlined text-[12px]">check</span>}
                                  </span>
                                )}
                              </div>
                              {opcao.subtexto && (
                                <span className="text-[10px] text-text-muted leading-tight">
                                  {opcao.subtexto}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Campo de Resposta Personalizada / "Outro" quando permitido */}
                      {q.allowCustom && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-medusa-primary/80">edit_note</span>
                          <input
                            type="text"
                            id={`custom-input-${q.id}`}
                            data-custom-input="true"
                            value={customTexts[q.id] || ''}
                            onChange={(e) => handleCustomTextChange(q.id, e.target.value)}
                            placeholder={q.customPlaceholder || 'Personalizar / Outro horário ou detalhe...'}
                            className="flex-1 bg-surface-secondary/40 border border-border/70 rounded-xl px-3 py-2 text-[12px] text-text-primary focus:border-medusa-primary focus:ring-1 focus:ring-medusa-primary/40 focus:outline-none placeholder:text-text-muted/60 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: AUTOAVALIAÇÃO DE DOMÍNIO */}
          {step === 'dominio' && (
            <div className="flex flex-col gap-6 w-full pb-10">
              <div className="text-center space-y-1.5">
                <span className="text-[10.5px] font-mono uppercase tracking-widest text-medusa-primary font-semibold">
                  Autoavaliação das 7 Disciplinas
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Como você avalia seu domínio em cada área?
                </h2>
                <p className="text-[12.5px] text-text-secondary max-w-lg mx-auto">
                  Disciplinas com domínio <strong>baixo</strong> receberão automaticamente mais horas de reforço e blocos de estudo no seu cronograma.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CRONOGRAMA_DISCIPLINES.map((disciplina) => {
                  const color = getDisciplineColor(disciplina);
                  const currentLevel = dominio[disciplina] ?? 'medio';

                  return (
                    <div
                      key={disciplina}
                      className="p-3.5 rounded-2xl bg-surface/80 border border-border/70 flex items-center justify-between gap-3 shadow-subtle"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                        <span className="text-[13px] font-semibold text-text-primary">{disciplina}</span>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 bg-surface-secondary/70 rounded-xl border border-border/60">
                        {(['baixo', 'medio', 'alto'] as DomainLevel[]).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => {
                              setDominio((prev) => ({ ...prev, [disciplina]: level }));
                              playFeedback('press');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono uppercase transition-all ${
                              currentLevel === level
                                ? 'bg-surface text-text-primary font-bold shadow-subtle border border-border/60'
                                : 'text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setStep('diagnostico');
                    setActiveBlocoIndex(BLOCOS_ORDER.length - 1);
                  }}
                  className="btn-interactive px-4 py-2 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border"
                >
                  Voltar ao Diagnóstico
                </button>

                <button
                  type="button"
                  id="btn-onboarding-calcular"
                  onClick={handleCalcular}
                  className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-7 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2"
                >
                  <span>Calcular Cronograma Temporal</span>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVELANDO */}
          {step === 'revelando' && (
            <div id="onboarding-revelando" className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <span className="w-16 h-16 rounded-2xl bg-medusa-primary/20 border border-medusa-primary/50 flex items-center justify-center living-pulse">
                <span className="material-symbols-outlined text-[30px] text-medusa-primary">schedule</span>
              </span>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-text-primary">Cruzando 26 Variáveis Temporais...</h3>
                <p className="text-[12px] text-text-secondary">
                  Distribuindo horas, prevenindo conflitos e calibrando blocos para a Agenda.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: RESULTADO E SINCRONIZAÇÃO */}
          {step === 'resultado' && plano && (
            <div id="cronograma-calculation-result" className="flex flex-col gap-6 w-full pb-10">
              <div className="text-center space-y-1.5">
                <span className="w-12 h-12 rounded-2xl bg-medusa-support/20 border border-medusa-support/40 flex items-center justify-center mx-auto text-medusa-support">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                  Seu Cronograma Temporal Está Pronto
                </h2>
                <p className="text-[12.5px] text-text-secondary">
                  {plano.semanasRestantes} semanas restantes · <strong>{plano.horasSemanais}h/semana</strong> · Ritmo{' '}
                  <strong className="text-medusa-primary">{INTENSIDADE_LABEL[plano.intensidade]}</strong>
                </p>
              </div>

              {appliedBanner && (
                <div
                  id="cronograma-applied-sync-banner"
                  className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in"
                >
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                    <span>Seu cronograma foi aplicado e 7 blocos foram sincronizados à sua Agenda.</span>
                  </div>
                  <button
                    type="button"
                    id="btn-view-agenda-from-sync"
                    onClick={() => setActiveRoute('agenda')}
                    className="btn-interactive px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-[11px] font-mono font-medium hover:bg-emerald-700"
                  >
                    Ver Agenda
                  </button>
                </div>
              )}

              {/* Métricas Operacionais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
                <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/70">
                  <span className="text-[9.5px] font-mono uppercase text-text-muted block">Pico Cognitivo</span>
                  <span className="text-[13.5px] font-bold text-text-primary flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-medusa-primary">wb_sunny</span>
                    {plano.horarioPico}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/70">
                  <span className="text-[9.5px] font-mono uppercase text-text-muted block">Duração de Bloco</span>
                  <span className="text-[13.5px] font-bold text-text-primary flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-medusa-primary">timer</span>
                    {plano.blocoMinutosIdeal} min
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/70">
                  <span className="text-[9.5px] font-mono uppercase text-text-muted block">Buffer Entre Aulas</span>
                  <span className="text-[13.5px] font-bold text-text-primary flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-medusa-primary">hourglass_empty</span>
                    {plano.bufferMinutos} min
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/70">
                  <span className="text-[9.5px] font-mono uppercase text-text-muted block">Área Prioritária</span>
                  <span className="text-[13.5px] font-bold text-text-primary truncate block mt-0.5" title={plano.areaPrioritaria}>
                    {plano.areaPrioritaria}
                  </span>
                </div>
              </div>

              {/* Distribuição Semanal por Disciplina */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface/80 border border-border/70 space-y-2.5 text-left">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                    Distribuição da Carga Horária
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {plano.horasSemanais} horas no total
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {plano.alocacao.map((a) => {
                    const color = getDisciplineColor(a.disciplina);
                    return (
                      <div key={a.disciplina} className="flex items-center gap-2.5 text-[11.5px]">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                        <span className="w-28 text-left font-medium text-text-secondary flex-shrink-0">{a.disciplina}</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color.dot} transition-all duration-500`}
                            style={{ width: `${a.percentual}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-text-primary font-semibold flex-shrink-0">
                          {a.horasSemana}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botões de Ação Final */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  id="btn-onboarding-ver-cronograma"
                  onClick={() => handleApplyAndSync(false)}
                  className="btn-interactive flex-1 w-full bg-medusa-primary hover:opacity-95 text-[#1C2420] py-3.5 rounded-full text-[13.5px] font-semibold transition-all shadow-subtle flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span>Concluir e Ver no Cronograma</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyAndSync(true)}
                  className="btn-interactive w-full sm:w-auto px-6 py-3.5 rounded-full text-[12.5px] font-medium text-text-secondary hover:text-text-primary bg-surface border border-border"
                >
                  Sincronizar e Ver na Agenda
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RODAPÉ FIXO PARA NAVEGAÇÃO DOS BLOCOS (100% ZOOM GATE) */}
      {step === 'diagnostico' && (
        <footer
          id="cronograma-fixed-footer"
          className="flex-shrink-0 bg-[#0C100E]/90 border-t border-border/50 px-5 sm:px-10 py-3 z-20 flex items-center justify-between"
        >
          <button
            type="button"
            onClick={handlePrevBloco}
            className="btn-interactive px-4 py-1.5 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border"
          >
            {activeBlocoIndex === 0 ? 'Voltar ao Início' : 'Bloco Anterior'}
          </button>

          <span className="text-[11px] font-mono text-text-muted">
            Bloco {activeBlocoIndex + 1} de 6
          </span>

          <button
            type="button"
            id="btn-onboarding-next-block"
            onClick={handleNextBloco}
            disabled={!isBlocoAtualCompleto}
            className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-6 py-1.5 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5"
          >
            <span>
              {activeBlocoIndex < BLOCOS_ORDER.length - 1 ? 'Próximo Bloco' : 'Avançar para Disciplinas'}
            </span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </footer>
      )}
    </div>
  );

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
