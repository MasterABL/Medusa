'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * PROTÓTIPO — Dynamic Island + Áudio (Round 7 §16/§17).
 *
 * NÃO é a Dynamic Island de produção (`DynamicIsland.tsx`) nem um 11º estado dela — o catálogo
 * canônico do Island é explicitamente fechado em 10 estados (ver `islandFixtures.ts`, "NOTA DE
 * ARQUITETURA"), e o pedido desta rodada foi explícito: "esse protótipo deve servir pra eu sentir
 * a linguagem visual antes de decidirmos a implementação final" — não pra já virar produção.
 *
 * Vive só em `/dev/motion-lab` (dev playground), reaproveitando a estética real do Island (mesma
 * cápsula, mesmo `living-pulse`, mesmas durações de `--duration-island`) sem tocar no componente
 * real nem na máquina de estados já testada dele.
 *
 * Áudio é REAL (Web Audio API, osciladores — mesmo princípio de `audioFeedback.ts`, sem arquivo
 * nem serviço pago) e o waveform reage a um `AnalyserNode` de verdade lendo o sinal gerado — não é
 * uma animação decorativa fingindo reagir a áudio. Título/artista são fixture (não há Spotify
 * real conectado, ver Round 5/6 §35 — bloqueio de rede do sandbox pra `open.spotify.com`).
 */
const BAR_COUNT = 9;
const TRACK_DURATION_S = 24;

export function IslandMediaPrototype() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0.08));
  const [reducedMotion, setReducedMotion] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    oscRef.current?.stop();
    oscRef.current?.disconnect();
    oscRef.current = null;
    setIsPlaying(false);
    setBars(Array(BAR_COUNT).fill(0.08));
  };

  const tick = () => {
    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !ctx) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / BAR_COUNT);
    const nextBars = Array.from({ length: BAR_COUNT }, (_, i) => {
      const slice = data.slice(i * step, (i + 1) * step);
      const avg = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
      return Math.max(0.08, avg / 255);
    });
    setBars(nextBars);

    const elapsedNow = (ctx.currentTime - startedAtRef.current) % TRACK_DURATION_S;
    setElapsed(elapsedNow);

    rafRef.current = requestAnimationFrame(tick);
  };

  const play = () => {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    ctxRef.current = ctx;

    // Tom de teste com leve vibrato — só pra dar ao AnalyserNode um sinal que varia de verdade ao
    // longo do tempo (um tom puro e estático produziria barras congeladas, o que não provaria
    // nada sobre a reatividade real do waveform).
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;

    osc.type = 'sine';
    osc.frequency.value = 220;
    lfo.type = 'sine';
    lfo.frequency.value = 0.6;
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    osc.start();
    lfo.start();
    oscRef.current = osc;
    analyserRef.current = analyser;
    startedAtRef.current = ctx.currentTime;

    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = (elapsed / TRACK_DURATION_S) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-medusa-alert bg-medusa-alert/10 border border-medusa-alert/30 px-2 py-0.5 rounded-full">
          Protótipo — não é o Island de produção
        </span>
        {reducedMotion && (
          <span className="text-[10px] font-mono text-text-muted">prefers-reduced-motion: waveform estático</span>
        )}
      </div>

      <div className="flex justify-center py-4">
        <div
          id="island-media-prototype-capsule"
          className={`island-fluid-capsule flex items-center bg-surface/95 dark:bg-surface/90 backdrop-blur-md border border-border/70 rounded-full shadow-island dark:shadow-island-dark overflow-hidden transition-all ${
            isPlaying ? 'px-4 py-2.5 gap-3 min-w-[280px]' : 'px-3.5 py-1.5 gap-2 min-w-[140px]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 bg-medusa-primary ${isPlaying ? 'living-pulse' : ''}`} />

          {!isPlaying ? (
            <span className="text-[12px] font-medium text-text-secondary whitespace-nowrap">Island · Idle</span>
          ) : (
            <>
              <div className="flex items-end gap-[2.5px] h-6 flex-shrink-0" aria-hidden="true">
                {bars.map((v, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-medusa-primary"
                    style={{
                      height: reducedMotion ? '6px' : `${Math.max(4, v * 24)}px`,
                      transition: reducedMotion ? 'none' : 'height 80ms linear',
                    }}
                  />
                ))}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-[12px] font-semibold text-text-primary truncate">Faixa de Teste · Motion Lab</span>
                <span className="text-[10px] font-mono text-text-muted truncate">Protótipo (não é Spotify real)</span>
              </div>
              <div className="w-14 h-1 rounded-full bg-border/60 overflow-hidden flex-shrink-0">
                <div className="h-full bg-medusa-primary" style={{ width: `${progressPct}%` }} />
              </div>
            </>
          )}

          <button
            type="button"
            id="btn-island-media-toggle"
            onClick={isPlaying ? stop : play}
            aria-label={isPlaying ? 'Pausar tom de teste' : 'Tocar tom de teste'}
            className="btn-interactive w-7 h-7 rounded-full bg-medusa-primary/20 hover:bg-medusa-primary/30 text-[#18534B] dark:text-[#71DBD2] flex items-center justify-center flex-shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[15px]">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
        </div>
      </div>

      <p className="text-[11px] text-text-secondary leading-relaxed text-center max-w-md mx-auto">
        Idle → Media é uma expansão espacial real (a cápsula cresce, reorganiza os elementos e o
        waveform aparece) — nunca uma troca instantânea de texto. As barras reagem a um
        <code className="mx-1 px-1 py-0.5 rounded bg-surface-secondary font-mono">AnalyserNode</code>
        de verdade lendo o tom gerado, não a uma animação decorativa.
      </p>
    </div>
  );
}
