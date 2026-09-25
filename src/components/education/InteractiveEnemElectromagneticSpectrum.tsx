'use client';

import React, { useState } from 'react';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { playFeedback } from '@/lib/audioFeedback';

interface SpectrumBand {
  id: string;
  name: string;
  freqRange: string;
  lambdaRange: string;
  freqHzExp: number; // Expoente de 10
  isIonizing: boolean;
  enemContext: string;
  application: string;
  penetrationLevel: number; // 1 a 5
  color: string;
}

const BANDS: SpectrumBand[] = [
  {
    id: 'radio',
    name: 'Ondas de Rádio',
    freqRange: '10⁴ – 10⁸ Hz',
    lambdaRange: '10³ – 1 m',
    freqHzExp: 7,
    isIonizing: false,
    enemContext: 'Transmissão AM/FM e telecomunicações de longo alcance por difração na atmosfera.',
    application: 'Antenas de transmissão e telecomunicação.',
    penetrationLevel: 1,
    color: '#8FB4E0',
  },
  {
    id: 'microwave',
    name: 'Micro-ondas',
    freqRange: '10⁹ – 10¹¹ Hz',
    lambdaRange: '1 m – 1 mm',
    freqHzExp: 10,
    isIonizing: false,
    enemContext: 'Aquecimento por agitação dipolar das moléculas de água e redes Wi-Fi (2.4 GHz e 5 GHz).',
    application: 'Fornos micro-ondas e roteadores Wi-Fi.',
    penetrationLevel: 2,
    color: '#7FC2C9',
  },
  {
    id: 'visible',
    name: 'Luz Visível',
    freqRange: '4·10¹⁴ – 8·10¹⁴ Hz',
    lambdaRange: '700 – 400 nm',
    freqHzExp: 14.5,
    isIonizing: false,
    enemContext: 'Fotossíntese nas plantas e percepção visual humana pelos cones e bastonetes da retina.',
    application: 'Iluminação, fibra óptica e fotossíntese.',
    penetrationLevel: 2,
    color: '#FFF18C',
  },
  {
    id: 'uv',
    name: 'Ultravioleta (UV)',
    freqRange: '8·10¹⁴ – 3·10¹⁶ Hz',
    lambdaRange: '400 – 10 nm',
    freqHzExp: 15.5,
    isIonizing: true,
    enemContext: 'Quebra de ligações moleculares de DNA na pele (necessidade de filtro solar) e camada de ozônio.',
    application: 'Esterilização hospitalar e síntese de vitamina D.',
    penetrationLevel: 3,
    color: '#B6A6E0',
  },
  {
    id: 'xray',
    name: 'Raios X',
    freqRange: '3·10¹⁶ – 3·10¹⁹ Hz',
    lambdaRange: '10 nm – 0,01 nm',
    freqHzExp: 18,
    isIonizing: true,
    enemContext: 'Diferencial de absorção entre tecido mole (atravessa) e osso denso rico em cálcio (absorve).',
    application: 'Radiografia médica, tomografia e inspeção de bagagens.',
    penetrationLevel: 5,
    color: '#C45B5B',
  },
];

export function InteractiveEnemElectromagneticSpectrum() {
  const [selectedBandId, setSelectedBandId] = useState<string>('microwave');
  const [enemAnswer, setEnemAnswer] = useState<string | null>(null);
  const [enemFeedback, setEnemFeedback] = useState<'idle' | 'correct' | 'error'>('idle');

  const selectedBand = BANDS.find((b) => b.id === selectedBandId) || BANDS[1];

  const handleSelectBand = (id: string) => {
    setSelectedBandId(id);
    playFeedback('navigation');
  };

  const handleAnswerEnem = (option: string) => {
    setEnemAnswer(option);
    if (option === 'C') {
      setEnemFeedback('correct');
      playFeedback('success');
    } else {
      setEnemFeedback('error');
      playFeedback('error');
    }
  };

  return (
    <div
      id="enem-spectrum-visualizer"
      className="w-full bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-calm flex flex-col gap-6 mt-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#8FB4E0]/20 border border-[#8FB4E0]/40 text-[#8FB4E0] flex items-center justify-center flex-shrink-0">
            <AnimatedIcon name="analytics" size={17} />
          </span>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8FB4E0] font-bold block">
              Interpretação de Gráficos & Espectro Eletromagnético (ENEM)
            </span>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              Relação entre Frequência f, Energia do Fóton E = h·f e Poder de Penetração
            </h3>
          </div>
        </div>
      </div>

      {/* Régua Seletora do Espectro Eletromagnético */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
          Frequência Crescente (f) → Energia do Fóton Crescente (E = hf)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {BANDS.map((band) => {
            const isSelected = selectedBand.id === band.id;
            return (
              <button
                key={band.id}
                type="button"
                id={`btn-spectrum-${band.id}`}
                onClick={() => handleSelectBand(band.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-surface-secondary border-[#8FB4E0] shadow-subtle scale-[1.02]'
                    : 'bg-surface/60 border-border/70 text-text-secondary hover:bg-surface-secondary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: isSelected ? band.color : undefined }}
                  >
                    {band.name}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: band.color }}
                  />
                </div>
                <span className="text-[10px] font-mono text-text-muted">{band.freqRange}</span>
                <span
                  className={`text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded self-start mt-0.5 ${
                    band.isIonizing ? 'bg-medusa-alert/20 text-medusa-alert' : 'bg-medusa-support/15 text-medusa-support'
                  }`}
                >
                  {band.isIonizing ? 'Ionizante' : 'Não-Ionizante'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel de Análise Científica e Interpretação de Dados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-secondary/40 p-4 sm:p-5 rounded-xl border border-border/70">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedBand.color }}
            />
            <h4 className="text-[14px] font-bold text-text-primary">
              {selectedBand.name} no Contexto do ENEM
            </h4>
          </div>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            {selectedBand.enemContext}
          </p>

          <div className="flex items-center gap-2 text-[12px] text-text-muted pt-1">
            <span className="font-semibold text-text-primary">Aplicação prática:</span>
            <span>{selectedBand.application}</span>
          </div>
        </div>

        {/* Medidor de Penetração & Radiação */}
        <div className="flex flex-col justify-between gap-3 bg-surface p-4 rounded-xl border border-border/70">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted">Poder de Penetração Tecidual:</span>
            <span className="font-bold text-text-primary">
              Nível {selectedBand.penetrationLevel} de 5
            </span>
          </div>

          <div className="w-full bg-surface-secondary rounded-full h-2.5 overflow-hidden flex gap-1 p-0.5 border border-border/60">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <div
                key={lvl}
                className="flex-1 h-full rounded-sm transition-all duration-300"
                style={{
                  backgroundColor:
                    lvl <= selectedBand.penetrationLevel
                      ? selectedBand.color
                      : 'rgba(255,255,255,0.06)',
                }}
              />
            ))}
          </div>

          <div className="text-[11px] text-text-secondary flex items-start gap-1.5 pt-1 border-t border-border/50">
            <AnimatedIcon name="info" size={14} className="text-[#8FB4E0] flex-shrink-0 mt-0.5" />
            <span>
              {selectedBand.isIonizing
                ? 'Radiação Ionizante: possui energia fóton suficiente para ejetar elétrons dos átomos e romper ligações químicas vitais.'
                : 'Radiação Não-Ionizante: excita rotação/vibração molecular ou corrente elétrica leve, sem alterar estruturas atômicas do DNA.'}
            </span>
          </div>
        </div>
      </div>

      {/* Questão Contextualizada Típica do ENEM */}
      <div className="p-4 rounded-xl bg-surface-secondary/50 border border-border/70 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#8FB4E0] font-bold flex items-center gap-1.5">
            <AnimatedIcon name="auto_stories" size={14} />
            Desafio Aplicado: Matriz ENEM Habilidade 17
          </span>
          {enemFeedback !== 'idle' && (
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                enemFeedback === 'correct'
                  ? 'bg-medusa-support/20 text-medusa-support'
                  : 'bg-medusa-alert/20 text-medusa-alert'
              }`}
            >
              {enemFeedback === 'correct' ? '✓ Resposta Correta!' : 'Tente Novamente'}
            </span>
          )}
        </div>

        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          Um técnico de radiologia utiliza um biombo de chumbo para se proteger, enquanto o vidro da porta do forno micro-ondas possui apenas uma grade metálica com pequenos orifícios. Por que a grade de metal bloqueia a micro-onda, mas não barraria os Raios X?
        </p>

        <div className="flex flex-col gap-2 pt-1">
          {[
            {
              id: 'A',
              text: 'A) As micro-ondas são radiação mecânica, logo refletem em qualquer obstáculo sólido.',
            },
            {
              id: 'B',
              text: 'B) Os Raios X viajam muito mais rápido que as micro-ondas no ar, perfurando a grade.',
            },
            {
              id: 'C',
              text: 'C) O comprimento de onda das micro-ondas (~12 cm) é muito maior que os furos da grade (difração/bloqueio), enquanto os Raios X têm comprimento sub-nanométrico e atravessam facilmente.',
            },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              id={`btn-enem-opt-${opt.id}`}
              onClick={() => handleAnswerEnem(opt.id)}
              className={`p-3 rounded-lg border text-left text-[12px] font-medium transition-all ${
                enemAnswer === opt.id
                  ? opt.id === 'C'
                    ? 'bg-medusa-support/15 border-medusa-support text-text-primary'
                    : 'bg-medusa-alert/15 border-medusa-alert text-text-primary'
                  : 'bg-surface border-border/70 text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{opt.text}</span>
                {enemAnswer === opt.id && (
                  <AnimatedIcon
                    name={opt.id === 'C' ? 'check' : 'close'}
                    size={14}
                    state={opt.id === 'C' ? 'success' : 'error'}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
