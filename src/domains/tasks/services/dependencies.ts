/**
 * MEDUSA — Tasks — Dependências
 *
 * Regra do produto: o sistema não recomenda a etapa 4 se a etapa 2 ainda não
 * terminou. "Executável" é derivado do grafo, não de um campo que alguém
 * esquece de atualizar.
 */

import type { Actionability, Task } from '../model/types';

/** Ciclos no grafo de dependências (cada ciclo como lista de ids, na ordem encontrada). */
export function findCycles(tasks: Task[]): string[][] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const state = new Map<string, 'visiting' | 'done'>();
  const cycles: string[][] = [];
  const stack: string[] = [];

  const visit = (id: string) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      const start = stack.indexOf(id);
      cycles.push(stack.slice(start));
      return;
    }
    state.set(id, 'visiting');
    stack.push(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) if (byId.has(dep)) visit(dep);
    stack.pop();
    state.set(id, 'done');
  };
  for (const t of tasks) visit(t.id);
  return cycles;
}

export function actionabilityOf(task: Task, all: Task[]): Actionability {
  if (task.status === 'done') return { actionable: false, reason: 'concluida', detail: [] };
  if (task.status === 'cancelled') return { actionable: false, reason: 'cancelada', detail: [] };
  if (task.status === 'blocked') return { actionable: false, reason: 'bloqueio_manual', detail: task.blockedReason ? [task.blockedReason] : [] };

  const byId = new Map(all.map((t) => [t.id, t]));
  const missing = task.dependsOn.filter((d) => !byId.has(d));
  if (missing.length > 0) return { actionable: false, reason: 'dependencia_inexistente', detail: missing };

  const inCycle = findCycles(all).find((c) => c.includes(task.id));
  if (inCycle) return { actionable: false, reason: 'ciclo_de_dependencia', detail: inCycle };

  // dependência cancelada não bloqueia: o trabalho dela deixou de existir
  const pending = task.dependsOn.filter((d) => {
    const dep = byId.get(d)!;
    return dep.status !== 'done' && dep.status !== 'cancelled';
  });
  if (pending.length > 0) return { actionable: false, reason: 'dependencia_pendente', detail: pending };
  return { actionable: true };
}

/**
 * Ordem de execução respeitando dependências (topológica, estável pela ordem
 * de entrada). Tarefas em ciclo ficam de fora e são devolvidas à parte.
 */
export function executionOrder(tasks: Task[]): { order: string[]; inCycle: string[] } {
  const cycleIds = new Set(findCycles(tasks).flat());
  const live = tasks.filter((t) => !cycleIds.has(t.id));
  const liveIds = new Set(live.map((t) => t.id));
  const placed = new Set<string>();
  const order: string[] = [];
  let progressed = true;
  while (progressed && order.length < live.length) {
    progressed = false;
    for (const t of live) {
      if (placed.has(t.id)) continue;
      if (t.dependsOn.filter((d) => liveIds.has(d)).every((d) => placed.has(d))) {
        placed.add(t.id);
        order.push(t.id);
        progressed = true;
      }
    }
  }
  return { order, inCycle: Array.from(cycleIds) };
}

/** Tarefas que ficam executáveis quando `taskId` for concluída. */
export function unlockedBy(taskId: string, all: Task[]): string[] {
  const simulated = all.map((t) => (t.id === taskId ? { ...t, status: 'done' as const } : t));
  return all
    .filter((t) => t.dependsOn.includes(taskId))
    .filter((t) => !actionabilityOf(t, all).actionable && actionabilityOf(t, simulated).actionable)
    .map((t) => t.id);
}
