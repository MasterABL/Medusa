/**
 * MEDUSA — Guardian — Auditores por relato (UX, Visual, Runtime, Integração)
 *
 * NÃO existe "IA visual" aqui. Estes auditores são o CONTRATO por onde uma
 * ferramenta futura (screenshot diff, axe, Lighthouse, log de runtime) entrega
 * observações. A regra é a mesma de todos: relato sem evidência é rejeitado.
 */

import type { FindingCategory, FindingDraft, FindingSeverity } from '../model/types';
import { validateEvidence } from '../model/validators';
import type { Auditor } from './types';

export interface ExternalReport {
  /** ferramenta/pessoa que observou (ex.: "axe-core", "revisão manual"). */
  source: string;
  reference: string;
  observation: string;
  expectation?: string;
  difference?: string;
  observedAt: string;
  severity: FindingSeverity;
  impact: string;
  hypothesis: string;
  confidence: number;
  dedupeKey: string;
}

export interface ReportedAuditInput {
  reports: ExternalReport[];
}

export function partitionReports(reports: ExternalReport[]): {
  accepted: ExternalReport[];
  rejected: Array<{ report: ExternalReport; reason: string }>;
} {
  const accepted: ExternalReport[] = [];
  const rejected: Array<{ report: ExternalReport; reason: string }> = [];
  for (const report of reports) {
    try {
      validateEvidence({ source: report.source, reference: report.reference, observation: report.observation, observedAt: report.observedAt });
      if (!report.impact?.trim() || !report.hypothesis?.trim() || !report.dedupeKey?.trim()) throw new Error('impact, hypothesis e dedupeKey são obrigatórios');
      if (!(report.confidence >= 0 && report.confidence <= 1)) throw new Error('confidence fora de 0-1');
      accepted.push(report);
    } catch (e) {
      rejected.push({ report, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { accepted, rejected };
}

export function createReportedAuditor(id: string, category: FindingCategory): Auditor<ReportedAuditInput> {
  return {
    id,
    category,
    detect(input) {
      return partitionReports(input.reports).accepted.map(
        (r): FindingDraft => ({
          category,
          severity: r.severity,
          origin: id,
          evidence: [{ source: r.source, reference: r.reference, observation: r.observation, expectation: r.expectation, difference: r.difference, observedAt: r.observedAt }],
          context: { reportedBy: r.source },
          impact: r.impact,
          confidence: r.confidence,
          hypothesis: r.hypothesis,
          dedupeKey: r.dedupeKey,
        })
      );
    },
  };
}

export const uxAuditor = createReportedAuditor('ux-auditor', 'ux');
export const visualAuditor = createReportedAuditor('visual-auditor', 'visual');
export const runtimeAuditor = createReportedAuditor('runtime-auditor', 'runtime');
export const integrationAuditor = createReportedAuditor('integration-auditor', 'integration');
