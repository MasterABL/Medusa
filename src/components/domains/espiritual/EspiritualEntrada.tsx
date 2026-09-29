'use client';

import React, { useState } from 'react';
import type { PracticeKind } from '@/domains/spiritual';
import { PLAN_CATALOG, PRACTICE_KINDS, addPractice, choosePlan, getData, setPurpose } from './spiritualSession';
import type { PlanKey } from './spiritualSession';
import { AtmosphericSanctuary } from './AtmosphericSanctuary';

type Step = 0 | 1 | 2;

/**
 * Entrada do Espiritual — "presença": uma pergunta por vez, sem cobrança e sem pressa. Tudo é
 * opcional (dá para pular cada passo). O propósito escrito no primeiro passo fica na tela nos
 * seguintes e, ao entrar, desliza até o lugar dele na Home (mesmo view-transition-name).
 */
export function EspiritualEntrada({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [purpose, setPurposeText] = useState(getData().purpose?.label ?? '');
  const [kind, setKind] = useState<PracticeKind | null>(null);
  const [intention, setIntention] = useState('');
  const [times, setTimes] = useState(3);
  const [minutes, setMinutes] = useState(10);
  const saved = getData().purpose?.label;

  const next = () => setStep((s) => (s < 2 ? ((s + 1) as Step) : s));

  return (
    <div className="dm-root esp-root esp-intro" data-domain="espiritual">
      <AtmosphericSanctuary mode="proposito" compact />
      <div className="esp-halo" aria-hidden="true" />

      {step > 0 && saved && (
        <p className="esp-purpose-mini" style={{ viewTransitionName: 'dm-purpose' }}>
          <span className="dm-eyebrow">Seu propósito em foco</span>
          “{saved}”
        </p>
      )}

      {step === 0 && (
        <section className="esp-step esp-fade" aria-labelledby="esp-q1">
          <p className="dm-eyebrow dm-fade" style={{ ['--i' as string]: 0 }}>Espiritual · presença e propósito</p>
          <h1 id="esp-q1" className="esp-question dm-fade" style={{ ['--i' as string]: 1 }}>O que importa agora?</h1>
          <p className="dm-subtitle dm-fade" style={{ ['--i' as string]: 2 }}>Uma frase sua, sem pressa. Ela vai ficar à vista aqui — para lembrar do “para quê” antes de tudo o mais.</p>
          <div className="dm-fade" style={{ ['--i' as string]: 3 }}>
            <label className="sr-only" htmlFor="esp-purpose">Seu propósito</label>
            <textarea id="esp-purpose" className="dm-field esp-purpose-input" rows={3} value={purpose} onChange={(e) => setPurposeText(e.target.value)} placeholder="Ex.: Cultivar clareza e paciência nas conversas difíceis." autoFocus />
          </div>
          <div className="esp-actions dm-fade" style={{ ['--i' as string]: 4 }}>
            <button type="button" className="dm-btn" data-variant="primary" disabled={!purpose.trim()} onClick={() => { setPurpose(purpose); next(); }}>Continuar</button>
            <button type="button" className="dm-btn" data-variant="quiet" onClick={next}>Prefiro começar sem definir isso agora</button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="esp-step esp-fade" aria-labelledby="esp-q2">
          <h1 id="esp-q2" className="esp-question">Uma prática pequena, que caiba no seu dia?</h1>
          <p className="dm-subtitle">Sem meta de pontos e sem “sequência”. Se ficar uns dias sem, a tela só convida a retomar.</p>
          <div className="cor-options" role="radiogroup" aria-label="Tipo de prática">
            {PRACTICE_KINDS.map((k) => (
              <button key={k.kind} type="button" role="radio" aria-checked={kind === k.kind} className="cor-option" data-selected={kind === k.kind} onClick={() => setKind(k.kind)}>
                {k.label}
                <span className="dm-faint text-[12px]">{k.hint}</span>
              </button>
            ))}
          </div>
          {kind && (
            <div className="esp-practice-form esp-fade">
              <label className="dm-eyebrow" htmlFor="esp-intention">Para quê? (só você vê)</label>
              <input id="esp-intention" className="dm-field" value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Ex.: começar o dia com calma" />
              <div className="esp-row">
                <div>
                  <p className="dm-eyebrow">Vezes por semana</p>
                  <div className="cor-scale" role="radiogroup" aria-label="Vezes por semana">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} type="button" role="radio" aria-checked={times === n} className="cor-scale-btn" data-selected={times === n} onClick={() => setTimes(n)}>{n}</button>)}
                  </div>
                </div>
                <div>
                  <p className="dm-eyebrow">Minutos</p>
                  <div className="cor-scale" role="radiogroup" aria-label="Minutos">
                    {[5, 10, 15, 20, 30].map((n) => <button key={n} type="button" role="radio" aria-checked={minutes === n} className="cor-scale-btn" data-selected={minutes === n} onClick={() => setMinutes(n)}>{n}</button>)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="esp-actions">
            <button type="button" className="dm-btn" data-variant="primary" disabled={!kind || !intention.trim()} onClick={() => { addPractice(kind!, intention, times, minutes); next(); }}>Continuar</button>
            <button type="button" className="dm-btn" data-variant="quiet" onClick={next}>Pular por agora</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="esp-step esp-fade" aria-labelledby="esp-q3">
          <h1 id="esp-q3" className="esp-question">Por onde você quer caminhar na Bíblia?</h1>
          <p className="dm-subtitle">Um plano só guarda a posição — onde você está e o que vem depois. Ficar para trás nunca vira cobrança: dá para ler o que ficou ou retomar de hoje.</p>
          <div className="esp-plans">
            {(Object.keys(PLAN_CATALOG) as PlanKey[]).map((key) => (
              <button key={key} type="button" className="esp-plan" onClick={() => { choosePlan(key); onDone(); }}>
                <strong>{PLAN_CATALOG[key].title}</strong>
                <span className="dm-muted text-[13px]">{PLAN_CATALOG[key].blurb}</span>
              </button>
            ))}
          </div>
          <div className="esp-actions">
            <button type="button" className="dm-btn" data-variant="quiet" onClick={onDone}>Entrar sem plano de leitura</button>
          </div>
        </section>
      )}
    </div>
  );
}
