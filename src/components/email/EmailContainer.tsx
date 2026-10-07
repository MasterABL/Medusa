'use client';

import React, { useState, useEffect } from 'react';
import { useEmailWorkspace } from '@/lib/useEmailWorkspace';
import { useShell } from '@/context/ShellContext';
import { useDemoMode } from '@/lib/dataMode';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { playFeedback } from '@/lib/audioFeedback';
import { EmailTriageView } from './EmailTriageView';
import { EmailRadarView } from './EmailRadarView';
import { EmailWorkspaceView } from './EmailWorkspaceView';
import { EmailAuditView } from './EmailAuditView';
import { EmailImportModal } from './EmailImportModal';
import type { EmailFilterId } from '@/domains/email/selectors';

export type EmailSubView = 'triagem' | 'radar' | 'workspace' | 'auditoria';

export function EmailContainer() {
  const {
    ready,
    filter,
    setFilter,
    inbox,
    providers,
    proposals,
    importLocal,
    lastImport,
    approve,
    reject,
  } = useEmailWorkspace();

  const { triggerIslandNotification, setActiveRoute } = useShell();
  const demo = useDemoMode();

  const [subView, setSubView] = useState<EmailSubView>('triagem');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isImportModalOpen, setImportModalOpen] = useState(false);

  // Auto-selecionar a primeira thread quando houver dados prontos
  useEffect(() => {
    if (inbox.status === 'ready' && inbox.data.rows.length > 0 && !selectedThreadId) {
      setSelectedThreadId(inbox.data.rows[0].thread.threadId);
    }
  }, [inbox, selectedThreadId]);

  const handleOpenWorkspace = (threadId: string) => {
    setSelectedThreadId(threadId);
    setSubView('workspace');
  };

  const handleImport = (content: string) => {
    const result = importLocal(content);
    if (result) {
      setImportModalOpen(false);
      // Notificação na Dynamic Island com feedback real
      triggerIslandNotification({
        title: result.duplicate
          ? 'E-mail Já Registrado'
          : `E-mail Processado (${result.proposals} propostas)`,
        tag: 'PROVEDOR LOCAL',
        description: result.duplicate
          ? 'Conteúdo idêntico identificado. Nenhuma duplicação gerada.'
          : `${result.proposals} ${result.proposals === 1 ? 'ação formulada' : 'ações formuladas'} para autorização no Guardian.`,
        badge: result.proposals > 0 ? 'GUARDIAN' : 'INFO',
        state: 'active',
        durationMs: 7000,
        actionLabel: 'Ver no Workspace',
        onAction: () => {
          setSubView('workspace');
        },
      });
    }
  };

  const handleApprove = (actionId: string) => {
    approve(actionId);
    playFeedback('success');
    triggerIslandNotification({
      title: 'Ação Autorizada pelo Usuário',
      tag: 'GUARDIAN · APROVADO',
      description: 'A proposta do e-mail foi confirmada e aplicada às rotinas locais do Medusa.',
      badge: 'CONCLUÍDO',
      state: 'success',
      durationMs: 6000,
    });
  };

  const handleReject = (actionId: string) => {
    reject(actionId);
    playFeedback('close');
  };

  const currentThread =
    inbox.status === 'ready'
      ? inbox.data.rows.find((r) => r.thread.threadId === selectedThreadId)?.thread ??
        inbox.data.rows[0]?.thread ??
        null
      : null;

  const currentAnalyses =
    inbox.status === 'ready' && currentThread
      ? inbox.data.rows.find((r) => r.thread.threadId === currentThread.threadId)?.analyses ?? []
      : [];

  const allThreads =
    inbox.status === 'ready' ? inbox.data.rows.map((r) => r.thread) : [];

  return (
    <main
      id="email-living-experience-main"
      className="w-full pb-20 px-4 sm:px-8 max-w-6xl mx-auto flex flex-col gap-6 pt-6 flex-1 overflow-x-hidden min-w-0"
    >
      {/* ================= HEADER DO DOMÍNIO E-MAIL ================= */}
      <section aria-label="Cabeçalho do E-mail" className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-text-muted">
                Life OS · Comunicação Contextual
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] font-mono text-text-secondary">
                Motor Semântico Local
              </span>
              <span className="text-text-muted/40">•</span>
              <ProvenanceBadge
                kind={demo ? 'fixture' : 'real'}
                detail={demo ? 'Modo Demonstração' : 'Provedor Local'}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              E-mail · Living Experience
            </h1>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
              O Medusa não é uma cópia do Gmail. Ele analisa o que chegou até você, identifica impacto,
              prazos e riscos, e formula ações supervisionadas pelo Guardian para a sua vida real.
            </p>
          </div>

          {/* Botões de Ação Globais */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                playFeedback('open');
                setImportModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-medusa-primary text-[#1C2420] font-semibold text-xs shadow-subtle hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">content_paste</span>
              <span>Colar / Importar E-mail</span>
            </button>
          </div>
        </div>

        {/* ================= SUBVIEW SWITCHER (MODELOS A, B, C & AUDITORIA) ================= */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <div className="flex items-center p-1 rounded-2xl bg-surface border border-border/60 shadow-subtle min-w-max">
            <button
              type="button"
              onClick={() => {
                playFeedback('toggle');
                setSubView('triagem');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                subView === 'triagem'
                  ? 'bg-medusa-primary text-[#1C2420] shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">flash_on</span>
              <span>Triagem Rápida (Modelo A)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playFeedback('toggle');
                setSubView('radar');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                subView === 'radar'
                  ? 'bg-medusa-primary text-[#1C2420] shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">radar</span>
              <span>Radar de Contexto (Modelo B)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playFeedback('toggle');
                setSubView('workspace');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                subView === 'workspace'
                  ? 'bg-medusa-primary text-[#1C2420] shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">splitscreen</span>
              <span>Workspace & Ações (Modelo C)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playFeedback('toggle');
                setSubView('auditoria');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                subView === 'auditoria'
                  ? 'bg-medusa-primary text-[#1C2420] shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">fact_check</span>
              <span>Auditoria Operacional</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= ESTADOS DO DATASTATE DO PERSONAL OS ================= */}

      {/* 1. ESTADO: LOADING */}
      {(!ready || inbox.status === 'loading') && (
        <section aria-label="Carregando e-mails" className="p-12 text-center rounded-2xl bg-surface border border-border/60 flex flex-col items-center justify-center gap-3">
          <span className="w-6 h-6 rounded-full border-2 border-medusa-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-text-secondary">
            Processando caixa contextual e analisando semântica dos e-mails...
          </p>
        </section>
      )}

      {/* 2. ESTADO: PERMISSION REQUIRED (PROVEDOR EXTERNO BLOQUEADO) */}
      {inbox.status === 'permission-required' && (
        <section aria-label="Permissão e Conexão" className="p-8 sm:p-10 rounded-2xl bg-surface border border-border/80 shadow-calm space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-surface-secondary border border-border/60 text-text-muted">
              <span className="material-symbols-outlined text-[28px]">link_off</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">
                  Provedores de Nuvem Bloqueados · Operação Privada
                </h3>
                <ProvenanceBadge kind="blocked" detail="Sem OAuth" />
              </div>
              <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
                O Google Gmail e o Microsoft Outlook estão bloqueados intencionalmente neste ambiente
                por não haver credenciais OAuth configuradas. O Medusa nunca simula dados não autorizados.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-secondary/60 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 text-xs">
              <span className="font-semibold text-text-primary block">
                Como usar o E-mail agora:
              </span>
              <span className="text-text-secondary">
                Use o Provedor Local para colar ou importar mensagens, ou ative os dados de exemplo canônicos.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  playFeedback('open');
                  setImportModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-medusa-primary text-[#1C2420] font-semibold text-xs shadow-subtle hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">content_paste</span>
                <span>Colar E-mail Local</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. ESTADO: EMPTY (NENHUMA MENSAGEM) */}
      {inbox.status === 'empty' && (
        <section aria-label="Caixa Vazia" className="p-12 text-center rounded-2xl bg-surface border border-border/60 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[28px]">inbox</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              Nenhuma mensagem importada no Provedor Local
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Sua caixa de entrada está limpa. Traga mensagens que você precisa processar ou ative os modelos canônicos para demonstrar os fluxos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playFeedback('open');
              setImportModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-medusa-primary text-[#1C2420] font-semibold text-xs shadow-subtle hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">content_paste</span>
            <span>Importar Mensagem</span>
          </button>
        </section>
      )}

      {/* 4. ESTADO: ERROR */}
      {inbox.status === 'error' && (
        <section aria-label="Erro de Carregamento" className="p-8 text-center rounded-2xl bg-[#C45B5B]/10 border border-[#C45B5B]/30 text-[#C45B5B] space-y-3">
          <span className="material-symbols-outlined text-[32px]">error</span>
          <h3 className="text-sm font-bold">Falha ao processar os e-mails</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {inbox.message || 'Ocorreu um erro durante a consulta do estado de dados.'}
          </p>
        </section>
      )}

      {/* 5. ESTADO NORMAL: RENDERIZAR SUBVIEW ATIVA */}
      {inbox.status === 'ready' && (
        <>
          {subView === 'triagem' && (
            <EmailTriageView
              inbox={inbox.data}
              activeFilter={filter}
              onSelectFilter={(f: EmailFilterId) => setFilter(f)}
              selectedThreadId={selectedThreadId}
              onSelectThread={(id: string) => setSelectedThreadId(id)}
              onOpenWorkspace={handleOpenWorkspace}
              onApproveProposal={handleApprove}
              proposals={proposals}
            />
          )}

          {subView === 'radar' && (
            <EmailRadarView
              inbox={inbox.data}
              onOpenWorkspace={handleOpenWorkspace}
              onApproveProposal={handleApprove}
              proposals={proposals}
            />
          )}

          {subView === 'workspace' && (
            <EmailWorkspaceView
              thread={currentThread}
              allThreads={allThreads}
              onSelectThread={(id: string) => setSelectedThreadId(id)}
              analyses={currentAnalyses}
              proposals={proposals}
              onApprove={handleApprove}
              onReject={handleReject}
              onNavigateToRoute={(route: string) => setActiveRoute(route)}
            />
          )}

          {subView === 'auditoria' && (
            <EmailAuditView
              inbox={inbox.data}
              onOpenWorkspace={handleOpenWorkspace}
            />
          )}
        </>
      )}

      {/* Modal de Ingestão de E-mail Local */}
      <EmailImportModal
        isOpen={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
        lastImportStatus={lastImport}
      />
    </main>
  );
}
