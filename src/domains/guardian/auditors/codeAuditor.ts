/**
 * MEDUSA — Guardian — Code Auditor
 *
 * Só olha o conteúdo que recebe: arquivo grande demais, catch vazio, ts-ignore.
 * Não tem opinião sobre estilo e nunca conserta sozinho (sem suggestedAction).
 */

import type { FindingDraft } from '../model/types';
import type { Auditor } from './types';

export interface CodeAuditInput {
  files: Array<{ path: string; content: string }>;
  maxLines?: number;
}

export const CODE_AUDITOR_ID = 'code-auditor';

export const codeAuditor: Auditor<CodeAuditInput> = {
  id: CODE_AUDITOR_ID,
  category: 'code',
  detect(input, now) {
    const observedAt = now.toISOString();
    const maxLines = input.maxLines ?? 400;
    const drafts: FindingDraft[] = [];

    for (const file of input.files) {
      const lines = file.content.split('\n');
      if (lines.length > maxLines) {
        drafts.push({
          category: 'code',
          severity: 'baixa',
          origin: CODE_AUDITOR_ID,
          evidence: [{ source: CODE_AUDITOR_ID, reference: file.path, observation: `${lines.length} linhas`, expectation: `até ${maxLines} linhas`, difference: `+${lines.length - maxLines} linhas`, observedAt }],
          context: { lines: lines.length, maxLines },
          impact: 'Arquivos muito grandes concentram responsabilidades e dificultam revisão.',
          confidence: 0.6,
          hypothesis: 'O módulo acumulou mais de uma responsabilidade.',
          dedupeKey: `code:oversized:${file.path}`,
        });
      }
      lines.forEach((line, i) => {
        if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line)) {
          drafts.push({
            category: 'code',
            severity: 'moderada',
            origin: CODE_AUDITOR_ID,
            evidence: [{ source: CODE_AUDITOR_ID, reference: `${file.path}:${i + 1}`, observation: 'bloco catch vazio', expectation: 'erro tratado, registrado ou repassado', difference: 'erro engolido em silêncio', observedAt }],
            context: {},
            impact: 'Falhas somem sem rastro e o sintoma aparece longe da causa.',
            confidence: 0.85,
            hypothesis: 'Tratamento de erro adiado e esquecido.',
            dedupeKey: `code:empty-catch:${file.path}:${i + 1}`,
          });
        }
        if (/@ts-ignore/.test(line)) {
          drafts.push({
            category: 'code',
            severity: 'baixa',
            origin: CODE_AUDITOR_ID,
            evidence: [{ source: CODE_AUDITOR_ID, reference: `${file.path}:${i + 1}`, observation: '@ts-ignore', expectation: 'tipo corrigido ou @ts-expect-error com motivo', difference: 'checagem de tipo desligada na linha', observedAt }],
            context: {},
            impact: 'Esconde erros de tipo reais dessa linha.',
            confidence: 0.7,
            hypothesis: 'Atalho para silenciar um erro de tipo.',
            dedupeKey: `code:ts-ignore:${file.path}:${i + 1}`,
          });
        }
      });
    }
    return drafts;
  },
};
