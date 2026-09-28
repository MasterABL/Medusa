/**
 * Etapas OBSERVE → DETECT → dedupe: coleta de cada fonte, validação de evidência
 * e junção com o que já é conhecido (deduplicação e regressão).
 */

import type { Finding, FindingDraft } from '../model/types';
import { GuardianValidationError, validateDraft } from '../model/validators';
import { emit, publishFindingEvent, saveFinding } from './context';
import type { CycleRuntime } from './context';

const CLOSED = new Set<Finding['status']>(['resolved', 'dismissed']);

export interface ObservationResult {
  /** auditor que rodou com sucesso → dedupeKeys que ele observou neste ciclo. */
  observedByAuditor: Map<string, Set<string>>;
  drafts: FindingDraft[];
}

export async function observeAndDetect(rt: CycleRuntime): Promise<ObservationResult> {
  const observedByAuditor = new Map<string, Set<string>>();
  const drafts: FindingDraft[] = [];

  for (const source of rt.sources) {
    const auditorId = source.auditor.id;
    try {
      const input = await source.collect();
      const found = (source.auditor.detect as (input: unknown, now: Date) => FindingDraft[])(input, rt.now);
      const keys = new Set<string>();
      for (const draft of found) {
        try {
          validateDraft(draft);
        } catch (e) {
          if (!(e instanceof GuardianValidationError)) throw e;
          emit(rt, 'AUDITOR_FAILED', `${auditorId}: rascunho rejeitado — ${e.message}`);
          rt.report.auditorFailures.push({ auditor: auditorId, error: e.message });
          continue;
        }
        keys.add(draft.dedupeKey);
        drafts.push(draft);
      }
      observedByAuditor.set(auditorId, keys);
      rt.report.auditorsRun.push(auditorId);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      rt.report.auditorFailures.push({ auditor: auditorId, error });
      emit(rt, 'AUDITOR_FAILED', `${auditorId} falhou: ${error}`);
    }
  }
  rt.report.observed = drafts.length;
  return { observedByAuditor, drafts };
}

export function ingestDrafts(rt: CycleRuntime, drafts: FindingDraft[]): void {
  for (const draft of drafts) {
    const known = rt.repo.findByDedupeKey(draft.dedupeKey);
    const open = known.find((f) => !CLOSED.has(f.status));

    if (open) {
      saveFinding(rt, open, { occurrences: open.occurrences + 1, lastSeenAt: rt.now.toISOString(), evidence: draft.evidence });
      rt.report.deduped += 1;
      emit(rt, 'FINDING_DEDUPED', `Mesmo problema observado de novo (${open.occurrences + 1}ª vez).`, { findingId: open.id });
      continue;
    }

    const previous = known.filter((f) => f.status === 'resolved').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const at = rt.now.toISOString();
    const finding: Finding = {
      id: rt.repo.nextId('finding'),
      category: draft.category,
      severity: draft.severity,
      origin: draft.origin,
      evidence: draft.evidence,
      context: draft.context,
      impact: draft.impact,
      confidence: draft.confidence,
      hypothesis: draft.hypothesis,
      suggestedActionKey: draft.suggestedActionKey,
      remediationInput: draft.remediationInput,
      status: 'detected',
      createdAt: at,
      updatedAt: at,
      lastSeenAt: at,
      occurrences: 1,
      dedupeKey: draft.dedupeKey,
      correlationId: previous?.correlationId ?? rt.repo.nextId('corr'),
      regressionOf: previous?.id,
    };
    rt.repo.saveFinding(finding);
    if (previous) {
      rt.report.reopened += 1;
      emit(rt, 'FINDING_REOPENED', `Problema já resolvido voltou a aparecer (regressão de ${previous.id}).`, { findingId: finding.id });
    } else {
      rt.report.newFindings += 1;
      emit(rt, 'FINDING_DETECTED', `${draft.category}/${draft.severity}: ${draft.evidence[0].observation}`, { findingId: finding.id });
    }
    publishFindingEvent('GUARDIAN_FINDING_DETECTED', finding);
  }
}

/** Um problema que o auditor (que rodou OK) não observa mais deixou de existir — resolvido sem atribuir a correção ao Guardian. */
export function resolveNoLongerObserved(rt: CycleRuntime, observedByAuditor: Map<string, Set<string>>): void {
  for (const finding of rt.repo.listFindings()) {
    if (!['detected', 'blocked', 'failed', 'unverified'].includes(finding.status)) continue;
    const seen = observedByAuditor.get(finding.origin);
    if (!seen || seen.has(finding.dedupeKey)) continue;
    const updated = saveFinding(rt, finding, {
      status: 'resolved',
      outcome: { status: 'no_longer_observed', reason: 'O auditor rodou e o problema não foi mais observado.', decidedAt: rt.now.toISOString() },
    });
    rt.report.noLongerObserved += 1;
    emit(rt, 'FINDING_NO_LONGER_OBSERVED', 'Problema deixou de ser observado.', { findingId: updated.id });
    publishFindingEvent('GUARDIAN_FINDING_RESOLVED', updated);
  }
}
