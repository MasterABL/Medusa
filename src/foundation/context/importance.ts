/**
 * MEDUSA FOUNDATION — Importância de evento por REGRAS configuráveis
 *
 * A primeira versão (reminders/policy.ts) classificava por uma cadeia de `if`
 * fixa — impossível de evoluir sem mexer em código. Aqui a classificação é
 * uma TABELA de regras ordenadas: cada regra diz o que casa (palavras,
 * domínio, tipo, flexibilidade ou um predicado) e o que isso significa
 * (categoria, tier, rigidez). O usuário pode sobrepor por evento ou por
 * categoria sem tocar nas regras.
 *
 *   critical  consulta, telemedicina, prova, compromisso rígido de alto impacto
 *   high      reunião importante, prazo próximo, apresentação, entrega
 *   medium    treino, aula, estudo, prática
 *   low       tarefa flexível, lembrete opcional
 */

import type { AgendaItem, AgendaDomain, AgendaItemKind, AgendaSourceType } from '../../types/agenda';
import type { EventContextCategory, EventImportance } from '../reminders/types';

export type ImportanceTier = 'critical' | 'high' | 'medium' | 'low';

export const TIER_ORDER: readonly ImportanceTier[] = ['critical', 'high', 'medium', 'low'];

export interface ImportanceRuleMatch {
  /** Casa se QUALQUER palavra aparecer no título/descrição (minúsculas, sem acento). */
  keywords?: string[];
  domains?: AgendaDomain[];
  kinds?: AgendaItemKind[];
  sourceTypes?: AgendaSourceType[];
  isFlexible?: boolean;
  /** Para regras que não cabem nos campos acima. Deve ser puro. */
  predicate?: (item: AgendaItem) => boolean;
  /** true = todas as condições informadas precisam casar; false (padrão) = qualquer uma. */
  all?: boolean;
}

export interface ImportanceRule {
  id: string;
  category: EventContextCategory;
  tier: ImportanceTier;
  /** Horário rígido: não dá pra adiar sem custo (consulta, prova). */
  rigid: boolean;
  match: ImportanceRuleMatch;
}

export interface ImportanceOverrides {
  /** Por evento (id do AgendaItem) — vence tudo. */
  byEventId?: Record<string, { tier?: ImportanceTier; category?: EventContextCategory; rigid?: boolean }>;
  /** Por categoria — vence a regra, perde para o override por evento. */
  byCategory?: Partial<Record<EventContextCategory, { tier?: ImportanceTier; rigid?: boolean }>>;
}

export interface ImportanceClassification {
  tier: ImportanceTier;
  category: EventContextCategory;
  rigid: boolean;
  /** Como se chegou nisso — explicável. */
  source: 'explicito_no_evento' | 'override_evento' | 'override_categoria' | 'regra' | 'padrao';
  ruleId?: string;
}

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const kw = (...words: string[]) => words.map(normalize);

/** Regras padrão — espelham a 1ª versão (reminders/policy.ts) e acrescentam o tier `critical`. */
export const DEFAULT_IMPORTANCE_RULES: readonly ImportanceRule[] = [
  { id: 'telemedicina', category: 'telemedicine', tier: 'critical', rigid: true, match: { keywords: kw('telemedicina', 'consulta online', 'videochamada médica', 'teleconsulta') } },
  { id: 'consulta_medica', category: 'medical_consultation', tier: 'critical', rigid: true, match: { keywords: kw('consulta', 'médic', 'dentista', 'psicólog', 'exame', 'laboratório') } },
  { id: 'prova', category: 'exam', tier: 'critical', rigid: true, match: { keywords: kw('prova', 'exame final', 'banca', 'concurso', 'avaliação presencial') } },
  { id: 'reuniao_critica', category: 'critical_meeting', tier: 'high', rigid: true, match: { keywords: kw('reunião diretoria', 'reunião com cliente', 'entrevista', 'audiência', 'alinhamento executivo') } },
  {
    id: 'compromisso_rigido',
    category: 'strict_appointment',
    tier: 'high',
    rigid: true,
    match: {
      predicate: (item) =>
        item.isFlexible === false &&
        (item.domain === 'work' || item.kind === 'event') &&
        kw('prazo', 'entrega', 'apresentação').some((w) => normalize(`${item.title} ${item.description ?? ''}`).includes(w)),
    },
  },
  { id: 'treino', category: 'workout', tier: 'medium', rigid: false, match: { domains: ['body'], sourceTypes: ['workout'], keywords: kw('treino', 'academia', 'musculação', 'corrida') } },
  { id: 'estudo', category: 'study', tier: 'medium', rigid: false, match: { domains: ['education'], sourceTypes: ['education_session'], keywords: kw('estudo', 'aula', 'inglês', 'revisão') } },
  { id: 'pratica', category: 'practice', tier: 'medium', rigid: false, match: { domains: ['spiritual'], keywords: kw('oração', 'devocional', 'leitura bíblica', 'culto') } },
  { id: 'bloco_ou_tarefa', category: 'task', tier: 'medium', rigid: false, match: { kinds: ['time_block', 'routine'], sourceTypes: ['task'] } },
  { id: 'flexivel', category: 'flexible_block', tier: 'low', rigid: false, match: { isFlexible: true } },
];

function matches(item: AgendaItem, m: ImportanceRuleMatch): boolean {
  const text = normalize(`${item.title ?? ''} ${item.description ?? ''}`);
  const checks: boolean[] = [];
  if (m.keywords) checks.push(m.keywords.some((w) => text.includes(w)));
  if (m.domains) checks.push(m.domains.includes(item.domain));
  if (m.kinds) checks.push(m.kinds.includes(item.kind));
  if (m.sourceTypes) checks.push(!!item.source?.sourceType && m.sourceTypes.includes(item.source.sourceType));
  if (m.isFlexible !== undefined) checks.push(item.isFlexible === m.isFlexible);
  if (m.predicate) checks.push(m.predicate(item));
  if (checks.length === 0) return false;
  return m.all ? checks.every(Boolean) : checks.some(Boolean);
}

/** Campos opcionais que um AgendaItem pode carregar quando o usuário já marcou a importância. */
export interface ExplicitImportance {
  importanceTier?: ImportanceTier;
  importance?: EventImportance;
  contextCategory?: EventContextCategory;
  rigid?: boolean;
}

export function classifyEvent(
  item: AgendaItem & ExplicitImportance,
  rules: readonly ImportanceRule[] = DEFAULT_IMPORTANCE_RULES,
  overrides: ImportanceOverrides = {}
): ImportanceClassification {
  const byEvent = overrides.byEventId?.[item.id];

  let base: ImportanceClassification;
  if (item.contextCategory && (item.importanceTier || item.importance)) {
    const tier = item.importanceTier ?? (item.importance === 'high' ? 'high' : item.importance === 'medium' ? 'medium' : 'low');
    base = { tier, category: item.contextCategory, rigid: item.rigid ?? tier === 'critical', source: 'explicito_no_evento' };
  } else {
    const rule = rules.find((r) => matches(item, r.match));
    base = rule
      ? { tier: rule.tier, category: rule.category, rigid: rule.rigid, source: 'regra', ruleId: rule.id }
      : { tier: 'low', category: 'optional_reminder', rigid: false, source: 'padrao' };
  }

  const byCat = overrides.byCategory?.[byEvent?.category ?? base.category];
  if (byCat) base = { ...base, tier: byCat.tier ?? base.tier, rigid: byCat.rigid ?? base.rigid, source: 'override_categoria' };
  if (byEvent) base = { ...base, tier: byEvent.tier ?? base.tier, category: byEvent.category ?? base.category, rigid: byEvent.rigid ?? base.rigid, source: 'override_evento' };
  return base;
}

/** O contrato antigo de lembretes só conhece high/medium/low: critical vira high lá. */
export function toLegacyImportance(tier: ImportanceTier): EventImportance {
  return tier === 'critical' || tier === 'high' ? 'high' : tier;
}
