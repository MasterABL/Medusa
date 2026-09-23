'use client';

import React, { useMemo, useState } from 'react';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { getDisciplineColor } from './disciplineColor';
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
} from './cronogramaPlanner';

type Step = 'intro' | 'rotina' | 'disponibilidade' | 'objetivo' | 'dominio' | 'revelando' | 'resultado';

const STEP_ORDER: Step[] = ['intro', 'rotina', 'disponibilidade', 'objetivo', 'dominio', 'revelando', 'resultado'];

const HORAS_OPCOES = [1, 2, 3, 4, 5, 6];

interface CronogramaOnboardingProps {
  onFinish: (plan: CronogramaPlan) => void;
}

/**
 * Onboarding do Cronograma (Round 5 §12-15) — assistente de tela cheia no primeiro acesso, não
 * um formulário pequeno embutido. Pergunta adaptativa: cada etapa só existe porque a anterior foi
 * respondida (rotina → disponibilidade → objetivo → domínio), nunca uma lista fixa arbitrária.
 *
 * Saudação SEM nome (honestidade, Round 5 §27): o pedido original previa "cumprimentar pelo
 * nome", mas este app não tem nenhum sistema de identidade/perfil de usuário real por trás —
 * inventar um nome fixo (ou usar o nome do dono do produto como se fosse dado da sessão) seria
 * apresentar como real algo que não existe.
 *
 * Lógica temporal real (Round 5 §15): `gerarPlano()` (cronogramaPlanner.ts) cruza data de hoje,
 * data da prova, disponibilidade e domínio por disciplina pra decidir semanas restantes,
 * intensidade e horas semanais por disciplina — nunca um cenário fixo tipo "ENEM 2028 = plano X".
 */
export function CronogramaOnboarding({ onFinish }: CronogramaOnboardingProps) {
  const [step, setStep] = useState<Step>('intro');
  const [diasDisponiveis, setDiasDisponiveis] = useState<Weekday[]>([]);
  const [horasPorDia, setHorasPorDia] = useState<number | null>(null);
  const [dataProva, setDataProva] = useState('');
  const [dominio, setDominio] = useState<Partial<Record<string, DomainLevel>>>({});
  const [plano, setPlano] = useState<CronogramaPlan | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  const semanasPreview = useMemo(() => {
    if (!dataProva) return null;
    const hoje = new Date();
    const prova = new Date(`${dataProva}T00:00:00`);
    const diffDias = (prova.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias < 0) return null;
    return Math.max(0, Math.ceil(diffDias / 7));
  }, [dataProva]);

  useEscapeKey(true, () => onFinish(gerarPlanoGenerico()));

  const toggleDia = (dia: Weekday) => {
    setDiasDisponiveis((prev) => (prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]));
  };

  const goTo = (s: Step) => setStep(s);

  const handleCalcular = () => {
    setStep('revelando');
    // Reveal orgânico e finito — motion, não um pulo direto pro resultado (Round 5 §17). O
    // cálculo em si é instantâneo (função pura, sem I/O); a pausa é só a experiência de "seu
    // plano está sendo montado", igual ao padrão já usado em StudyReadyState.tsx.
    setTimeout(() => {
      const plan = gerarPlano({
        diasDisponiveis,
        horasPorDia: horasPorDia ?? 2,
        dataProva,
        dominio,
      });
      setPlano(plan);
      setStep('resultado');
    }, 1400);
  };

  const handleGenerico = () => {
    const plan = gerarPlanoGenerico();
    setPlano(plan);
    setStep('resultado');
  };

  return (
    <div
      id="cronograma-onboarding"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar Cronograma do ENEM"
      className="fixed inset-0 z-[70] bg-background flex flex-col modal-backdrop-enter"
    >
      {/* Cabeçalho: progresso + fechar */}
      <div className="flex items-center justify-between px-5 sm:px-10 pt-5 sm:pt-8 flex-shrink-0">
        <div className="flex items-center gap-2">
          {step !== 'intro' && step !== 'revelando' && step !== 'resultado' && (
            <div className="flex items-center gap-1" aria-hidden="true">
              {STEP_ORDER.slice(1, 5).map((s, i) => (
                <span
                  key={s}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i <= stepIndex - 1 ? 'w-6 bg-medusa-accent' : 'w-3 bg-border'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          id="btn-close-cronograma-onboarding"
          onClick={() => onFinish(gerarPlanoGenerico())}
          aria-label="Pular configuração e ver o cronograma"
          title="Pular (Esc)"
          className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 sm:px-10 pb-10 overflow-y-auto">
        <div key={step} className="study-stage-enter w-full max-w-lg flex flex-col items-center text-center gap-6">
          {step === 'intro' && (
            <>
              <span className="w-14 h-14 rounded-full bg-medusa-accent/20 border border-medusa-accent/50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-[#8A6D00] dark:text-medusa-accent">calendar_month</span>
              </span>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">Vamos configurar seu Cronograma?</h2>
                <p className="text-[13px] text-text-secondary max-w-md">
                  Algumas perguntas rápidas sobre sua rotina, disponibilidade e domínio em cada
                  área ajudam a calcular quantas horas por semana faz sentido dedicar a cada
                  disciplina até a prova.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
                <button
                  type="button"
                  id="btn-onboarding-personalizar"
                  onClick={() => goTo('rotina')}
                  className="btn-interactive w-full sm:w-auto bg-medusa-primary hover:opacity-95 text-[#1C2420] px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Sim, quero personalizar
                </button>
                <button
                  type="button"
                  id="btn-onboarding-generico"
                  onClick={handleGenerico}
                  className="btn-interactive w-full sm:w-auto px-6 py-2.5 rounded-full text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Não, gerar um cronograma genérico
                </button>
              </div>
            </>
          )}

          {step === 'rotina' && (
            <>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Quais dias você consegue estudar?</h2>
              <p className="text-[12px] text-text-secondary">Escolha os dias da semana com tempo real disponível para o ENEM.</p>
              <div id="onboarding-dias-grid" className="flex flex-wrap items-center justify-center gap-2">
                {WEEKDAYS.map((dia) => (
                  <button
                    key={dia}
                    type="button"
                    id={`onboarding-dia-${dia}`}
                    onClick={() => toggleDia(dia)}
                    aria-pressed={diasDisponiveis.includes(dia)}
                    className={`w-12 h-12 rounded-xl text-[13px] font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                      diasDisponiveis.includes(dia)
                        ? 'bg-medusa-primary/20 border-medusa-primary/60 text-[#18534B] dark:text-medusa-primary'
                        : 'bg-surface-secondary/50 border-border/60 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {WEEKDAY_LABEL[dia]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                id="btn-onboarding-next-rotina"
                onClick={() => goTo('disponibilidade')}
                disabled={diasDisponiveis.length === 0}
                className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                Continuar
              </button>
            </>
          )}

          {step === 'disponibilidade' && (
            <>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Quantas horas por dia, nesses dias?</h2>
              <p className="text-[12px] text-text-secondary">Uma estimativa realista — dá pra ajustar depois.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {HORAS_OPCOES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    id={`onboarding-horas-${h}`}
                    onClick={() => setHorasPorDia(h)}
                    aria-pressed={horasPorDia === h}
                    className={`w-14 h-14 rounded-xl text-[13px] font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                      horasPorDia === h
                        ? 'bg-medusa-primary/20 border-medusa-primary/60 text-[#18534B] dark:text-medusa-primary'
                        : 'bg-surface-secondary/50 border-border/60 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              {horasPorDia && diasDisponiveis.length > 0 && (
                <p className="text-[11px] font-mono text-text-muted">
                  = {horasPorDia * diasDisponiveis.length}h por semana
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTo('rotina')}
                  className="btn-interactive px-4 py-2 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="btn-onboarding-next-disponibilidade"
                  onClick={() => goTo('objetivo')}
                  disabled={!horasPorDia}
                  className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 'objetivo' && (
            <>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Quando é a sua prova?</h2>
              <p className="text-[12px] text-text-secondary">Isso decide se o plano é de longo prazo ou de alta intensidade.</p>
              <input
                type="date"
                id="onboarding-data-prova"
                value={dataProva}
                onChange={(e) => setDataProva(e.target.value)}
                className="bg-surface-secondary/60 border border-border/60 rounded-xl px-4 py-2.5 text-[14px] text-text-primary focus:outline-none focus:border-medusa-primary/80 focus:ring-1 focus:ring-medusa-primary/50 transition-all"
              />
              {semanasPreview !== null && (
                <p className="text-[12px] font-mono text-[#18534B] dark:text-medusa-primary">
                  Faltam {semanasPreview} semana{semanasPreview !== 1 ? 's' : ''}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTo('disponibilidade')}
                  className="btn-interactive px-4 py-2 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="btn-onboarding-next-objetivo"
                  onClick={() => goTo('dominio')}
                  disabled={!dataProva || semanasPreview === null}
                  className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 'dominio' && (
            <>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Como está seu domínio em cada área?</h2>
              <p className="text-[12px] text-text-secondary max-w-sm">
                Estimativa inicial sua, não um diagnóstico científico — quanto menor o domínio, mais horas o plano reserva pra essa disciplina.
              </p>
              <div id="onboarding-dominio-list" className="w-full flex flex-col gap-2">
                {CRONOGRAMA_DISCIPLINES.map((disciplina) => {
                  const color = getDisciplineColor(disciplina);
                  return (
                    <div
                      key={disciplina}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-secondary/40 border border-border/50"
                    >
                      <span className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                        {disciplina}
                      </span>
                      <div className="flex items-center gap-1">
                        {(['baixo', 'medio', 'alto'] as DomainLevel[]).map((nivel) => (
                          <button
                            key={nivel}
                            type="button"
                            id={`onboarding-dominio-${disciplina}-${nivel}`}
                            onClick={() => setDominio((prev) => ({ ...prev, [disciplina]: nivel }))}
                            aria-pressed={dominio[disciplina] === nivel}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-semibold transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                              dominio[disciplina] === nivel
                                ? 'bg-surface text-text-primary shadow-subtle'
                                : 'text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {nivel}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTo('objetivo')}
                  className="btn-interactive px-4 py-2 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="btn-onboarding-calcular"
                  onClick={handleCalcular}
                  disabled={Object.keys(dominio).length < CRONOGRAMA_DISCIPLINES.length}
                  className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center gap-2"
                >
                  <span>Calcular meu plano</span>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                </button>
              </div>
            </>
          )}

          {step === 'revelando' && (
            <div id="onboarding-revelando" className="flex flex-col items-center gap-4 py-10">
              <span className="w-14 h-14 rounded-full bg-medusa-primary/20 border border-medusa-primary/50 flex items-center justify-center living-pulse">
                <span className="material-symbols-outlined text-[26px] text-[#18534B] dark:text-medusa-primary">auto_awesome</span>
              </span>
              <p className="text-[13px] text-text-secondary">Montando seu plano de estudos...</p>
            </div>
          )}

          {step === 'resultado' && plano && (
            <>
              <span className="w-14 h-14 rounded-full bg-medusa-support/20 border border-medusa-support/50 flex items-center justify-center island-success-settle">
                <span className="material-symbols-outlined text-[28px] text-[#1B502C] dark:text-medusa-support">check_circle</span>
              </span>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold tracking-tight text-text-primary">Seu plano está pronto</h2>
                <p className="text-[12px] text-text-secondary">
                  {plano.semanasRestantes} semana{plano.semanasRestantes !== 1 ? 's' : ''} até a prova ·{' '}
                  {plano.horasSemanais}h/semana · <strong className="text-text-primary">{INTENSIDADE_LABEL[plano.intensidade]}</strong>
                </p>
                <p className="text-[11px] text-text-muted max-w-sm mx-auto">{INTENSIDADE_DESCRICAO[plano.intensidade]}</p>
              </div>

              <div id="onboarding-alocacao-list" className="w-full flex flex-col gap-1.5">
                {plano.alocacao.map((a) => {
                  const color = getDisciplineColor(a.disciplina);
                  return (
                    <div key={a.disciplina} className="flex items-center gap-2 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
                      <span className="w-20 text-left text-text-secondary flex-shrink-0">{a.disciplina}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${color.dot}`} style={{ width: `${a.percentual}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono text-text-muted flex-shrink-0">{a.horasSemana}h</span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                id="btn-onboarding-ver-cronograma"
                onClick={() => onFinish(plano)}
                className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span>Ver cronograma detalhado</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
