'use client';

import React, { useState, useEffect, useRef } from 'react';
import { playFeedback } from '@/lib/audioFeedback';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';

interface InteractiveSimulationHookeProps {
  accentColor?: string;
}

type FormulaToken = 'none' | 'F' | 'minus' | 'k' | 'x';

export function InteractiveSimulationHooke({ accentColor = '#71DBD2' }: InteractiveSimulationHookeProps) {
  // Estado físico real do oscilador
  const [xCm, setXCm] = useState<number>(4.0); // Deslocamento em cm (-8 a +8)
  const [kConstant, setKConstant] = useState<number>(25); // Constante elástica N/m (10 a 50)
  const [isOscillating, setIsOscillating] = useState<boolean>(false);
  const [checkpointAnswer, setCheckpointAnswer] = useState<string | null>(null);
  const [checkpointStatus, setCheckpointStatus] = useState<'idle' | 'correct' | 'error'>('idle');

  // Token interativo de Bret Victor: hover na equação ilumina o elemento físico correspondente
  const [hoveredToken, setHoveredToken] = useState<FormulaToken>('none');

  // Variáveis para animação de oscilação MHS
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const initialAmplitudeRef = useRef<number>(4.0);

  // Cálculos físicos reais
  const xMeters = xCm / 100;
  const massKg = 1.0;
  const forceNewtons = -kConstant * xMeters;
  const potentialEnergyJoules = 0.5 * kConstant * Math.pow(xMeters, 2);
  
  // Amplitude máxima registrada para balanço de energia total E = Ep + Ek
  const currentAmplitudeMeters = isOscillating ? Math.abs(initialAmplitudeRef.current / 100) : Math.max(0.04, Math.abs(xMeters));
  const totalMechanicalEnergy = 0.5 * kConstant * Math.pow(currentAmplitudeMeters, 2);
  const kineticEnergyJoules = isOscillating ? Math.max(0, totalMechanicalEnergy - potentialEnergyJoules) : 0;
  
  const naturalFrequencyOmega = Math.sqrt(kConstant / massKg); // rad/s
  const oscillationPeriodSec = (2 * Math.PI) / naturalFrequencyOmega;

  // Animação MHS contínua: x(t) = A * cos(omega * t) * e^(-gamma * t)
  useEffect(() => {
    if (!isOscillating) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    startTimeRef.current = performance.now();
    initialAmplitudeRef.current = Math.abs(xCm) > 0.5 ? xCm : 5.0;

    const loop = (now: number) => {
      const elapsedSec = (now - startTimeRef.current) / 1000;
      const damping = Math.exp(-0.06 * elapsedSec); // Leve amortecimento realista
      const currentX = initialAmplitudeRef.current * Math.cos(naturalFrequencyOmega * elapsedSec) * damping;

      if (Math.abs(currentX) < 0.08 && elapsedSec > 10) {
        setXCm(0);
        setIsOscillating(false);
        return;
      }

      setXCm(parseFloat(currentX.toFixed(2)));
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOscillating, kConstant, naturalFrequencyOmega]);

  const handleSliderChange = (newVal: number) => {
    if (isOscillating) setIsOscillating(false);
    setXCm(newVal);
  };

  const handleToggleOscillation = () => {
    if (!isOscillating && Math.abs(xCm) < 0.5) {
      setXCm(5.0);
    }
    setIsOscillating((prev) => !prev);
    playFeedback('action');
  };

  const handlePresetSpring = (k: number) => {
    setKConstant(k);
    playFeedback('action');
  };

  const handleCheckpointSelect = (optId: string) => {
    setCheckpointAnswer(optId);
    if (optId === 'B') {
      setCheckpointStatus('correct');
      playFeedback('learning_correct');
    } else {
      setCheckpointStatus('error');
      playFeedback('learning_error');
    }
  };

  // Coordenadas SVG responsivas do oscilador (Canvas de 640 x 170)
  const wallX = 60;
  const equilibriumX = 320; // x = 0
  const floorY = 140;
  const blockWidth = 60;
  const blockHeight = 50;
  const blockY = floorY - blockHeight;

  // Escala: 1 cm = 18 px no canvas
  const pxPerCm = 18;
  const blockX = equilibriumX + xCm * pxPerCm - blockWidth / 2;

  // Gerador de espiras da mola helicoidal (SVG Path)
  const springStartX = wallX;
  const springEndX = blockX;
  const springLength = springEndX - springStartX;
  const numCoils = 14;
  const coilHeight = 18;
  const coilPitch = springLength / numCoils;
  const springCenterY = blockY + blockHeight / 2;

  let springPath = `M ${springStartX} ${springCenterY}`;
  for (let i = 0; i < numCoils; i++) {
    const cx1 = springStartX + i * coilPitch + coilPitch * 0.25;
    const cy1 = springCenterY - coilHeight;
    const cx2 = springStartX + i * coilPitch + coilPitch * 0.75;
    const cy2 = springCenterY + coilHeight;
    const endX = springStartX + (i + 1) * coilPitch;
    springPath += ` Q ${cx1} ${cy1}, ${springStartX + (i + 0.5) * coilPitch} ${springCenterY} Q ${cx2} ${cy2}, ${endX} ${springCenterY}`;
  }

  // Vetor Força Restauradora (seta apontando na direção de F)
  const forceVectorScale = 3.2; // pixels por Newton
  const forceVectorLength = Math.min(120, Math.abs(forceNewtons) * forceVectorScale);
  const forceArrowStartX = blockX + blockWidth / 2;
  const forceArrowEndX =
    forceNewtons < 0
      ? forceArrowStartX - forceVectorLength // Aponta para esquerda (x > 0)
      : forceArrowStartX + forceVectorLength; // Aponta para direita (x < 0)

  // Gráfico Característico F vs x (Dimensões do Mini-Plot SVG: 260x120)
  const plotW = 260;
  const plotH = 110;
  const plotCenterX = plotW / 2;
  const plotCenterY = plotH / 2;
  // Mapeamento: x (-8 a +8 cm) -> (20 a 240 px)
  const plotPxPerCm = (plotW - 40) / 16;
  // Força (-4 a +4 N) -> (15 a 95 px vertical, invertido)
  const plotPxPerNewton = (plotH - 30) / 8;
  
  const currentPlotPointX = plotCenterX + xCm * plotPxPerCm;
  const currentPlotPointY = plotCenterY - forceNewtons * plotPxPerNewton; // No SVG, Y cresce para baixo

  // Pontos da reta linear F = -k·x no gráfico
  const plotLineX1 = plotCenterX - 8 * plotPxPerCm;
  const plotLineY1 = plotCenterY - (-kConstant * -0.08) * plotPxPerNewton;
  const plotLineX2 = plotCenterX + 8 * plotPxPerCm;
  const plotLineY2 = plotCenterY - (-kConstant * 0.08) * plotPxPerNewton;

  return (
    <div id="hooke-law-simulation" className="w-full flex flex-col gap-5 my-2">
      {/* Workshop Pedagógico: Simulação Interativa */}
      <div className="w-full rounded-2xl bg-[#0C1311] dark:bg-[#070B0A] border border-[#71DBD2]/30 p-4 sm:p-6 shadow-calm flex flex-col gap-5 text-white relative overflow-hidden">
        {/* Ambient Glow */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #71DBD2 0%, transparent 70%)' }}
        />

        {/* Cabeçalho do Laboratório Visual */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#71DBD2]/20 border border-[#71DBD2]/40 text-[#71DBD2] flex items-center justify-center flex-shrink-0">
              <AnimatedIcon name="science" size={18} interactive />
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71DBD2] block font-semibold">
                Simulação Física Interativa & Gráfico Progressivo
              </span>
              <h3 className="text-[16px] font-bold tracking-tight text-white">
                Dinamômetro & Força Restauradora (MHS)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Presets de Rigidez */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-[11px]">
              <span className="px-2 text-white/50 text-[10px] font-mono uppercase">Mola:</span>
              <button
                type="button"
                id="btn-spring-preset-soft"
                onClick={() => handlePresetSpring(15)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  kConstant === 15 ? 'bg-[#71DBD2]/25 text-[#71DBD2] font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                Macia (15 N/m)
              </button>
              <button
                type="button"
                id="btn-spring-preset-standard"
                onClick={() => handlePresetSpring(25)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  kConstant === 25 ? 'bg-[#71DBD2]/25 text-[#71DBD2] font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                Padrão (25 N/m)
              </button>
              <button
                type="button"
                id="btn-spring-preset-stiff"
                onClick={() => handlePresetSpring(45)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  kConstant === 45 ? 'bg-[#71DBD2]/25 text-[#71DBD2] font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                Rígida (45 N/m)
              </button>
            </div>

            <button
              type="button"
              id="btn-toggle-hooke-oscillation"
              onClick={handleToggleOscillation}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-[#71DBD2] ${
                isOscillating
                  ? 'bg-[#FFF18C] text-[#3D3200] hover:bg-[#FFE866]'
                  : 'bg-[#71DBD2] text-[#111A17] hover:bg-[#5EC7BD]'
              }`}
            >
              <AnimatedIcon
                name={isOscillating ? 'pause' : 'play'}
                state={isOscillating ? 'active' : 'idle'}
                size={16}
              />
              <span>{isOscillating ? 'Pausar Oscilação' : 'Oscilar MHS Livre'}</span>
            </button>
          </div>
        </div>

        {/* Palco Visual SVG (O oscilador em tempo real) */}
        <div className="w-full bg-[#070D0B] rounded-xl border border-white/10 p-3 sm:p-5 relative select-none">
          <svg viewBox="0 0 640 170" className="w-full h-auto overflow-visible" fill="none">
            {/* Parede de ancoragem à esquerda */}
            <line x1={wallX} y1={25} x2={wallX} y2={floorY} stroke="#4A655A" strokeWidth="4" />
            {[35, 55, 75, 95, 115, 135].map((y) => (
              <line key={y} x1={wallX - 12} y1={y + 8} x2={wallX} y2={y} stroke="#4A655A" strokeWidth="2" opacity="0.6" />
            ))}

            {/* Piso sem atrito */}
            <line x1={wallX} y1={floorY} x2={620} y2={floorY} stroke="#2C4038" strokeWidth="2" />

            {/* Eixo de Equilíbrio (x = 0) */}
            <line
              x1={equilibriumX}
              y1={20}
              x2={equilibriumX}
              y2={floorY + 12}
              stroke="#FFF18C"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
            <text x={equilibriumX} y={15} fill="#FFF18C" fontSize="10" textAnchor="middle" fontFamily="monospace">
              Eixo x = 0 (Equilíbrio)
            </text>

            {/* Mola Helicoidal */}
            <path
              d={springPath}
              stroke={hoveredToken === 'k' ? '#FFF18C' : '#71DBD2'}
              strokeWidth={hoveredToken === 'k' ? '4.5' : '3.5'}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isOscillating ? 'transition-none' : 'transition-all duration-75'}
            />

            {/* Bloco de Massa m */}
            <rect
              x={blockX}
              y={blockY}
              width={blockWidth}
              height={blockHeight}
              rx="8"
              fill="#182A24"
              stroke={hoveredToken === 'k' ? '#FFF18C' : '#71DBD2'}
              strokeWidth="2"
              className={isOscillating ? 'transition-none' : 'transition-all duration-75'}
            />
            <text
              x={blockX + blockWidth / 2}
              y={blockY + blockHeight / 2 + 4}
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              m = 1 kg
            </text>

            {/* Indicador de Deslocamento x */}
            {Math.abs(xCm) > 0.2 && (
              <g>
                <line
                  x1={equilibriumX}
                  y1={floorY + 18}
                  x2={blockX + blockWidth / 2}
                  y2={floorY + 18}
                  stroke={hoveredToken === 'x' ? '#ADE4B5' : '#FFF18C'}
                  strokeWidth={hoveredToken === 'x' ? '2.5' : '1.5'}
                />
                <circle cx={blockX + blockWidth / 2} cy={floorY + 18} r="3" fill="#FFF18C" />
                <text
                  x={(equilibriumX + blockX + blockWidth / 2) / 2}
                  y={floorY + 30}
                  fill={hoveredToken === 'x' ? '#ADE4B5' : '#FFF18C'}
                  fontSize="10"
                  fontWeight={hoveredToken === 'x' ? 'bold' : 'normal'}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  x = {xCm > 0 ? `+${xCm.toFixed(1)}` : xCm.toFixed(1)} cm
                </text>
              </g>
            )}

            {/* Vetor Força Restauradora F */}
            {Math.abs(forceVectorLength) > 6 && (
              <g>
                <line
                  x1={forceArrowStartX}
                  y1={blockY - 14}
                  x2={forceArrowEndX}
                  y2={blockY - 14}
                  stroke={hoveredToken === 'F' ? '#FFF18C' : forceNewtons < 0 ? '#71DBD2' : '#ADE4B5'}
                  strokeWidth={hoveredToken === 'F' ? '4.5' : '3'}
                />
                {/* Ponta da Seta */}
                {forceNewtons < 0 ? (
                  <polygon
                    points={`${forceArrowEndX},${blockY - 14} ${forceArrowEndX + 8},${blockY - 18} ${forceArrowEndX + 8},${blockY - 10}`}
                    fill={hoveredToken === 'F' ? '#FFF18C' : '#71DBD2'}
                  />
                ) : (
                  <polygon
                    points={`${forceArrowEndX},${blockY - 14} ${forceArrowEndX - 8},${blockY - 18} ${forceArrowEndX - 8},${blockY - 10}`}
                    fill={hoveredToken === 'F' ? '#FFF18C' : '#ADE4B5'}
                  />
                )}
                <text
                  x={(forceArrowStartX + forceArrowEndX) / 2}
                  y={blockY - 22}
                  fill={hoveredToken === 'F' ? '#FFF18C' : forceNewtons < 0 ? '#71DBD2' : '#ADE4B5'}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  F = {forceNewtons.toFixed(1)} N
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Área Explicativa Bret Victor: Fórmula com Tokens Vivos Conectados */}
        <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2">
            <AnimatedIcon name="functions" size={16} className="text-[#71DBD2]" />
            <span className="text-white/70 font-sans">Passe o cursor sobre os símbolos da fórmula:</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[16px] select-none">
            <span
              id="token-hooke-F"
              onMouseEnter={() => setHoveredToken('F')}
              onMouseLeave={() => setHoveredToken('none')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                hoveredToken === 'F' ? 'bg-[#71DBD2] text-[#111A17] font-bold scale-105' : 'text-[#71DBD2] hover:bg-white/10'
              }`}
              title="Vetor Força Restauradora (Newtons)"
            >
              F
            </span>
            <span className="text-white/40">=</span>
            <span
              id="token-hooke-minus"
              onMouseEnter={() => setHoveredToken('minus')}
              onMouseLeave={() => setHoveredToken('none')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                hoveredToken === 'minus' ? 'bg-[#FFF18C] text-[#3D3200] font-bold scale-105' : 'text-[#FFF18C] hover:bg-white/10'
              }`}
              title="Sinal Negativo: a força sempre resiste e aponta no sentido oposto ao deslocamento"
            >
              -
            </span>
            <span
              id="token-hooke-k"
              onMouseEnter={() => setHoveredToken('k')}
              onMouseLeave={() => setHoveredToken('none')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                hoveredToken === 'k' ? 'bg-[#ADE4B5] text-[#102B19] font-bold scale-105' : 'text-[#ADE4B5] hover:bg-white/10'
              }`}
              title="Constante Elástica da Mola (N/m): rigidez do material"
            >
              k
            </span>
            <span className="text-white/40">·</span>
            <span
              id="token-hooke-x"
              onMouseEnter={() => setHoveredToken('x')}
              onMouseLeave={() => setHoveredToken('none')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                hoveredToken === 'x' ? 'bg-[#FFF18C] text-[#3D3200] font-bold scale-105' : 'text-[#FFF18C] hover:bg-white/10'
              }`}
              title="Deslocamento em relação ao ponto de equilíbrio x=0"
            >
              x
            </span>
          </div>

          <div className="text-[11.5px] font-sans text-white/60 text-right">
            {hoveredToken === 'F' && <span className="text-[#71DBD2]">Força restauradora aplicada ao bloco</span>}
            {hoveredToken === 'minus' && <span className="text-[#FFF18C]">Sinal negativo: restaura o equilíbrio estável</span>}
            {hoveredToken === 'k' && <span className="text-[#ADE4B5]">Rigidez da mola: k = {kConstant} N/m</span>}
            {hoveredToken === 'x' && <span className="text-[#FFF18C]">Deformação atual: x = {xCm > 0 ? `+${xCm}` : xCm} cm</span>}
            {hoveredToken === 'none' && <span>Fórmula interativa conectada ao palco visual</span>}
          </div>
        </div>

        {/* Controles Físicos Interativos + Gráfico Progressivo F x x */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
          {/* Coluna 1: Sliders e Gráfico F x x */}
          <div className="flex flex-col gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/10">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-white/90">Deslocamento (x)</span>
                <span className="font-mono text-[#FFF18C] font-bold">
                  {xCm > 0 ? `+${xCm.toFixed(1)}` : xCm.toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                id="slider-hooke-displacement"
                min={-8}
                max={8}
                step={0.2}
                value={xCm}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#71DBD2]"
                aria-label="Ajustar Deslocamento x"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/50">
                <span>-8 cm (Compressão)</span>
                <span>0 (Equilíbrio)</span>
                <span>+8 cm (Extensão)</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-white/90">Constante Elástica da Mola (k)</span>
                <span className="font-mono text-[#71DBD2] font-bold">{kConstant} N/m</span>
              </div>
              <input
                type="range"
                id="slider-hooke-spring-k"
                min={10}
                max={50}
                step={5}
                value={kConstant}
                onChange={(e) => setKConstant(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#71DBD2]"
                aria-label="Ajustar Constante Elástica k"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/50">
                <span>10 N/m (Macia)</span>
                <span>50 N/m (Rígida)</span>
              </div>
            </div>

            {/* GRÁFICO DINÂMICO F x x (Característica Linear de Hooke) */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#71DBD2] font-semibold flex items-center gap-1 font-mono uppercase tracking-wider">
                  <AnimatedIcon name="analytics" size={14} />
                  Gráfico Força × Deslocamento
                </span>
                <span className="font-mono text-white/50 text-[10px]">
                  Inclinação = -k (-{kConstant} N/m)
                </span>
              </div>

              <div className="w-full bg-[#050908] rounded-lg p-2 border border-white/10 relative">
                <svg viewBox={`0 0 ${plotW} ${plotH}`} className="w-full h-auto overflow-visible select-none">
                  {/* Grid de fundo */}
                  <line x1={20} y1={plotCenterY} x2={plotW - 20} y2={plotCenterY} stroke="#2C4038" strokeWidth="1" />
                  <line x1={plotCenterX} y1={10} x2={plotCenterX} y2={plotH - 10} stroke="#2C4038" strokeWidth="1" />

                  {/* Rótulos dos eixos */}
                  <text x={plotW - 15} y={plotCenterY + 4} fill="#888" fontSize="9" fontFamily="monospace">x</text>
                  <text x={plotCenterX + 5} y={15} fill="#888" fontSize="9" fontFamily="monospace">F</text>

                  {/* Reta Característica F = -k·x */}
                  <line
                    x1={plotLineX1}
                    y1={plotLineY1}
                    x2={plotLineX2}
                    y2={plotLineY2}
                    stroke="#71DBD2"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.85"
                  />

                  {/* Ponto de Operação Atual em Tempo Real */}
                  <circle
                    cx={currentPlotPointX}
                    cy={currentPlotPointY}
                    r="4.5"
                    fill="#FFF18C"
                    className="transition-all duration-75"
                  />
                  <circle
                    cx={currentPlotPointX}
                    cy={currentPlotPointY}
                    r="8"
                    fill="none"
                    stroke="#FFF18C"
                    strokeWidth="1"
                    opacity="0.5"
                    className="animate-ping"
                  />

                  {/* Coordenadas do Ponto */}
                  <text
                    x={currentPlotPointX > plotCenterX ? currentPlotPointX - 10 : currentPlotPointX + 10}
                    y={currentPlotPointY < plotCenterY ? currentPlotPointY + 12 : currentPlotPointY - 6}
                    fill="#FFF18C"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor={currentPlotPointX > plotCenterX ? 'end' : 'start'}
                  >
                    ({xCm > 0 ? `+${xCm.toFixed(1)}` : xCm.toFixed(1)}cm, {forceNewtons.toFixed(1)}N)
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Coluna 2: Conservação de Energia (Ep x Ek) e Telemetria MHS */}
          <div className="flex flex-col justify-between gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/10">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-[#71DBD2] font-semibold tracking-wider block">
                Equação Fundamental & Telemetria
              </span>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[13.5px] flex items-center justify-between flex-wrap gap-2">
                <span className="text-white/80">F = -k · x</span>
                <span className="font-bold text-[#71DBD2]">
                  F = -({kConstant}) · ({xMeters >= 0 ? `+${xMeters.toFixed(2)}` : xMeters.toFixed(2)}) ={' '}
                  <span className="text-[#FFF18C] underline decoration-[#FFF18C]/50">{forceNewtons.toFixed(2)} N</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70 pt-1">
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <span className="text-white/50 block">Freq. Angular (ω₀):</span>
                  <span className="text-white font-bold">{naturalFrequencyOmega.toFixed(2)} rad/s</span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <span className="text-white/50 block">Período (T = 2π/ω₀):</span>
                  <span className="text-white font-bold">{oscillationPeriodSec.toFixed(2)} s</span>
                </div>
              </div>
            </div>

            {/* DUAL ENERGY EXCHANGE METER: Ep (Potencial) vs Ek (Cinética) */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 font-medium flex items-center gap-1.5">
                  <AnimatedIcon name="bolt" size={14} className="text-[#ADE4B5]" />
                  Conservação da Energia Mecânica (E = Ep + Ek)
                </span>
                <span className="font-mono text-[#ADE4B5] font-semibold">
                  {(potentialEnergyJoules + kineticEnergyJoules).toFixed(3)} J
                </span>
              </div>

              {/* Barra de Troca Energética */}
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex">
                {/* Parcela Potencial Elástica Ep */}
                <div
                  className="h-full bg-gradient-to-r from-[#71DBD2] to-[#ADE4B5] transition-all duration-75"
                  style={{
                    width: `${totalMechanicalEnergy > 0 ? (potentialEnergyJoules / totalMechanicalEnergy) * 100 : 50}%`,
                  }}
                  title={`Energia Potencial: ${potentialEnergyJoules.toFixed(3)} J`}
                />
                {/* Parcela Cinética Ek */}
                <div
                  className="h-full bg-gradient-to-r from-[#FFF18C] to-[#E5A83B] transition-all duration-75"
                  style={{
                    width: `${totalMechanicalEnergy > 0 ? (kineticEnergyJoules / totalMechanicalEnergy) * 100 : 50}%`,
                  }}
                  title={`Energia Cinética: ${kineticEnergyJoules.toFixed(3)} J`}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-white/60">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#71DBD2]" />
                  Ep (Potencial): {potentialEnergyJoules.toFixed(3)} J
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#FFF18C]" />
                  Ek (Cinética): {kineticEnergyJoules.toFixed(3)} J
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkpoint Pedagógico Interativo: Pergunta de Fixação do Conceito */}
        <div className="mt-2 p-4 sm:p-5 rounded-xl bg-white/[0.04] border border-[#71DBD2]/30 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#FFF18C]/20 text-[#FFF18C] flex items-center justify-center text-[12px] font-bold">
              ?
            </span>
            <span className="text-[12px] font-bold text-white tracking-tight">
              Checkpoint de Fixação: Sentido da Força Restauradora
            </span>
          </div>

          <p className="text-[12.5px] text-white/85 leading-relaxed">
            Se deslocamos o bloco para a direita (<code className="font-mono text-[#FFF18C]">x &gt; 0</code>), para qual direção atua a força que a mola exerce sobre o bloco?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              id="btn-checkpoint-opt-a"
              onClick={() => handleCheckpointSelect('A')}
              className={`p-3 rounded-xl border text-left text-[12px] transition-all flex items-start gap-2 focus:outline-none ${
                checkpointAnswer === 'A'
                  ? 'border-[#C45B5B] bg-[#C45B5B]/20 text-white shake-error'
                  : 'border-white/15 bg-white/[0.02] text-white/80 hover:bg-white/[0.06] hover:border-white/30'
              }`}
            >
              <span className="font-mono font-bold text-white/60">A)</span>
              <span>Para a direita (+x), acelerando o bloco para longe da origem.</span>
            </button>

            <button
              type="button"
              id="btn-checkpoint-opt-b"
              onClick={() => handleCheckpointSelect('B')}
              className={`p-3 rounded-xl border text-left text-[12px] transition-all flex items-start gap-2 focus:outline-none ${
                checkpointAnswer === 'B'
                  ? 'border-[#ADE4B5] bg-[#ADE4B5]/25 text-white spring-success font-medium shadow-subtle'
                  : 'border-white/15 bg-white/[0.02] text-white/80 hover:bg-white/[0.06] hover:border-white/30'
              }`}
            >
              <span className="font-mono font-bold text-[#ADE4B5]">B)</span>
              <span>Para a esquerda (-x), puxando o bloco de volta para o equilíbrio.</span>
            </button>
          </div>

          {checkpointStatus === 'correct' && (
            <div className="p-3 rounded-lg bg-[#ADE4B5]/15 border border-[#ADE4B5]/40 text-[12px] text-[#ADE4B5] flex items-center gap-2 animate-fadeRise">
              <AnimatedIcon name="check_circle" size={18} className="text-[#ADE4B5]" />
              <span>
                <strong>Correto!</strong> O sinal negativo da Lei de Hooke (F = -kx) garante que a força seja sempre
                restauradora, agindo em oposição direta ao deslocamento para reconduzir o corpo à posição de equilíbrio.
              </span>
            </div>
          )}

          {checkpointStatus === 'error' && (
            <div className="p-3 rounded-lg bg-[#C45B5B]/15 border border-[#C45B5B]/40 text-[12px] text-[#FFA3A3] flex items-center gap-2 animate-fadeRise">
              <AnimatedIcon name="info" size={18} className="text-[#FFA3A3]" />
              <span>
                Observe o vetor no gráfico acima: ao mover o bloco para a direita (+x), a mola esticada tenta
                puxá-lo de volta para a esquerda (-x). Tente novamente!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
