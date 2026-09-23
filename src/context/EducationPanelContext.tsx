/**
 * Medusa — Education Panel Context
 *
 * Compartilha o estado de navegação interna da Educação (aba do ENEM, disciplina selecionada
 * na Faculdade, trilha ativa) entre o EducationContainer e o Context Panel do Shell — mesmo
 * padrão já usado pelo AgendaContext para a Agenda. Sem isso, o painel lateral não teria como
 * saber "em que parte da Educação" o usuário está para se adaptar (ver ContextPanel.tsx).
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { StudyTrack, SessionResult } from '@/components/education/types';
import { CompletedActivityItem } from '@/components/education/CompletedActivityList';

type EnemView = 'visao-geral' | 'cronograma';

interface EducationPanelContextType {
  // Espelhado a partir do EducationContainer (fonte real permanece lá — este é só o valor
  // exposto para o painel lateral, que não tem acesso direto ao estado local do container).
  currentTrack: StudyTrack;
  setCurrentTrackMirror: (track: StudyTrack) => void;
  isSessionCompleted: boolean;
  setIsSessionCompletedMirror: (value: boolean) => void;
  /**
   * Resultado real da última sessão concluída (mesmo objeto exibido em StudyCompletionView) —
   * espelhado para que os Context Panels possam registrar a revisão gerada por ELA
   * especificamente (tópico, disciplina e data de revisão reais), não uma revisão genérica.
   */
  sessionResultMirror: SessionResult | null;
  setSessionResultMirror: (result: SessionResult | null) => void;

  // Estado real (não espelhado): só o EnemHub e o painel do ENEM leem/escrevem isto.
  enemView: EnemView;
  setEnemView: (view: EnemView) => void;

  // Estado real: só o FaculdadeHub e o painel da Faculdade leem/escrevem isto.
  faculdadeDisciplineCode: string;
  setFaculdadeDisciplineCode: (code: string) => void;

  // Destino real do botão "Rever"/"Revisão" — compartilhado entre `CompletedActivityList` (Hub)
  // e a seção "Próximas Revisões" de cada Context Panel, para que os dois pontos de entrada
  // abram exatamente o mesmo item, em vez de duas implementações divergentes de "revisão".
  reviewModalItem: CompletedActivityItem | null;
  openReviewModal: (item: CompletedActivityItem) => void;
  closeReviewModal: () => void;

  /**
   * Cronograma do ENEM em contexto (Refinamento Visual §10): abre como overlay sobre a tela
   * atual (Dashboard OU dentro do Study Mode), sem navegar para outra página. Estado real aqui
   * porque precisa ser acionável tanto do Context Panel quanto de dentro do Study Mode.
   */
  isCronogramaOverlayOpen: boolean;
  openCronogramaOverlay: () => void;
  closeCronogramaOverlay: () => void;

  /**
   * Intervalo preferido entre blocos de estudo do ENEM — configuração REAL e alterável, mas
   * escopo de sessão (não persistida em backend, dito explicitamente na UI onde aparece). Não
   * existia nenhuma modelagem de "intervalo" antes desta rodada; nenhuma reagenda automática de
   * blocos foi implementada (exigiria um motor de agendamento que não existe) — o efeito real e
   * honesto é limitado ao tempo total estimado do dia/semana no Cronograma.
   */
  studyIntervalMinutes: number;
  setStudyIntervalMinutes: (minutes: number) => void;
}

const EducationPanelContext = createContext<EducationPanelContextType | undefined>(undefined);

export function EducationPanelProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrackMirror] = useState<StudyTrack>('faculdade');
  const [isSessionCompleted, setIsSessionCompletedMirror] = useState(false);
  const [sessionResultMirror, setSessionResultMirror] = useState<SessionResult | null>(null);
  const [enemView, setEnemView] = useState<EnemView>('visao-geral');
  // FIS-204 é a disciplina ativa por fixture (ver educationFixtures.ts) — mesmo default usado
  // antes desta mudança, quando a seleção ainda era estado local do FaculdadeHub.
  const [faculdadeDisciplineCode, setFaculdadeDisciplineCode] = useState('FIS-204');
  const [reviewModalItem, setReviewModalItem] = useState<CompletedActivityItem | null>(null);
  const [isCronogramaOverlayOpen, setIsCronogramaOverlayOpen] = useState(false);
  const [studyIntervalMinutes, setStudyIntervalMinutes] = useState(10);

  const setCurrentTrackMirrorCb = useCallback((track: StudyTrack) => setCurrentTrackMirror(track), []);
  const setIsSessionCompletedMirrorCb = useCallback((value: boolean) => setIsSessionCompletedMirror(value), []);
  const openReviewModal = useCallback((item: CompletedActivityItem) => setReviewModalItem(item), []);
  const closeReviewModal = useCallback(() => setReviewModalItem(null), []);
  const openCronogramaOverlay = useCallback(() => setIsCronogramaOverlayOpen(true), []);
  const closeCronogramaOverlay = useCallback(() => setIsCronogramaOverlayOpen(false), []);

  return (
    <EducationPanelContext.Provider
      value={{
        currentTrack,
        setCurrentTrackMirror: setCurrentTrackMirrorCb,
        isSessionCompleted,
        setIsSessionCompletedMirror: setIsSessionCompletedMirrorCb,
        sessionResultMirror,
        setSessionResultMirror,
        enemView,
        setEnemView,
        faculdadeDisciplineCode,
        setFaculdadeDisciplineCode,
        reviewModalItem,
        openReviewModal,
        closeReviewModal,
        isCronogramaOverlayOpen,
        openCronogramaOverlay,
        closeCronogramaOverlay,
        studyIntervalMinutes,
        setStudyIntervalMinutes,
      }}
    >
      {children}
    </EducationPanelContext.Provider>
  );
}

export function useEducationPanel() {
  const context = useContext(EducationPanelContext);
  if (!context) {
    throw new Error('useEducationPanel must be used within an EducationPanelProvider');
  }
  return context;
}
