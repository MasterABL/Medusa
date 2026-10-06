/**
 * MEDUSA — Agenda — Modelo temporal (contratos)
 *
 * Princípio herdado de `src/types/agenda.ts`: "A Agenda conhece o tempo; cada
 * domínio conhece o significado." Este módulo NÃO substitui `AgendaItem` —
 * reaproveita-o como entrada — e acrescenta o que faltava pra responder
 * perguntas de tempo com honestidade: deslocamento e buffer como intervalos
 * de primeira classe, conflito com política de prioridade explícita, vão livre
 * que não mente, e uma linha do tempo com "agora".
 *
 * Procedência: rotina fixa (acorda/sai/ônibus/trabalho/estudo) e a regra
 * "trabalho vence estudo/inglês" vêm do MINHA-VIDA (ROTINA_FIXA em hoje.js);
 * a ordem de prioridade entre domínios espelha a que a Agenda do Medusa já
 * usa pra distribuir colunas em conflito. Fixo-vence-flexível é NOVA.
 *
 * Nenhuma dependência de React, layout ou cor.
 */

import type { AgendaDomain, AgendaItemKind } from '../../../types/agenda';

/** O que ocupa tempo. Só `evento` e `rotina` têm significado de domínio; os outros ocupam sem "ser" compromisso. */
export type EntryKind = 'evento' | 'rotina' | 'deslocamento' | 'buffer';

export interface TimelineEntry {
  id: string;
  kind: EntryKind;
  title: string;
  domain?: AgendaDomain;
  /** YYYY-MM-DD */
  date: string;
  /** Minutos desde 00:00. */
  startMin: number;
  endMin: number;
  /** Vem de um AgendaItem (id dele) quando aplicável; buffer/deslocamento apontam pro item a que servem. */
  itemId?: string;
  /** Só o tipo original do AgendaItem; ausente em rotina/deslocamento/buffer. */
  itemKind?: AgendaItemKind;
  /** true = não pode ser movido (padrão). Flexível cede lugar em conflito. */
  fixed: boolean;
}

/** Trecho de deslocamento. Nunca é tempo livre. */
export interface TravelLeg {
  id: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  label?: string;
  /** Item ao qual este deslocamento leva (ou de onde volta). */
  forItemId?: string;
}

/** Respiro antes/depois de um tipo de compromisso. Não some: entra no cálculo de tempo livre. */
export interface BufferRule {
  appliesTo: { itemId?: string; domain?: AgendaDomain };
  beforeMinutes: number;
  afterMinutes: number;
}

/** Rotina recorrente por dia da semana (0 = domingo). */
export interface RoutineBlock {
  id: string;
  label: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  domain: AgendaDomain;
  kind: 'rotina' | 'deslocamento';
}

/** Ordem de prioridade entre domínios: índice menor vence. */
export interface PriorityPolicy {
  domainOrder: AgendaDomain[];
}

/** Mesma ordem que a Agenda do Medusa já usa (work > personal > body > finance > education > external). */
export const DEFAULT_PRIORITY_POLICY: PriorityPolicy = {
  domainOrder: ['work', 'personal', 'body', 'finance', 'education', 'external'],
};

export type ConflictSeverity = 'hard' | 'soft';

export type ResolutionRule = 'fixo_sobre_flexivel' | 'prioridade_do_dominio' | 'comecou_antes' | 'desempate_por_id';

export interface ConflictResolution {
  keepId: string;
  yieldId: string;
  rule: ResolutionRule;
}

/**
 * hard = dois compromissos/rotinas/deslocamentos sobrepostos.
 * soft = um compromisso invade o buffer de outro (o respiro planejado foi violado).
 */
export interface TemporalConflict {
  a: TimelineEntry;
  b: TimelineEntry;
  overlapMinutes: number;
  startMin: number;
  endMin: number;
  severity: ConflictSeverity;
  resolution: ConflictResolution;
}

export interface FreeSlot {
  startMin: number;
  endMin: number;
  durationMinutes: number;
}

export interface SlotSuggestion {
  date: string;
  startMin: number;
  endMin: number;
}

export type EntryPhase = 'passado' | 'agora' | 'proximo' | 'futuro';

export interface PhasedEntry {
  entry: TimelineEntry;
  phase: EntryPhase;
}

export interface DaySchedule {
  date: string;
  entries: TimelineEntry[];
  /** Itens que não entraram na linha do tempo e por quê — nunca descartados em silêncio. */
  issues: string[];
  conflicts: TemporalConflict[];
  freeSlots: FreeSlot[];
}

export interface AgendaContextSnapshot {
  date: string;
  nowMin: number;
  current?: TimelineEntry;
  next?: TimelineEntry;
  /** Minutos livres de verdade entre agora e o próximo compromisso (deslocamento e buffer descontados). Ausente se não há próximo. */
  freeUntilNextMinutes?: number;
  conflictCount: number;
  hardConflictCount: number;
  freeMinutesRemaining: number;
}
