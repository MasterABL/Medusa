/**
 * Medusa — Education Panel Context
 *
 * Compartilha o estado de navegação interna da Educação (aba do ENEM, disciplina selecionada
 * na Faculdade, trilha ativa) entre o EducationContainer e o Context Panel do Shell — mesmo
 * padrão já usado pelo AgendaContext para a Agenda. Sem isso, o painel lateral não teria como
 * saber "em que parte da Educação" o usuário está para se adaptar (ver ContextPanel.tsx).
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { StudyTrack, SessionResult, DisciplineChip } from '@/components/education/types';
import { CompletedActivityItem } from '@/components/education/CompletedActivityList';
import { CronogramaPlan } from '@/components/education/cronogramaPlanner';

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
  /**
   * Espelha `handleStartStudy` do EducationContainer (Round 5 §9) — sem isso, o card "Próxima
   * Ação" dos 3 Context Panels não tinha NENHUM jeito de disparar a ação real: eram `<div>`
   * decorativos, só com hover implicando clique. `null` até o Container montar e registrar a
   * função real (evita o painel chamar algo antes de existir uma sessão de Educação ativa).
   */
  requestStartStudy: (() => void) | null;
  setRequestStartStudyMirror: (fn: (() => void) | null) => void;

  // Estado real (não espelhado): só o EnemHub e o painel do ENEM leem/escrevem isto.
  enemView: EnemView;
  setEnemView: (view: EnemView) => void;

  // Estado real: só o FaculdadeHub e o painel da Faculdade leem/escrevem isto.
  faculdadeDisciplineCode: string;
  setFaculdadeDisciplineCode: (code: string) => void;

  /**
   * Disciplinas adicionadas pelo usuário (Round 5 §5) — vivem aqui, não em `FaculdadeHub`,
   * porque `FaculdadeContextPanel.tsx` lê `trackDef.disciplines` de forma independente (import
   * direto de `TRACK_DEFINITIONS.faculdade`, sem receber a lista via prop) e precisa enxergar a
   * MESMA disciplina nova — sem isso, escolher a disciplina recém-criada faria o painel lateral
   * cair no fallback `disciplines[0]" por não achar o código. Escopo de sessão (React state, sem
   * persistência) — honesto: some ao recarregar a página, igual a todo o resto do app fixture.
   */
  facultyExtraDisciplines: DisciplineChip[];
  addFaculdadeDiscipline: (discipline: DisciplineChip) => void;

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
   * Onboarding do Cronograma (Round 5 §12-14) — assistente de tela cheia no primeiro acesso da
   * SESSÃO (escopo de sessão, como o resto do app fixture: some ao recarregar a página). Uma vez
   * visto, `openCronogramaOverlay` sempre vai direto pro Cronograma detalhado.
   */
  cronogramaOnboardingSeen: boolean;
  markCronogramaOnboardingSeen: () => void;
  /** Resultado real do onboarding (ou o plano genérico, se o usuário pulou) — ver cronogramaPlanner.ts. */
  cronogramaPlan: CronogramaPlan | null;
  setCronogramaPlan: (plan: CronogramaPlan | null) => void;
  resetCronograma: () => void;
  isCronogramaConfigured: boolean;

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
  const [requestStartStudy, setRequestStartStudyMirror] = useState<(() => void) | null>(null);
  const [enemView, setEnemView] = useState<EnemView>('visao-geral');
  // FIS-204 é a disciplina ativa por fixture (ver educationFixtures.ts) — mesmo default usado
  // antes desta mudança, quando a seleção ainda era estado local do FaculdadeHub.
  const [faculdadeDisciplineCode, setFaculdadeDisciplineCode] = useState('FIS-204');
  const [facultyExtraDisciplines, setFacultyExtraDisciplines] = useState<DisciplineChip[]>([]);
  const [reviewModalItem, setReviewModalItem] = useState<CompletedActivityItem | null>(null);
  const [isCronogramaOverlayOpen, setIsCronogramaOverlayOpen] = useState(false);
  const [studyIntervalMinutes, setStudyIntervalMinutes] = useState(10);
  const [cronogramaOnboardingSeen, setCronogramaOnboardingSeen] = useState(false);
  const [cronogramaPlan, setCronogramaPlan] = useState<CronogramaPlan | null>(null);

  // Hidratação segura a partir do localStorage (Fase 2: Cronograma persistente)
  useEffect(() => {
    try {
      const savedSeen = localStorage.getItem('medusa_cronograma_seen');
      const savedPlan = localStorage.getItem('medusa_cronograma_plan');
      if (savedSeen === 'true') {
        setCronogramaOnboardingSeen(true);
      }
      if (savedPlan) {
        setCronogramaPlan(JSON.parse(savedPlan));
      }
    } catch (e) {
      console.warn('[EducationPanelContext] Não foi possível ler cronograma salvo:', e);
    }
  }, []);

  const setCurrentTrackMirrorCb = useCallback((track: StudyTrack) => setCurrentTrackMirror(track), []);
  const setIsSessionCompletedMirrorCb = useCallback((value: boolean) => setIsSessionCompletedMirror(value), []);
  // React trata valor de estado do tipo função como updater lazy — por isso `() => fn` aqui e em
  // toda chamada de `setRequestStartStudyMirror`, nunca `fn` sozinho (armazenaria a referência
  // errada / dispararia a função na hora, em vez de guardá-la para o clique real do usuário).
  const setRequestStartStudyMirrorCb = useCallback((fn: (() => void) | null) => {
    setRequestStartStudyMirror(() => fn);
  }, []);
  const openReviewModal = useCallback((item: CompletedActivityItem) => setReviewModalItem(item), []);
  const closeReviewModal = useCallback(() => setReviewModalItem(null), []);
  const addFaculdadeDiscipline = useCallback((discipline: DisciplineChip) => {
    setFacultyExtraDisciplines((prev) => [...prev, discipline]);
  }, []);
  const openCronogramaOverlay = useCallback(() => setIsCronogramaOverlayOpen(true), []);
  const closeCronogramaOverlay = useCallback(() => setIsCronogramaOverlayOpen(false), []);
  
  const markCronogramaOnboardingSeen = useCallback(() => {
    setCronogramaOnboardingSeen(true);
    try {
      localStorage.setItem('medusa_cronograma_seen', 'true');
    } catch {}
  }, []);

  const handleSetCronogramaPlan = useCallback((plan: CronogramaPlan | null) => {
    setCronogramaPlan(plan);
    try {
      if (plan) {
        localStorage.setItem('medusa_cronograma_plan', JSON.stringify(plan));
        localStorage.setItem('medusa_cronograma_seen', 'true');
        setCronogramaOnboardingSeen(true);
      } else {
        localStorage.removeItem('medusa_cronograma_plan');
      }
    } catch {}
  }, []);

  const resetCronograma = useCallback(() => {
    setCronogramaPlan(null);
    setCronogramaOnboardingSeen(false);
    try {
      localStorage.removeItem('medusa_cronograma_plan');
      localStorage.removeItem('medusa_cronograma_seen');
    } catch {}
    setIsCronogramaOverlayOpen(true);
  }, []);

  const isCronogramaConfigured = Boolean(cronogramaPlan);

  return (
    <EducationPanelContext.Provider
      value={{
        currentTrack,
        setCurrentTrackMirror: setCurrentTrackMirrorCb,
        isSessionCompleted,
        setIsSessionCompletedMirror: setIsSessionCompletedMirrorCb,
        sessionResultMirror,
        setSessionResultMirror,
        requestStartStudy,
        setRequestStartStudyMirror: setRequestStartStudyMirrorCb,
        enemView,
        setEnemView,
        faculdadeDisciplineCode,
        setFaculdadeDisciplineCode,
        facultyExtraDisciplines,
        addFaculdadeDiscipline,
        reviewModalItem,
        openReviewModal,
        closeReviewModal,
        isCronogramaOverlayOpen,
        openCronogramaOverlay,
        closeCronogramaOverlay,
        studyIntervalMinutes,
        setStudyIntervalMinutes,
        cronogramaOnboardingSeen,
        markCronogramaOnboardingSeen,
        cronogramaPlan,
        setCronogramaPlan: handleSetCronogramaPlan,
        resetCronograma,
        isCronogramaConfigured,
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
