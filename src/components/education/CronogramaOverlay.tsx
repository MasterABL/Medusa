'use client';

import React, { useEffect } from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { useAgenda } from '@/context/AgendaContext';
import { EnemCronogramaView } from './EnemCronogramaView';
import { CronogramaOnboarding } from './CronogramaOnboarding';
import { CronogramaPlan, Weekday, gerarBlocosAgendaSemana } from './cronogramaPlanner';

interface CronogramaOverlayProps {
  /**
   * Repassado para o "Iniciar Sessão" de um bloco do cronograma. Presente quando o overlay é
   * aberto a partir do DASHBOARD (Context Panel do ENEM) — nesse caso o Cronograma não abre mais
   * como drawer (Round 6 §20: "não abrir uma cópia dentro de um drawer de 640px"), navega direto
   * pra aba Cronograma real do EnemHub (`enemView`), que já existe como experiência principal.
   * Omitido quando aberto de DENTRO do Study Mode — aí não há Hub montado pra navegar (o Shell
   * está em modo foco), então o overlay continua sendo a única forma de consultar o cronograma
   * sem sair da aula (ver o mapa, fechar, continuar — nunca inicia uma segunda sessão por cima).
   */
  onStartStudy?: (simulateError?: boolean) => void;
}

/**
 * Cronograma do ENEM — dois comportamentos distintos por contexto (Round 6 §20):
 *
 * 1. A partir do Dashboard (Context Panel, `onStartStudy` presente): o gate de onboarding (se
 *    ainda não visto) mostra o assistente de tela cheia; assim que ele termina (ou já tinha sido
 *    visto antes), a navegação é pra aba Cronograma REAL do `EnemHub` (`setEnemView`), não uma
 *    cópia dentro de um drawer — "Ver Cronograma completo" leva à experiência principal.
 * 2. De DENTRO de uma sessão de estudo ativa (`onStartStudy` ausente): não existe Hub montado
 *    pra navegar (Shell em modo foco) — o overlay continua sendo um painel deslizante read-only,
 *    exatamente como antes, pra consultar sem perder o progresso da aula.
 */
export function CronogramaOverlay({ onStartStudy }: CronogramaOverlayProps) {
  const {
    isCronogramaOverlayOpen,
    closeCronogramaOverlay,
    cronogramaOnboardingSeen,
    markCronogramaOnboardingSeen,
    cronogramaPlan,
    setCronogramaPlan,
    setEnemView,
  } = useEducationPanel();
  const { reconcileEducationBlocks } = useAgenda();
  const cronograma = TRACK_DEFINITIONS.vestibular.cronograma ?? [];
  const isDashboardContext = Boolean(onStartStudy);

  // Reconciliação dos blocos do Cronograma na Agenda sem duplicações (Fase 2)
  const handleFinishOnboarding = (plan: CronogramaPlan, diasReais?: Weekday[]) => {
    setCronogramaPlan(plan);
    markCronogramaOnboardingSeen();
    if (diasReais && diasReais.length > 0) {
      const blocos = gerarBlocosAgendaSemana(plan, diasReais);
      reconcileEducationBlocks(blocos);
    }
  };

  // Round 6 §20/§21: no contexto do Dashboard, assim que o onboarding é resolvido (terminado
  // agora, ou já tinha sido visto numa visita anterior desta sessão), a "abertura" do overlay se
  // resolve navegando pra aba real do Hub em vez de mostrar um drawer por cima — o usuário sabe
  // que chegou no cronograma de verdade, não numa cópia. Só dispara quando o overlay está aberto
  // (nunca navega sozinho em segundo plano) e só no contexto de dashboard (in-session mantém o
  // drawer, ver docblock acima).
  useEffect(() => {
    if (isCronogramaOverlayOpen && isDashboardContext && cronogramaOnboardingSeen) {
      setEnemView('cronograma');
      closeCronogramaOverlay();
    }
  }, [isCronogramaOverlayOpen, isDashboardContext, cronogramaOnboardingSeen, setEnemView, closeCronogramaOverlay]);

  // Primeiro acesso da SESSÃO ao Cronograma mostra o assistente de tela cheia em vez do painel
  // lateral — nunca os dois ao mesmo tempo. `isCronogramaOverlayOpen` continua controlando o
  // backdrop/painel por baixo (que já existe montado, só escondido), então fechar o onboarding
  // sem terminar não deixa a tela em branco.
  if (isCronogramaOverlayOpen && !cronogramaOnboardingSeen) {
    return <CronogramaOnboarding onFinish={handleFinishOnboarding} />;
  }

  // Contexto de dashboard com onboarding já resolvido: o efeito acima já disparou a navegação e
  // fechou o overlay no mesmo ciclo — não há nada visível pra renderizar aqui (o `EnemHub`,
  // aba Cronograma, é quem mostra o conteúdo agora). Evita um frame do drawer "piscando" aberto
  // antes do `useEffect` rodar.
  if (isDashboardContext && cronogramaOnboardingSeen) {
    return null;
  }

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
          {isCronogramaOverlayOpen && (
            <EnemCronogramaView blocks={cronograma} onStartStudy={onStartStudy} plan={cronogramaPlan} />
          )}
        </div>
      </aside>
    </>
  );
}
