/**
 * MEDUSA — Ponte DomainInsight → contexto compartilhado (Hoje)
 *
 * Os engines de domínio devolvem `DomainInsight` (rico); o snapshot do Hoje só
 * enxerga `Goals.createInsight`. Sem esta ponte, nenhum insight de Finanças ou
 * Corpo chegava ao Hoje. É uma operação EXPLÍCITA (tem efeito colateral) — os
 * engines continuam puros.
 *
 * `insufficient_evidence` nunca é publicado: ausência de dado não é insight.
 */

import { createInsight } from '../../foundation/goals/goalModel';
import type { DomainId } from '../../foundation/types/domain';
import type { Insight } from '../../foundation/types/goals';
import type { DomainInsight } from './insight';

export function publishInsightsToContext(domain: DomainId, insights: DomainInsight[]): Insight[] {
  return insights
    .filter((i) => i.type !== 'insufficient_evidence')
    .map((i) =>
      createInsight({
        domain,
        observation: i.observation,
        evidence: i.evidence,
        reasoningSummary: [i.impact, `severidade ${i.severity}`].filter(Boolean).join(' — '),
        confidence: i.confidence,
      })
    );
}
