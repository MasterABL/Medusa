/**
 * MEDUSA — Guardian — Privacy Auditor do domínio Espiritual
 *
 * Guardian protege governança, privacidade e integridade — NÃO modera
 * conteúdo religioso. Este auditor só responde: algum texto PRIVADO do
 * usuário (reflexão, oração, nota pessoal) apareceu num canal de saída?
 * A evidência cita ids e canal; nunca reproduz o texto.
 */

import type { FindingDraft } from '../model/types';
import { leaksPrivateText } from '../../shared/privateText';
import type { Auditor } from './types';

export interface PrivacyAuditInput {
  privateItems: Array<{ id: string; kind: string; content: string }>;
  outbound: Array<{ channel: string; text: string; reference?: string }>;
}

export const SPIRITUAL_PRIVACY_AUDITOR_ID = 'spiritual-privacy-auditor';
export const spiritualPrivacyAuditor: Auditor<PrivacyAuditInput> = {
  id: SPIRITUAL_PRIVACY_AUDITOR_ID,
  category: 'security',
  detect(input, now) {
    const observedAt = now.toISOString();
    const drafts: FindingDraft[] = [];
    for (const item of input.privateItems) {
      for (const out of input.outbound) {
        if (!leaksPrivateText(item.content, out.text)) continue;
        drafts.push({
          category: 'security',
          severity: 'critica',
          origin: SPIRITUAL_PRIVACY_AUDITOR_ID,
          evidence: [
            {
              source: SPIRITUAL_PRIVACY_AUDITOR_ID,
              reference: `${out.channel}${out.reference ? `#${out.reference}` : ''}`,
              observation: `trecho do item privado "${item.id}" (${item.kind}) presente no canal "${out.channel}"`,
              expectation: 'conteúdo privado nunca aparece em canal de saída',
              difference: 'conteúdo privado exposto',
              observedAt,
            },
          ],
          context: { itemId: item.id, kind: item.kind, channel: out.channel },
          impact: 'Texto pessoal do usuário saiu do espaço privado.',
          confidence: 0.85,
          hypothesis: 'Um consumidor montou a saída a partir do conteúdo em vez do metadado.',
          dedupeKey: `privacy:${out.channel}:${item.id}`,
        });
      }
    }
    return drafts;
  },
};
