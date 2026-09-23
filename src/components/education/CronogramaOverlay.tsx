'use client';

import React from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { EnemCronogramaView } from './EnemCronogramaView';

interface CronogramaOverlayProps {
  /**
   * Repassado para o "Iniciar Sessão" de um bloco do cronograma. Omitido quando o overlay é
   * aberto de DENTRO do Study Mode — iniciar uma segunda sessão por cima da atual sem passar
   * pelo fluxo de "Interromper aula" destruiria o progresso em silêncio, o que a Rodada 4 já
   * proibiu explicitamente. Nesse caso o overlay fica só-leitura (ver o mapa, fechar, continuar
   * a aula), que já resolve o pedido real: "ver o cronograma sem sair do material".
   */
  onStartStudy?: (simulateError?: boolean) => void;
}

/**
 * Cronograma do ENEM em contexto (Refinamento Visual §10) — abre como um painel deslizante por
 * cima da tela atual (Dashboard OU Study Mode), nunca uma navegação para outra página. Reaproveita
 * o mesmo `EnemCronogramaView` já usado na aba "Cronograma" do Hub (não duplica a UI), e a mesma
 * transição de painel (`panel-transition`, translateX) já usada pelo Context Panel mobile e pela
 * Sidebar — sem introduzir um terceiro sistema de overlay.
 */
export function CronogramaOverlay({ onStartStudy }: CronogramaOverlayProps) {
  const { isCronogramaOverlayOpen, closeCronogramaOverlay } = useEducationPanel();
  const cronograma = TRACK_DEFINITIONS.vestibular.cronograma ?? [];

  return (
    <>
      <div
        id="cronograma-overlay-backdrop"
        aria-hidden="true"
        onClick={closeCronogramaOverlay}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-200 ${
          isCronogramaOverlayOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        id="cronograma-overlay-panel"
        aria-label="Cronograma do ENEM"
        aria-hidden={!isCronogramaOverlayOpen}
        className={`fixed inset-y-0 right-0 w-full sm:w-[640px] max-w-full bg-surface border-l border-border/80 shadow-2xl z-50 flex flex-col panel-transition ${
          isCronogramaOverlayOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-surface-secondary/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#8A6D00] dark:text-medusa-accent">calendar_month</span>
            <h3 className="text-[13px] font-semibold text-text-primary">Cronograma · ENEM</h3>
          </div>
          <button
            type="button"
            id="btn-close-cronograma-overlay"
            onClick={closeCronogramaOverlay}
            aria-label="Fechar Cronograma"
            className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {!onStartStudy && (
          <p className="px-4 pt-3 text-[11px] text-text-muted italic">
            Você está dentro de uma sessão de estudo — o cronograma abre aqui para consulta, sem
            perder seu progresso. Para iniciar outro bloco, conclua ou interrompa a aula atual primeiro.
          </p>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {isCronogramaOverlayOpen && <EnemCronogramaView blocks={cronograma} onStartStudy={onStartStudy} />}
        </div>
      </aside>
    </>
  );
}
