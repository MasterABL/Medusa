'use client';

import React, { useEffect, useId, useState } from 'react';

export type AmbientTime = 'auto' | 'dia' | 'entardecer' | 'noite';
export type SanctuaryMode = 'proposito' | 'leitura' | 'estudo' | 'oracao';

interface AtmosphericSanctuaryProps {
  mode: SanctuaryMode;
  onModeChange?: (mode: SanctuaryMode) => void;
  ambientTime?: AmbientTime;
  onAmbientTimeChange?: (time: AmbientTime) => void;
  compact?: boolean;
}

function resolveRealTimePeriod(): 'dia' | 'entardecer' | 'noite' {
  if (typeof window === 'undefined') return 'dia';
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 17) return 'dia';
  if (hour >= 17 && hour < 20) return 'entardecer';
  return 'noite';
}

const MODE_LABELS: Record<SanctuaryMode, { label: string; icon: string; feeling: string }> = {
  proposito: { label: 'Propósito', icon: 'explore', feeling: 'Caminho e horizonte aberto' },
  leitura: { label: 'Leitura', icon: 'menu_book', feeling: 'Silêncio sereno na passagem' },
  estudo: { label: 'Estudo', icon: 'school', feeling: 'Foco e atenção profunda' },
  oracao: { label: 'Oração', icon: 'self_improvement', feeling: 'Presença tranquila e minimalista' },
};

const TIME_LABELS: Record<'dia' | 'entardecer' | 'noite', { label: string; icon: string; blurb: string }> = {
  dia: { label: 'Dia', icon: 'light_mode', blurb: 'Luz difusa e céu sereno' },
  entardecer: { label: 'Fim de tarde', icon: 'wb_twilight', blurb: 'Atmosfera calorosa e transição' },
  noite: { label: 'Noite', icon: 'dark_mode', blurb: 'Profundidade, silêncio e estrelas' },
};

export function AtmosphericSanctuary({
  mode,
  onModeChange,
  ambientTime = 'auto',
  onAmbientTimeChange,
  compact = false,
}: AtmosphericSanctuaryProps) {
  const [realTime, setRealTime] = useState<'dia' | 'entardecer' | 'noite'>('dia');
  const cloudId = useId();

  useEffect(() => {
    setRealTime(resolveRealTimePeriod());
    const interval = setInterval(() => {
      setRealTime(resolveRealTimePeriod());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeTime = ambientTime === 'auto' ? realTime : ambientTime;

  return (
    <div
      className="esp-sanctuary"
      data-ambient-time={activeTime}
      data-sanctuary-mode={mode}
      aria-label={`Ambiente espiritual em modo ${MODE_LABELS[mode].label}, atmosfera ${TIME_LABELS[activeTime].label}`}
    >
      {/* Dynamic ambient backdrop layer */}
      <div className="esp-atmosphere-backdrop" aria-hidden="true">
        <div className="esp-sky-gradient" />

        {/* Clouds for Day / Twilight */}
        {(activeTime === 'dia' || activeTime === 'entardecer') && (
          <div className="esp-cloud-layer">
            <svg className="esp-cloud-svg esp-cloud-drift-1" viewBox="0 0 1200 240" fill="none">
              <defs>
                <linearGradient id={`${cloudId}-c1`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--esp-cloud-top)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--esp-cloud-bot)" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path
                d="M120 180 Q190 80 320 120 T540 100 T780 130 T980 90 T1140 170 L1200 240 L0 240 Z"
                fill={`url(#${cloudId}-c1)`}
              />
            </svg>
            <svg className="esp-cloud-svg esp-cloud-drift-2" viewBox="0 0 1200 240" fill="none">
              <defs>
                <linearGradient id={`${cloudId}-c2`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--esp-cloud-top)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--esp-cloud-bot)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M40 200 Q140 130 260 160 T490 120 T720 160 T940 130 T1120 190 L1200 240 L0 240 Z"
                fill={`url(#${cloudId}-c2)`}
              />
            </svg>
          </div>
        )}

        {/* Stars for Night */}
        {activeTime === 'noite' && (
          <div className="esp-stars-layer">
            <svg className="esp-stars-svg" viewBox="0 0 1000 400" preserveAspectRatio="none">
              <circle cx="120" cy="45" r="1.4" className="esp-star-twinkle-1" />
              <circle cx="280" cy="90" r="1.1" className="esp-star-twinkle-2" />
              <circle cx="340" cy="30" r="1.8" className="esp-star-twinkle-3" />
              <circle cx="480" cy="75" r="1.2" className="esp-star-twinkle-1" />
              <circle cx="620" cy="40" r="1.5" className="esp-star-twinkle-2" />
              <circle cx="740" cy="110" r="1.1" className="esp-star-twinkle-3" />
              <circle cx="830" cy="50" r="1.6" className="esp-star-twinkle-1" />
              <circle cx="920" cy="85" r="1.2" className="esp-star-twinkle-2" />
              <circle cx="190" cy="120" r="0.9" className="esp-star-twinkle-3" />
              <circle cx="510" cy="140" r="1.3" className="esp-star-twinkle-1" />
              <circle cx="670" cy="100" r="1.0" className="esp-star-twinkle-2" />
              <circle cx="880" cy="130" r="1.4" className="esp-star-twinkle-3" />
            </svg>
          </div>
        )}

        {/* Mode-specific lighting halo */}
        <div className="esp-mode-halo" />
        <div className="esp-horizon-line" />
      </div>

      {/* Sanctuary Ambient Control Bar */}
      {!compact && (
        <div className="esp-sanctuary-bar">
          <div className="esp-mode-nav" role="tablist" aria-label="Modo de presença">
            {(Object.keys(MODE_LABELS) as SanctuaryMode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  className="esp-mode-tab"
                  data-active={active}
                  onClick={() => onModeChange?.(m)}
                  title={MODE_LABELS[m].feeling}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {MODE_LABELS[m].icon}
                  </span>
                  <span>{MODE_LABELS[m].label}</span>
                </button>
              );
            })}
          </div>

          <div className="esp-ambient-nav">
            <span className="esp-ambient-legend" title="Ambiente reativo ao horário">
              <span className="material-symbols-outlined" aria-hidden="true">
                {TIME_LABELS[activeTime].icon}
              </span>
              <span className="text-[12px] font-medium">{TIME_LABELS[activeTime].label}</span>
            </span>

            <div className="esp-time-pills" role="radiogroup" aria-label="Ajuste do momento visual">
              {(['auto', 'dia', 'entardecer', 'noite'] as AmbientTime[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={ambientTime === t}
                  className="esp-time-pill"
                  data-selected={ambientTime === t}
                  onClick={() => onAmbientTimeChange?.(t)}
                >
                  {t === 'auto' ? 'Auto' : t === 'dia' ? 'Dia' : t === 'entardecer' ? 'Tarde' : 'Noite'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
