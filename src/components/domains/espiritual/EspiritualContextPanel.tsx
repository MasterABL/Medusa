'use client';

import React, { useMemo, useState } from 'react';
import { formatReference } from '@/domains/spiritual';
import type { SpiritualConsent } from '@/domains/spiritual/services/aiContext';
import { PRACTICE_KINDS, buildView, previewAIContext, spiritualUi, useSpiritualState } from './spiritualSession';

const CONSENT_LABEL: Array<[keyof SpiritualConsent, string]> = [
  ['shareReadingPlan', 'Posição no plano de leitura'],
  ['shareStudies', 'Passagem do estudo (sem suas notas)'],
  ['sharePractices', 'Estado da prática (sem a intenção)'],
  ['sharePurposes', 'Rótulo do propósito'],
];

/**
 * Context Panel do Espiritual: prática vigente, leitura, propósito e o estudo contextual. A IA aqui é
 * o CONTRATO de contexto (consentimento por escopo + barreira de privacidade) com o assistente por
 * modelo fixo — nenhum LLM está conectado, e a tela diz isso.
 */
export function EspiritualContextPanel() {
  const { version, consent } = useSpiritualState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(() => buildView(), [version]);
  const [result, setResult] = useState<Awaited<ReturnType<typeof previewAIContext>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const practice = v.practices[0];
  const c = practice ? v.continuities.find((x) => x.definitionId === practice.id) : undefined;
  const entry = v.reading?.todayEntry ?? v.reading?.nextEntry;

  const preview = async () => {
    setError(null);
    try {
      setResult(await previewAIContext(consent, 'suggest_next_step'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível montar o contexto.');
    }
  };

  return (
    <>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Prática vigente</p>
        {practice ? (
          <>
            <strong className="text-[15px]">{PRACTICE_KINDS.find((k) => k.kind === practice.kind)?.label}</strong>
            <span className="dm-muted text-[13px] leading-snug">{v.doneToday.has(practice.id) ? 'Feita hoje.' : c?.message}</span>
          </>
        ) : (
          <p className="dm-muted text-[13px]">Nenhuma prática definida ainda.</p>
        )}
      </div>

      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Leitura</p>
        {v.plan && v.reading ? (
          <>
            <strong className="text-[15px]">{entry ? formatReference(entry.references[0], { names: true }) : 'Plano concluído'}</strong>
            <span className="dm-muted text-[13px]">{v.plan.title} · {v.reading.completedCount}/{v.reading.total}</span>
            <div className="dm-bar" aria-hidden="true"><i data-tone="primary" style={{ width: `${(v.reading.completedCount / v.reading.total) * 100}%` }} /></div>
          </>
        ) : (
          <p className="dm-muted text-[13px]">Sem plano de leitura.</p>
        )}
      </div>

      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Propósito</p>
        {v.purpose ? <p className="esp-quote">“{v.purpose.label}”</p> : <p className="dm-muted text-[13px]">Ainda não definido.</p>}
      </div>

      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Companheiro de estudo <span className="dm-chip" data-tone="accent">IA não conectada</span></p>
        <p className="dm-muted text-[12px] leading-snug">Escolha o que poderia ser compartilhado com uma IA. Reflexões, orações e suas notas nunca entram — a barreira de privacidade recusa.</p>
        <div className="esp-consent" role="group" aria-label="Consentimento por escopo">
          {CONSENT_LABEL.map(([key, text]) => (
            <label key={key}>
              <input type="checkbox" checked={consent[key]} onChange={(e) => { spiritualUi.set((s) => ({ consent: { ...s.consent, [key]: e.target.checked } })); setResult(null); }} />
              <span>{text}</span>
            </label>
          ))}
        </div>
        <button type="button" className="dm-btn" data-size="sm" onClick={() => void preview()}>Ver o que seria compartilhado</button>
        {error && <p className="dm-alert-text text-[12px]" role="alert">{error}</p>}
        {result && (
          <div className="esp-ai" role="status">
            <p className="dm-eyebrow">Escopos autorizados</p>
            <p className="text-[13px]">{result.context.scopes.length ? result.context.scopes.join(', ') : 'nenhum — nada seria enviado'}</p>
            {result.context.currentPassage && <p className="dm-muted text-[12px]">Passagem: {formatReference(result.context.currentPassage, { names: true })}</p>}
            <p className="dm-eyebrow">Resposta do assistente por modelo fixo</p>
            <p className="text-[13px] leading-snug">{result.response.answer}</p>
            {result.response.nextSteps.length > 0 && <ul className="fin-evidence">{result.response.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>}
            <p className="dm-faint text-[11px]">Não é autoridade espiritual. Sem LLM conectado, isto é organização de passos, não explicação.</p>
          </div>
        )}
      </div>
    </>
  );
}
