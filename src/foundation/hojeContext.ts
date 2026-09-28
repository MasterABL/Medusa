/**
 * MEDUSA FOUNDATION — Hoje como camada de síntese (seção 3/13)
 *
 * Hoje não duplica cada domínio inteiro — ele agrega uma FATIA de cada um
 * (insights recentes, mensagens proativas endereçadas a "hoje", aprovações
 * pendentes) numa única leitura. Esta função é pura leitura: não decide
 * nada, não modifica nenhum estado — só prova que a arquitetura permite
 * "Hoje" consumir múltiplos domínios sem import direto de nenhum deles em
 * particular (só dos módulos de fundação compartilhados).
 *
 * NENHUM componente de UI usa isto ainda — ver seção "NÃO FAZER AGORA" do
 * relatório da rodada.
 */

import { listLiveDomains } from './domainRegistry';
import { listInsights } from './goals/goalModel';
import { list as listProactiveMessages } from './messaging/proactiveMessage';
import { listApprovalRequests } from './guardian/approval';
import type { DomainDefinition } from './types/domain';
import type { Insight } from './types/goals';
import type { ProactiveMessage } from './types/messaging';
import type { ApprovalRequest } from './types/guardian';

export interface TodayContextSnapshot {
  liveDomains: DomainDefinition[];
  recentInsights: Insight[];
  messagesForToday: ProactiveMessage[];
  pendingApprovals: ApprovalRequest[];
}

/** Agrega o estado atual de todos os domínios registrados — não filtra por um único domínio. */
export function getTodayContextSnapshot(): TodayContextSnapshot {
  return {
    liveDomains: listLiveDomains(),
    recentInsights: listInsights(),
    messagesForToday: listProactiveMessages({ surface: 'hoje' }),
    pendingApprovals: listApprovalRequests({ status: 'pending' }),
  };
}
