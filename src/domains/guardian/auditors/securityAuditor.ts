/**
 * MEDUSA — Guardian — Security Auditor
 *
 * Segredo exposto e configuração insegura. A evidência NUNCA carrega o
 * segredo: só o nome do padrão, um prefixo curto e o tamanho.
 */

import type { FindingDraft } from '../model/types';
import type { Auditor } from './types';
import { fingerprint } from './types';

export interface SecurityAuditInput {
  items?: Array<{ location: string; content: string }>;
  config?: Array<{ location: string; key: string; value: string; environment?: string }>;
}

export const SECURITY_AUDITOR_ID = 'security-auditor';

export const SECRET_PATTERNS: Array<{ name: string; re: RegExp; action?: string }> = [
  { name: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/g, action: 'REDACT_EXPOSED_SECRET' },
  { name: 'api-key-sk', re: /\bsk-[A-Za-z0-9]{20,}\b/g, action: 'REDACT_EXPOSED_SECRET' },
  { name: 'private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, action: 'ROTATE_SECRET' },
  { name: 'password-assignment', re: /password\s*[:=]\s*['"][^'"]{6,}['"]/gi, action: 'REDACT_EXPOSED_SECRET' },
];

function redact(match: string): string {
  return `${match.slice(0, 4)}… (${match.length} caracteres)`;
}

export const securityAuditor: Auditor<SecurityAuditInput> = {
  id: SECURITY_AUDITOR_ID,
  category: 'security',
  detect(input, now) {
    const observedAt = now.toISOString();
    const drafts: FindingDraft[] = [];

    for (const item of input.items ?? []) {
      for (const pattern of SECRET_PATTERNS) {
        for (const match of Array.from(item.content.matchAll(pattern.re))) {
          const idx = match.index ?? 0;
          const line = item.content.slice(0, idx).split('\n').length;
          drafts.push({
            category: 'security',
            severity: 'critica',
            origin: SECURITY_AUDITOR_ID,
            evidence: [
              {
                source: SECURITY_AUDITOR_ID,
                reference: `${item.location}:${line}`,
                observation: `padrão "${pattern.name}" encontrado (${redact(match[0])})`,
                expectation: 'nenhum segredo em texto/código armazenado',
                difference: 'segredo presente em claro',
                observedAt,
              },
            ],
            context: { pattern: pattern.name, location: item.location, line },
            impact: 'Quem tiver acesso ao texto passa a ter a credencial; vazamento é irreversível sem rotação.',
            confidence: pattern.name === 'password-assignment' ? 0.7 : 0.9,
            hypothesis: 'Credencial colada em arquivo/texto em vez de variável de ambiente ou cofre.',
            suggestedActionKey: pattern.action,
            remediationInput: { location: item.location, pattern: pattern.name, fingerprint: fingerprint(match[0]) },
            dedupeKey: `security:secret:${pattern.name}:${item.location}:${fingerprint(match[0])}`,
          });
        }
      }
    }

    for (const entry of input.config ?? []) {
      const key = entry.key.toLowerCase();
      const value = entry.value.trim().toLowerCase();
      const prod = (entry.environment ?? '').toLowerCase() === 'production';
      let problem: { rule: string; expectation: string } | undefined;
      if (prod && key === 'debug' && value === 'true') problem = { rule: 'debug-em-producao', expectation: 'debug desligado em produção' };
      else if (/cors.*origin/.test(key) && value === '*') problem = { rule: 'cors-aberto', expectation: 'origens explícitas' };
      else if (/(tls|ssl).*verify/.test(key) && value === 'false') problem = { rule: 'verificacao-tls-desligada', expectation: 'verificação de certificado ligada' };
      if (!problem) continue;
      drafts.push({
        category: 'security',
        severity: 'alta',
        origin: SECURITY_AUDITOR_ID,
        evidence: [
          {
            source: SECURITY_AUDITOR_ID,
            reference: `${entry.location}#${entry.key}`,
            observation: `${entry.key}=${entry.value}${entry.environment ? ` (${entry.environment})` : ''}`,
            expectation: problem.expectation,
            difference: 'configuração insegura ativa',
            observedAt,
          },
        ],
        context: { rule: problem.rule },
        impact: 'Amplia a superfície de ataque do ambiente afetado.',
        confidence: 0.85,
        hypothesis: 'Configuração de desenvolvimento promovida sem revisão.',
        dedupeKey: `security:config:${problem.rule}:${entry.location}#${entry.key}`,
      });
    }

    return drafts;
  },
};
