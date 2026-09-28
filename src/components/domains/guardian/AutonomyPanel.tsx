'use client';

import React, { useMemo, useState } from 'react';
import { GuardianDomainApi } from '@/domains/guardian';
import type { AutonomyLevel } from '@/foundation/types/autonomy';
import { assessments, getGuardianSession, previewCeiling, useGuardianState } from './guardianSession';

const ROUTE_TEXT = { auto: 'Sozinho', approval: 'Pede sua aprovação', blocked: 'Bloqueada' } as const;

/**
 * Autonomia: o que o Guardian pode fazer sozinho hoje e por quê. "E se…" mostra a consequência de
 * mudar o teto ANTES de aplicar — nada é gravado, a política real não muda.
 */
export function AutonomyPanel() {
  const { version } = useGuardianState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => assessments(), [version]);
  const policies = useMemo(() => GuardianDomainApi.explainPolicies('guardian'), []);
  const { remediations } = getGuardianSession();
  const [what, setWhat] = useState<Record<string, AutonomyLevel | ''>>({});

  return (
    <ul className="gd-autonomy">
      {rows.map((a) => {
        const policy = policies.find((p) => p.actionType === a.actionKey);
        const choice = what[a.actionKey] || '';
        const preview = choice ? previewCeiling(a.actionKey, choice) : null;
        return (
          <li key={a.actionKey}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <strong className="gd-ref text-[13px]">{a.actionKey}</strong>
              <span className="dm-chip" data-tone={a.expectedRoute === 'auto' ? 'support' : a.expectedRoute === 'blocked' ? 'alert' : 'accent'}>{ROUTE_TEXT[a.expectedRoute]}</span>
            </div>
            <p className="dm-muted text-[13px] leading-snug">{policy?.text}</p>
            <p className="dm-faint text-[12px] leading-snug">{a.explanation}</p>
            <label className="gd-whatif">
              <span className="dm-faint text-[12px]">E se o teto fosse…</span>
              <select className="dm-field" value={choice} onChange={(e) => setWhat((w) => ({ ...w, [a.actionKey]: e.target.value as AutonomyLevel | '' }))} aria-label={`Simular teto de ${a.actionKey}`}>
                <option value="">— manter como está —</option>
                <option value="L1">L1 · pode rodar sozinha depois de ganhar confiança</option>
                <option value="L2">L2 · sempre proposta</option>
                <option value="L3">L3 · alto impacto, sempre aprovação</option>
              </select>
            </label>
            {preview && (
              <div className="fin-outcome" role="status">
                <span className="material-symbols-outlined" aria-hidden="true">preview</span>
                <span>
                  {preview.summary.join(' ')} {preview.warnings.join(' ')} <em className="dm-faint">Simulação — nada foi alterado.</em>
                </span>
              </div>
            )}
            {!remediations.has(a.actionKey) && <p className="dm-faint text-[12px]">Sem executor registrado: mesmo com autorização, nada roda.</p>}
          </li>
        );
      })}
    </ul>
  );
}
