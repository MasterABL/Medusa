'use client';

import React, { useEffect, useId, useState } from 'react';

export type AmbientTime = 'auto' | 'manha' | 'tarde' | 'noite';

interface AtmosphericSanctuaryProps {
  ambientTime?: AmbientTime;
  onAmbientTimeChange?: (time: AmbientTime) => void;
  mode?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

export function resolveRealTimePeriod(): 'manha' | 'tarde' | 'noite' {
  if (typeof window === 'undefined') return 'manha';
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 16) return 'manha';
  if (hour >= 16 && hour < 19) return 'tarde';
  return 'noite';
}

export const TIME_LABELS: Record<'manha' | 'tarde' | 'noite', { label: string; icon: string; blurb: string }> = {
  manha: { label: 'Manhã', icon: 'light_mode', blurb: 'Céu claro, luz suave e quietude matinal' },
  tarde: { label: 'Fim de tarde', icon: 'wb_twilight', blurb: 'Luz mais quente, transição gradual e reflexão' },
  noite: { label: 'Noite', icon: 'dark_mode', blurb: 'Céu profundo, estrelas e silêncio orante' },
};

export function AtmosphericSanctuary({
  ambientTime = 'auto',
  onAmbientTimeChange,
  children,
}: AtmosphericSanctuaryProps) {
  const [realTime, setRealTime] = useState<'manha' | 'tarde' | 'noite'>('manha');
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
    <div className="esp-atmosphere-wrapper" data-ambient-time={activeTime}>
      {/* Camada Ambiental Integral que envelopa toda a tela */}
      <div className="esp-full-atmosphere" aria-hidden="true">
        <div className="esp-sky-gradient" />
        <div className="esp-ambient-glow" />

        {/* Nuvens suaves e lentas para Manhã e Fim de tarde */}
        {(activeTime === 'manha' || activeTime === 'tarde') && (
          <div className="esp-cloud-layer">
            <svg className="esp-cloud-svg esp-cloud-drift-1" viewBox="0 0 1440 280" fill="none">
              <defs>
                <linearGradient id={`${cloudId}-c1`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--esp-cloud-top)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--esp-cloud-bot)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d="M0 160 Q180 80 380 130 T820 90 T1220 140 T1440 100 L1440 280 L0 280 Z"
                fill={`url(#${cloudId}-c1)`}
              />
            </svg>
            <svg className="esp-cloud-svg esp-cloud-drift-2" viewBox="0 0 1440 280" fill="none">
              <defs>
                <linearGradient id={`${cloudId}-c2`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--esp-cloud-top)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--esp-cloud-bot)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 200 Q260 120 540 170 T1040 130 T1440 180 L1440 280 L0 280 Z"
                fill={`url(#${cloudId}-c2)`}
              />
            </svg>
          </div>
        )}

        {/* Céu noturno com estrelas respiradas e quietude para Noite */}
        {activeTime === 'noite' && (
          <div className="esp-stars-layer">
            <svg className="esp-stars-svg" viewBox="0 0 1200 600" preserveAspectRatio="none">
              <circle cx="140" cy="50" r="1.5" className="esp-star-twinkle-1" />
              <circle cx="280" cy="110" r="1.1" className="esp-star-twinkle-2" />
              <circle cx="360" cy="35" r="1.8" className="esp-star-twinkle-3" />
              <circle cx="490" cy="90" r="1.3" className="esp-star-twinkle-1" />
              <circle cx="640" cy="45" r="1.6" className="esp-star-twinkle-2" />
              <circle cx="760" cy="125" r="1.2" className="esp-star-twinkle-3" />
              <circle cx="860" cy="60" r="1.7" className="esp-star-twinkle-1" />
              <circle cx="940" cy="95" r="1.1" className="esp-star-twinkle-2" />
              <circle cx="1060" cy="40" r="1.4" className="esp-star-twinkle-3" />
              <circle cx="210" cy="150" r="1.0" className="esp-star-twinkle-2" />
              <circle cx="530" cy="170" r="1.4" className="esp-star-twinkle-1" />
              <circle cx="700" cy="130" r="1.2" className="esp-star-twinkle-3" />
              <circle cx="900" cy="160" r="1.5" className="esp-star-twinkle-1" />
              <circle cx="1120" cy="120" r="1.0" className="esp-star-twinkle-2" />
            </svg>
          </div>
        )}

        <div className="esp-horizon-line" />
      </div>

      {/* Conteúdo do Domínio sobre a atmosfera */}
      <div className="esp-content-overlay">
        {/* Controle Sutil de Atmosfera */}
        <div className="esp-ambient-header">
          <div className="esp-ambient-legend" title="Ambiente integral do Santuário">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {TIME_LABELS[activeTime].icon}
            </span>
            <span className="text-[13px] font-medium">{TIME_LABELS[activeTime].label}</span>
            <span className="dm-faint text-[12px] hidden sm:inline">· {TIME_LABELS[activeTime].blurb}</span>
          </div>

          <div className="esp-time-pills" role="radiogroup" aria-label="Ajuste do momento do dia">
            {(['auto', 'manha', 'tarde', 'noite'] as AmbientTime[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={ambientTime === t}
                className="esp-time-pill"
                data-selected={ambientTime === t}
                onClick={() => onAmbientTimeChange?.(t)}
              >
                {t === 'auto' ? 'Horário Atual' : t === 'manha' ? 'Manhã' : t === 'tarde' ? 'Tarde' : 'Noite'}
              </button>
            ))}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
