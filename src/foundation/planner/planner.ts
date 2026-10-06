/**
 * MEDUSA FOUNDATION — Planner (contrato + versão determinística)
 *
 *   Task + Deadline + Routine + FreeTimeSlot + Priority + Travel + ProtectedTime
 *     = SuggestedSchedule
 *
 * Não é uma Agenda nova e não grava nada: devolve uma SUGESTÃO. Gravar passa
 * pelo Guardian (APPLY_SUGGESTED_SCHEDULE, L2 — sempre com confirmação).
 *
 * Regras já existentes respeitadas por construção, porque o tempo livre vem
 * da camada temporal da Agenda (`buildDay` + `computeFreeSlots`):
 *  - trabalho e rotina ocupam tempo (estudo nunca é posto em cima do trabalho);
 *  - deslocamento é tempo ocupado;
 *  - buffer é tempo real;
 *  - sono e horários protegidos entram como ocupados.
 * Ordem de colocação: prioridade calculada, sempre depois das dependências
 * (uma etapa só entra depois do bloco da etapa anterior) e antes do prazo.
 */

import type { Task } from '../../domains/tasks/model/types';
import type { Project } from '../../domains/projects/model/types';
import type { DayInput } from '../../domains/agenda/services/timeline';
import type { RoutineBlock } from '../../domains/agenda/model/temporal';
import { buildDay } from '../../domains/agenda/services/timeline';
import { computeFreeSlots } from '../../domains/agenda/services/freeTime';
import { addDaysISO, toMin } from '../../domains/agenda/services/time';
import { fromTask, fromProjectTasks } from '../priority/candidates';
import { rankCandidates } from '../priority/engine';
import type { PriorityCandidate } from '../priority/engine';
import { actionabilityOf } from '../../domains/tasks/services/dependencies';
import { submitThroughGuardian } from '../actions/submit';
import type { DataOrigin, DataState } from '../types/dataState';
import * as DS from '../dataState';

export interface ProtectedWindow {
  id: string;
  label: string;
  kind: 'sono' | 'protegido';
  /** HH:mm — se end < start, atravessa a meia-noite (ex.: sono 23:00–06:00). */
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}

export interface PlannerInput {
  now: string;
  /** Primeiro dia (YYYY-MM-DD) e quantos dias olhar. */
  fromDate: string;
  days: number;
  /** Como montar cada dia a partir da fonte da Agenda. */
  dayInput: (date: string) => DayInput;
  tasks: Task[];
  projects?: Project[];
  protectedWindows?: ProtectedWindow[];
  minBlockMinutes?: number;
  maxBlockMinutes?: number;
  /** Intervalo deixado entre dois blocos planejados. */
  gapBetweenBlocksMinutes?: number;
}

export interface SuggestedBlock {
  taskId: string;
  title: string;
  date: string;
  startMin: number;
  endMin: number;
  /** Bloco N de M quando a tarefa foi dividida. */
  part?: { index: number; of: number };
  projectId?: string;
}

export type UnplacedReason = 'sem_estimativa' | 'nao_executavel' | 'sem_tempo_antes_do_prazo' | 'dependencia_nao_planejada' | 'sem_tempo_no_horizonte';

export interface SuggestedSchedule {
  blocks: SuggestedBlock[];
  unplaced: Array<{ taskId: string; title: string; reason: UnplacedReason; detail?: string }>;
  /** Premissas que o leitor precisa saber. */
  assumptions: string[];
  horizon: { from: string; days: number };
}

function protectedAsRoutine(windows: ProtectedWindow[]): RoutineBlock[] {
  const out: RoutineBlock[] = [];
  for (const w of windows) {
    const s = toMin(w.startTime)!;
    const e = toMin(w.endTime)!;
    if (e > s) out.push({ id: `prot:${w.id}`, label: w.label, daysOfWeek: w.daysOfWeek, startTime: w.startTime, endTime: w.endTime, domain: 'personal', kind: 'rotina' });
    else {
      // atravessa a meia-noite: fim de um dia + começo do dia seguinte
      out.push({ id: `prot:${w.id}:noite`, label: w.label, daysOfWeek: w.daysOfWeek, startTime: w.startTime, endTime: '24:00', domain: 'personal', kind: 'rotina' });
      out.push({ id: `prot:${w.id}:madrugada`, label: w.label, daysOfWeek: w.daysOfWeek.map((d) => (d + 1) % 7), startTime: '00:00', endTime: w.endTime, domain: 'personal', kind: 'rotina' });
    }
  }
  return out;
}

const dueLimit = (dueAt: string | undefined, date: string): number => {
  if (!dueAt) return 24 * 60;
  const dueDate = dueAt.slice(0, 10);
  if (date > dueDate) return -1;
  if (date < dueDate) return 24 * 60;
  return dueAt.length > 10 ? toMin(dueAt.slice(11, 16)) ?? 24 * 60 : 24 * 60;
};

export function suggestSchedule(input: PlannerInput): SuggestedSchedule {
  const minBlock = input.minBlockMinutes ?? 25;
  const maxBlock = input.maxBlockMinutes ?? 90;
  const gap = input.gapBetweenBlocksMinutes ?? 10;
  const extra = protectedAsRoutine(input.protectedWindows ?? []);
  const nowDate = input.now.slice(0, 10);
  const nowMin = toMin(input.now.slice(11, 16)) ?? 0;

  // Tempo livre por dia (rotina + protegidos + deslocamento + buffer já descontados).
  const free = new Map<string, Array<{ s: number; e: number }>>();
  for (let i = 0; i < input.days; i += 1) {
    const date = addDaysISO(input.fromDate, i);
    const base = input.dayInput(date);
    const day = buildDay({ ...base, routine: [...(base.routine ?? []), ...extra] });
    const slots = computeFreeSlots(day.entries, { dayStartMin: 0, dayEndMin: 24 * 60, minMinutes: minBlock })
      .map((s) => ({ s: date === nowDate ? Math.max(s.startMin, nowMin) : s.startMin, e: s.endMin }))
      .filter((s) => s.e - s.s >= minBlock);
    free.set(date, slots);
  }

  // Candidatos: tarefas de projeto herdam o prazo do projeto.
  const projectTaskIds = new Set<string>();
  const candidates: PriorityCandidate[] = [];
  for (const p of input.projects ?? []) {
    for (const c of fromProjectTasks(p, input.tasks, input.now)) {
      candidates.push(c);
      projectTaskIds.add(c.refs!.taskId!);
    }
  }
  for (const t of input.tasks) {
    if (projectTaskIds.has(t.id) || t.status === 'done' || t.status === 'cancelled') continue;
    candidates.push(fromTask(t, input.tasks));
  }
  const byId = new Map(input.tasks.map((t) => [t.id, t]));
  const dueOf = new Map(candidates.map((c) => [c.refs!.taskId!, c.dueAt]));

  // planejar = tratar como "feito no fim do bloco" para destravar dependentes
  const plannedEnd = new Map<string, { date: string; endMin: number }>();
  const blocks: SuggestedBlock[] = [];
  const unplaced: SuggestedSchedule['unplaced'] = [];
  const pendingQueue = rankCandidates(candidates, input.now).map((r) => r.candidate.refs!.taskId!);

  let progressed = true;
  const remaining = new Set(pendingQueue);
  while (progressed && remaining.size > 0) {
    progressed = false;
    for (const id of pendingQueue) {
      if (!remaining.has(id)) continue;
      const task = byId.get(id)!;
      if (task.estimatedMinutes === undefined) {
        unplaced.push({ taskId: id, title: task.title, reason: 'sem_estimativa' });
        remaining.delete(id);
        continue;
      }
      const act = actionabilityOf(task, input.tasks);
      const depsOk = task.dependsOn.every((d) => {
        const dep = byId.get(d);
        return dep && (dep.status === 'done' || dep.status === 'cancelled' || plannedEnd.has(d));
      });
      if (!act.actionable && !(act.reason === 'dependencia_pendente' && depsOk)) {
        if (act.reason === 'dependencia_pendente') continue; // talvez destrave depois que a dependência for planejada
        unplaced.push({ taskId: id, title: task.title, reason: 'nao_executavel', detail: act.reason });
        remaining.delete(id);
        continue;
      }
      const after = task.dependsOn.map((d) => plannedEnd.get(d)).filter((x): x is { date: string; endMin: number } => !!x).sort((a, b) => b.date.localeCompare(a.date) || b.endMin - a.endMin)[0];

      let left = task.estimatedMinutes;
      const parts: SuggestedBlock[] = [];
      for (let i = 0; i < input.days && left > 0; i += 1) {
        const date = addDaysISO(input.fromDate, i);
        const limit = dueLimit(dueOf.get(id), date);
        if (limit < 0) break;
        const slots = free.get(date)!;
        for (const slot of slots) {
          if (left <= 0) break;
          let start = slot.s;
          if (after && (date < after.date || (date === after.date && start < after.endMin + gap))) {
            if (date < after.date) continue;
            start = Math.max(start, after.endMin + gap);
          }
          const end = Math.min(slot.e, limit, start + Math.min(left, maxBlock));
          const len = end - start;
          if (len < Math.min(minBlock, left)) continue;
          parts.push({ taskId: id, title: task.title, date, startMin: start, endMin: end, projectId: task.projectId });
          left -= len;
        }
      }
      if (left > 0) {
        unplaced.push({ taskId: id, title: task.title, reason: dueOf.get(id) ? 'sem_tempo_antes_do_prazo' : 'sem_tempo_no_horizonte', detail: `faltaram ${left} min` });
        remaining.delete(id);
        continue;
      }
      // consome o tempo usado (+ intervalo) das janelas
      for (const p of parts) {
        const slots = free.get(p.date)!;
        const idx = slots.findIndex((s) => s.s <= p.startMin && s.e >= p.endMin);
        const s = slots[idx];
        const pieces = [{ s: s.s, e: p.startMin - gap }, { s: p.endMin + gap, e: s.e }].filter((x) => x.e - x.s >= minBlock);
        slots.splice(idx, 1, ...pieces);
      }
      parts.forEach((p, i) => blocks.push(parts.length > 1 ? { ...p, part: { index: i + 1, of: parts.length } } : p));
      const last = parts[parts.length - 1];
      plannedEnd.set(id, { date: last.date, endMin: last.endMin });
      remaining.delete(id);
      progressed = true;
    }
  }
  for (const id of Array.from(remaining)) unplaced.push({ taskId: id, title: byId.get(id)!.title, reason: 'dependencia_nao_planejada' });

  return {
    blocks: blocks.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin),
    unplaced,
    assumptions: [
      'Tempo livre vem da Agenda: rotina, trabalho, deslocamento, buffer, sono e horários protegidos já estão fora.',
      `Blocos entre ${minBlock} e ${maxBlock} min, com ${gap} min entre eles; tarefas maiores são divididas.`,
      'Tarefa sem estimativa de esforço não é planejada (não se inventa duração).',
      'É uma sugestão: nada é gravado na Agenda sem confirmação (Guardian L2).',
    ],
    horizon: { from: input.fromDate, days: input.days },
  };
}

export function selectSuggestedSchedule(input: PlannerInput, origin: DataOrigin = 'derived'): DataState<SuggestedSchedule> {
  const open = input.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  if (open.length === 0) return DS.empty('Nenhuma tarefa aberta para planejar.');
  const schedule = suggestSchedule(input);
  const missing = schedule.unplaced.map((u) => `${u.title}: ${u.reason}`);
  return DS.partial(schedule, missing, 'dados_insuficientes', origin, input.now);
}

export function proposeSchedule(schedule: SuggestedSchedule, correlationId: string) {
  return submitThroughGuardian({
    domain: 'agenda',
    type: 'APPLY_SUGGESTED_SCHEDULE',
    intent: `Gravar ${schedule.blocks.length} bloco(s) sugerido(s) na Agenda`,
    payload: { blocks: schedule.blocks },
    riskLevel: 'moderado',
    reversible: true,
    undoDescription: 'Remover os blocos criados.',
    correlationId,
    signals: [{ kind: 'planner', ref: `planner#${schedule.horizon.from}+${schedule.horizon.days}`, summary: `${schedule.blocks.length} blocos, ${schedule.unplaced.length} sem lugar` }],
  });
}
