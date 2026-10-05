'use client';

import React, { useState, useMemo } from 'react';
import { ESPIRITUAL_DATA, SpatialAperture, CanonicalSunHour } from './spiritualFixtures';

export function SpiritualContainer() {
  const [data] = useState(ESPIRITUAL_DATA);
  const [activeApertureId, setActiveApertureId] = useState<'proposito' | 'leitura' | 'estudo' | 'oracao'>('proposito');
  const [deepSilence, setDeepSilence] = useState<boolean>(false);

  const currentAperture = useMemo(() => {
    return data.apertures.find((a) => a.id === activeApertureId) || data.apertures[0];
  }, [data.apertures, activeApertureId]);

  return (
    <main
      className={`w-full pb-24 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-10 pt-6 flex-1 transition-all duration-700 ${
        deepSilence ? 'bg-[#0B0F0D] text-[#EDEFEA]' : ''
      }`}
    >
      {/* ================= 1. CABEÇALHO DO SANTUÁRIO: PRESENÇA & VIGÍLIA ================= */}
      <section aria-label="Santuário de Presença" className="flex flex-col gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4A373] living-pulse" />
              <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
                Espiritual · Santuário de Presença, Fé e Caminho
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] font-mono text-[#D4A373]">
                {data.sanctuaryState.currentHourName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-text-primary">
              Santuário da Presença &amp; O Caminho Interior
            </h1>
          </div>

          {/* Botão de Silêncio Profundo e Contador de Vigília */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setDeepSilence(!deepSilence)}
              className={`px-4 py-1.5 rounded-full border text-[11px] font-mono font-semibold transition-all flex items-center gap-2 shadow-subtle ${
                deepSilence
                  ? 'bg-[#D4A373]/25 border-[#D4A373] text-[#D4A373]'
                  : 'bg-surface border-border/80 text-text-primary hover:border-text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {deepSilence ? 'wb_twilight' : 'spa'}
              </span>
              {deepSilence ? 'Silêncio Ativo' : 'Entrar em Silêncio'}
            </button>
            <div className="bg-surface border border-border/70 rounded-xl px-3.5 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Vigília Contínua</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                Dia {data.sanctuaryState.vigilDays}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. O ALTAR DE PROPÓSITO: CHAMA SAGRADA E ESCRITURA ÂNCORA ================= */}
      <section
        aria-label="Altar Central de Presença"
        className="relative rounded-3xl p-8 sm:p-14 border border-[#D4A373]/30 shadow-calm overflow-hidden flex flex-col items-center text-center gap-8 bg-gradient-to-b from-[#18201D]/5 to-[#18201D]/25 dark:from-[#111715] dark:to-[#0D1210]"
      >
        {/* Halo Cenográfico Suave */}
        <div
          className="absolute -top-24 w-96 h-96 rounded-full bg-[#D4A373]/15 blur-3xl pointer-events-none animate-aura-drift"
          aria-hidden="true"
        />

        {/* Chama Sagrada Viva */}
        <div className="relative flex flex-col items-center">
          <div className="w-14 h-20 relative flex items-center justify-center">
            {/* Brilho Expandido */}
            <div className="absolute w-10 h-14 bg-amber-400/25 rounded-full blur-lg animate-pulse" />
            {/* Núcleo da Chama */}
            <div className="w-4 h-9 bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-100 rounded-full animate-flame-flicker shadow-sm" />
          </div>
          {/* Base de Pedra */}
          <div className="w-20 h-2 bg-gradient-to-r from-border-subtle via-border-strong to-border-subtle rounded-full mt-1" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4A373] mt-2 font-bold">
            Chama da Vigília
          </span>
        </div>

        {/* Palavra Âncora Monumental */}
        <div className="max-w-2xl space-y-3 relative z-10">
          <blockquote className="text-xl sm:text-2xl md:text-3xl font-serif italic text-text-primary leading-relaxed tracking-wide">
            &ldquo;{currentAperture.sacredScripture}&rdquo;
          </blockquote>
          <div className="text-[12px] font-mono uppercase tracking-widest text-[#D4A373] font-bold">
            — {currentAperture.reference}
          </div>
        </div>

        {/* Ponto de Recolhimento */}
        <div className="bg-surface/80 dark:bg-surface/40 backdrop-blur-md border border-border/70 rounded-2xl px-6 py-4 max-w-xl text-[13px] text-text-secondary leading-relaxed font-sans shadow-subtle">
          {currentAperture.contemplativeFocus}
        </div>
      </section>

      {/* ================= 3. O ARCO SOLAR DAS HORAS CANÔNICAS (TRANSIÇÃO TEMPORAL) ================= */}
      <section aria-label="Arco Solar das Horas Canônicas" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#D4A373]">
              wb_sunny
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Arco Solar das Horas Canônicas (Transição da Luz ao Crepúsculo)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            {data.sanctuaryState.cycleName}
          </span>
        </div>

        {/* Arco Horizontal Contínuo das 6 Horas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.solarCycle.map((hour) => {
            const isAtual = hour.status === 'atual';
            const isGuardada = hour.status === 'guardada';

            return (
              <div
                key={hour.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  isAtual
                    ? 'bg-[#D4A373]/15 border-[#D4A373] shadow-subtle ring-1 ring-[#D4A373]/40'
                    : 'bg-surface-elevated border-border/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-text-muted">{hour.solarTime}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAtual
                        ? 'bg-[#D4A373] animate-pulse'
                        : isGuardada
                        ? 'bg-[#ADE4B5]'
                        : 'bg-border-strong'
                    }`}
                  />
                </div>

                <div>
                  <h3 className="text-[14px] font-serif font-bold text-text-primary">
                    {hour.name}
                  </h3>
                  <span className="text-[11px] text-text-secondary mt-0.5 block">
                    {hour.sacredAnchor}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/50 text-[9px] font-mono uppercase tracking-wider text-text-muted">
                  {isAtual ? 'Hora Presente' : isGuardada ? 'Guardada ✓' : 'Aguardando'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 4. QUATRO APERTURAS ESPACIAIS DE PRESENÇA ================= */}
      <section aria-label="Quatro Aperturas Espaciais" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.apertures.map((aperture) => {
          const isSelected = activeApertureId === aperture.id;
          return (
            <button
              key={aperture.id}
              type="button"
              onClick={() => setActiveApertureId(aperture.id)}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all duration-300 ${
                isSelected
                  ? 'bg-surface-elevated border-[#D4A373] shadow-md ring-1 ring-[#D4A373]/40'
                  : 'bg-surface border-border/70 hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[24px] text-[#D4A373]">
                  {aperture.icon}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#D4A373] living-pulse" />
                )}
              </div>

              <div>
                <h3 className="text-[15px] font-serif font-bold text-text-primary">
                  {aperture.title}
                </h3>
                <span className="text-[11px] font-mono text-[#D4A373] mt-1 block">
                  {aperture.reference}
                </span>
              </div>

              <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted pt-2 border-t border-border/50">
                {isSelected ? 'Presença Ativa' : 'Abrir Espaço'}
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
}
