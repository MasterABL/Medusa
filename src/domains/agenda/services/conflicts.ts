/**
 * MEDUSA — Agenda — Conflitos e política de prioridade
 *
 * Conflito = dois intervalos que ocupam o mesmo minuto:
 *  - hard: evento/rotina/deslocamento contra evento/rotina/deslocamento;
 *  - soft: um deles invade o BUFFER do outro (respiro violado).
 * Buffer contra buffer nunca é conflito. Buffer de X contra o PRÓPRIO X não
 * existe (o buffer é adjacente, não sobreposto).
 *
 * Quem cede (resolução sugerida — a Agenda nunca move sozinha):
 *  1. fixo vence flexível;
 *  2. senão, domínio de maior prioridade (work > personal > body > finance >
 *     education > external) — é aqui que "trabalho vence estudo/inglês";
 *  3. senão, quem começou antes;
 *  4. senão, id (desempate determinístico).
 * Rotina/deslocamento sem domínio de evento contam como fixos; sem domínio,
 * ficam no fim da ordem de domínio.
 */

import type { ConflictResolution, PriorityPolicy, TemporalConflict, TimelineEntry } from '../model/temporal';
import { DEFAULT_PRIORITY_POLICY } from '../model/temporal';

export function domainRank(entry: TimelineEntry, policy: PriorityPolicy = DEFAULT_PRIORITY_POLICY): number {
  if (!entry.domain) return policy.domainOrder.length;
  const idx = policy.domainOrder.indexOf(entry.domain);
  return idx === -1 ? policy.domainOrder.length : idx;
}

export function resolve(a: TimelineEntry, b: TimelineEntry, policy: PriorityPolicy = DEFAULT_PRIORITY_POLICY): ConflictResolution {
  const pick = (keep: TimelineEntry, yld: TimelineEntry, rule: ConflictResolution['rule']): ConflictResolution => ({ keepId: keep.id, yieldId: yld.id, rule });
  if (a.fixed !== b.fixed) return a.fixed ? pick(a, b, 'fixo_sobre_flexivel') : pick(b, a, 'fixo_sobre_flexivel');
  const ra = domainRank(a, policy);
  const rb = domainRank(b, policy);
  if (ra !== rb) return ra < rb ? pick(a, b, 'prioridade_do_dominio') : pick(b, a, 'prioridade_do_dominio');
  if (a.startMin !== b.startMin) return a.startMin < b.startMin ? pick(a, b, 'comecou_antes') : pick(b, a, 'comecou_antes');
  return a.id < b.id ? pick(a, b, 'desempate_por_id') : pick(b, a, 'desempate_por_id');
}

export function detectConflicts(entries: TimelineEntry[], policy: PriorityPolicy = DEFAULT_PRIORITY_POLICY): TemporalConflict[] {
  const out: TemporalConflict[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      if (a.date !== b.date) continue;
      if (a.kind === 'buffer' && b.kind === 'buffer') continue;
      // o buffer de um evento é adjacente a ele: nunca conflita com o próprio dono
      if ((a.kind === 'buffer' && a.itemId !== undefined && a.itemId === b.itemId && b.kind === 'evento') || (b.kind === 'buffer' && b.itemId !== undefined && b.itemId === a.itemId && a.kind === 'evento')) continue;

      const start = Math.max(a.startMin, b.startMin);
      const end = Math.min(a.endMin, b.endMin);
      if (end <= start) continue;
      const severity = a.kind === 'buffer' || b.kind === 'buffer' ? 'soft' : 'hard';
      // Resolução só faz sentido entre quem é compromisso; num soft, quem cede é sempre o invasor do buffer.
      const resolution = severity === 'soft' ? softResolution(a, b) : resolve(a, b, policy);
      out.push({ a, b, overlapMinutes: end - start, startMin: start, endMin: end, severity, resolution });
    }
  }
  return out.sort((x, y) => x.startMin - y.startMin || x.a.id.localeCompare(y.a.id));
}

function softResolution(a: TimelineEntry, b: TimelineEntry): ConflictResolution {
  const buffer = a.kind === 'buffer' ? a : b;
  const invader = a.kind === 'buffer' ? b : a;
  // o buffer não "cede" nem "vence": o que se sugere é o invasor respeitar o respiro.
  return { keepId: buffer.id, yieldId: invader.id, rule: 'fixo_sobre_flexivel' };
}
