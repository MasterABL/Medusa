/**
 * MEDUSA — Guardian — Adapter do MINHA-VIDA (agent_action_executions)
 *
 * ARMADILHA DE VOCABULÁRIO: no MINHA-VIDA "L3" é a autonomia MÁXIMA (a ação
 * roda sem ninguém confirmar). No Medusa "L3" é o OPOSTO: alto impacto, SEMPRE
 * com aprovação humana; o que roda sozinho é "L1". Copiar o número
 * quebraria a semântica de segurança — o adapter traduz pelo SIGNIFICADO.
 *
 *   legado trigger_reason 'auto_l3'            -> rodou sem aprovação  (Medusa: autonomia L1)
 *   legado trigger_reason 'confirmacao_humana' -> passou por aprovação (Medusa: L2)
 *
 * Importar não concede autoridade nenhuma: o histórico vira EVIDÊNCIA
 * (auditoria), e quem decide o que roda sozinho daqui pra frente continua
 * sendo `policy.classify()` + confiança + (futuramente) grant.
 */

import type { ActionStatus } from '../types/action';
import type { AutonomyLevel } from '../types/autonomy';

export interface LegacyExecutionRow {
  id: string;
  decision_id: string;
  agent_id: string;
  action_key: string;
  action_type: string;
  trigger_reason: 'auto_l3' | 'confirmacao_humana' | string;
  status: 'executing' | 'succeeded' | 'failed' | string;
  error?: string | null;
  started_at: string;
  finished_at?: string | null;
}

export interface ImportedExecution {
  legacyExecutionId: string;
  legacyDecisionId: string;
  actionKey: string;
  ranWithoutApproval: boolean;
  autonomyLevel: AutonomyLevel;
  status: ActionStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

const STATUS: Record<string, ActionStatus> = { executing: 'EXECUTING', succeeded: 'SUCCESS', failed: 'FAILED' };

/** Nível legado (1/2/3) -> nível Medusa. Legado 3 = roda sozinho = Medusa L1; 1 e 2 exigem decisão humana = L2. */
export function legacyLevelToMedusa(level: number): AutonomyLevel {
  return level >= 3 ? 'L1' : 'L2';
}

export function mapExecution(row: LegacyExecutionRow): ImportedExecution | { skipped: true; reason: string } {
  const status = STATUS[row.status];
  if (!status) return { skipped: true, reason: `status desconhecido: "${row.status}".` };
  if (row.trigger_reason !== 'auto_l3' && row.trigger_reason !== 'confirmacao_humana') {
    return { skipped: true, reason: `trigger_reason desconhecido: "${row.trigger_reason}" — não dá pra saber se passou por aprovação.` };
  }
  const auto = row.trigger_reason === 'auto_l3';
  return {
    legacyExecutionId: row.id,
    legacyDecisionId: row.decision_id,
    actionKey: row.action_key,
    ranWithoutApproval: auto,
    autonomyLevel: auto ? 'L1' : 'L2',
    status,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    error: row.error ?? undefined,
  };
}
