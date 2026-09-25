'use client';

/**
 * Medusa — Sound Language & Sistema Semântico de Áudio (Round Human Visual Gate 2)
 *
 * Baseado na pesquisa de UI Sound Design e Web Audio API:
 * 1. HIERARQUIA SEMÂNTICA EM 3 NÍVEIS:
 *    - Micro: press, toggle, navigation, open, close (12-30ms, frequências selecionadas, envelopes secos).
 *    - Médio: processing, ready, error, success, checkpoint, tutor, voice (80-380ms, timbres ricos, filtros biquad).
 *    - Alto: completion, celebration (500-850ms, cadência polifônica de 4 vozes).
 * 2. AUTORUN & RESUME AUTOMÁTICO:
 *    Se o AudioContext estiver em estado 'suspended', ele é retomado imediatamente via Promise sem
 *    descartar silenciosamente o evento (corrige o bug de conclusão de sessão sem áudio).
 * 3. IDENTIDADE DISTINTIVA:
 *    Nenhum som soa como um simples "beep" genérico em frequência diferente.
 * 4. ZERO ASSETS / ZERO SERVIÇOS PAGOS:
 *    Síntese 100% matemática em tempo real via Web Audio API.
 */

export type AudioCategory =
  | 'press'
  | 'toggle'
  | 'navigation'
  | 'open'
  | 'close'
  | 'processing'
  | 'ready'
  | 'error'
  | 'success'
  | 'checkpoint'
  | 'tutor'
  | 'voice'
  | 'completion'
  | 'celebration'
  // Compatibilidade com eventos anteriores
  | 'notification'
  | 'action'
  | 'learning_correct'
  | 'learning_error'
  | 'mode_switch'
  | 'upload_drop'
  | 'upload_ready'
  | 'delete'
  | 'mic';

export interface AudioPrefs {
  enabled: boolean;
  volume: number; // 0–1
  categories: Record<AudioCategory, boolean>;
}

const STORAGE_KEY = 'medusa-audio-prefs-v2';

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  enabled: true,
  volume: 0.5,
  categories: {
    press: true,
    toggle: true,
    navigation: true,
    open: true,
    close: true,
    processing: true,
    ready: true,
    error: true,
    success: true,
    checkpoint: true,
    tutor: true,
    voice: true,
    completion: true,
    celebration: true,
    notification: true,
    action: true,
    learning_correct: true,
    learning_error: true,
    mode_switch: true,
    upload_drop: true,
    upload_ready: true,
    delete: true,
    mic: true,
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

/** Executa sintetizador com garantia de que o AudioContext está running */
function withRunningContext(fn: (ctx: AudioContext) => void) {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => fn(ctx)).catch(() => {});
  } else {
    fn(ctx);
  }
}

/** Síntese de clique tátil de alta precisão (nível micro) */
function playTactileClick(freq: number, durationMs: number, gainMultiplier: number, type: OscillatorType = 'triangle') {
  withRunningContext((ctx) => {
    const prefs = loadPrefs();
    if (!prefs.enabled) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + durationMs / 1000);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, now);

    const peak = prefs.volume * gainMultiplier;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  });
}

/** Síntese de acorde polifônico estagiado (nível médio e alto) */
function playPolyphonicChord(
  frequencies: number[],
  durationMs: number,
  gainMultiplier: number,
  type: OscillatorType = 'sine',
  staggerMs: number = 0
) {
  withRunningContext((ctx) => {
    const prefs = loadPrefs();
    if (!prefs.enabled) return;

    const now = ctx.currentTime;
    const peak = (prefs.volume * gainMultiplier) / frequencies.length;
    const durSec = durationMs / 1000;

    frequencies.forEach((freq, idx) => {
      const noteStart = now + (idx * staggerMs) / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, noteStart);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'triangle' ? 1200 : 3800, noteStart);

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(peak, noteStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + durSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + durSec + 0.05);
    });
  });
}

/** Síntese de sweep tonal filtrado para processos contínuos */
function playFilteredSweep(
  startFreq: number,
  endFreq: number,
  durationMs: number,
  gainMultiplier: number,
  filterFreq: number
) {
  withRunningContext((ctx) => {
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
  });
}

let lastCompletionTime = 0;

/**
 * playFeedback — Dispara um evento semântico da Linguagem Sonora do Medusa.
 * Cada som é semanticamente diferenciado em timbre, envelope e propósito pedagógico.
 */
export function playFeedback(category: AudioCategory) {
  const prefs = loadPrefs();
  if (!prefs.enabled) return;

  // Mapeamento de retrocompatibilidade
  const categoryKey = category as AudioCategory;
  if (prefs.categories[categoryKey] === false) return;

  switch (category) {
    case 'press':
      // Micro: toque recebido (1400Hz, 12ms)
      playTactileClick(1400, 12, 0.16);
      break;

    case 'toggle':
    case 'mode_switch':
      // Micro: estado alternado (800Hz -> 1200Hz, 20ms)
      playTactileClick(800, 20, 0.22, 'sine');
      break;

    case 'navigation':
      // Micro: mudança espacial suave (1100Hz, 15ms)
      playTactileClick(1100, 15, 0.18);
      break;

    case 'open':
      // Micro: superfície abriu / expansão (320Hz -> 540Hz, 85ms)
      playFilteredSweep(320, 540, 85, 0.26, 2200);
      break;

    case 'close':
      // Micro: superfície fechou / retração (540Hz -> 280Hz, 75ms)
      playFilteredSweep(540, 280, 75, 0.22, 1800);
      break;

    case 'action':
      // Micro: confirmação rápida (980Hz, 22ms)
      playTactileClick(980, 22, 0.24);
      break;

    case 'processing':
      // Médio: sistema trabalhando (pulso senoidal duplo 440Hz + 554Hz)
      playPolyphonicChord([440, 554.37], 150, 0.32, 'sine', 15);
      break;

    case 'ready':
    case 'upload_ready':
      // Médio: conclusão de processamento / upload pronto (D5 587Hz -> A5 880Hz)
      playPolyphonicChord([587.33, 880.0, 1174.66], 260, 0.48, 'sine', 35);
      break;

    case 'error':
    case 'learning_error':
      // Médio: falha / erro pedagógico (marimba amortecida em segunda menor: G#3 207Hz + D3 146Hz)
      playPolyphonicChord([207.65, 146.83], 260, 0.52, 'triangle', 15);
      break;

    case 'success':
    case 'learning_correct':
      // Médio: ação correta (tríade harmônica em C-Major: C5 523Hz, E5 659Hz, G5 784Hz)
      playPolyphonicChord([523.25, 659.25, 783.99], 380, 0.64, 'sine', 30);
      break;

    case 'checkpoint':
      // Médio: marco formativo de etapa (quarta justa aberta: F4 349Hz -> C5 523Hz)
      playPolyphonicChord([349.23, 523.25], 420, 0.55, 'sine', 55);
      break;

    case 'tutor':
    case 'notification':
      // Médio: atenção / comunicação (E5 659Hz -> B5 987Hz)
      playPolyphonicChord([659.25, 987.77], 240, 0.45, 'sine', 40);
      break;

    case 'voice':
    case 'mic':
      // Médio: escuta iniciada / canal aberto (pulso ascendente 400Hz -> 660Hz)
      playFilteredSweep(400, 660, 110, 0.34, 1800);
      break;

    case 'upload_drop':
      // Médio: sweep de absorção líquida
      playFilteredSweep(460, 290, 140, 0.36, 1200);
      break;

    case 'delete':
      // Médio: sweep de remoção
      playFilteredSweep(320, 110, 160, 0.32, 800);
      break;

    case 'completion':
      // Alto: marco de sessão concluída (cadência C4 261Hz, G4 392Hz, C5 523Hz, E5 659Hz)
      const now = Date.now();
      if (now - lastCompletionTime > 600) {
        lastCompletionTime = now;
        playPolyphonicChord([261.63, 392.0, 523.25, 659.25], 720, 0.85, 'sine', 50);
      }
      break;

    case 'celebration':
      // Alto: conquista de destaque / grande marco
      playPolyphonicChord([523.25, 659.25, 783.99, 1046.5], 880, 0.9, 'sine', 45);
      break;
  }
}
