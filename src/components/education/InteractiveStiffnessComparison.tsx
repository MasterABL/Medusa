'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { playFeedback } from '@/lib/audioFeedback';

interface SpringConfig {
  id: string;
  name: string;
  label: string;
  k: number; // N/m
  color: string;
  coils: number;
}

const SPRINGS: SpringConfig[] = [
  { id: 'soft', name: 'Mola Macia', label: 'k = 50 N/m', k: 50, color: '#8FB4E0', coils: 8 },
  { id: 'standard', name: 'Mola Padrão', label: 'k = 150 N/m', k: 150, color: '#71DBD2', coils: 12 },
  { id: 'stiff', name: 'Mola Rígida', label: 'k = 300 N/m', k: 300, color: '#ADE4B5', coils: 18 },
];

export function InteractiveStiffnessComparison() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [initialDisplacement] = useState<number>(30); // px
  const [prediction, setPrediction] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);

  // Tempo de simulação acumulado em segundos
  const [simTime, setSimTime] = useState<number>(0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const mass = 1.0; // kg

  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      setSimTime((prev) => prev + dt);
      animRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  const handleTogglePlay = () => {
    playFeedback('action');
    if (!isPlaying && !revealed && prediction) {
      setRevealed(true);
      if (prediction === 'stiff') {
        playFeedback('success');
      } else {
        playFeedback('error');
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    playFeedback('action');
    setIsPlaying(false);
    setSimTime(0);
  };

  const handlePredict = (springId: string) => {
    setPrediction(springId);
    playFeedback('toggle');
  };

  // Traçar caminho de mola SVG vertical
  const renderSpringSvg = (spring: SpringConfig) => {
    const omega = Math.sqrt(spring.k / mass);
    const damping = 0.08;
    const yDisp = isPlaying
      ? initialDisplacement * Math.cos(omega * simTime) * Math.exp(-damping * simTime)
      : initialDisplacement;

    const baseLength = 90;
    const currentLength = baseLength + yDisp;
    const coils = spring.coils;
    const coilHeight = currentLength / coils;

    let path = `M 25 10 L 25 15`;
    for (let i = 0; i < coils; i++) {
      const y1 = 15 + i * coilHeight + coilHeight * 0.25;
      const y2 = 15 + i * coilHeight + coilHeight * 0.75;
      const y3 = 15 + (i + 1) * coilHeight;
      path += ` L 10 ${y1} L 40 ${y2} L 25 ${y3}`;
    }
    path += ` L 25 ${currentLength + 20}`;

    const period = (2 * Math.PI) / omega;

    return (
      <div
        key={spring.id}
        className="flex-1 bg-surface-secondary/40 border border-border/70 rounded-xl p-3.5 flex flex-col items-center gap-3 relative overflow-hidden"
      >
        <div className="flex flex-col items-center text-center">
          <span className="text-[12px] font-bold text-text-primary">{spring.name}</span>
          <span className="text-[10.5px] font-mono text-text-muted">{spring.label}</span>
        </div>

        {/* Palco SVG Vertical */}
        <div className="w-full h-44 bg-[#0A100E] rounded-lg border border-border/40 relative flex justify-center items-start pt-2 overflow-hidden">
          {/* Linha de equilíbrio tracejada */}
          <div
            className="absolute left-2 right-2 border-b border-dashed border-white/20 text-[9px] font-mono text-white/40 text-right pr-1"
            style={{ top: '100px' }}
          >
            y₀ (eq)
          </div>

          <svg width="50" height="170" className="overflow-visible">
            <line x1="10" y1="10" x2="40" y2="10" stroke="#555" strokeWidth="2" />
            <path
              d={path}
              fill="none"
              stroke={spring.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bloco de Massa m = 1kg */}
            <rect
              x="10"
              y={currentLength + 15}
              width="30"
              height="20"
              rx="4"
              fill={spring.color}
              className="shadow-subtle"
            />
            <text
              x="25"
              y={currentLength + 29}
              textAnchor="middle"
              fill="#111"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              1kg
            </text>
          </svg>
        </div>

        {/* Frequência Angular e Período */}
        <div className="grid grid-cols-2 gap-1 w-full text-center text-[10px] font-mono bg-surface p-1.5 rounded-lg border border-border/60">
          <div>
            <span className="text-text-muted block text-[9px]">ω (rad/s)</span>
            <span className="font-bold text-text-primary">{omega.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[9px]">T (período)</span>
            <span className="font-bold text-text-primary">{period.toFixed(2)}s</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="stiffness-comparison-block"
      className="w-full bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-calm flex flex-col gap-5 mt-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-medusa-primary/20 border border-medusa-primary/40 text-medusa-primary flex items-center justify-center flex-shrink-0">
            <AnimatedIcon name="speed" size={17} />
          </span>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-medusa-primary font-bold block">
              Comparativo de Rigidez & Frequência Natural (Faculdade)
            </span>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              Influência da Constante elástica k no Período T = 2π√(m/k)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="btn-stiffness-play"
            onClick={handleTogglePlay}
            className="btn-interactive group px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-medusa-primary text-[#1C2420] flex items-center gap-1.5 shadow-subtle hover:opacity-95"
          >
            <AnimatedIcon name={isPlaying ? 'pause' : 'play'} size={15} />
            <span>{isPlaying ? 'Pausar' : 'Liberar Molas'}</span>
          </button>
          <button
            type="button"
            id="btn-stiffness-reset"
            onClick={handleReset}
            className="btn-interactive group p-1.5 rounded-full bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary"
            title="Resetar Posições"
          >
            <AnimatedIcon name="refresh" size={15} />
          </button>
        </div>
      </div>

      {/* Checkpoint PREDICT -> REVEAL (Harvard Active Learning Discovery) */}
      <div className="p-4 rounded-xl bg-surface-secondary/50 border border-border/70 flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-medusa-accent font-bold flex items-center gap-1">
            <AnimatedIcon name="psychology" size={14} />
            Desafio Predict-Before-Reveal
          </span>
          {revealed && (
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
              prediction === 'stiff' ? 'bg-medusa-support/20 text-medusa-support' : 'bg-medusa-alert/20 text-medusa-alert'
            }`}>
              {prediction === 'stiff' ? '✓ Previsão Correta!' : 'Previsão Incorreta'}
            </span>
          )}
        </div>
        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          Com a mesma massa (m = 1.0 kg), qual mola oscilará com a <strong>maior frequência</strong> (mais ciclos por segundo) ao ser liberada?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {SPRINGS.map((sp) => (
            <button
              key={sp.id}
              type="button"
              id={`btn-predict-${sp.id}`}
              disabled={isPlaying}
              onClick={() => handlePredict(sp.id)}
              className={`p-2.5 rounded-lg border text-left text-[12px] font-medium transition-all ${
                prediction === sp.id
                  ? 'bg-medusa-primary/15 border-medusa-primary text-text-primary shadow-subtle'
                  : 'bg-surface border-border/70 text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{sp.name}</span>
                {prediction === sp.id && <AnimatedIcon name="check" size={14} state="success" />}
              </div>
              <span className="text-[10px] font-mono text-text-muted block mt-0.5">{sp.label}</span>
            </button>
          ))}
        </div>

        {revealed && (
          <div className="mt-1 p-2.5 rounded-lg bg-surface border border-border/80 text-[12px] text-text-secondary leading-relaxed animate-fadeRise">
            <strong>Conclusão Física:</strong> A mola <strong>Rígida (k = 300 N/m)</strong> tem a maior força restauradora para qualquer deformação dada. Como ω = √(k/m), a frequência cresce com a raiz de k, resultando no menor período (T = 0.36s) e oscilações muito mais rápidas.
          </div>
        )}
      </div>

      {/* Grid das 3 Molas Lado a Lado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {SPRINGS.map((s) => renderSpringSvg(s))}
      </div>
    </div>
  );
}
