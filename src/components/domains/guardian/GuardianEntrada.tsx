'use client';

import React, { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../shared/viewTransition';
import { COVERAGE, getGuardianSession, runCycle } from './guardianSession';
import { healthOf, isOpen } from './guardianView';

/**
 * Entrada do Guardian — "observação": uma verificação de verdade roda enquanto a tela abre, e cada
 * área é revelada na ordem, com o que o Guardian encontrou nela. A varredura é apresentação; o
 * resultado de cada linha é lido do repositório depois do ciclo real.
 */
export function GuardianEntrada({ onContinue }: { onContinue: () => void }) {
  const [done, setDone] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void runCycle().then(() => {
      if (!cancelled) setDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    if (prefersReducedMotion()) {
      setShown(COVERAGE.length + 1);
      return;
    }
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n > COVERAGE.length) window.clearInterval(id);
    }, 420);
    return () => window.clearInterval(id);
  }, [done]);

  const { repo } = getGuardianSession();
  const open = done ? repo.listFindings().filter(isOpen) : [];
  const health = healthOf(open);
  const awaiting = open.filter((f) => f.status === 'awaiting_approval').length;
  const finished = done && shown > COVERAGE.length;

  return (
    <div className="dm-root gd-root gd-intro" data-domain="guardian">
      <div className="dm-rise">
        <p className="dm-eyebrow">Guardian · observação e evidência</p>
        <h1 className="dm-title">{finished ? (awaiting > 0 ? `${awaiting} ponto${awaiting > 1 ? 's' : ''} pedem a sua decisão.` : 'Nada pede a sua decisão.') : 'Observando o Medusa…'}</h1>
        <p className="dm-subtitle">
          {finished
            ? `${health.verdict} Cada achado abaixo carrega a evidência de onde veio — o Guardian não afirma o que não consegue mostrar.`
            : 'Uma verificação real está rodando. O Guardian só reporta o que consegue provar.'}
        </p>
      </div>

      <ol className="gd-scan" aria-label="Áreas verificadas" aria-live="polite">
        {COVERAGE.map((c, i) => {
          const visible = done && i < shown;
          const count = done ? repo.listFindings().filter((f) => c.categories.includes(f.category) && isOpen(f)).length : 0;
          return (
            <li key={c.key} data-visible={visible} data-mode={c.mode}>
              <span className="gd-scan-mark" aria-hidden="true">
                <span className="material-symbols-outlined">{!visible ? 'radio_button_unchecked' : c.mode === 'sem_fonte' ? 'remove' : count > 0 ? 'search' : 'check'}</span>
              </span>
              <span className="min-w-0 flex-1">
                <strong>{c.name}</strong>
                <span className="dm-muted">{c.what}</span>
              </span>
              <span className="gd-scan-result dm-num">
                {!visible ? '…' : c.mode === 'sem_fonte' ? 'sem fonte' : count > 0 ? `${count} achado${count > 1 ? 's' : ''}` : 'nada encontrado'}
              </span>
            </li>
          );
        })}
        <span className="gd-scanline" aria-hidden="true" data-running={!finished} />
      </ol>

      <div className="fin-intro-foot dm-rise" style={{ ['--i' as string]: 2 }}>
        <button type="button" className="dm-btn" data-variant="primary" onClick={onContinue} disabled={!finished} autoFocus>
          Ver o que encontrei
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <span className="dm-faint text-[13px]">“Sobre demonstração” = a fonte lê dados de exemplo; “sem fonte” = ainda não há como observar.</span>
      </div>
    </div>
  );
}
