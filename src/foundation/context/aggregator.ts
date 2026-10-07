/**
 * MEDUSA FOUNDATION — Context Aggregator (o que alimenta o Hoje)
 *
 *   Agenda · Education · Projects · Tasks · Finance · Body · Spiritual · Guardian
 *     → Context Aggregator → Hoje { Agora · Próximo · Atenção · Ritmo · Recomendação }
 *
 * Cada fonte devolve um DataState da sua contribuição. O agregador nunca
 * finge que uma fonte respondeu: fonte indisponível, velha, offline ou sem
 * permissão aparece em `sources` e torna o Hoje PARCIAL, dizendo qual faltou.
 * Não há UI aqui — só o modelo de informação que a tela do Anti vai consumir.
 */

import type { DataState, DataStatus } from '../types/dataState';
import * as DS from '../dataState';
import type { LifeDomain } from '../types/lifeDomain';
import type { ImportanceTier } from './importance';
import type { PriorityBand } from '../priority/engine';
import type { Recommendation } from '../recommendations/engine';

export type ContextSourceId = 'agenda' | 'tasks' | 'projects' | 'reminders' | 'guardian' | 'education' | 'finance' | 'body' | 'spiritual' | 'recommendations' | 'email';

export interface TodayItem {
  id: string;
  title: string;
  kind: 'event' | 'task' | 'routine' | 'reminder';
  domain: LifeDomain;
  tier: ImportanceTier;
  startIso?: string;
  endIso?: string;
  /** Calculado pelo agregador a partir de `now`. */
  minutesUntilStart?: number;
  band?: PriorityBand;
  refs?: { eventId?: string; taskId?: string; projectId?: string; reminderId?: string; emailId?: string; candidateId?: string };
  /** Ainda não confirmado na Agenda (ex.: consulta detectada num e-mail). A UI deve dizer isso. */
  provisional?: { reason: string };
  source: ContextSourceId;
}

export type AttentionReason =
  | 'prazo_proximo'
  | 'prazo_inviavel'
  | 'marco_atrasado'
  | 'conflito'
  | 'lembrete_sem_reconhecimento'
  | 'aprovacao_pendente'
  | 'canal_bloqueado'
  | 'tarefa_bloqueada'
  | 'email_requer_acao'
  | 'email_prazo'
  | 'email_risco'
  | 'email_acompanhamento';

export interface AttentionItem {
  id: string;
  reason: AttentionReason;
  severity: 'alta' | 'media';
  title: string;
  /** Dados estruturados para a UI compor a frase. */
  detail: Record<string, string | number | boolean | undefined>;
  dueIso?: string;
  refs?: TodayItem['refs'] & { actionId?: string };
  source: ContextSourceId;
}

export interface RhythmItem {
  id: string;
  title: string;
  kind: 'treino' | 'aula' | 'estudo' | 'pratica' | 'rotina';
  domain: LifeDomain;
  startIso: string;
  source: ContextSourceId;
}

export interface ContextContribution {
  now?: TodayItem[];
  next?: TodayItem[];
  attention?: AttentionItem[];
  rhythm?: RhythmItem[];
  recommendations?: Recommendation[];
}

export interface ContextSource {
  id: ContextSourceId;
  read(now: string): DataState<ContextContribution>;
}

export interface SourceStatus {
  id: ContextSourceId;
  status: DataStatus;
  detail?: string;
}

export interface TodayContext {
  now: string;
  agora?: TodayItem;
  /** Outros itens acontecendo ao mesmo tempo (ex.: telemedicina durante o trabalho). */
  agoraTambem: TodayItem[];
  proximo?: TodayItem;
  atencao: AttentionItem[];
  ritmo: RhythmItem[];
  recomendacao?: Recommendation;
  outrasRecomendacoes: Recommendation[];
  sources: SourceStatus[];
}

const TIER_RANK: Record<ImportanceTier, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_RANK = { alta: 0, media: 1 } as const;
const STRENGTH_RANK = { forte: 0, moderada: 1, fraca: 2 } as const;

/** Fonte declarada mas ainda não conectada — aparece como indisponível, nunca como "vazia". */
export function unavailableSource(id: ContextSourceId, reason: string): ContextSource {
  return { id, read: () => DS.failed<ContextContribution>(`fonte não conectada: ${reason}`, false) };
}

export function aggregateToday(sources: ContextSource[], now: string): DataState<TodayContext> {
  const nowMs = Date.parse(now);
  const statuses: SourceStatus[] = [];
  const contributions: ContextContribution[] = [];

  for (const s of sources) {
    let state: DataState<ContextContribution>;
    try {
      state = s.read(now);
    } catch (err) {
      state = DS.failed(err instanceof Error ? err.message : String(err));
    }
    statuses.push({ id: s.id, status: state.status, detail: state.status === 'ready' || state.status === 'loading' ? undefined : DS.describe(state) });
    const data = DS.dataOf(state);
    if (data) contributions.push(data);
  }

  const withMinutes = (i: TodayItem): TodayItem => (i.startIso ? { ...i, minutesUntilStart: Math.round((Date.parse(i.startIso) - nowMs) / 60_000) } : i);
  const nowItems = contributions.flatMap((c) => c.now ?? []).map(withMinutes).sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || (a.startIso ?? '').localeCompare(b.startIso ?? ''));
  const nextItems = contributions
    .flatMap((c) => c.next ?? [])
    .map(withMinutes)
    .filter((i) => (i.minutesUntilStart ?? 0) > 0)
    .sort((a, b) => (a.minutesUntilStart ?? 0) - (b.minutesUntilStart ?? 0) || TIER_RANK[a.tier] - TIER_RANK[b.tier]);

  // Agora = o que está em andamento; com sobreposição, o de horário rígido/de maior tier vem primeiro, mas
  // um bloco longo de rotina (trabalho) é o "agora" e o resto fica em agoraTambem.
  const [agora, ...agoraTambem] = nowItems;

  const seen = new Set<string>();
  const atencao = contributions
    .flatMap((c) => c.attention ?? [])
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || (a.dueIso ?? '9999').localeCompare(b.dueIso ?? '9999'));

  const ritmo = contributions
    .flatMap((c) => c.rhythm ?? [])
    .filter((r) => Date.parse(r.startIso) >= nowMs)
    .sort((a, b) => a.startIso.localeCompare(b.startIso));

  const recs = contributions.flatMap((c) => c.recommendations ?? []).sort((a, b) => STRENGTH_RANK[a.strength] - STRENGTH_RANK[b.strength] || a.window.startIso.localeCompare(b.window.startIso));

  const today: TodayContext = {
    now,
    agora,
    agoraTambem,
    proximo: nextItems[0],
    atencao,
    ritmo,
    recomendacao: recs[0],
    outrasRecomendacoes: recs.slice(1),
    sources: statuses,
  };

  const usable = statuses.filter((s) => ['ready', 'partial', 'stale', 'empty'].includes(s.status));
  const hasAnything = !!agora || !!today.proximo || atencao.length > 0 || ritmo.length > 0 || recs.length > 0;
  if (usable.length === 0) return DS.failed('Nenhuma fonte de contexto respondeu.', true);
  if (!hasAnything && statuses.every((s) => s.status === 'empty' || s.status === 'ready')) return DS.empty('Nada acontecendo nem pendente hoje.');
  const missing = statuses.filter((s) => s.status !== 'ready' && s.status !== 'empty').map((s) => `${s.id}: ${s.status}`);
  return DS.partial(today, missing, 'fonte_indisponivel', 'derived', now);
}
