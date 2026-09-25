'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useClickOutside } from '@/lib/useClickOutside';
import { AudioCategory, AudioPrefs, DEFAULT_AUDIO_PREFS, getAudioPrefs, setAudioEnabled, setAudioVolume, setCategoryEnabled, playFeedback } from '@/lib/audioFeedback';

const CATEGORY_LABEL: Record<AudioCategory, string> = {
  notification: 'Notificação',
  action: 'Ação do Sistema',
  completion: 'Conclusão de Sessão',
  learning_correct: 'Acerto / Sucesso Pedagógico',
  learning_error: 'Tentativa Incorreta',
  checkpoint: 'Pausa & Checkpoint',
  mode_switch: 'Troca Espacial de Modo',
  upload_drop: 'Recebimento de Arquivo',
  upload_ready: 'Material Processado',
  delete: 'Remoção / Exclusão',
};

const CATEGORY_DESC: Record<AudioCategory, string> = {
  notification: 'Ex.: o Tutor respondeu sua pergunta',
  action: 'Ex.: calcular o plano do Cronograma',
  completion: 'Ex.: concluir uma sessão de estudo',
  learning_correct: 'Ex.: acertar alternativa do exercício',
  learning_error: 'Ex.: resposta incorreta com shake tátil',
  checkpoint: 'Ex.: marco reflexivo durante a aula',
  mode_switch: 'Ex.: alternar entre Só Aula e Resumo',
  upload_drop: 'Ex.: soltar PDF na área de materiais',
  upload_ready: 'Ex.: arquivo indexado e disponível',
  delete: 'Ex.: remover material da disciplina',
};

/**
 * Medusa — Personalização do feedback sonoro (Round 5 §10)
 *
 * Popover simples: liga/desliga geral, volume, e liga/desliga por categoria — preferências REAIS
 * (persistidas em localStorage, ver audioFeedback.ts), não decorativas. Clicar num toggle de
 * categoria toca o próprio som daquela categoria como confirmação auditiva imediata (só quando
 * está LIGANDO — desligar não toca nada, seria contraditório).
 */
export function AudioSettingsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  // BUG REAL evitado aqui (achado testando esta rodada): ler `localStorage` direto no
  // inicializador do estado causa hydration mismatch — o servidor sempre renderiza
  // `DEFAULT_AUDIO_PREFS` (não tem `window`), mas o cliente leria a preferência real na
  // primeira renderização, e o ícone (`volume_up`/`volume_off`) divergiria entre os dois.
  // Mesmo padrão já usado em `ShellContext.tsx` pro tema: valor padrão no SSR, valor real
  // sincronizado depois de montar, num `useEffect` client-only.
  const [prefs, setPrefs] = useState<AudioPrefs>(DEFAULT_AUDIO_PREFS);
  const popoverRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverRef, () => setIsOpen(false), isOpen);
  useEscapeKey(isOpen, () => setIsOpen(false));

  useEffect(() => {
    setPrefs(getAudioPrefs());
  }, []);

  useEffect(() => {
    if (isOpen) setPrefs(getAudioPrefs());
  }, [isOpen]);

  const toggleEnabled = () => setPrefs(setAudioEnabled(!prefs.enabled));
  const changeVolume = (v: number) => setPrefs(setAudioVolume(v));
  const toggleCategory = (cat: AudioCategory) => {
    const nextEnabled = !prefs.categories[cat];
    const next = setCategoryEnabled(cat, nextEnabled);
    setPrefs(next);
    if (nextEnabled && prefs.enabled) playFeedback(cat);
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        id="btn-audio-settings"
        onClick={() => setIsOpen((v) => !v)}
        title="Som"
        aria-label="Configurar feedback sonoro"
        aria-expanded={isOpen}
        className="btn-interactive w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/80 border border-border/60 text-text-secondary hover:text-text-primary hover:border-medusa-primary/40 shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center justify-center flex-shrink-0"
      >
        <span className="material-symbols-outlined text-[16px]">{prefs.enabled ? 'volume_up' : 'volume_off'}</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          id="audio-settings-popover"
          role="dialog"
          aria-label="Configurações de som"
          className="modal-pop-enter absolute right-0 top-10 z-40 w-64 bg-surface border border-border/70 rounded-2xl shadow-island p-3.5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Som</span>
            <button
              type="button"
              id="btn-audio-master-toggle"
              onClick={toggleEnabled}
              aria-pressed={prefs.enabled}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                prefs.enabled ? 'bg-medusa-primary' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  prefs.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className={`flex flex-col gap-2 transition-opacity ${prefs.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
              <span>Volume</span>
              <input
                type="range"
                id="audio-volume-slider"
                min={0}
                max={1}
                step={0.05}
                value={prefs.volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                onMouseUp={() => playFeedback('action')}
                className="w-full accent-medusa-primary"
              />
            </label>

            <div className="h-px bg-border/60" />

            {(Object.keys(CATEGORY_LABEL) as AudioCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                id={`audio-category-toggle-${cat}`}
                onClick={() => toggleCategory(cat)}
                aria-pressed={prefs.categories[cat]}
                className="w-full flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-surface-secondary/60 transition-colors text-left"
              >
                <span className="flex flex-col">
                  <span className="text-[12px] font-medium text-text-primary">{CATEGORY_LABEL[cat]}</span>
                  <span className="text-[10px] text-text-muted">{CATEGORY_DESC[cat]}</span>
                </span>
                <span
                  className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${
                    prefs.categories[cat] ? 'bg-medusa-primary' : 'bg-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                      prefs.categories[cat] ? 'translate-x-[15px]' : 'translate-x-0.5'
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
