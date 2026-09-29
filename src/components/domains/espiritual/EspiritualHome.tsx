'use client';

import React, { useMemo, useState } from 'react';
import { StudyEngine, formatReference } from '@/domains/spiritual';
import type { BibleReference } from '@/domains/spiritual';
import { Disclosure } from '../shared/Disclosure';
import {
  PLAN_CATALOG,
  PRACTICE_KINDS,
  addPractice,
  addReflection,
  addStudyNote,
  buildView,
  choosePlan,
  completePractice,
  concludeStudy,
  ensureStudy,
  getData,
  markReading,
  readReflection,
  resumeReading,
  setPurpose,
  useSpiritualState,
} from './spiritualSession';
import type { PlanKey } from './spiritualSession';

const STAGE_TITLE = { observacao: 'Observar', interpretacao: 'Entender', aplicacao: 'Viver' } as const;

function StudyCard({ reference }: { reference: BibleReference }) {
  const { version } = useSpiritualState();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const study = useMemo(() => getData().studies.find((s) => formatReference(s.ref) === formatReference(reference)), [version, reference]);
  const questions = StudyEngine.studyQuestionTemplates(reference);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [conclusion, setConclusion] = useState('');
  const name = formatReference(reference, { names: true });

  return (
    <section className="esp-sanctuary-block esp-study-block dm-rise" style={{ ['--i' as string]: 4 }} aria-label="Estudo da passagem">
      <Disclosure open={open} onOpenChange={(o) => { if (o) ensureStudy(reference); setOpen(o); }} summary={<span><span className="dm-h2">Estudar {name}</span><span className="dm-muted text-[13px] block mt-1">Três perguntas, no seu tempo. O que você escrever é privado.</span></span>}>
        <div className="esp-study">
          <p className="dm-faint text-[12px]">Perguntas de um modelo fixo (observar → entender → viver). Não são geradas por IA nem vêm de uma tradição específica.</p>
          {(['observacao', 'interpretacao', 'aplicacao'] as const).map((stage) => {
            const qs = questions.filter((q) => q.stage === stage);
            const notes = study?.notes.filter((n) => n.stage === stage) ?? [];
            return (
              <div key={stage} className="esp-stage">
                <p className="dm-eyebrow">{STAGE_TITLE[stage]}</p>
                <ul className="esp-qs">{qs.map((q) => <li key={q.question}>{q.question}</li>)}</ul>
                {study?.concluded ? null : (
                  <>
                    <label className="sr-only" htmlFor={`note-${stage}`}>Sua nota — {STAGE_TITLE[stage]}</label>
                    <textarea id={`note-${stage}`} className="dm-field" rows={2} value={drafts[stage] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [stage]: e.target.value }))} placeholder="Sua nota (privada)" />
                    <div className="flex items-center gap-3">
                      <button type="button" className="dm-btn" data-size="sm" disabled={!drafts[stage]?.trim() || !study} onClick={() => { addStudyNote(study!.id, stage, drafts[stage]); setDrafts((d) => ({ ...d, [stage]: '' })); }}>Guardar nota</button>
                      {notes.length > 0 && <span className="dm-faint text-[12px]">{notes.length} nota{notes.length > 1 ? 's' : ''} sua{notes.length > 1 ? 's' : ''} · só você lê</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {study?.concluded ? (
            <p className="fin-outcome" role="status"><span className="material-symbols-outlined" aria-hidden="true">check_circle</span><span>Estudo concluído. A conclusão é sua e fica privada.</span></p>
          ) : (
            <div className="esp-stage">
              <p className="dm-eyebrow">Concluir</p>
              <textarea className="dm-field" rows={2} aria-label="Sua conclusão (privada)" value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Com as suas palavras: o que fica desta passagem?" />
              <button type="button" className="dm-btn" data-size="sm" disabled={!conclusion.trim() || !study} onClick={() => { concludeStudy(study!.id, conclusion); setConclusion(''); }}>Concluir estudo</button>
            </div>
          )}
        </div>
      </Disclosure>
    </section>
  );
}

function ReflectionCard() {
  const { version } = useSpiritualState();
  const [text, setText] = useState('');
  const [shown, setShown] = useState<Record<string, string | undefined>>({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => buildView().reflections, [version]);
  return (
    <section className="esp-sanctuary-block esp-reflection-block dm-rise" style={{ ['--i' as string]: 5 }} aria-label="Reflexão privada">
      <h2 className="dm-h2">Reflexão privada</h2>
      <p className="dm-muted text-[13px]">Escreva o que tocou sua consciência hoje, sem necessidade de formatar. Fica só neste aparelho, sem criptografia ainda, e nunca sai para outras telas.</p>
      <label className="sr-only" htmlFor="esp-refl">Reflexão</label>
      <textarea id="esp-refl" className="dm-field" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva com calma…" />
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" className="dm-btn" data-size="sm" disabled={!text.trim()} onClick={() => { addReflection(text); setText(''); }}>Guardar</button>
        <span className="dm-faint text-[12px]">{list.length === 0 ? 'Nenhuma reflexão guardada ainda.' : `${list.length} guardada${list.length > 1 ? 's' : ''}.`}</span>
      </div>
      {list.length > 0 && (
        <ul className="esp-refl-list">
          {list.map((m) => (
            <li key={m.id}>
              <span className="dm-faint text-[12px]">{new Date(m.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {m.contentLength} caracteres</span>
              {shown[m.id] === undefined ? (
                <button type="button" className="dm-btn" data-variant="quiet" data-size="sm" onClick={() => setShown((s) => ({ ...s, [m.id]: readReflection(m.id) ?? '' }))}>Reler</button>
              ) : (
                <p className="esp-refl-text">{shown[m.id]}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { AtmosphericSanctuary, type AmbientTime, type SanctuaryMode } from './AtmosphericSanctuary';

export function EspiritualHome({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { version } = useSpiritualState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(() => buildView(), [version]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v.purpose?.label ?? '');
  const [addingPractice, setAddingPractice] = useState(false);
  const [pKind, setPKind] = useState(PRACTICE_KINDS[0].kind);
  const [pWhy, setPWhy] = useState('');
  const [mode, setMode] = useState<SanctuaryMode>('proposito');
  const [ambientTime, setAmbientTime] = useState<AmbientTime>('auto');

  const entry = v.reading?.todayEntry ?? v.reading?.nextEntry;
  const ref = entry?.references[0];
  const behind = v.reading && ['ficou_para_tras', 'retomada_sugerida'].includes(v.reading.status);

  return (
    <div className="dm-root esp-root" data-domain="espiritual" data-sanctuary-mode={mode}>
      <AtmosphericSanctuary
        mode={mode}
        onModeChange={(m) => setMode(m)}
        ambientTime={ambientTime}
        onAmbientTimeChange={(t) => setAmbientTime(t)}
      />

      <header className="esp-head esp-sanctuary-altar">
        <p className="dm-eyebrow">Espiritual · presença e propósito</p>
        {v.purpose ? (
          <>
            <p className="dm-eyebrow esp-focus-label">Propósito em foco</p>
            {editing ? (
              <form className="esp-edit" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setPurpose(draft, v.purpose?.description); setEditing(false); } }}>
                <label className="sr-only" htmlFor="esp-edit">Propósito</label>
                <textarea id="esp-edit" className="dm-field esp-purpose-input" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                <div className="esp-actions"><button type="submit" className="dm-btn" data-variant="primary" data-size="sm">Salvar</button><button type="button" className="dm-btn" data-variant="quiet" data-size="sm" onClick={() => setEditing(false)}>Cancelar</button></div>
              </form>
            ) : (
              <h1 className="esp-purpose" style={{ viewTransitionName: 'dm-purpose' }}>“{v.purpose.label}”</h1>
            )}
            {v.purposeC && <p className="dm-subtitle">{v.purposeC.message}</p>}
          </>
        ) : (
          <>
            <h1 className="esp-purpose">O que importa agora?</h1>
            <p className="dm-subtitle">Ainda não há um propósito à vista. Uma frase sua já muda o que a tela sugere.</p>
            <form className="esp-edit" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setPurpose(draft); }}>
              <label className="sr-only" htmlFor="esp-new">Propósito</label>
              <textarea id="esp-new" className="dm-field esp-purpose-input" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Uma frase sua, sem pressa." />
              <div className="esp-actions"><button type="submit" className="dm-btn" data-variant="primary" data-size="sm" disabled={!draft.trim()}>Definir</button></div>
            </form>
          </>
        )}
        <div className="esp-head-actions">
          {v.purpose && !editing && <button type="button" className="dm-btn" data-size="sm" onClick={() => { setDraft(v.purpose!.label); setEditing(true); }}><span className="material-symbols-outlined" aria-hidden="true">tune</span>Reajustar intenção</button>}
          <button type="button" className="dm-btn" data-variant="quiet" data-size="sm" onClick={onReplayIntro}><span className="material-symbols-outlined" aria-hidden="true">replay</span>Rever introdução</button>
        </div>
      </header>

      <section className="esp-now dm-rise" aria-label="O que importa agora">
        <h2 className="dm-h2">Hoje, com calma</h2>
        {v.today.items.length === 0 ? (
          <p className="dm-muted text-[14px]">Nada pede você agora. Presença também é não fazer nada.</p>
        ) : (
          <ul className="esp-now-list">
            {v.today.items.map((i, k) => (
              <li key={k}>
                <span className="material-symbols-outlined" aria-hidden="true">{i.kind === 'reading' ? 'menu_book' : i.kind === 'study' ? 'school' : i.kind === 'daily_verse' ? 'format_quote' : 'self_improvement'}</span>
                <span>{i.headline}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="esp-sanctuary-grid">
        <section className="esp-sanctuary-block esp-lectern-block dm-rise" style={{ ['--i' as string]: 1 }} aria-label="Onde estou na Bíblia">
          <div className="esp-block-header">
            <span className="material-symbols-outlined esp-block-icon" aria-hidden="true">menu_book</span>
            <h2 className="dm-h2">Onde estou na Bíblia</h2>
          </div>
          {!v.reading || !v.plan ? (
            <>
              <p className="dm-muted text-[13px]">Sem plano de leitura. Escolha por onde caminhar — o plano só guarda a posição.</p>
              <div className="esp-plans">
                {(Object.keys(PLAN_CATALOG) as PlanKey[]).map((k) => (
                  <button key={k} type="button" className="esp-plan" onClick={() => choosePlan(k)}>
                    <strong>{PLAN_CATALOG[k].title}</strong>
                    <span className="dm-muted text-[13px]">{PLAN_CATALOG[k].blurb}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="dm-muted text-[13px]">{v.plan.title} · {v.reading.completedCount} de {v.reading.total} lidos</p>
              <div className="dm-bar" aria-hidden="true"><i data-tone="primary" style={{ width: `${(v.reading.completedCount / v.reading.total) * 100}%` }} /></div>
              {ref ? (
                <>
                  <p className="esp-ref">{formatReference(ref, { names: true })}</p>
                  <p className="dm-muted text-[13px] leading-snug">{v.reading.message}</p>
                  <p className="esp-textnote">
                    <span className="material-symbols-outlined" aria-hidden="true">auto_stories</span>
                    <span>O texto bíblico aparecerá aqui quando uma tradução estiver conectada. Por enquanto, abra a passagem na sua Bíblia — o Medusa guarda onde você está.</span>
                  </p>
                  <div className="esp-actions">
                    <button type="button" className="dm-btn" data-variant="primary" onClick={() => markReading(entry!.id)}>
                      <span className="material-symbols-outlined" aria-hidden="true">check</span>
                      Li {formatReference(ref, { names: true })}
                    </button>
                    {behind && <button type="button" className="dm-btn" onClick={resumeReading}>Retomar de hoje</button>}
                  </div>
                </>
              ) : (
                <p className="dm-muted text-[14px]">Plano concluído. Que caminhada.</p>
              )}
            </>
          )}
        </section>

        <section className="esp-sanctuary-block esp-practice-block dm-rise" style={{ ['--i' as string]: 2 }} aria-label="Práticas de hoje">
          <div className="esp-block-header">
            <span className="material-symbols-outlined esp-block-icon" aria-hidden="true">self_improvement</span>
            <h2 className="dm-h2">Suas práticas</h2>
          </div>
          {v.practices.length === 0 && !addingPractice && <p className="dm-muted text-[13px]">Nenhuma prática ainda. Uma pequena já basta.</p>}
          <ul className="esp-practices">
            {v.practices.map((p) => {
              const c = v.continuities.find((x) => x.definitionId === p.id);
              const done = v.doneToday.has(p.id);
              const kind = PRACTICE_KINDS.find((k) => k.kind === p.kind);
              return (
                <li key={p.id}>
                  <div className="min-w-0 flex-1">
                    <strong className="text-[14px]">{kind?.label}</strong>
                    <span className="dm-faint text-[12px]"> · {p.durationMinutes} min · {p.frequency?.timesPerWeek}x por semana</span>
                    <p className="dm-muted text-[13px] leading-snug">{done ? 'Feita hoje. Obrigado por estar presente.' : c?.message}</p>
                  </div>
                  <button type="button" className="dm-btn" data-size="sm" data-variant={done ? undefined : 'primary'} disabled={done} onClick={() => completePractice(p.id)}>{done ? 'Feita' : 'Fiz agora'}</button>
                </li>
              );
            })}
          </ul>
          {addingPractice ? (
            <form className="esp-practice-form" onSubmit={(e) => { e.preventDefault(); if (pWhy.trim()) { addPractice(pKind, pWhy, 3, 10); setAddingPractice(false); setPWhy(''); } }}>
              <select className="dm-field" value={pKind} onChange={(e) => setPKind(e.target.value as typeof pKind)} aria-label="Tipo de prática">{PRACTICE_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select>
              <input className="dm-field" value={pWhy} onChange={(e) => setPWhy(e.target.value)} placeholder="Para quê? (só você vê)" aria-label="Intenção" />
              <div className="esp-actions"><button type="submit" className="dm-btn" data-size="sm" data-variant="primary" disabled={!pWhy.trim()}>Adicionar (3x por semana, 10 min)</button><button type="button" className="dm-btn" data-size="sm" data-variant="quiet" onClick={() => setAddingPractice(false)}>Cancelar</button></div>
            </form>
          ) : (
            <button type="button" className="dm-btn" data-variant="quiet" data-size="sm" onClick={() => setAddingPractice(true)}>+ Adicionar prática</button>
          )}
          <p className="dm-faint text-[12px]">Sem pontos nem “sequência”: o ritmo é descrito, nunca cobrado. Agenda: a integração cai em “externo” — a Agenda ainda não tem um tipo Espiritual próprio.</p>
        </section>
      </div>

      {ref && <StudyCard reference={ref} />}
      <ReflectionCard />
      <p className="dm-faint text-[12px]">Nada aqui é conteúdo de exemplo: são as suas escolhas e notas, salvas só neste aparelho. Apenas o catálogo de planos e os tipos de prática vêm do produto.</p>
    </div>
  );
}
