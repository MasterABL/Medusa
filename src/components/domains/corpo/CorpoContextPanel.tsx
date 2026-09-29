'use client';

import React, { useMemo } from 'react';
import { getActivity } from '@/domains/body';
import { buildCorpoView } from './CorpoHome';
import { WEEKDAY_SHORT, label } from './bodyLabels';
import { useCorpoState } from './bodySession';

/** Context Panel do Corpo: próxima atividade, rotina, recuperação e o que já dá para dizer de progresso. */
export function CorpoContextPanel() {
  const { version } = useCorpoState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => buildCorpoView(), [version]);

  if (!view) {
    return (
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Corpo</p>
        <p className="dm-muted text-[13px] leading-snug">O painel se preenche quando o seu plano estiver ativo.</p>
      </div>
    );
  }
  const session = view.plan.sessions[0];
  const act = getActivity(session.activityId)!;
  const p = view.profile;

  return (
    <>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Próxima atividade</p>
        <strong className="text-[15px]">{act.label}</strong>
        <span className="dm-muted text-[13px]">{view.isSessionDay ? 'Hoje' : view.nextOffset === 1 ? 'Amanhã' : WEEKDAY_SHORT[view.nextIdx]} · {session.durationMinutes} min · {label(session.intensity).toLowerCase()}</span>
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Sua rotina</p>
        <p className="text-[13px] leading-snug">{p.routineSummary.value}</p>
        <p className="dm-faint text-[12px]">Janelas: {p.availabilityWindows.value.map(label).join(', ')}</p>
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Recuperação</p>
        <p className="text-[13px] leading-snug">{act.recoveryExpectation}</p>
        {p.recoveryQuality && <p className="dm-faint text-[12px]">Você relatou recuperação {label(p.recoveryQuality.value).toLowerCase()}.</p>}
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Progresso</p>
        <p className="text-[13px] leading-snug">Plano {view.plan.status === 'active' ? 'ativo' : view.plan.status} · {view.plan.frequencyPerWeek}x por semana.</p>
        <p className="dm-faint text-[12px] leading-snug">Sessões concluídas ainda não são registradas; quando forem, o progresso aparece aqui.</p>
      </div>
    </>
  );
}
