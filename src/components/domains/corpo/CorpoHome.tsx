'use client';

import React, { useMemo, useState } from 'react';
import { BodyApi, RoutineLoadHeuristic, getActivity } from '@/domains/body';
import type { BodyPlan, BodyProfile } from '@/domains/body';
import { Disclosure } from '../shared/Disclosure';
import { DemoBadge } from '../shared/DemoBadge';
import { DomainHeader } from '../shared/DomainHeader';
import { PendingApprovals } from '../shared/PendingApprovals';
import { isoDay } from '../shared/format';
import { WEEKDAY_LONG, WEEKDAY_SHORT, label } from './bodyLabels';
import {
  PLAN_ID,
  PROFILE_ID,
  corpoUi,
  executeApprovedBodyAction,
  getBodyRepository,
  proposeLightActivity,
  proposeSessionToAgenda,
  useCorpoState,
} from './bodySession';
import type { AgendaOutcome } from './bodySession';

export interface CorpoView {
  profile: BodyProfile;
  plan: BodyPlan;
  todayIdx: number;
  isSessionDay: boolean;
  nextIdx: number;
  nextOffset: number;
  nextDate: string;
}

export function buildCorpoView(): CorpoView | null {
  const repo = getBodyRepository();
  const profile = BodyApi.getProfile(repo, PROFILE_ID);
  const plan = BodyApi.getPlan(repo, PLAN_ID);
  if (!profile || !plan || plan.sessions.length === 0) return null;
  const now = new Date();
  const todayIdx = now.getDay();
  const days = plan.sessions[0].preferredDays;
  let nextOffset = 0;
  while (nextOffset < 7 && !days.includes((todayIdx + nextOffset) % 7)) nextOffset += 1;
  const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + nextOffset);
  return { profile, plan, todayIdx, isSessionDay: nextOffset === 0, nextIdx: (todayIdx + nextOffset) % 7, nextOffset, nextDate: isoDay(nextDate) };
}

/** Onda de ritmo: puramente ambiente (aria-hidden) — não representa nenhuma medição. */
function RhythmWave() {
  return (
    <svg className="cor-wave" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 30 C 50 4, 100 56, 150 30 S 250 4, 300 30 S 400 56, 450 30 S 550 4, 600 30" />
      <path d="M0 30 C 50 12, 100 48, 150 30 S 250 12, 300 30 S 400 48, 450 30 S 550 12, 600 30" data-soft="true" />
    </svg>
  );
}

function DayAdjust({ view, onLight }: { view: CorpoView; onLight: (reason: string) => void }) {
  const [work, setWork] = useState('');
  const [study, setStudy] = useState('');
  const [commute, setCommute] = useState(view.profile.commuteMinutes ? String(view.profile.commuteMinutes.value) : '');
  const [ran, setRan] = useState(false);
  const session = view.plan.sessions[0];
  const input = {
    workMinutes: Number(work || 0) * 60,
    studyMinutes: Number(study || 0) * 60,
    commuteMinutes: Number(commute || 0),
    plannedActivityMinutes: view.isSessionDay ? session.durationMinutes : 0,
    sleepQuality: view.profile.sleepQuality?.value,
    energyLevel: view.profile.energyLevel?.value,
  };
  const load = useMemo(() => (ran ? RoutineLoadHeuristic.computeRoutineLoad(input) : null), [ran, work, study, commute]); // eslint-disable-line react-hooks/exhaustive-deps
  const insights = useMemo(
    () => (ran ? BodyApi.getInsights(getBodyRepository(), input, undefined, new Date().toISOString()).filter((i) => i.type !== 'insufficient_evidence') : []),
    [ran, work, study, commute] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const reset = () => setRan(false);

  return (
    <div className="cor-adjust">
      <p className="dm-muted text-[13px]">Diga como o dia de hoje está. Eu só organizo a carga — não avalio seu corpo.</p>
      <div className="cor-adjust-row">
        <label>Trabalho (horas)<input className="dm-field" type="number" min={0} max={24} inputMode="decimal" value={work} onChange={(e) => { setWork(e.target.value); reset(); }} /></label>
        <label>Estudo (horas)<input className="dm-field" type="number" min={0} max={24} inputMode="decimal" value={study} onChange={(e) => { setStudy(e.target.value); reset(); }} /></label>
        <label>Deslocamento (min)<input className="dm-field" type="number" min={0} inputMode="numeric" value={commute} onChange={(e) => { setCommute(e.target.value); reset(); }} /></label>
      </div>
      <button type="button" className="dm-btn" data-size="sm" onClick={() => setRan(true)}>Avaliar a carga de hoje</button>
      {load && (
        <div className="cor-load" role="status">
          <p>
            <span className="dm-chip" data-tone={load.level === 'alta' ? 'accent' : load.level === 'moderada' ? undefined : 'support'}>Carga {load.level}</span>
          </p>
          <ul className="fin-evidence">{load.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          {insights.filter((i) => i.type === 'recovery_suggested').map((i) => (
            <div key={i.id} className="cor-care">
              <p>{i.observation}</p>
              <button type="button" className="dm-btn" data-size="sm" data-variant="primary" onClick={() => onLight('carga alta hoje')}>Propor versão leve</button>
            </div>
          ))}
          {load.level !== 'alta' && <p className="dm-muted text-[13px]">Nada a ajustar por enquanto: o plano de hoje cabe na sua rotina.</p>}
        </div>
      )}
    </div>
  );
}

export function CorpoHome({ onRedo }: { onRedo: () => void }) {
  const { version, agendaRequests } = useCorpoState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => buildCorpoView(), [version]);
  const [outcome, setOutcome] = useState<AgendaOutcome | null>(null);

  if (!view) return null;
  const session = view.plan.sessions[0];
  const act = getActivity(session.activityId)!;
  const p = view.profile;

  const title = view.isSessionDay ? (
    <>Hoje é dia de <span className="dm-accent-text">{act.label.toLowerCase()}</span> — {session.durationMinutes} min.</>
  ) : (
    <>Hoje é dia de descanso. A próxima atividade é {view.nextOffset === 1 ? 'amanhã' : `na ${WEEKDAY_LONG[view.nextIdx]}`}.</>
  );

  return (
    <div className="dm-root cor-root" data-domain="corpo">
      <DomainHeader
        eyebrow="Corpo · movimento e rotina"
        title={title}
        subtitle={view.isSessionDay ? `${act.recoveryExpectation}` : 'Descansar também faz parte do plano. O ritmo é o que se sustenta, não o que se cobra.'}
        aside={
          <button type="button" className="dm-btn" data-variant="quiet" data-size="sm" onClick={onRedo}>
            <span className="material-symbols-outlined" aria-hidden="true">replay</span>
            Refazer diagnóstico
          </button>
        }
      />

      <section className="cor-tiles dm-rise" aria-label="Estado atual">
        <div className="dm-card cor-tile">
          <p className="dm-eyebrow">Como estou</p>
          <p className="cor-tile-value">{p.energyLevel ? `Energia ${label(p.energyLevel.value).toLowerCase()}` : 'Sem relato'}</p>
          <p className="dm-faint text-[12px]">{p.energyLevel ? 'relatado por você no diagnóstico' : 'responda no diagnóstico'}</p>
        </div>
        <div className="dm-card cor-tile">
          <p className="dm-eyebrow">Próxima atividade</p>
          <p className="cor-tile-value">{view.isSessionDay ? 'Hoje' : view.nextOffset === 1 ? 'Amanhã' : WEEKDAY_SHORT[view.nextIdx]}</p>
          <p className="dm-faint text-[12px]">{act.label} · {session.durationMinutes} min</p>
        </div>
        <div className="dm-card cor-tile">
          <p className="dm-eyebrow">Recuperação</p>
          <p className="cor-tile-value">{p.recoveryQuality ? label(p.recoveryQuality.value) : 'Sem relato'}</p>
          <p className="dm-faint text-[12px]">{p.sleepQuality ? `sono ${label(p.sleepQuality.value).toLowerCase()} · ` : ''}relatado por você</p>
        </div>
        <div className="dm-card cor-tile">
          <p className="dm-eyebrow">Ritmo semanal</p>
          <p className="cor-tile-value">{view.plan.frequencyPerWeek}x por semana</p>
          <p className="dm-faint text-[12px]">plano {view.plan.status === 'active' ? 'ativo' : view.plan.status === 'paused' ? 'em pausa' : 'em rascunho'}</p>
        </div>
      </section>

      <PendingApprovals domain="body" version={version} execute={executeApprovedBodyAction} onChanged={() => corpoUi.set((s) => ({ version: s.version + 1 }))} />

      <section className="dm-card dm-card-pad cor-session dm-rise" style={{ ['--i' as string]: 1 }} aria-label="Atividade sugerida">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="dm-eyebrow">{view.isSessionDay ? 'Sugerida para hoje' : 'Próxima sessão'}</p>
            <h2 className="cor-session-title">{act.label}</h2>
          </div>
          <span className="dm-chip" data-tone="primary"><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>timer</span>{session.durationMinutes} min</span>
        </div>
        <RhythmWave />
        <ul className="cor-facts">
          <li><span className="dm-faint">Intensidade</span>{label(session.intensity)}</li>
          <li><span className="dm-faint">Onde</span>{label(act.environment)}</li>
          <li><span className="dm-faint">Equipamento</span>{act.equipment.length ? act.equipment.map(label).join(', ') : 'Nenhum'}</li>
          {session.preferredWindowLabel && <li><span className="dm-faint">Janela preferida</span>{label(session.preferredWindowLabel)}</li>}
        </ul>
        {outcome ? (
          <p className="fin-outcome" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">{outcome.route === 'automatica' ? 'check_circle' : 'hourglass_top'}</span>
            <span>
              {outcome.route === 'automatica' ? (
                <>Pedido pronto para a Agenda: <strong>{outcome.request?.title}</strong>, {outcome.request?.durationMinutes} min em {outcome.request?.date.split('-').reverse().slice(0, 2).join('/')}. A Agenda escolhe o horário.</>
              ) : (
                <>Pedido <strong>aguardando sua aprovação</strong> acima em “Aguardando sua decisão”. Só depois ele segue para a Agenda.</>
              )}
            </span>
          </p>
        ) : (
          <div className="cor-actions">
            <button type="button" className="dm-btn" data-variant="primary" onClick={() => setOutcome(proposeSessionToAgenda(view.nextDate))}>
              <span className="material-symbols-outlined" aria-hidden="true">event_available</span>
              Propor à Agenda
            </button>
            <button type="button" className="dm-btn" onClick={() => setOutcome(proposeLightActivity(view.nextDate, 'versão leve escolhida por você'))}>Versão leve (15 min)</button>
          </div>
        )}
        <Disclosure summary={<span className="dm-btn" data-variant="quiet" data-size="sm" style={{ paddingInline: 0 }}>Ajustar ao meu dia de hoje</span>} chevron={false}>
          <DayAdjust view={view} onLight={(reason) => setOutcome(proposeLightActivity(view.nextDate, reason))} />
        </Disclosure>
      </section>

      <div className="fin-cols">
        <section className="dm-card dm-card-pad dm-rise" style={{ ['--i' as string]: 2 }} aria-label="Sua semana">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="dm-h2">Distribuição e constância</h2>
            <span className="dm-muted text-[13px]">{view.plan.frequencyPerWeek} sessões</span>
          </div>
          <div className="cor-weekgrid" role="list">
            {WEEKDAY_SHORT.map((d, i) => {
              const on = session.preferredDays.includes(i);
              return (
                <div key={d} role="listitem" className="cor-day" data-on={on} data-today={i === view.todayIdx} aria-label={`${WEEKDAY_LONG[i]}${on ? `: ${act.label}, ${session.durationMinutes} minutos` : ': descanso'}${i === view.todayIdx ? ' (hoje)' : ''}`}>
                  <b>{d}</b>
                  <span>{on ? `${session.durationMinutes} min` : 'folga'}</span>
                </div>
              );
            })}
          </div>
          <p className="dm-faint text-[12px] mt-3">Dias distribuídos pelo planejador para haver descanso entre sessões. O registro do que você concluiu ainda não existe — por isso não há “sequência” aqui.</p>
        </section>

        <section className="dm-card dm-card-pad dm-rise" style={{ ['--i' as string]: 3 }} aria-label="Conectado à sua agenda">
          <h2 className="dm-h2">Conectado à sua agenda</h2>
          {agendaRequests.length === 0 ? (
            <p className="dm-muted text-[13px] mt-3">Nenhum pedido enviado ainda. Ao propor uma sessão, ela aparece aqui pronta para a Agenda — quem escolhe o horário é a Agenda, nunca o Corpo.</p>
          ) : (
            <ul className="fin-subs">
              {agendaRequests.map((r, i) => (
                <li key={i}>
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <span className="dm-faint text-[12px]">{r.durationMinutes} min</span>
                  <span className="dm-num">{r.date.split('-').reverse().slice(0, 2).join('/')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="dm-card dm-card-pad dm-rise" style={{ ['--i' as string]: 4 }} aria-label="O que você me disse">
        <Disclosure summary={<span className="dm-h2">O que você me disse</span>}>
          <dl className="cor-profile" style={{ marginTop: 12 }}>
            <div><dt>Você quer</dt><dd>{p.objectives.value.map(label).join(', ')}</dd></div>
            <div><dt>Seu dia</dt><dd>{p.routineSummary.value}</dd></div>
            <div><dt>Cabe em</dt><dd>{p.availabilityWindows.value.map(label).join(', ')}</dd></div>
            {p.limitations.value.length > 0 && <div><dt>Respeitar</dt><dd>{p.limitations.value.map(label).join(', ')}</dd></div>}
          </dl>
          <div style={{ marginTop: 12 }}><DemoBadge label="Autorrelato" hint="Todos estes campos vêm do que você respondeu — nada foi medido nem inferido." /></div>
        </Disclosure>
      </section>
    </div>
  );
}
