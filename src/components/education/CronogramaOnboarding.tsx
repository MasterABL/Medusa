'use client';

import React, { useMemo, useState } from 'react';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { getDisciplineColor } from './disciplineColor';
import { playFeedback } from '@/lib/audioFeedback';
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

type Step =
  | 'intro'
  | 'diagnostico'
  | 'dominio'
  | 'revelando'
  | 'resultado';

interface CronogramaOnboardingProps {
  onFinish: (plan: CronogramaPlan, diasReais?: Weekday[]) => void;
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

export function CronogramaOnboarding({ onFinish }: CronogramaOnboardingProps) {
  const [step, setStep] = useState<Step>('intro');
  const [activeBlocoIndex, setActiveBlocoIndex] = useState(0);
  const [diagnosticoRespostas, setDiagnosticoRespostas] = useState<Record<string, number>>({});
  const [dominio, setDominio] = useState<Partial<Record<string, DomainLevel>>>({});
  const [plano, setPlano] = useState<CronogramaPlan | null>(null);

  const activeBloco = BLOCOS_ORDER[activeBlocoIndex];
  const questoesDoBloco = useMemo(() => {
    return DIAGNOSTICO_QUESTOES_TEMPORAIS.filter((q) => q.bloco === activeBloco);
  }, [activeBloco]);

  const totalQuestoesRespondidas = Object.keys(diagnosticoRespostas).length;
  const totalQuestoes = DIAGNOSTICO_QUESTOES_TEMPORAIS.length;
  const isBlocoAtualCompleto = questoesDoBloco.every((q) => diagnosticoRespostas[q.id] !== undefined);
  const isDiagnosticoTotalCompleto = totalQuestoesRespondidas === totalQuestoes;

  useEscapeKey(true, () => onFinish(gerarPlanoGenerico()));

  const handleSelectOpcao = (questaoId: string, opcaoIndex: number) => {
    setDiagnosticoRespostas((prev) => ({ ...prev, [questaoId]: opcaoIndex }));
    playFeedback('press');
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
    DIAGNOSTICO_QUESTOES_TEMPORAIS.forEach((q) => {
      presetRespostas[q.id] = 1; // Seleciona opção intermediária realista
    });
    setDiagnosticoRespostas(presetRespostas);

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
      // Deduz dias disponíveis a partir da pergunta dt_08
      const r08 = diagnosticoRespostas['dt_08'] ?? 1;
      let diasDisponiveis: Weekday[] = ['seg', 'ter', 'qua', 'qui', 'sex'];
      if (r08 === 0) diasDisponiveis = ['seg', 'ter', 'qui', 'sex'];
      else if (r08 === 2) diasDisponiveis = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      else if (r08 === 3) diasDisponiveis = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

      // Deduz horas por dia a partir da pergunta dt_09
      const r09 = diagnosticoRespostas['dt_09'] ?? 1;
      let horasPorDia = 3;
      if (r09 === 0) horasPorDia = 2;
      else if (r09 === 1) horasPorDia = 3.5;
      else if (r09 === 2) horasPorDia = 5;
      else if (r09 === 3) horasPorDia = 6.5;

      // Data aproximada do próximo ENEM (novembro)
      const hoje = new Date();
      const anoAlvo = hoje.getMonth() >= 10 ? hoje.getFullYear() + 1 : hoje.getFullYear();
      const dataProva = `${anoAlvo}-11-08`;

      const plan = gerarPlano({
        diasDisponiveis,
        horasPorDia,
        dataProva,
        dominio,
        diagnosticoRespostas,
      });

      setPlano(plan);
      setStep('resultado');
      playFeedback('celebration');
    }, 1200);
  };

  return (
    <div
      id="cronograma-onboarding"
      role="dialog"
      aria-modal="true"
      aria-label="Diagnóstico Temporal e Planejamento do Cronograma ENEM"
      className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-md flex flex-col modal-backdrop-enter"
    >
      {/* Cabeçalho Superior: Stepper de Progresso + Botão Fechar */}
      <header className="flex items-center justify-between px-5 sm:px-10 pt-5 sm:pt-6 pb-3 border-b border-border/60 flex-shrink-0 bg-surface/70">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-medusa-primary/20 border border-medusa-primary/40 flex items-center justify-center text-medusa-primary">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                Temporal OS · Diagnóstico do Cronograma
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] font-mono text-medusa-primary font-semibold">
                {totalQuestoesRespondidas} de {totalQuestoes} respondidas
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
              {step === 'intro'
                ? 'Configuração Personalizada do Cronograma'
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
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono text-text-secondary bg-surface-secondary/70 hover:bg-surface-secondary border border-border/60 transition-all"
            >
              <span className="material-symbols-outlined text-[13px]">tune</span>
              Preencher perfil padrão
            </button>
          )}

          <button
            type="button"
            id="btn-close-cronograma-onboarding"
            onClick={() => onFinish(gerarPlanoGenerico())}
            aria-label="Fechar e pular configuração"
            title="Pular diagnóstico (Esc)"
            className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* Barra de Progresso Contínua */}
      <div className="w-full bg-border/40 h-1 overflow-hidden">
        <div
          className="bg-medusa-primary h-full transition-all duration-300"
          style={{
            width: `${
              step === 'intro'
                ? 5
                : step === 'dominio'
                ? 90
                : step === 'resultado'
                ? 100
                : Math.max(5, (totalQuestoesRespondidas / totalQuestoes) * 85)
            }%`,
          }}
        />
      </div>

      {/* Conteúdo Central */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 overflow-y-auto">
        <div key={`${step}-${activeBlocoIndex}`} className="study-stage-enter w-full max-w-2xl flex flex-col gap-6">
          
          {/* STEP 1: INTRO */}
          {step === 'intro' && (
            <div className="text-center flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-medusa-primary/15 border border-medusa-primary/40 flex items-center justify-center shadow-subtle">
                <span className="material-symbols-outlined text-[32px] text-medusa-primary">auto_awesome</span>
              </div>
              <div className="space-y-2 max-w-lg">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                  Vamos desenhar o seu Cronograma de Estudos?
                </h2>
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  Para que a sua Agenda funcione como um <strong>Temporal OS</strong> e nunca gere blocos irreais ou conflitantes, preparamos um diagnóstico rápido em 6 blocos (26 perguntas) sobre a sua rotina real, trabalho, picos de foco e metas de aprovação.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full text-left pt-2">
                {BLOCOS_ORDER.map((blocoKey, idx) => (
                  <div
                    key={blocoKey}
                    className="p-3 rounded-xl bg-surface border border-border/60 flex flex-col gap-1 shadow-subtle"
                  >
                    <div className="flex items-center gap-1.5 text-medusa-primary">
                      <span className="material-symbols-outlined text-[15px]">{BLOCOS_INFO[blocoKey].icone}</span>
                      <span className="text-[11px] font-semibold text-text-primary">
                        {idx + 1}. {BLOCOS_INFO[blocoKey].titulo}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight">
                      {BLOCOS_INFO[blocoKey].descricao}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                <button
                  type="button"
                  id="btn-onboarding-start-diagnostic"
                  onClick={() => {
                    setStep('diagnostico');
                    setActiveBlocoIndex(0);
                    playFeedback('checkpoint');
                  }}
                  className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-7 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2"
                >
                  <span>Iniciar Diagnóstico Temporal</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => onFinish(gerarPlanoGenerico())}
                  className="btn-interactive text-[12px] text-text-muted hover:text-text-primary font-mono px-4 py-2"
                >
                  Usar plano padrão de referência
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DIAGNÓSTICO (26 PERGUNTAS EM 6 BLOCOS) */}
          {step === 'diagnostico' && (
            <div className="flex flex-col gap-5 w-full">
              {/* Barra de Tabs dos 6 Blocos */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/50">
                {BLOCOS_ORDER.map((bKey, bIdx) => {
                  const isCurrent = bIdx === activeBlocoIndex;
                  const isPassed = bIdx < activeBlocoIndex;
                  const questoes = DIAGNOSTICO_QUESTOES_TEMPORAIS.filter((q) => q.bloco === bKey);
                  const respondidas = questoes.filter((q) => diagnosticoRespostas[q.id] !== undefined).length;
                  const allDone = respondidas === questoes.length;

                  return (
                    <button
                      key={bKey}
                      type="button"
                      onClick={() => {
                        setActiveBlocoIndex(bIdx);
                        playFeedback('press');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                        isCurrent
                          ? 'bg-surface text-text-primary border border-medusa-primary/50 shadow-subtle font-semibold'
                          : allDone
                          ? 'bg-surface-secondary/50 text-medusa-primary hover:bg-surface-secondary'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {allDone ? 'check_circle' : BLOCOS_INFO[bKey].icone}
                      </span>
                      <span>{BLOCOS_INFO[bKey].titulo}</span>
                      <span className="text-[9px] font-mono opacity-60">
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

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-surface border border-border/70 flex flex-col gap-2.5 shadow-subtle"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-medusa-primary font-semibold">
                            Questão {q.numero} de 26 · {BLOCOS_INFO[q.bloco].titulo}
                          </span>
                          <h3 className="text-[13px] sm:text-[14px] font-semibold text-text-primary leading-snug">
                            {q.pergunta}
                          </h3>
                        </div>
                        {respostaSelecionada !== undefined && (
                          <span className="w-5 h-5 rounded-full bg-medusa-support/20 text-medusa-support flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </span>
                        )}
                      </div>

                      {q.detalhe && (
                        <p className="text-[11px] text-text-secondary">{q.detalhe}</p>
                      )}

                      {/* Opções de Resposta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.opcoes.map((opcao, oi) => {
                          const isSelected = respostaSelecionada === oi;

                          return (
                            <button
                              key={oi}
                              type="button"
                              id={`opcao-${q.id}-${oi}`}
                              onClick={() => handleSelectOpcao(q.id, oi)}
                              className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                                isSelected
                                  ? 'bg-medusa-primary/10 border-medusa-primary text-text-primary shadow-subtle ring-1 ring-medusa-primary/40'
                                  : 'bg-surface-secondary/40 border-border/60 hover:bg-surface-secondary hover:border-border text-text-secondary'
                              }`}
                            >
                              <span className="text-[12px] font-medium leading-tight">
                                {opcao.texto}
                              </span>
                              {opcao.subtexto && (
                                <span className="text-[10px] text-text-muted leading-tight">
                                  {opcao.subtexto}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controles de Navegação Entre Blocos */}
              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={handlePrevBloco}
                  className="btn-interactive px-4 py-2 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border"
                >
                  {activeBlocoIndex === 0 ? 'Voltar ao Início' : 'Bloco Anterior'}
                </button>

                <button
                  type="button"
                  id="btn-onboarding-next-block"
                  onClick={handleNextBloco}
                  disabled={!isBlocoAtualCompleto}
                  className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-6 py-2 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5"
                >
                  <span>
                    {activeBlocoIndex < BLOCOS_ORDER.length - 1 ? 'Próximo Bloco' : 'Avançar para Disciplinas'}
                  </span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: AUTOAVALIAÇÃO DE DOMÍNIO */}
          {step === 'dominio' && (
            <div className="flex flex-col gap-5 w-full">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-medusa-primary font-semibold">
                  Autoavaliação das 7 Disciplinas
                </span>
                <h2 className="text-xl font-bold text-text-primary">
                  Como você avalia seu domínio em cada área?
                </h2>
                <p className="text-[12px] text-text-secondary max-w-md mx-auto">
                  Disciplinas com domínio baixo receberão automaticamente mais horas de reforço e blocos de estudo no seu cronograma.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CRONOGRAMA_DISCIPLINES.map((disciplina) => {
                  const color = getDisciplineColor(disciplina);
                  const currentLevel = dominio[disciplina] ?? 'medio';

                  return (
                    <div
                      key={disciplina}
                      className="p-3.5 rounded-xl bg-surface border border-border/70 flex items-center justify-between gap-3 shadow-subtle"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                        <span className="text-[13px] font-semibold text-text-primary">{disciplina}</span>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 bg-surface-secondary/70 rounded-lg border border-border/60">
                        {(['baixo', 'medio', 'alto'] as DomainLevel[]).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => {
                              setDominio((prev) => ({ ...prev, [disciplina]: level }));
                              playFeedback('press');
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all ${
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

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
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
                  className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2"
                >
                  <span>Calcular Cronograma Temporal</span>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVELANDO */}
          {step === 'revelando' && (
            <div id="onboarding-revelando" className="flex flex-col items-center justify-center gap-4 py-16 text-center">
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

          {/* STEP 5: RESULTADO */}
          {step === 'resultado' && plano && (
            <div className="flex flex-col gap-5 w-full">
              <div className="text-center space-y-1.5">
                <span className="w-12 h-12 rounded-xl bg-medusa-support/20 border border-medusa-support/40 flex items-center justify-center mx-auto text-medusa-support">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </span>
                <h2 className="text-xl font-bold tracking-tight text-text-primary">
                  Seu Cronograma Temporal Está Pronto
                </h2>
                <p className="text-[12px] text-text-secondary">
                  {plano.semanasRestantes} semanas restantes · <strong>{plano.horasSemanais}h/semana</strong> · Ritmo{' '}
                  <strong className="text-medusa-primary">{INTENSIDADE_LABEL[plano.intensidade]}</strong>
                </p>
              </div>

              {/* Cards de Métricas Operacionais Calculadas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                <div className="p-3 rounded-xl bg-surface border border-border/60">
                  <span className="text-[9px] font-mono uppercase text-text-muted block">Pico Cognitivo</span>
                  <span className="text-[13px] font-bold text-text-primary flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px] text-medusa-primary">wb_sunny</span>
                    {plano.horarioPico}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border/60">
                  <span className="text-[9px] font-mono uppercase text-text-muted block">Duração de Bloco</span>
                  <span className="text-[13px] font-bold text-text-primary flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px] text-medusa-primary">timer</span>
                    {plano.blocoMinutosIdeal} min
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border/60">
                  <span className="text-[9px] font-mono uppercase text-text-muted block">Buffer Entre Aulas</span>
                  <span className="text-[13px] font-bold text-text-primary flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px] text-medusa-primary">hourglass_empty</span>
                    {plano.bufferMinutos} min
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border/60">
                  <span className="text-[9px] font-mono uppercase text-text-muted block">Área Prioritária</span>
                  <span className="text-[13px] font-bold text-text-primary truncate block mt-0.5" title={plano.areaPrioritaria}>
                    {plano.areaPrioritaria}
                  </span>
                </div>
              </div>

              {/* Distribuição Semanal por Disciplina */}
              <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                    Distribuição da Carga Horária
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {plano.horasSemanais} horas no total
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {plano.alocacao.map((a) => {
                    const color = getDisciplineColor(a.disciplina);
                    return (
                      <div key={a.disciplina} className="flex items-center gap-2 text-[11px]">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                        <span className="w-24 text-left font-medium text-text-secondary flex-shrink-0">{a.disciplina}</span>
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

              {/* Botão de Finalização e Sincronização */}
              <button
                type="button"
                id="btn-onboarding-ver-cronograma"
                onClick={() => {
                  const diasReais: Weekday[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
                  onFinish(plano, diasReais);
                  playFeedback('success');
                }}
                className="btn-interactive w-full bg-medusa-primary hover:opacity-95 text-[#1C2420] py-3 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center justify-center gap-2"
              >
                <span>Concluir e Sincronizar com a Agenda</span>
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
