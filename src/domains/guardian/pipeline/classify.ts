/**
 * Etapa CLASSIFY — severidade final e autonomia exigida.
 *
 * Regras (heurísticas documentadas, não IA):
 *  - segurança crítica nunca cai abaixo de "alta";
 *  - confiança < 0.5 limita a severidade a "moderada" (não alarma sem base);
 *  - autonomia exigida vem do teto da política da fundação para a ação sugerida
 *    (sem regra = L3, risco máximo).
 */

import { GuardianPolicy } from '../../../foundation/guardian';
import type { AutonomyLevel } from '../../../foundation/types/autonomy';
import type { Finding, FindingSeverity } from '../model/types';

const ORDER: FindingSeverity[] = ['baixa', 'moderada', 'alta', 'critica'];

export function classifySeverity(finding: Pick<Finding, 'severity' | 'category' | 'confidence'>): FindingSeverity {
  let index = ORDER.indexOf(finding.severity);
  if (finding.category === 'security' && finding.severity === 'critica') index = Math.max(index, ORDER.indexOf('alta'));
  if (finding.confidence < 0.5) index = Math.min(index, ORDER.indexOf('moderada'));
  return ORDER[index];
}

export function requiredAutonomyFor(actionKey: string | undefined): AutonomyLevel | undefined {
  if (!actionKey) return undefined;
  return GuardianPolicy.getAutonomyRule('guardian', actionKey)?.ceilingLevel ?? 'L3';
}
