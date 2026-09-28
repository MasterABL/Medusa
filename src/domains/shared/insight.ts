/**
 * MEDUSA — Shared Domain Insight shape (usado por Finance/Body/Spiritual)
 *
 * Mais rico que o `Insight` genérico da fundação (src/foundation/types/goals.ts)
 * — inclui `period`/`impact`/`severity`, que os engines de domínio desta
 * rodada precisam. Um domínio pode opcionalmente publicar uma versão
 * resumida no `Goals.createInsight()` compartilhado quando fizer sentido
 * (ex.: pra aparecer em `hojeContext`), mas o modelo rico vive aqui.
 *
 * Regra dura (seção 5/41): NUNCA inventar evidência. Sem dado suficiente,
 * o tipo do insight é `insufficient_evidence` — nunca uma conclusão forçada.
 */

export type InsightSeverity = 'baixa' | 'moderada' | 'alta';

export interface DomainInsight<TType extends string = string> {
  id: string;
  type: TType | 'insufficient_evidence';
  observation: string;
  evidence: string[];
  period?: { from: string; to: string };
  impact?: string;
  severity: InsightSeverity;
  confidence: number; // 0-1, sempre interpretável junto da evidência
  proposedActionType?: string;
  createdAt: string;
}
