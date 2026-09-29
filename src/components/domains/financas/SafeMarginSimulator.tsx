'use client';

import React, { useState } from 'react';
import { brl } from '../shared/format';
import type { FinanceView } from './financeView';

export interface SafeMarginSimulatorProps {
  view: FinanceView;
  onSimulate?: (amount: number) => void;
}

/** "E se eu gastar X agora?" — recalcula a margem por dia com a mesma conta da tela (sobra ÷ dias restantes). */
export function SafeMarginSimulator({ view, onSimulate }: SafeMarginSimulatorProps) {
  const [raw, setRaw] = useState('');
  const amount = Number(raw.replace(/\./g, '').replace(',', '.'));
  const valid = raw.trim() !== '' && Number.isFinite(amount) && amount >= 0;
  const afterFree = view.free - (valid ? amount : 0);
  const afterDaily = afterFree / view.daysLeft;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRaw(val);
    const parsed = Number(val.replace(/\./g, '').replace(',', '.'));
    if (val.trim() !== '' && Number.isFinite(parsed) && parsed >= 0) {
      onSimulate?.(parsed);
    } else {
      onSimulate?.(0);
    }
  };

  return (
    <div className="fin-sim">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="dm-eyebrow" htmlFor="fin-sim-input">
          Simulador de Decisão Instantânea
        </label>
        <span className="dm-faint text-[12px] font-mono">Impacto imediato no fluxo</span>
      </div>
      <div className="fin-sim-row">
        <span className="dm-muted font-mono" aria-hidden="true">
          R$
        </span>
        <input
          id="fin-sim-input"
          className="dm-field fin-sim-field font-mono"
          inputMode="decimal"
          placeholder="0,00"
          value={raw}
          onChange={handleChange}
          aria-describedby="fin-sim-out"
        />
        {valid && (
          <button
            type="button"
            className="dm-btn"
            data-size="sm"
            data-variant="quiet"
            onClick={() => {
              setRaw('');
              onSimulate?.(0);
            }}
          >
            Limpar
          </button>
        )}
      </div>
      <dl id="fin-sim-out" className="fin-sim-out" aria-live="polite">
        <div className="fin-sim-stat">
          <dt className="dm-faint">Margem por dia hoje</dt>
          <dd className="dm-num font-mono">{brl(view.dailyMargin)}/dia</dd>
        </div>
        <div className="fin-sim-stat">
          <dt className="dm-faint">Com esse gasto</dt>
          <dd className={`dm-num font-mono ${afterDaily < 0 ? 'dm-alert-text' : 'dm-accent-text'}`}>
            {valid ? `${brl(afterDaily)}/dia` : '—'}
          </dd>
        </div>
        <div className="fin-sim-stat">
          <dt className="dm-faint">Sobra do mês</dt>
          <dd className={`dm-num font-mono ${afterFree < 0 ? 'dm-alert-text' : ''}`}>
            {valid ? brl(afterFree) : brl(view.free)}
          </dd>
        </div>
      </dl>
      <p className="dm-faint text-[12px]">
        Cálculo linear: sobra do mês ÷ {view.daysLeft} dia{view.daysLeft > 1 ? 's' : ''} restante{view.daysLeft > 1 ? 's' : ''}. Nenhuma transação é gravada.
      </p>
    </div>
  );
}

