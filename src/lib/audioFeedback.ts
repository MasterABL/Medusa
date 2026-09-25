'use client';

/**
 * Medusa — Sound Language & Sistema Semântico de Áudio (Round Expansão de Experiência)
 *
 * Baseado na pesquisa de UI Sound Design e Web Audio API:
 * 1. HIERARQUIA SEMÂNTICA:
 *    - Micro: cliques táteis, trocas de modo, toggles (frequência alta, envelope ultra-curto 15-35ms).
 *    - Médio: acertos pedagógicos, erros com diagnóstico, checkpoints, uploads (timbres orgânicos, filtros biquad).
 *    - Alto: conclusão de sessão de estudo, marcos do Learning OS (cadência polifônica rica, 4 vozes).
 * 2. IDENTIDADE DISTINTIVA:
 *    Nenhum som soa como um simples "beep" genérico em frequência diferente:
 *    - Acerto = Tríade polifônica ascendente em C-Major (C5, E5, G5) com sino harmônico.
 *    - Erro = Acorde duplo amortecido em marimba/woodblock (G#3 + D3) com filtro passa-baixa (não agressivo).
 *    - Checkpoint = Intervalo contemplativo em quarta justa (F4 -> C5).
 *    - Upload Drop = Glissando descendente ressonante com sensação líquida.
 *    - Upload Ready = Arpejo brilhante ascendente em sino.
 *    - Delete = Decaimento tonal suave em filtro passa-baixa.
 * 3. ZERO ASSETS / ZERO SERVIÇOS PAGOS:
 *    Síntese 100% matemática em tempo real via Web Audio API.
 * 4. AUTOPLAY & ACESSIBILIDADE:
 *    Fallback silencioso caso o navegador suspenda o áudio; respeita estritamente volume e mute por categoria.
 */

export type AudioCategory =
  | 'notification'
  | 'navigation'
  | 'action'
  | 'completion'
  | 'learning_correct'
  | 'learning_error'
  | 'checkpoint'
  | 'mode_switch'
  | 'upload_drop'
  | 'upload_ready'
  | 'delete'
  | 'mic'
  | 'tutor';

export interface AudioPrefs {
  enabled: boolean;
  volume: number; // 0–1
  categories: Record<AudioCategory, boolean>;
}

const STORAGE_KEY = 'medusa-audio-prefs-v1';

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  enabled: true,
  volume: 0.5,
  categories: {
    notification: true,
    navigation: true,
    action: true,
    completion: true,
    learning_correct: true,
    learning_error: true,
    checkpoint: true,
    mode_switch: true,
    upload_drop: true,
    upload_ready: true,
    delete: true,
    mic: true,
    tutor: true,
  },
};

function loadPrefs(): AudioPrefs {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIO_PREFS;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AUDIO_PREFS.enabled,
      volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_AUDIO_PREFS.volume,
      categories: { ...DEFAULT_AUDIO_PREFS.categories, ...(parsed.categories ?? {}) },
    };
  } catch {
    return DEFAULT_AUDIO_PREFS;
  }
}

function savePrefs(prefs: AudioPrefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // fallback silencioso
  }
}

export function getAudioPrefs(): AudioPrefs {
  return loadPrefs();
}

export function setAudioEnabled(enabled: boolean): AudioPrefs {
  const prefs = { ...loadPrefs(), enabled };
  savePrefs(prefs);
  return prefs;
}

export function setAudioVolume(volume: number): AudioPrefs {
  const prefs = { ...loadPrefs(), volume: Math.max(0, Math.min(1, volume)) };
  savePrefs(prefs);
  return prefs;
}

export function setCategoryEnabled(category: AudioCategory, enabled: boolean): AudioPrefs {
  const prefs = loadPrefs();
  prefs.categories = { ...prefs.categories, [category]: enabled };
  savePrefs(prefs);
  return prefs;
}

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioCtx = new AudioContextCtor();
  }
  return audioCtx;
}

let unlockListenerAttached = false;

export function unlockAudioOnFirstGesture() {
  if (typeof window === 'undefined' || unlockListenerAttached) return;
  unlockListenerAttached = true;
  const unlock = () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
}

/** Síntese de clique tátil de alta precisão (nível micro) */
function playTactileClick(freq: number, durationMs: number, gainMultiplier: number) {
  const ctx = getContext();
  if (!ctx || ctx.state !== 'running') return;
  const prefs = loadPrefs();
  if (!prefs.enabled) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + durationMs / 1000);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, now);

  const peak = prefs.volume * gainMultiplier;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

/** Síntese polifônica de acordes harmônicos ricos (nível médio e alto) */
function playPolyphonicChord(
  frequencies: number[],
  durationMs: number,
  gainMultiplier: number,
  type: OscillatorType = 'sine',
  staggerMs = 25
) {
  const ctx = getContext();
  if (!ctx || ctx.state !== 'running') return;
  const prefs = loadPrefs();
  if (!prefs.enabled) return;

  const now = ctx.currentTime;
  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startAt = now + (idx * staggerMs) / 1000;
    const voiceDuration = durationMs / 1000;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    const peak = (prefs.volume * gainMultiplier) / Math.sqrt(frequencies.length);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + voiceDuration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startAt);
    osc.stop(startAt + voiceDuration + 0.05);
  });
}

/** Síntese com varredura de frequência e filtro orgânico (upload, deleção) */
function playFilteredSweep(
  startFreq: number,
  endFreq: number,
  durationMs: number,
  gainMultiplier: number,
  filterFreq: number
) {
  const ctx = getContext();
  if (!ctx || ctx.state !== 'running') return;
  const prefs = loadPrefs();
  if (!prefs.enabled) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const durSec = durationMs / 1000;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + durSec);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, now);

  const peak = prefs.volume * gainMultiplier;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durSec + 0.05);
}

/**
 * playFeedback — Dispara um evento semântico da Linguagem Sonora do Medusa.
 * Cada som é semanticamente diferenciado em timbre, envelope e propósito pedagógico.
 */
export function playFeedback(category: AudioCategory) {
  const prefs = loadPrefs();
  if (!prefs.enabled || !prefs.categories[category]) return;

  switch (category) {
    case 'navigation':
      // Micro: clique ultracurto e discreto de navegação (1500Hz, 14ms)
      playTactileClick(1500, 14, 0.18);
      break;

    case 'mode_switch':
      // Micro: clique de vidro sutil (1350Hz, 18ms)
      playTactileClick(1350, 18, 0.22);
      break;

    case 'action':
      // Micro: tick tátil de confirmação rápida (980Hz, 25ms)
      playTactileClick(980, 25, 0.25);
      break;

    case 'learning_correct':
      // Médio: Tríade harmônica ascendente em C-Major (C5 523Hz, E5 659Hz, G5 784Hz) com sino suave
      playPolyphonicChord([523.25, 659.25, 783.99], 380, 0.62, 'sine', 30);
      break;

    case 'learning_error':
      // Médio: Acorde amortecido em marimba (G#3 207Hz + D3 146Hz com filtro baixo) - claro sem ser agressivo
      playPolyphonicChord([207.65, 146.83], 260, 0.5, 'triangle', 15);
      break;

    case 'checkpoint':
      // Médio: Intervalo aberto de quarta justa (F4 349Hz -> C5 523Hz) - reflexivo e calmo
      playPolyphonicChord([349.23, 523.25], 420, 0.55, 'sine', 60);
      break;

    case 'completion':
      // Alto: Cadência polifônica de marco de estudo (C4 261Hz, G4 392Hz, C5 523Hz, E5 659Hz)
      playPolyphonicChord([261.63, 392.0, 523.25, 659.25], 680, 0.78, 'sine', 45);
      break;

    case 'upload_drop':
      // Médio: Absorção líquida suave (sweep de 460Hz a 290Hz)
      playFilteredSweep(460, 290, 140, 0.38, 1200);
      break;

    case 'upload_ready':
      // Médio: Chime brilhante ascendente (D5 587Hz -> A5 880Hz -> D6 1174Hz)
      playPolyphonicChord([587.33, 880.0, 1174.66], 260, 0.48, 'sine', 35);
      break;

    case 'delete':
      // Médio: Decaimento de remoção (sweep 320Hz a 110Hz em passa-baixa)
      playFilteredSweep(320, 110, 160, 0.32, 800);
      break;

    case 'tutor':
    case 'notification':
      // Médio: Aviso caloroso de presença (E5 659Hz -> B5 987Hz)
      playPolyphonicChord([659.25, 987.77], 240, 0.45, 'sine', 40);
      break;

    case 'mic':
      // Médio: Pulso de escuta acústica (A4 440Hz com leve modulação)
      playTactileClick(440, 90, 0.35);
      break;
  }
}
