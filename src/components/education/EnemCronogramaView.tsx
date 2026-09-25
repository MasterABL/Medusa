'use client';

import React, { useMemo, useState } from 'react';
import { CronogramaBlock } from './types';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { getDisciplineColor, COLORED_DISCIPLINES } from './disciplineColor';
import { CronogramaPlan, INTENSIDADE_LABEL } from './cronogramaPlanner';

const INTERVAL_OPTIONS = [5, 10, 15, 20];

interface EnemCronogramaViewProps {
  blocks: CronogramaBlock[];
  onStartStudy?: (simulateError?: boolean) => void;
  /** Resultado do onboarding (Round 5 §12-15) — ausente quando aberto pela aba Cronograma do Hub, que não passa por esse fluxo. */
  plan?: CronogramaPlan | null;
}

type Period = 'hoje' | 'semana' | 'mes';

const ACTIVITY_ICON: Record<CronogramaBlock['activityType'], string> = {
  aula: 'play_circle',
  video: 'smart_display',
  exercicio: 'edit_note',
  simulado: 'quiz',
  revisao: 'refresh',
  redacao: 'draw',
};

const ACTIVITY_LABEL: Record<CronogramaBlock['activityType'], string> = {
  aula: 'Aula',
  video: 'Vídeo',
  exercicio: 'Exercícios',
  simulado: 'Simulado',
  revisao: 'Revisão',
  redacao: 'Redação',
};

const STATUS_STYLE: Record<CronogramaBlock['status'], string> = {
  planejado: 'bg-surface-secondary text-text-muted border-border/60',
  concluido: 'bg-medusa-support/15 text-[#1B502C] dark:text-medusa-support border-medusa-support/30',
  atrasado: 'bg-[#FFF18C]/20 text-[#6B4E00] dark:text-[#FFF18C] border-[#FFF18C]/40',
};

const STATUS_LABEL: Record<CronogramaBlock['status'], string> = {
  planejado: 'Planejado',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
};

/**
 * Cronograma do ENEM — mapa operacional de preparação, não uma timeline decorativa nem uma
 * to-do list genérica. Cruza tempo (Hoje/Semana/Mês) × disciplina × conteúdo × tipo de
 * atividade × recurso × status, e cada bloco abre um painel de contexto sem navegar para
 * outra tela.
 */
export function EnemCronogramaView({ blocks, onStartStudy, plan }: EnemCronogramaViewProps) {
  const [period, setPeriod] = useState<Period>('semana');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('Todas');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    blocks.find((b) => b.isToday)?.id ?? null
  );

  const disciplines = useMemo(() => {
    const unique = Array.from(new Set(blocks.map((b) => b.discipline)));
    return ['Todas', ...unique];
  }, [blocks]);

  const periodFiltered = useMemo(() => {
    if (period === 'hoje') return blocks.filter((b) => b.isToday);
    if (period === 'semana') return blocks.filter((b) => b.weekOffset === 0);
    return blocks; // mês: semana atual + próxima
  }, [blocks, period]);

  const filtered = useMemo(
    () =>
      disciplineFilter === 'Todas'
        ? periodFiltered
        : periodFiltered.filter((b) => b.discipline === disciplineFilter),
    [periodFiltered, disciplineFilter]
  );

  // Agrupamento por dia — a mesma estrutura serve Hoje (1 grupo), Semana (até 7) e Mês (até ~9),
  // só muda quantos grupos aparecem. Em "Semana" os grupos viram colunas lado a lado no desktop
  // (como um grid semanal); em Hoje/Mês, uma lista vertical agrupada por dia lê melhor.
  const groups = useMemo(() => {
    const map = new Map<string, { date: string; weekday: string; isToday?: boolean; items: CronogramaBlock[] }>();
    filtered.forEach((b) => {
      const key = `${b.date}`;
      if (!map.has(key)) map.set(key, { date: b.date, weekday: b.weekday, isToday: b.isToday, items: [] });
      map.get(key)!.items.push(b);
    });
    return Array.from(map.values());
  }, [filtered]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  const completedCount = filtered.filter((b) => b.status === 'concluido').length;
  const lateCount = filtered.filter((b) => b.status === 'atrasado').length;

  // Intervalo entre blocos — configuração REAL e alterável (ver EducationPanelContext), mas
  // escopo de sessão. Não existe motor de agendamento: o efeito honesto e visível é limitado ao
  // tempo total estimado do período filtrado (soma das durações + intervalos entre os blocos).
  const { studyIntervalMinutes, setStudyIntervalMinutes } = useEducationPanel();
  const totalBlockMinutes = filtered.reduce((sum, b) => sum + b.durationMinutes, 0);
  const totalIntervalMinutes = filtered.length > 1 ? (filtered.length - 1) * studyIntervalMinutes : 0;
  const totalEstimatedMinutes = totalBlockMinutes + totalIntervalMinutes;
  const totalEstimatedLabel =
    totalEstimatedMinutes >= 60
      ? `${Math.floor(totalEstimatedMinutes / 60)}h${(totalEstimatedMinutes % 60).toString().padStart(2, '0')}`
      : `${totalEstimatedMinutes}min`;

  const renderBlockCard = (block: CronogramaBlock) => {
    const isSelected = block.id === selectedBlockId;
    // Round 5 §16: acento de cor pequeno (borda esquerda, nunca o bloco inteiro) identifica a
    // disciplina de relance ao rolar a lista — o texto uppercase sozinho exigia ler palavra por
    // palavra pra achar um bloco de uma disciplina específica.
    const subjectColor = getDisciplineColor(block.discipline);
    return (
      <button
        key={block.id}
        type="button"
        id={`cronograma-block-${block.id}`}
        onClick={() => setSelectedBlockId(block.id)}
        className={`w-full text-left p-3 rounded-lg border ${subjectColor.leftBorder} transition-all flex flex-col gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
          isSelected
            ? 'bg-surface border-medusa-primary/60 shadow-subtle'
            : 'bg-surface/70 border-border/50 hover:bg-surface hover:border-border/70'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-text-muted truncate">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${subjectColor.dot}`} />
            {block.discipline}
          </span>
          <span
            className={`flex-shrink-0 text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLE[block.status]}`}
          >
            {STATUS_LABEL[block.status]}
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-medusa-primary mt-0.5 flex-shrink-0">
            {ACTIVITY_ICON[block.activityType]}
          </span>
          <span className="text-[12.5px] font-semibold text-text-primary leading-snug">{block.topic}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
          <span>{ACTIVITY_LABEL[block.activityType]}</span>
          <span className="text-text-muted/40">•</span>
          <span>{block.durationMinutes} min</span>
          {block.hasVideoResource && (
            <>
              <span className="text-text-muted/40">•</span>
              <span className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">smart_display</span>
                vídeo
              </span>
            </>
          )}
        </div>
      </button>
    );
  };

  return (
    <div id="enem-cronograma-view" className="flex flex-col gap-4">
      {/* Resumo do plano calculado no onboarding (Round 5 §12-15) — separado do cronograma
          detalhado abaixo, de propósito: este resumo é derivado das respostas reais do usuário
          (dias/horas/prazo/domínio); o cronograma detalhado continua sendo a mesma lista de
          blocos curada de sempre, que não muda com essas respostas. Misturar os dois faria
          parecer que os blocos foram gerados a partir do plano, o que não é verdade. */}
      {plan && (
        <div
          id="cronograma-plan-summary"
          className="p-3 rounded-xl bg-medusa-accent/10 border border-medusa-accent/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
        >
          <span className="flex items-center gap-1.5 font-semibold text-text-primary">
            <span className="material-symbols-outlined text-[15px] text-[#8A6D00] dark:text-medusa-accent">auto_awesome</span>
            Seu plano calculado
          </span>
          <span className="text-text-secondary">
            {plan.semanasRestantes} semana{plan.semanasRestantes !== 1 ? 's' : ''} até a prova
          </span>
          <span className="text-text-secondary">{plan.horasSemanais}h/semana</span>
          <span className="text-text-secondary">{INTENSIDADE_LABEL[plan.intensidade]}</span>
        </div>
      )}

      {/* Barra de período + resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div id="cronograma-period-switcher" className="flex items-center gap-1 p-1 bg-surface-secondary/70 border border-border/60 rounded-xl w-fit">
          {([
            { id: 'hoje', label: 'Hoje' },
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mês' },
          ] as const).map((p) => (
            <button
              key={p.id}
              type="button"
              id={`btn-cronograma-period-${p.id}`}
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                period === p.id
                  ? 'bg-surface text-text-primary shadow-subtle font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-medusa-support" />
            {completedCount} concluídos
          </span>
          {lateCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFF18C]" />
              {lateCount} atrasado{lateCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtro por disciplina — cada chip ganha o ponto de cor da própria disciplina (Round 5
          §16), então escolher "Física" no filtro já ensina qual cor procurar na lista de blocos
          abaixo, sem precisar de uma legenda separada pra isso. */}
      <div id="cronograma-discipline-filter" className="flex flex-wrap gap-1.5">
        {disciplines.map((d) => {
          const subjectColor = getDisciplineColor(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDisciplineFilter(d)}
              aria-pressed={disciplineFilter === d}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                disciplineFilter === d
                  ? 'bg-medusa-primary/15 border-medusa-primary/40 text-[#18534B] dark:text-[#71DBD2] font-semibold'
                  : 'bg-surface-secondary/40 border-border/50 text-text-secondary hover:text-text-primary'
              }`}
            >
              {d !== 'Todas' && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${subjectColor.dot}`} />}
              {d}
            </button>
          );
        })}
      </div>

      {/* Intervalo entre blocos — configuração real, escopo de sessão (ver comentário acima).
          Efeito visível: tempo total estimado do período, não uma reagenda automática. */}
      {filtered.length > 0 && (
        <div
          id="cronograma-interval-setting"
          className="flex items-center justify-between gap-3 text-[11px] p-2.5 rounded-xl bg-surface-secondary/40 border border-border/50"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-text-muted">timer</span>
            <label htmlFor="cronograma-interval-select" className="text-text-secondary font-medium">
              Intervalo entre blocos
            </label>
            <select
              id="cronograma-interval-select"
              value={studyIntervalMinutes}
              onChange={(e) => setStudyIntervalMinutes(Number(e.target.value))}
              className="bg-surface border border-border/60 rounded-lg px-1.5 py-0.5 text-[11px] font-mono text-text-primary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              {INTERVAL_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <span className="font-mono text-text-muted">
            Total estimado: <strong className="text-text-primary">{totalEstimatedLabel}</strong>
          </span>
        </div>
      )}

      {/* Corpo temporal: colunas por dia na Semana (rolagem horizontal — cada dia mantém largura
          legível em vez de espremer 7 colunas no container), lista agrupada em Hoje/Mês. */}
      <div
        key={`${period}-${disciplineFilter}`}
        className={`study-summary-enter ${
          period === 'semana'
            ? 'grid grid-flow-col auto-cols-[168px] gap-3 overflow-x-auto pb-2 -mx-1 px-1'
            : 'flex flex-col gap-4'
        }`}
      >
        {groups.length === 0 && (
          <p className="text-[12px] text-text-muted italic py-6 text-center col-span-full">
            Nenhum bloco para esse filtro nesse período.
          </p>
        )}
        {groups.map((group) => (
          <div key={group.date} className={`flex flex-col gap-2 min-w-0 ${period === 'semana' ? 'w-[168px] flex-shrink-0' : ''}`}>
            <div className="flex items-baseline gap-1.5 px-0.5">
              <span
                className={`text-[11px] font-mono font-semibold uppercase ${
                  group.isToday ? 'text-[#18534B] dark:text-[#71DBD2]' : 'text-text-muted'
                }`}
              >
                {group.weekday}
              </span>
              <span className="text-[10px] font-mono text-text-muted">{group.date}</span>
              {group.isToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse ml-0.5" />
              )}
            </div>
            <div className="flex flex-col gap-2">{group.items.map(renderBlockCard)}</div>
          </div>
        ))}
      </div>

      {/* Painel de contexto do bloco selecionado — inline, sem navegação */}
      {selectedBlock && (
        <div
          id="cronograma-context-panel"
          key={selectedBlock.id}
          className="summary-item-rise p-4 sm:p-5 rounded-xl border border-medusa-primary/40 bg-surface shadow-calm flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {selectedBlock.discipline} · {selectedBlock.date} ({selectedBlock.weekday})
              </span>
              <h4 className="text-[15px] font-semibold text-text-primary">{selectedBlock.topic}</h4>
              {selectedBlock.subtopic && (
                <p className="text-[12px] text-text-secondary">{selectedBlock.subtopic}</p>
              )}
            </div>
            <span
              className={`flex-shrink-0 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${STATUS_STYLE[selectedBlock.status]}`}
            >
              {STATUS_LABEL[selectedBlock.status]}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-mono text-text-muted">
            <span className="flex items-center gap-1 bg-surface-secondary/60 border border-border/50 rounded-full px-2.5 py-0.5">
              <span className="material-symbols-outlined text-[13px]">{ACTIVITY_ICON[selectedBlock.activityType]}</span>
              {ACTIVITY_LABEL[selectedBlock.activityType]}
            </span>
            <span className="bg-surface-secondary/60 border border-border/50 rounded-full px-2.5 py-0.5">
              {selectedBlock.durationMinutes} min
            </span>
            {selectedBlock.hasVideoResource && (
              <span className="flex items-center gap-1 bg-surface-secondary/60 border border-border/50 rounded-full px-2.5 py-0.5">
                <span className="material-symbols-outlined text-[13px]">smart_display</span>
                Recurso de vídeo indicado
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
            <p className="text-[12px] text-text-secondary">
              <span className="font-semibold text-text-primary">Próximo passo: </span>
              {selectedBlock.nextAction}
            </p>
            {selectedBlock.isToday && onStartStudy ? (
              <button
                type="button"
                id="btn-cronograma-start-today"
                onClick={() => onStartStudy(false)}
                className="btn-interactive flex-shrink-0 bg-medusa-primary hover:opacity-95 text-[#1C2420] px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                Iniciar Sessão
              </button>
            ) : selectedBlock.isToday ? (
              // `onStartStudy` ausente = overlay aberto de DENTRO de uma sessão já em andamento
              // (ver CronogramaOverlay.tsx) — nunca mostrar um botão clicável que silenciosamente
              // não faz nada quando clicado.
              <span className="flex-shrink-0 text-[11px] font-mono text-text-muted italic">
                Conclua ou interrompa a aula atual para iniciar este bloco
              </span>
            ) : (
              <span className="flex-shrink-0 text-[11px] font-mono text-text-muted italic">
                Fora da sessão de hoje
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
