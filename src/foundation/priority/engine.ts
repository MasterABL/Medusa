/**
 * MEDUSA FOUNDATION — Priority Engine
 *
 * Não é "urgente primeiro". Combina, com pesos explícitos:
 *   importância · proximidade (início/prazo) · rigidez · custo de não fazer ·
 *   pressão de disponibilidade (esforço vs. tempo livre real) · encaixe no contexto
 * e aplica regras de SOBREPOSIÇÃO que nenhuma soma deve vencer:
 *   - evento rígido começando em ≤ 15 min (ou em andamento) → máxima;
 *   - tarefa não executável (bloqueada / dependência pendente) → bloqueada,
 *     nunca recomendada, por mais urgente que seja.
 *
 * Determinístico: mesmo input + mesmo `now` → mesma saída. A saída carrega a
 * explicação ESTRUTURADA (fator, peso, valor, contribuição) para uma UI futura
 * decidir como mostrar — não gera texto para o usuário.
 */

import type { ImportanceTier } from '../context/importance';
import type { LifeDomain } from '../types/lifeDomain';

export type CandidateKind = 'event' | 'task' | 'deadline' | 'study' | 'routine';

export interface PriorityCandidate {
  id: string;
  kind: CandidateKind;
  title: string;
  domain: LifeDomain;
  tier: ImportanceTier;
  rigid: boolean;
  /** Para eventos: início (ISO local). */
  startsAt?: string;
  endsAt?: string;
  /** Para tarefas/prazos: vencimento (ISO data ou data-hora). */
  dueAt?: string;
  estimatedMinutes?: number;
  /** Executável agora? (dependências resolvidas, não bloqueada, não concluída). */
  actionable: boolean;
  notActionableReason?: string;
  /** Conflito de horário com outro compromisso. */
  inConflict?: boolean;
  /** Este item cede no conflito pela política da Agenda. */
  yieldsInConflict?: boolean;
  costOfDelay?: 'alto' | 'medio' | 'baixo';
  /** Minutos realmente livres até o prazo (planner/Agenda). */
  availableMinutesBeforeDue?: number;
  /** 0-1: o quanto cabe no contexto atual (energia, local, rotina). Ausente = neutro. */
  contextFit?: number;
  /** Referências de origem (projeto, evento, tarefa) para a UI e para a trilha causal. */
  refs?: { projectId?: string; taskId?: string; eventId?: string; milestoneId?: string };
}

export type PriorityBand = 'maxima' | 'alta' | 'media' | 'baixa' | 'bloqueada';

export interface PriorityFactor {
  key: 'importancia' | 'proximidade' | 'rigidez' | 'custo_de_atraso' | 'pressao_de_tempo' | 'encaixe_no_contexto';
  weight: number;
  /** 0-1 */
  value: number;
  contribution: number;
  /** Dado que faltou: o fator contou como 0, não como estimativa inventada. */
  missingData?: boolean;
  basis: string;
}

export interface PriorityOverride {
  key: 'evento_rigido_iminente' | 'evento_em_andamento' | 'nao_executavel' | 'cede_no_conflito';
  basis: string;
}

export interface PriorityResult {
  candidate: PriorityCandidate;
  score: number;
  band: PriorityBand;
  factors: PriorityFactor[];
  overrides: PriorityOverride[];
  flags: Array<'conflito' | 'sem_estimativa' | 'prazo_vencido' | 'esforco_maior_que_tempo'>;
}

export const PRIORITY_WEIGHTS = {
  importancia: 0.25,
  proximidade: 0.3,
  rigidez: 0.1,
  custo_de_atraso: 0.1,
  pressao_de_tempo: 0.15,
  encaixe_no_contexto: 0.1,
} as const;

const TIER_VALUE: Record<ImportanceTier, number> = { critical: 1, high: 0.75, medium: 0.5, low: 0.25 };
const COST_VALUE = { alto: 1, medio: 0.6, baixo: 0.3 } as const;
const DEFAULT_COST: Record<ImportanceTier, keyof typeof COST_VALUE> = { critical: 'alto', high: 'alto', medium: 'medio', low: 'baixo' };

function toMs(iso: string): number {
  return Date.parse(iso.length === 10 ? `${iso}T23:59:59` : iso);
}

function proximity(c: PriorityCandidate, nowMs: number): { value: number; basis: string; missing?: boolean; overdue?: boolean } {
  if (c.startsAt) {
    const min = (toMs(c.startsAt) - nowMs) / 60_000;
    const end = c.endsAt ? (toMs(c.endsAt) - nowMs) / 60_000 : min;
    if (min <= 0 && end > 0) return { value: 1, basis: 'em andamento' };
    if (end <= 0) return { value: 0, basis: 'já terminou' };
    const value = min <= 15 ? 1 : min <= 60 ? 0.8 : min <= 180 ? 0.5 : min <= 720 ? 0.3 : 0.1;
    return { value, basis: `começa em ${Math.round(min)} min` };
  }
  if (c.dueAt) {
    const h = (toMs(c.dueAt) - nowMs) / 3_600_000;
    if (h < 0) return { value: 1, basis: 'prazo vencido', overdue: true };
    const value = h <= 24 ? 1 : h <= 72 ? 0.7 : h <= 168 ? 0.4 : h <= 360 ? 0.2 : 0.1;
    return { value, basis: `prazo em ${Math.round(h)} h` };
  }
  return { value: 0, basis: 'sem horário nem prazo', missing: true };
}

export function scoreCandidate(c: PriorityCandidate, now: string): PriorityResult {
  const nowMs = Date.parse(now);
  const flags: PriorityResult['flags'] = [];
  const overrides: PriorityOverride[] = [];
  const W = PRIORITY_WEIGHTS;

  const prox = proximity(c, nowMs);
  if (prox.overdue) flags.push('prazo_vencido');
  if (c.inConflict) flags.push('conflito');
  if (c.kind !== 'event' && c.estimatedMinutes === undefined) flags.push('sem_estimativa');

  let pressure = { value: 0, basis: 'esforço ou tempo livre desconhecido', missing: true };
  if (c.estimatedMinutes !== undefined && c.availableMinutesBeforeDue !== undefined) {
    const ratio = c.availableMinutesBeforeDue <= 0 ? Infinity : c.estimatedMinutes / c.availableMinutesBeforeDue;
    if (ratio >= 1) flags.push('esforco_maior_que_tempo');
    pressure = { value: ratio >= 1 ? 1 : ratio >= 0.66 ? 0.7 : Math.round(ratio * 100) / 100, basis: `${c.estimatedMinutes} min de esforço para ${c.availableMinutesBeforeDue} min livres`, missing: false };
  }

  const cost = c.costOfDelay ?? DEFAULT_COST[c.tier];
  const fit = c.contextFit;

  const factors: PriorityFactor[] = [
    { key: 'importancia', weight: W.importancia, value: TIER_VALUE[c.tier], contribution: 0, basis: `tier ${c.tier}` },
    { key: 'proximidade', weight: W.proximidade, value: prox.value, contribution: 0, basis: prox.basis, missingData: prox.missing },
    { key: 'rigidez', weight: W.rigidez, value: c.rigid ? 1 : 0.3, contribution: 0, basis: c.rigid ? 'horário rígido' : 'flexível' },
    { key: 'custo_de_atraso', weight: W.custo_de_atraso, value: COST_VALUE[cost], contribution: 0, basis: c.costOfDelay ? `custo ${cost} (declarado)` : `custo ${cost} (derivado do tier)` },
    { key: 'pressao_de_tempo', weight: W.pressao_de_tempo, value: pressure.value, contribution: 0, basis: pressure.basis, missingData: pressure.missing },
    { key: 'encaixe_no_contexto', weight: W.encaixe_no_contexto, value: fit ?? 0.5, contribution: 0, basis: fit === undefined ? 'contexto neutro (sem sinal)' : 'encaixe informado pelo contexto' },
  ];
  for (const f of factors) f.contribution = Math.round(f.weight * f.value * 1000) / 1000;
  let score = Math.round(factors.reduce((s, f) => s + f.contribution, 0) * 1000) / 1000;

  if (c.yieldsInConflict && !c.rigid) {
    score = Math.max(0, Math.round((score - 0.1) * 1000) / 1000);
    overrides.push({ key: 'cede_no_conflito', basis: 'em conflito com compromisso de maior prioridade na Agenda' });
  }

  let band: PriorityBand = score >= 0.8 ? 'maxima' : score >= 0.6 ? 'alta' : score >= 0.4 ? 'media' : 'baixa';

  if (c.kind === 'event' && c.rigid && c.startsAt) {
    const min = (toMs(c.startsAt) - nowMs) / 60_000;
    const end = c.endsAt ? (toMs(c.endsAt) - nowMs) / 60_000 : min;
    if (min > 0 && min <= 15) {
      band = 'maxima';
      overrides.push({ key: 'evento_rigido_iminente', basis: `compromisso rígido em ${Math.round(min)} min` });
    } else if (min <= 0 && end > 0) {
      band = 'maxima';
      overrides.push({ key: 'evento_em_andamento', basis: 'compromisso rígido acontecendo agora' });
    }
  }

  if (!c.actionable) {
    band = 'bloqueada';
    overrides.push({ key: 'nao_executavel', basis: c.notActionableReason ?? 'não executável agora' });
  }

  return { candidate: c, score, band, factors, overrides, flags };
}

const BAND_RANK: Record<PriorityBand, number> = { maxima: 0, alta: 1, media: 2, baixa: 3, bloqueada: 4 };

/** Ordena: banda, depois score, depois quem começa/vence antes, depois id (estável). */
export function rankCandidates(candidates: PriorityCandidate[], now: string): PriorityResult[] {
  return candidates
    .map((c) => scoreCandidate(c, now))
    .sort((a, b) => {
      const byBand = BAND_RANK[a.band] - BAND_RANK[b.band];
      if (byBand !== 0) return byBand;
      if (b.score !== a.score) return b.score - a.score;
      const ta = a.candidate.startsAt ?? a.candidate.dueAt ?? '9999';
      const tb = b.candidate.startsAt ?? b.candidate.dueAt ?? '9999';
      return ta.localeCompare(tb) || a.candidate.id.localeCompare(b.candidate.id);
    });
}
