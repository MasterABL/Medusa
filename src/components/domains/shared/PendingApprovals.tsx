'use client';

import React, { useMemo, useState } from 'react';
import { getAction } from '@/foundation/actionBus';
import { GuardianApproval } from '@/foundation/guardian';
import type { Action } from '@/foundation/types/action';
import type { DomainId } from '@/foundation/types/domain';
import { approveAndRun, rejectPending } from './runtime';

interface Notice {
  id: string;
  tone: 'ok' | 'warn' | 'info';
  text: string;
}

interface PendingApprovalsProps {
  /** Quais domínios listar (um ou vários). */
  domain: DomainId | DomainId[];
  /** Roda o executor REAL do domínio depois da aprovação humana. Se lançar, a Action fecha como FAILED. */
  execute: (action: Action) => void;
  /** Relê o domínio depois de uma decisão. */
  onChanged?: () => void;
  /** Muda quando algo novo pode ter entrado na fila (ex.: versão do repositório). */
  version?: number;
  heading?: string;
}

/**
 * Pedidos que o Guardian deixou nas mãos da pessoa. O botão "Aprovar" é o ato humano: ele percorre a
 * máquina de estados real e só mostra "executado" se o executor do domínio realmente terminou sem erro.
 */
export function PendingApprovals({ domain, execute, onChanged, version = 0, heading = 'Aguardando sua decisão' }: PendingApprovalsProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tick, setTick] = useState(0);
  const pending = useMemo(
    () => {
      const wanted = Array.isArray(domain) ? domain : [domain];
      return GuardianApproval.listApprovalRequests({ status: 'pending' }).filter((r) => wanted.includes(r.domain));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Array.isArray(domain) ? domain.join(',') : domain, version, tick]
  );

  const push = (n: Notice) => setNotices((prev) => [n, ...prev].slice(0, 3));
  const done = () => {
    setTick((t) => t + 1);
    onChanged?.();
  };

  const approve = (actionId: string, requestId: string) => {
    const action = getAction(actionId);
    if (!action) return;
    try {
      approveAndRun(actionId, () => execute(action));
      push({ id: requestId, tone: 'ok', text: `Aprovado e executado: ${action.intent}` });
    } catch (error) {
      push({
        id: requestId,
        tone: 'warn',
        text: `Aprovado, mas não executado — ${error instanceof Error ? error.message : 'falha desconhecida'}`,
      });
    }
    done();
  };

  const reject = (actionId: string, requestId: string) => {
    const action = getAction(actionId);
    try {
      rejectPending(actionId);
      push({ id: requestId, tone: 'info', text: `Recusado: ${action?.intent ?? actionId}. Nada foi executado.` });
    } catch (error) {
      push({ id: requestId, tone: 'warn', text: error instanceof Error ? error.message : 'Não foi possível recusar.' });
    }
    done();
  };

  if (pending.length === 0 && notices.length === 0) return null;

  return (
    <section className="dm-card dm-card-pad dm-approvals" aria-label={heading}>
      {pending.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined dm-accent-text" aria-hidden="true" style={{ fontSize: 20 }}>
              how_to_reg
            </span>
            <h2 className="dm-h2">{heading}</h2>
            <span className="dm-chip" data-tone="accent">
              {pending.length}
            </span>
          </div>
          <ul className="dm-approval-list">
            {pending.map((request) => {
              const action = getAction(request.actionId);
              return (
                <li key={request.id} className="dm-approval-item">
                  <div className="min-w-0">
                    <p className="dm-approval-intent">{action?.intent ?? request.actionId}</p>
                    <p className="dm-muted text-[13px] leading-snug">{request.reason}</p>
                    <p className="dm-faint text-[12px] leading-snug">Impacto: {request.impact}</p>
                    {action && !action.reversible && <p className="dm-alert-text text-[12px] font-semibold mt-1">Não é reversível.</p>}
                  </div>
                  <div className="dm-approval-actions">
                    <button type="button" className="dm-btn" data-size="sm" onClick={() => reject(request.actionId, request.id)}>
                      Recusar
                    </button>
                    <button type="button" className="dm-btn" data-size="sm" data-variant="primary" onClick={() => approve(request.actionId, request.id)}>
                      Aprovar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {notices.length > 0 && (
        <ul className="dm-notices" aria-live="polite">
          {notices.map((n, i) => (
            <li key={`${n.id}-${i}`} className="dm-notice" data-tone={n.tone}>
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>
                {n.tone === 'ok' ? 'check_circle' : n.tone === 'warn' ? 'info' : 'do_not_disturb_on'}
              </span>
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
