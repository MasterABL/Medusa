'use client';

import React, { useState, useEffect, useRef } from 'react';
import { playFeedback } from '@/lib/audioFeedback';

export function InteractiveWaveBlock() {
  const [frequency, setFrequency] = useState<number>(2.0); // Hz (1 a 5)
  const [wavelengthCm, setWavelengthCm] = useState<number>(20); // cm (10 a 40)
  const [amplitude, setAmplitude] = useState<number>(30); // px (10 a 50)
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [checkpointAnswer, setCheckpointAnswer] = useState<string | null>(null);
  const [checkpointStatus, setCheckpointStatus] = useState<'idle' | 'correct' | 'error'>('idle');

  // Velocidade da onda: v = lambda * f
  const velocityMetersPerSec = (wavelengthCm / 100) * frequency;

  // Animação de onda senoidal progressiva
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    if (isPaused) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      // Velocidade angular omega = 2 * pi * f
      phaseRef.current = (phaseRef.current + 2 * Math.PI * frequency * dt) % (2 * Math.PI * 100);
      setPhase(phaseRef.current);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [frequency, isPaused]);

  const handleCheckpoint = (opt: string) => {
    setCheckpointAnswer(opt);
    if (opt === 'A') {
      setCheckpointStatus('correct');
      playFeedback('learning_correct');
    } else {
      setCheckpointStatus('error');
      playFeedback('learning_error');
    }
  };

  // Gerar curva senoidal SVG para largura 640px
  const width = 640;
  const centerY = 90;
  const kWaveNumber = (2 * Math.PI) / (wavelengthCm * 4); // escala visual

  const points: [number, number][] = [];
  for (let x = 0; x <= width; x += 4) {
    const y = centerY - amplitude * Math.sin(kWaveNumber * x - phase);
    points.push([x, y]);
  }
  const pathD = points.reduce((acc, [px, py], i) => (i === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`), '');

  return (
    <div className="w-full flex flex-col gap-5 my-2">
      <div className="w-full rounded-2xl bg-[#0B1218] dark:bg-[#060B10] border border-[#8FB4E0]/30 p-5 sm:p-7 shadow-calm flex flex-col gap-6 text-white relative overflow-hidden">
        {/* Glow */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #8FB4E0 0%, transparent 70%)' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#8FB4E0]/20 border border-[#8FB4E0]/40 text-[#8FB4E0] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">waves</span>
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8FB4E0] block font-semibold">
                Simulação de Fenômenos Ondulatórios (ENEM)
              </span>
              <h3 className="text-[16px] font-bold tracking-tight text-white">
                Propagação Harmônica: Equação Fundamental v = λ · f
              </h3>
            </div>
          </div>

          <button
            type="button"
            id="btn-toggle-wave-pause"
            onClick={() => {
              setIsPaused(!isPaused);
              playFeedback('action');
            }}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#8FB4E0] text-[#0A121A] hover:bg-[#A9C8EE] flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-subtle"
          >
            <span className="material-symbols-outlined text-[16px]">{isPaused ? 'play_arrow' : 'pause'}</span>
            <span>{isPaused ? 'Animar Onda' : 'Congelar Propagação'}</span>
          </button>
        </div>

        {/* Palco SVG da Onda */}
        <div className="w-full bg-[#060D12] rounded-xl border border-white/10 p-3 sm:p-5 relative select-none">
          <svg viewBox="0 0 640 180" className="w-full h-auto overflow-visible" fill="none">
            {/* Eixo de Equilíbrio */}
            <line x1={0} y1={centerY} x2={640} y2={centerY} stroke="#8FB4E0" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <text x={20} y={centerY - 8} fill="#8FB4E0" fontSize="9" opacity="0.7" fontFamily="monospace">
              Eixo de Equilíbrio
            </text>

            {/* Onda Senoidal */}
            <path d={pathD} stroke="#71DBD2" strokeWidth="3.5" strokeLinecap="round" />

            {/* Marcadores de Comprimento de Onda Lambda */}
            <g opacity="0.9">
              <line x1={120} y1={centerY - amplitude - 12} x2={120 + wavelengthCm * 4} y2={centerY - amplitude - 12} stroke="#FFF18C" strokeWidth="1.5" />
              <circle cx={120} cy={centerY - amplitude - 12} r="2.5" fill="#FFF18C" />
              <circle cx={120 + wavelengthCm * 4} cy={centerY - amplitude - 12} r="2.5" fill="#FFF18C" />
              <text x={120 + (wavelengthCm * 4) / 2} y={centerY - amplitude - 18} fill="#FFF18C" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                λ = {wavelengthCm} cm
              </text>
            </g>

            {/* Marcador de Amplitude A */}
            <g opacity="0.85">
              <line x1={580} y1={centerY} x2={580} y2={centerY - amplitude} stroke="#ADE4B5" strokeWidth="1.5" />
              <text x={592} y={centerY - amplitude / 2 + 4} fill="#ADE4B5" fontSize="10" fontFamily="monospace">
                A = {amplitude}px
              </text>
            </g>
          </svg>
        </div>

        {/* Controles & Velocidade Calculada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          <div className="flex flex-col gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/10">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-white/90">Frequência da Fonte (f)</span>
                <span className="font-mono text-[#8FB4E0] font-bold">{frequency.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={4.0}
                step={0.1}
                value={frequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8FB4E0]"
                aria-label="Ajustar Frequência"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-white/90">Comprimento de Onda (λ)</span>
                <span className="font-mono text-[#FFF18C] font-bold">{wavelengthCm} cm</span>
              </div>
              <input
                type="range"
                min={10}
                max={35}
                step={1}
                value={wavelengthCm}
                onChange={(e) => setWavelengthCm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FFF18C]"
                aria-label="Ajustar Comprimento de Onda"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 bg-white/[0.03] p-4 rounded-xl border border-white/10">
            <span className="text-[11px] font-mono uppercase text-[#8FB4E0] font-semibold tracking-wider">
              Relação Fundamental da Ondulatória
            </span>
            <div className="p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-[14px] flex items-center justify-between flex-wrap gap-2">
              <span className="text-white/80">v = λ · f</span>
              <span className="font-bold text-[#ADE4B5]">
                v = ({(wavelengthCm / 100).toFixed(2)} m) · ({frequency.toFixed(1)} s⁻¹) ={' '}
                <span className="text-[#FFF18C] underline">{velocityMetersPerSec.toFixed(2)} m/s</span>
              </span>
            </div>
            <p className="text-[11.5px] text-white/70 leading-relaxed">
              Pegadinha clássica do ENEM: a <strong>frequência (f)</strong> depende exclusivamente da fonte geradora,
              enquanto a <strong>velocidade (v)</strong> é determinada pelas propriedades físicas do meio de propagação.
            </p>
          </div>
        </div>

        {/* Checkpoint ENEM */}
        <div className="p-4 rounded-xl bg-white/[0.04] border border-[#8FB4E0]/30 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#8FB4E0]/20 text-[#8FB4E0] flex items-center justify-center text-[12px] font-bold">
              ?
            </span>
            <span className="text-[12px] font-bold text-white tracking-tight">
              Questão de Interpretação ENEM: Refração e Frequência
            </span>
          </div>

          <p className="text-[12.5px] text-white/85 leading-relaxed">
            Quando uma onda luminosa ou sonora passa de um meio para outro com refração (mudando sua velocidade de propagação), o que acontece com a sua frequência?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              id="btn-wave-checkpoint-a"
              onClick={() => handleCheckpoint('A')}
              className={`p-3 rounded-xl border text-left text-[12px] transition-all flex items-start gap-2 focus:outline-none ${
                checkpointAnswer === 'A'
                  ? 'border-[#ADE4B5] bg-[#ADE4B5]/25 text-white spring-success font-medium shadow-subtle'
                  : 'border-white/15 bg-white/[0.02] text-white/80 hover:bg-white/[0.06]'
              }`}
            >
              <span className="font-mono font-bold text-[#ADE4B5]">A)</span>
              <span>Permanece constante, pois a frequência é determinada exclusivamente pela fonte.</span>
            </button>

            <button
              type="button"
              id="btn-wave-checkpoint-b"
              onClick={() => handleCheckpoint('B')}
              className={`p-3 rounded-xl border text-left text-[12px] transition-all flex items-start gap-2 focus:outline-none ${
                checkpointAnswer === 'B'
                  ? 'border-[#C45B5B] bg-[#C45B5B]/20 text-white shake-error'
                  : 'border-white/15 bg-white/[0.02] text-white/80 hover:bg-white/[0.06]'
              }`}
            >
              <span className="font-mono font-bold text-white/60">B)</span>
              <span>Aumenta ou diminui na mesma proporção em que a velocidade varia.</span>
            </button>
          </div>

          {checkpointStatus === 'correct' && (
            <div className="p-3 rounded-lg bg-[#ADE4B5]/15 border border-[#ADE4B5]/40 text-[12px] text-[#ADE4B5] flex items-center gap-2 animate-fadeRise">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>
                <strong>Excelente!</strong> A frequência é invariante na refração. Quando v muda, é o comprimento de onda (λ) que se ajusta para manter a relação v = λ · f satisfeita.
              </span>
            </div>
          )}

          {checkpointStatus === 'error' && (
            <div className="p-3 rounded-lg bg-[#C45B5B]/15 border border-[#C45B5B]/40 text-[12px] text-[#FFA3A3] flex items-center gap-2 animate-fadeRise">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>
                Cuidado com o distrator! A frequência depende da fonte emissora e NUNCA muda na refração. Tente novamente!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
