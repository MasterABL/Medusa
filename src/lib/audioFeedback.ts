'use client';

/**
 * Medusa — Sistema de feedback sonoro (Round 5 §10)
 *
 * Web Audio API pura (osciladores sintetizados), sem nenhum arquivo de áudio nem serviço pago —
 * cada som é gerado na hora, então não existe asset pra hospedar nem licença pra pagar.
 *
 * 3 categorias, cada uma ligável/desligável independente (Round 5 §10 pede personalização):
 * - `notification`: algo novo chegou sem o usuário pedir agora (resposta do Tutor).
 * - `action`: confirmação de uma ação que o usuário mesmo disparou (calcular o plano do
 *   Cronograma) — deliberadamente mais discreto que os outros dois.
 * - `completion`: fechamento de algo maior (concluir uma sessão de estudo).
 *
 * **Restrição de autoplay do navegador**: um `AudioContext` nasce `suspended` até um gesto real
 * do usuário (clique/tecla) — `unlockAudioOnFirstGesture()` (chamado uma vez em
 * `ShellContext.tsx`, que já envolve o app inteiro) registra um listener de UMA vez em
 * `pointerdown`/`keydown` que dá `resume()` no contexto. Antes desse gesto, `playFeedback()`
 * simplesmente não toca nada — nunca lança erro nem trava a interface.
 */

export type AudioCategory = 'notification' | 'action' | 'completion';

export interface AudioPrefs {
  enabled: boolean;
  volume: number; // 0–1
  categories: Record<AudioCategory, boolean>;
}

const STORAGE_KEY = 'medusa-audio-prefs-v1';

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  enabled: true,
  volume: 0.5,
  categories: { notification: true, action: true, completion: true },
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
    // localStorage pode falhar (modo privado, quota) — som é sempre um "nice to have", nunca crítico.
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
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioCtx = new AudioContextCtor();
  }
  return audioCtx;
}

let unlockListenerAttached = false;

/** Registrado uma vez, no provedor raiz do app (`ShellContext.tsx`). */
export function unlockAudioOnFirstGesture() {
  if (typeof window === 'undefined' || unlockListenerAttached) return;
  unlockListenerAttached = true;
  const unlock = () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Se o navegador recusar por algum motivo, som simplesmente continua desligado — nunca crítico.
      });
    }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
}

/** Toca uma sequência curta de tons puros com envelope suave (nunca um "beep" seco/áspero). */
function playTone(frequencies: number[], totalDurationMs: number, volumeMultiplier: number) {
  const ctx = getContext();
  // Contexto ainda suspenso (nenhum gesto do usuário ainda) ou API indisponível — silêncio, nunca erro.
  if (!ctx || ctx.state !== 'running') return;
  const prefs = loadPrefs();
  if (!prefs.enabled) return;

  const now = ctx.currentTime;
  const perNoteSeconds = totalDurationMs / 1000 / frequencies.length;
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const startAt = now + i * perNoteSeconds;
    const peakVolume = prefs.volume * volumeMultiplier;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakVolume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + perNoteSeconds + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + perNoteSeconds + 0.1);
  });
}

/**
 * Ponto de entrada único pra disparar um som — nunca chamar `playTone` direto de fora deste
 * arquivo, senão o filtro de categoria/preferência vira decoração (mesmo princípio já aplicado
 * em `enfileirar()` no projeto irmão, pra notificações).
 */
export function playFeedback(category: AudioCategory) {
  const prefs = loadPrefs();
  if (!prefs.enabled || !prefs.categories[category]) return;
  switch (category) {
    case 'completion':
      // Arpejo maior curto (Dó-Mi-Sol) — celebratório sem ser longo ou cansativo.
      playTone([523.25, 659.25, 783.99], 480, 0.9);
      break;
    case 'notification':
      // Dois tons ascendentes, curto — "chegou algo", sem competir com o que o usuário está lendo.
      playTone([880, 1108.73], 200, 0.6);
      break;
    case 'action':
      // Um tom único, bem curto e baixo — confirmação discreta, não uma celebração.
      playTone([660], 80, 0.3);
      break;
  }
}
