'use client';

import React, { useState } from 'react';
import { brl } from '../shared/format';
import type { FinanceView } from './financeView';

/** "E se eu gastar X agora?" — recalcula a margem por dia com a mesma conta da tela (sobra ÷ dias restantes). */
export function SafeMarginSimulator({ view }: { view: FinanceView }) {
  const [raw, setRaw] = useState('');
  const amount = Number(raw.replace(/\./g, '').replace(',', '.'));
  const valid = raw.trim() !== '' && Number.isFinite(amount) && amount >= 0;
  const afterFree = view.free - (valid ? amount : 0);
  const afterDaily = afterFree / view.daysLeft;

  return (
    <div className="fin-sim">
      <label className="dm-eyebrow" htmlFor="fin-sim-input">
        Se eu gastar agora
      </label>
      <div className="fin-sim-row">
        <span className="dm-muted" aria-hidden="true">
          R$
        </span>
        <input id="fin-sim-input" className="dm-field" inputMode="decimal" placeholder="0,00" value={raw} onChange={(e) => setRaw(e.target.value)} aria-describedby="fin-sim-out" />
      </div>
      <dl id="fin-sim-out" className="fin-sim-out" aria-live="polite">
        <div>
          <dt className="dm-faint">Margem por dia hoje</dt>
          <dd className="dm-num">{brl(view.dailyMargin)}/dia</dd>
        </div>
        <div>
          <dt className="dm-faint">Com esse gasto</dt>
          <dd className={`dm-num ${afterDaily < 0 ? 'dm-alert-text' : 'dm-accent-text'}`}>{valid ? `${brl(afterDaily)}/dia` : '—'}</dd>
        </div>
        <div>
          <dt className="dm-faint">Sobra do mês</dt>
          <dd className={`dm-num ${afterFree < 0 ? 'dm-alert-text' : ''}`}>{valid ? brl(afterFree) : brl(view.free)}</dd>
        </div>
      </dl>
      <p className="dm-faint text-[12px]">
        Cálculo: sobra do mês ÷ {view.daysLeft} dia{view.daysLeft > 1 ? 's' : ''} restante{view.daysLeft > 1 ? 's' : ''}. Não registra nada.
      </p>
    </div>
  );
}
