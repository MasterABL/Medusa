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
import { StudyTrack } from '@/components/education/types';
import { CompletedActivityItem } from '@/components/education/CompletedActivityList';

type EnemView = 'visao-geral' | 'cronograma';

interface EducationPanelContextType {
  // Espelhado a partir do EducationContainer (fonte real permanece lá — este é só o valor
  // exposto para o painel lateral, que não tem acesso direto ao estado local do container).
  currentTrack: StudyTrack;
  setCurrentTrackMirror: (track: StudyTrack) => void;
  isSessionCompleted: boolean;
  setIsSessionCompletedMirror: (value: boolean) => void;

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
}

const EducationPanelContext = createContext<EducationPanelContextType | undefined>(undefined);

export function EducationPanelProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrackMirror] = useState<StudyTrack>('faculdade');
  const [isSessionCompleted, setIsSessionCompletedMirror] = useState(false);
  const [enemView, setEnemView] = useState<EnemView>('visao-geral');
  // FIS-204 é a disciplina ativa por fixture (ver educationFixtures.ts) — mesmo default usado
  // antes desta mudança, quando a seleção ainda era estado local do FaculdadeHub.
  const [faculdadeDisciplineCode, setFaculdadeDisciplineCode] = useState('FIS-204');
  const [reviewModalItem, setReviewModalItem] = useState<CompletedActivityItem | null>(null);

  const setCurrentTrackMirrorCb = useCallback((track: StudyTrack) => setCurrentTrackMirror(track), []);
  const setIsSessionCompletedMirrorCb = useCallback((value: boolean) => setIsSessionCompletedMirror(value), []);
  const openReviewModal = useCallback((item: CompletedActivityItem) => setReviewModalItem(item), []);
  const closeReviewModal = useCallback(() => setReviewModalItem(null), []);

  return (
    <EducationPanelContext.Provider
      value={{
        currentTrack,
        setCurrentTrackMirror: setCurrentTrackMirrorCb,
        isSessionCompleted,
        setIsSessionCompletedMirror: setIsSessionCompletedMirrorCb,
        enemView,
        setEnemView,
        faculdadeDisciplineCode,
        setFaculdadeDisciplineCode,
        reviewModalItem,
        openReviewModal,
        closeReviewModal,
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
