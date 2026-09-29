'use client';

import React, { useState } from 'react';
import type { BodyActivity, IntensityDescriptor } from '@/domains/body';
import { label } from './bodyLabels';

export interface ActivityMovementVisualizerProps {
  activity: BodyActivity;
  durationMinutes: number;
  intensity: IntensityDescriptor;
}

/**
 * Visualizador de Movimento Vivo — Assinatura do Domínio Corpo.
 * Não mostra apenas texto: explica visualmente o ciclo completo:
 * movimento → repetição/cadência → duração → descanso → progressão.
 * Inclui guia de ritmo/respiração orgânica viva.
 */
export function ActivityMovementVisualizer({
  activity,
  durationMinutes,
  intensity,
}: ActivityMovementVisualizerProps) {
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inspire' | 'pause' | 'expire'>('inspire');

  // Toggle interativo de respiração / cadência de presença corporal
  const toggleBreathing = () => {
    if (breathingActive) {
      setBreathingActive(false);
    } else {
      setBreathingActive(true);
    }
  };

  React.useEffect(() => {
    if (!breathingActive) return;
    const interval = setInterval(() => {
      setBreathPhase((prev) => (prev === 'inspire' ? 'pause' : prev === 'pause' ? 'expire' : 'inspire'));
    }, 3200);
    return () => clearInterval(interval);
  }, [breathingActive]);

  // Parâmetros visuais adaptados à atividade
  const isWalking = activity.id.includes('caminhada') || activity.id.includes('corrida');
  const isMobility = activity.id.includes('mobilidade') || activity.id.includes('alongamento');

  return (
    <div className="cor-movement-visualizer">
      {/* 1. Arco de Movimento Biomecânico & Ritmo */}
      <div className="cor-kinetic-card">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="cor-live-dot" aria-hidden="true" />
            <span className="dm-eyebrow text-[11px]">Movimento Vivo · Dinâmica da Sessão</span>
          </div>
          <span className="dm-chip" data-tone={intensity === 'desafiadora' ? 'accent' : 'support'}>
            Intensidade {label(intensity).toLowerCase()}
          </span>
        </div>

        {/* Demonstração visual do ciclo cinético (SVG Orgânico de Movimento) */}
        <div className="cor-kinetic-stage" role="img" aria-label={`Ciclo de movimento para ${activity.label}: aquecimento, fase ativa, cadência e recuperação.`}>
          <svg className="cor-kinetic-svg" viewBox="0 0 680 140" preserveAspectRatio="none">
            <defs>
              <linearGradient id="corGradEnergy" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(113, 219, 210, 0.4)" />
                <stop offset="45%" stopColor="rgba(173, 228, 181, 0.9)" />
                <stop offset="85%" stopColor="rgba(113, 219, 210, 0.7)" />
                <stop offset="100%" stopColor="rgba(208, 234, 163, 0.4)" />
              </linearGradient>
            </defs>

            {/* Onda de intensidade da sessão: Aquecimento -> Pico de Cadência -> Arrefecimento */}
            <path
              d="M 20,110 C 100,105 160,35 340,30 C 520,25 580,100 660,110"
              fill="none"
              stroke="url(#corGradEnergy)"
              strokeWidth="4"
              strokeLinecap="round"
              className="cor-wave-pulse"
            />

            {/* Onda de respiração de fundo */}
            <path
              d="M 20,110 C 120,115 220,50 340,50 C 460,50 560,115 660,110"
              fill="none"
              stroke="rgba(113, 219, 210, 0.25)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />

            {/* Marcadores dos 4 momentos do ciclo */}
            <circle cx="100" cy="95" r="5" fill="rgb(var(--color-primary-rgb))" />
            <circle cx="340" cy="30" r="7" fill="rgb(var(--color-support-rgb))" className="cor-crest-marker" />
            <circle cx="580" cy="95" r="5" fill="rgb(var(--color-tertiary-rgb))" />
          </svg>

          {/* Marcadores de Etapa do Exercício */}
          <div className="cor-kinetic-markers" aria-hidden="true">
            <div className="cor-marker-tag cor-m-warmup">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Aquecimento</span>
              <span className="text-[12px] font-semibold text-text-primary">5 min suaves</span>
            </div>
            <div className="cor-marker-tag cor-m-active">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Fase Principal</span>
              <span className="text-[12px] font-semibold text-text-primary">
                {isWalking ? 'Cadência constante' : isMobility ? 'Fluxo articular' : 'Ritmo e contração'}
              </span>
            </div>
            <div className="cor-marker-tag cor-m-cooldown">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Desaceleração</span>
              <span className="text-[12px] font-semibold text-text-primary">5 min calmos</span>
            </div>
          </div>
        </div>

        {/* 2. Ciclo em 5 Dimensões: Movimento → Repetição → Duração → Descanso → Progressão */}
        <div className="cor-dimensions-grid">
          <div className="cor-dim-cell">
            <span className="material-symbols-outlined text-medusa-primary" aria-hidden="true">directions_run</span>
            <div>
              <p className="dm-eyebrow text-[10px]">1. Movimento</p>
              <p className="text-[13px] font-semibold text-text-primary leading-tight mt-0.5">
                {isWalking ? 'Passada natural e postura ereta' : isMobility ? 'Amplitude articular completa' : 'Controle em cada repetição'}
              </p>
            </div>
          </div>

          <div className="cor-dim-cell">
            <span className="material-symbols-outlined text-medusa-support" aria-hidden="true">repeat</span>
            <div>
              <p className="dm-eyebrow text-[10px]">2. Repetição / Ritmo</p>
              <p className="text-[13px] font-semibold text-text-primary leading-tight mt-0.5">
                {isWalking ? '100–115 passos/min' : isMobility ? '3 respirações por posição' : '3 ciclos com cadência 2-1-2'}
              </p>
            </div>
          </div>

          <div className="cor-dim-cell">
            <span className="material-symbols-outlined text-medusa-primary" aria-hidden="true">timer</span>
            <div>
              <p className="dm-eyebrow text-[10px]">3. Duração</p>
              <p className="text-[13px] font-semibold text-text-primary leading-tight mt-0.5">
                {durationMinutes} minutos totais
              </p>
            </div>
          </div>

          <div className="cor-dim-cell">
            <span className="material-symbols-outlined text-medusa-tertiary" aria-hidden="true">hotel</span>
            <div>
              <p className="dm-eyebrow text-[10px]">4. Descanso</p>
              <p className="text-[13px] font-semibold text-text-primary leading-tight mt-0.5">
                {activity.recoveryExpectation}
              </p>
            </div>
          </div>

          <div className="cor-dim-cell">
            <span className="material-symbols-outlined text-text-muted" aria-hidden="true">trending_up</span>
            <div>
              <p className="dm-eyebrow text-[10px]">5. Progressão</p>
              <p className="text-[13px] font-semibold text-text-primary leading-tight mt-0.5">
                Semana 1: consistência de rotina
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Guia de Respiração & Consciência Corporal (Micro-interação Viva) */}
      <div className="cor-breath-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`cor-breath-sphere ${breathingActive ? `cor-breath-${breathPhase}` : ''}`} aria-hidden="true">
              <span />
              <span />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-text-primary">
                {breathingActive
                  ? breathPhase === 'inspire'
                    ? 'Inspire suavemente pelo nariz (4s)…'
                    : breathPhase === 'pause'
                    ? 'Mantenha a presença (2s)…'
                    : 'Solte o ar devagar pela boca (4s)…'
                  : 'Ritmo & Respiração Pré-Atividade'}
              </h3>
              <p className="text-[12px] text-text-secondary leading-snug">
                {breathingActive
                  ? 'Concentre-se no ritmo do tórax e no contato dos pés com o chão.'
                  : 'Sincronizar a respiração reduz a tensão antes ou após a atividade física.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dm-btn"
            data-size="sm"
            data-variant={breathingActive ? 'quiet' : 'primary'}
            onClick={toggleBreathing}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>
              {breathingActive ? 'stop_circle' : 'air'}
            </span>
            {breathingActive ? 'Encerrar ritmo' : 'Iniciar ritmo respiratório'}
          </button>
        </div>
      </div>
    </div>
  );
}
