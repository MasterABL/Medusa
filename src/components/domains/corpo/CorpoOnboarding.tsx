'use client';

import React, { useMemo, useState } from 'react';
import type { BodyDiagnosticQuestion, BodyProfile } from '@/domains/body';
import { getActivity } from '@/domains/body';
import { label, STAGES, WEEKDAY_SHORT } from './bodyLabels';
import {
  QUESTIONS_BY_SECTION,
  SECTION_TITLE,
  acceptAndActivate,
  buildProfile,
  loadStoredAnswers,
  proposePlan,
} from './bodySession';
import type { ActivationResult, AnswerMap, PlanProposal } from './bodySession';

type Step = { kind: 'intro' } | { kind: 'section'; index: number } | { kind: 'profile' } | { kind: 'plan' };

/** Trilha de 4 estágios (BodyPlanStage). O estágio ativo respira; os anteriores ficam preenchidos. */
function Stepper({ stage }: { stage: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="cor-stepper" aria-label="Etapas">
      {STAGES.map((s, i) => (
        <li key={s.key} data-state={i < stage ? 'done' : i === stage ? 'now' : 'todo'} aria-current={i === stage ? 'step' : undefined}>
          <span className="cor-step-dot" aria-hidden="true">{i < stage ? <span className="material-symbols-outlined">check</span> : i + 1}</span>
          <span className="cor-step-name">{s.name}</span>
        </li>
      ))}
    </ol>
  );
}

function Field({ q, value, onChange }: { q: BodyDiagnosticQuestion; value: AnswerMap[string] | undefined; onChange: (v: AnswerMap[string]) => void }) {
  const id = `q-${q.id}`;
  return (
    <fieldset className="cor-question">
      <legend id={`${id}-l`} className="cor-q-prompt">{q.prompt}</legend>
      {(q.type === 'single' || q.type === 'multi') && q.options && (
        <div className="cor-options" role={q.type === 'single' ? 'radiogroup' : 'group'} aria-labelledby={`${id}-l`}>
          {q.options.map((opt) => {
            const selected = q.type === 'multi' ? Array.isArray(value) && value.includes(opt) : value === opt;
            return (
              <button
                key={opt}
                type="button"
                role={q.type === 'single' ? 'radio' : 'checkbox'}
                aria-checked={selected}
                className="cor-option"
                data-selected={selected}
                onClick={() => {
                  if (q.type === 'single') onChange(opt);
                  else {
                    const cur = Array.isArray(value) ? value : [];
                    onChange(cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt]);
                  }
                }}
              >
                {selected && <span className="material-symbols-outlined" aria-hidden="true">check</span>}
                {label(opt)}
              </button>
            );
          })}
        </div>
      )}
      {q.type === 'multi' && q.allowCustom && (
        <input
          className="dm-field cor-custom"
          aria-label={`Outro (${q.prompt})`}
          placeholder="Algo mais? Escreva e tecle Enter"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const text = (e.target as HTMLInputElement).value.trim();
            if (!text) return;
            const cur = Array.isArray(value) ? value : [];
            if (!cur.includes(text)) onChange([...cur, text]);
            (e.target as HTMLInputElement).value = '';
          }}
        />
      )}
      {q.type === 'multi' && Array.isArray(value) && value.filter((v) => !q.options?.includes(v)).length > 0 && (
        <div className="cor-options">
          {value.filter((v) => !q.options?.includes(v)).map((v) => (
            <button key={v} type="button" className="cor-option" data-selected="true" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remover ${v}`}>
              {v}
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          ))}
        </div>
      )}
      {q.type === 'free_text' && (
        <textarea id={id} className="dm-field" rows={3} aria-labelledby={`${id}-l`} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder="Ex.: trabalho de manhã, estudo à noite, ônibus por 1 hora" />
      )}
      {q.type === 'duration' && (
        <div className="cor-inline">
          <input id={id} className="dm-field cor-num" type="number" min={0} inputMode="numeric" aria-labelledby={`${id}-l`} value={typeof value === 'number' ? value : ''} onChange={(e) => onChange(e.target.value === '' ? (undefined as unknown as number) : Number(e.target.value))} />
          <span className="dm-muted">minutos por dia</span>
        </div>
      )}
      {q.type === 'scale' && (
        <div className="cor-scale" role="radiogroup" aria-labelledby={`${id}-l`}>
          {Array.from({ length: (q.validation?.scaleMax ?? 7) - (q.validation?.scaleMin ?? 0) + 1 }, (_, i) => (q.validation?.scaleMin ?? 0) + i).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={value === n} className="cor-scale-btn" data-selected={value === n} onClick={() => onChange(n)}>
              {n}
            </button>
          ))}
          <span className="dm-faint text-[12px] w-full">vezes por semana, de forma realista</span>
        </div>
      )}
    </fieldset>
  );
}

function isAnswered(q: BodyDiagnosticQuestion, v: AnswerMap[string] | undefined): boolean {
  if (v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.length >= (q.validation?.minSelected ?? (q.validation?.required ? 1 : 0)) && (q.validation?.required ? v.length > 0 : true);
  if (typeof v === 'string') return v.trim().length > 0;
  return Number.isFinite(v);
}

/**
 * Entrada do Corpo — "entender": uma pergunta de cada vez sobre o dia, nunca sobre o corpo como
 * problema. Trilha em 4 estágios (Entender → Perfil → Plano → Ativação) que espelha BodyPlanStage.
 * Nada é gravado antes de a pessoa aceitar o plano; o Guardian decide o que exige aprovação.
 */
export function CorpoOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'intro' });
  const [answers, setAnswers] = useState<AnswerMap>(() => loadStoredAnswers());
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const section = step.kind === 'section' ? QUESTIONS_BY_SECTION[step.index] : null;
  const requiredOk = useMemo(() => (section ? section.questions.filter((q) => q.validation?.required || q.type === 'single').every((q) => isAnswered(q, answers[q.id])) : true), [section, answers]);

  const stage: 0 | 1 | 2 | 3 = step.kind === 'profile' ? 1 : step.kind === 'plan' ? (result?.plan ? 3 : 2) : 0;

  const goNext = () => {
    setError(null);
    if (step.kind === 'intro') return setStep({ kind: 'section', index: 0 });
    if (step.kind === 'section') {
      if (step.index < QUESTIONS_BY_SECTION.length - 1) return setStep({ kind: 'section', index: step.index + 1 });
      try {
        setProfile(buildProfile(answers));
        setStep({ kind: 'profile' });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível montar o perfil.');
      }
      return;
    }
    if (step.kind === 'profile' && profile) {
      try {
        setProposal(proposePlan(profile));
        setStep({ kind: 'plan' });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível montar o plano.');
      }
    }
  };

  const goBack = () => {
    setError(null);
    if (step.kind === 'section') return setStep(step.index === 0 ? { kind: 'intro' } : { kind: 'section', index: step.index - 1 });
    if (step.kind === 'profile') return setStep({ kind: 'section', index: QUESTIONS_BY_SECTION.length - 1 });
  };

  if (step.kind === 'intro') {
    return (
      <div className="dm-root cor-root cor-intro" data-domain="corpo">
        <div className="cor-breath" aria-hidden="true"><span /><span /><span /></div>
        <div className="cor-intro-copy">
          <p className="dm-eyebrow dm-rise" style={{ ['--i' as string]: 0 }}>Corpo · movimento e rotina</p>
          <h1 className="dm-title dm-rise" style={{ ['--i' as string]: 1 }}>Vamos começar pelo seu dia, não por um treino.</h1>
          <p className="dm-subtitle dm-rise" style={{ ['--i' as string]: 2 }}>
            Algumas perguntas curtas sobre rotina, energia e o que já cabe no seu tempo. Com elas eu monto um plano enxuto — e você decide se aceita.
          </p>
          <p className="dm-faint text-[13px] dm-rise" style={{ ['--i' as string]: 3 }}>Isto organiza atividade e rotina. Não é avaliação médica nem diagnóstico.</p>
          <div className="fin-intro-foot dm-rise" style={{ ['--i' as string]: 4 }}>
            <button type="button" className="dm-btn" data-variant="primary" onClick={goNext} autoFocus>
              Começar
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </button>
            <span className="dm-faint text-[13px]">{QUESTIONS_BY_SECTION.length} passos · cerca de 2 minutos</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-root cor-root" data-domain="corpo">
      <Stepper stage={stage} />

      {section && step.kind === 'section' && (
        <section key={step.index} className="cor-panel cor-slide" aria-labelledby="cor-sec-title">
          <p className="dm-eyebrow">Passo {step.index + 1} de {QUESTIONS_BY_SECTION.length}</p>
          <h2 id="cor-sec-title" className="cor-panel-title">{SECTION_TITLE[section.section]?.title}</h2>
          <p className="dm-muted text-[14px]">{SECTION_TITLE[section.section]?.hint}</p>
          <div className="cor-questions">
            {section.questions.map((q) => (
              <Field key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
            ))}
          </div>
          <div className="cor-nav">
            <button type="button" className="dm-btn" data-variant="quiet" onClick={goBack}>Voltar</button>
            <button type="button" className="dm-btn" data-variant="primary" onClick={goNext} disabled={!requiredOk}>
              {step.index === QUESTIONS_BY_SECTION.length - 1 ? 'Ver o que entendi' : 'Continuar'}
            </button>
          </div>
          {!requiredOk && <p className="dm-faint text-[12px]" role="status">Responda o que está em destaque para continuar.</p>}
          {error && <p className="dm-alert-text text-[13px]" role="alert">{error}</p>}
        </section>
      )}

      {step.kind === 'profile' && profile && (
        <section className="cor-panel cor-slide" aria-labelledby="cor-prof-title">
          <p className="dm-eyebrow">Perfil</p>
          <h2 id="cor-prof-title" className="cor-panel-title">Isto é o que eu entendi.</h2>
          <p className="dm-muted text-[14px]">Tudo abaixo veio de você — “você disse”. Se algo estiver errado, volte e ajuste.</p>
          <dl className="cor-profile">
            <div><dt>Você quer</dt><dd>{profile.objectives.value.map(label).join(', ')}</dd></div>
            <div><dt>Seu dia</dt><dd>{profile.routineSummary.value}</dd></div>
            <div><dt>Cabe em</dt><dd>{profile.availabilityWindows.value.map(label).join(', ')} · {profile.weeklyFrequency.value}x por semana</dd></div>
            <div><dt>Ponto de partida</dt><dd>{label(profile.experienceLevel.value)}{profile.location ? ` · ${label(profile.location.value)}` : ''}</dd></div>
            {profile.energyLevel && <div><dt>Energia</dt><dd>{label(profile.energyLevel.value)} · sono {profile.sleepQuality ? label(profile.sleepQuality.value).toLowerCase() : '—'} · recuperação {profile.recoveryQuality ? label(profile.recoveryQuality.value).toLowerCase() : '—'}</dd></div>}
            {profile.limitations.value.length > 0 && <div><dt>Respeitar</dt><dd>{profile.limitations.value.map(label).join(', ')}</dd></div>}
          </dl>
          <div className="cor-nav">
            <button type="button" className="dm-btn" data-variant="quiet" onClick={goBack}>Ajustar respostas</button>
            <button type="button" className="dm-btn" data-variant="primary" onClick={goNext}>Ver o plano</button>
          </div>
          {error && <p className="dm-alert-text text-[13px]" role="alert">{error}</p>}
        </section>
      )}

      {step.kind === 'plan' && proposal && (
        <section className="cor-panel cor-slide" aria-labelledby="cor-plan-title">
          <p className="dm-eyebrow">{result?.plan ? 'Ativação' : 'Plano'}</p>
          <h2 id="cor-plan-title" className="cor-panel-title">{result?.plan ? 'Seu plano está ativo.' : 'Uma proposta enxuta.'}</h2>
          {proposal.plan.sessions.map((s) => {
            const act = getActivity(s.activityId);
            return (
              <div key={s.id} className="cor-plan-card">
                <strong className="cor-plan-name">{act?.label}</strong>
                <span className="dm-muted text-[14px]">{s.durationMinutes} min · intensidade {label(s.intensity).toLowerCase()}{s.preferredWindowLabel ? ` · de preferência ${label(s.preferredWindowLabel).toLowerCase()}` : ''}</span>
                <div className="cor-week" aria-label="Dias sugeridos">
                  {WEEKDAY_SHORT.map((d, i) => (
                    <span key={d} data-on={s.preferredDays.includes(i)}>{d}</span>
                  ))}
                </div>
                {act && <p className="dm-muted text-[13px]">Recuperação: {act.recoveryExpectation}</p>}
              </div>
            );
          })}
          {proposal.plan.progressionNotes && <p className="dm-muted text-[13px]">{proposal.plan.progressionNotes}</p>}
          {proposal.plan.notes && <p className="dm-faint text-[13px]">{proposal.plan.notes}</p>}

          {!result?.plan && (
            <>
              <div className="cor-guardian-note">
                <span className="material-symbols-outlined" aria-hidden="true">shield</span>
                <span>Criar e ativar um plano passa pelo Guardian. Hoje ele pede a sua decisão — aceitar aqui é essa decisão. {proposal.createReason}</span>
              </div>
              <div className="cor-nav">
                <button type="button" className="dm-btn" data-variant="quiet" onClick={() => setStep({ kind: 'profile' })}>Voltar</button>
                <button
                  type="button"
                  className="dm-btn"
                  data-variant="primary"
                  onClick={() => {
                    const r = acceptAndActivate(proposal, answers, profile!);
                    setResult(r);
                  }}
                >
                  Aceitar plano e ativar
                </button>
              </div>
            </>
          )}

          {result && (
            <ul className="dm-notices" aria-live="polite">
              {result.steps.map((s, i) => (
                <li key={i} className="dm-notice" data-tone={s.ok ? 'ok' : 'warn'}>
                  <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>{s.ok ? 'check_circle' : 'info'}</span>
                  <span>{s.ok ? `${s.intent}: decidido por você e executado.` : `Não foi possível: ${s.error}`}</span>
                </li>
              ))}
            </ul>
          )}
          {result?.plan && (
            <div className="cor-nav">
              <span />
              <button type="button" className="dm-btn" data-variant="primary" onClick={onDone} autoFocus>
                Ir para o meu dia
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          )}
        </section>
      )}

      <p className="dm-faint text-[12px]">O plano usa só o que você respondeu. Nenhum dado de saúde ou de dispositivo está conectado.</p>
    </div>
  );
}
