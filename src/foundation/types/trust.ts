/**
 * MEDUSA FOUNDATION — Trust model
 *
 * Seção 6 da missão: a confiança aprende com o padrão de uso, mas a IA NUNCA
 * aumenta sua própria autoridade silenciosamente — quem decide a elevação de
 * autonomia é a AutonomyPolicy (ver autonomy.ts), lendo este perfil como
 * EVIDÊNCIA, nunca como permissão automática.
 *
 * Nenhum "número mágico": todo valor numérico aqui vem acompanhado de um
 * `state` interpretável e da evidência bruta que o produziu.
 */

import type { DomainId } from './domain';

export type TrustOutcome = 'accepted' | 'rejected' | 'corrected';

export interface TrustEvidenceEntry {
  outcome: TrustOutcome;
  actionId: string;
  occurredAt: string;
  /** Nota livre, ex.: "usuário editou o horário antes de aplicar". */
  note?: string;
}

/**
 * Estado interpretável — a UI nunca deveria precisar decidir sozinha o que
 * "0.63" significa. O motor de confiança já resolve isso aqui.
 */
export type TrustState =
  | 'sem_evidencia' // amostra insuficiente pra dizer qualquer coisa
  | 'aprendendo' // amostra pequena, tendência ainda não estável
  | 'confiavel' // aceitação consistente numa amostra razoável
  | 'requer_atencao'; // rejeições/correções recentes acima do esperado

/**
 * Perfil de confiança por (domain, actionType) — nunca por domínio inteiro
 * (ver seção 5 da missão). `evidence` é a lista bruta; os campos agregados
 * abaixo são derivados dela, nunca a fonte de verdade em si.
 */
export interface ActionTrustProfile {
  domain: DomainId;
  actionType: string;
  state: TrustState;
  sampleSize: number;
  acceptedCount: number;
  rejectedCount: number;
  correctedCount: number;
  /** Proporção de aceitação nas últimas N ocorrências — não uma média eterna. */
  recentAcceptanceRate: number | null;
  evidence: TrustEvidenceEntry[];
  updatedAt: string;
}
