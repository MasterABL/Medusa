/**
 * MEDUSA — Guardian — Product Auditor (contrato × implementação)
 *
 * Compara o que os domínios DECLARAM com o que existe de fato: ação declarada
 * sem política de autonomia (cairia em L3 por padrão), política sem declaração,
 * evento declarado sem nenhum emissor observado.
 */

import type { FindingDraft } from '../model/types';
import type { Auditor } from './types';

export interface ProductAuditInput {
  domains: Array<{ id: string; actionTypes: string[]; eventTypes: string[] }>;
  rules: Array<{ domain: string; actionType: string }>;
  /** Só checa "sem emissor" quando a lista de eventos observados é fornecida. */
  emittedEvents?: Array<{ domain: string; type: string }>;
}

export const PRODUCT_AUDITOR_ID = 'product-auditor';

export const productAuditor: Auditor<ProductAuditInput> = {
  id: PRODUCT_AUDITOR_ID,
  category: 'product',
  detect(input, now) {
    const observedAt = now.toISOString();
    const drafts: FindingDraft[] = [];
    const ruleKeys = new Set(input.rules.map((r) => `${r.domain}::${r.actionType}`));

    for (const domain of input.domains) {
      for (const type of domain.actionTypes) {
        if (ruleKeys.has(`${domain.id}::${type}`)) continue;
        drafts.push({
          category: 'product',
          severity: 'moderada',
          origin: PRODUCT_AUDITOR_ID,
          evidence: [{ source: PRODUCT_AUDITOR_ID, reference: `domain:${domain.id}#actionTypes`, observation: `ação "${type}" declarada sem política de autonomia`, expectation: 'toda ação declarada tem regra no Guardian', difference: 'sem regra → tratada como L3 (risco máximo)', observedAt }],
          context: { domain: domain.id, actionType: type },
          impact: 'A ação nunca executa sozinha e sempre pede aprovação, mesmo que fosse de baixo risco.',
          confidence: 0.95,
          hypothesis: 'A ação foi adicionada ao contrato do domínio sem registrar a política.',
          dedupeKey: `product:no-rule:${domain.id}:${type}`,
        });
      }
      for (const rule of input.rules.filter((r) => r.domain === domain.id)) {
        if (domain.actionTypes.includes(rule.actionType)) continue;
        drafts.push({
          category: 'product',
          severity: 'baixa',
          origin: PRODUCT_AUDITOR_ID,
          evidence: [{ source: PRODUCT_AUDITOR_ID, reference: `policy:${domain.id}::${rule.actionType}`, observation: `política registrada para "${rule.actionType}", ausente em domain.actionTypes`, expectation: 'contrato do domínio lista todas as ações que ele emite', difference: 'ação existe na política mas não no contrato', observedAt }],
          context: { domain: domain.id, actionType: rule.actionType },
          impact: 'Consumidores do contrato (UI, Registry) não sabem que a ação existe.',
          confidence: 0.9,
          hypothesis: 'Contrato do domínio ficou desatualizado em relação à política.',
          dedupeKey: `product:undeclared-action:${domain.id}:${rule.actionType}`,
        });
      }
      if (input.emittedEvents) {
        for (const type of domain.eventTypes) {
          if (input.emittedEvents.some((e) => e.domain === domain.id && e.type === type)) continue;
          drafts.push({
            category: 'product',
            severity: 'baixa',
            origin: PRODUCT_AUDITOR_ID,
            evidence: [{ source: PRODUCT_AUDITOR_ID, reference: `domain:${domain.id}#eventTypes`, observation: `evento "${type}" declarado, nenhuma emissão observada`, expectation: 'evento declarado tem emissor', difference: 'sem emissão na janela observada', observedAt }],
            context: { domain: domain.id, eventType: type },
            impact: 'Quem assina o evento nunca será notificado.',
            confidence: 0.5,
            hypothesis: 'Emissor ainda não implementado — ou o evento simplesmente não ocorreu na janela observada.',
            dedupeKey: `product:event-no-emitter:${domain.id}:${type}`,
          });
        }
      }
    }
    return drafts;
  },
};
