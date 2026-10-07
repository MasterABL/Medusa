'use client';

import React from 'react';
import type { EmailFilterId, EmailInbox, EmailInboxRow } from '@/domains/email/selectors';
import { EMAIL_FILTERS } from '@/domains/email/selectors';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { playFeedback } from '@/lib/audioFeedback';

interface EmailTriageViewProps {
  inbox: EmailInbox;
  activeFilter: EmailFilterId;
  onSelectFilter: (filter: EmailFilterId) => void;
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onOpenWorkspace: (threadId: string) => void;
  onApproveProposal?: (actionId: string) => void;
  proposals?: Array<{ actionId: string; view?: { intent?: string; autonomy?: string; state: string } }>;
}

export function EmailTriageView({
  inbox,
  activeFilter,
  onSelectFilter,
  selectedThreadId,
  onSelectThread,
  onOpenWorkspace,
  onApproveProposal,
  proposals = [],
}: EmailTriageViewProps) {
  const getFilterBadge = (id: EmailFilterId) => {
    return inbox.counts[id] ?? 0;
  };

  const formatReceivedTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return iso;
    }
  };

  const getImportanceBadge = (importance?: string) => {
    switch (importance) {
      case 'critical':
        return { label: 'CRÍTICO', bg: 'bg-[#C45B5B]/15 text-[#C45B5B] border-[#C45B5B]/30' };
      case 'high':
        return { label: 'ALTO', bg: 'bg-[#E5A93C]/15 text-[#B87A1E] dark:text-[#E5A93C] border-[#E5A93C]/30' };
      case 'medium':
        return { label: 'MÉDIO', bg: 'bg-surface-secondary text-text-secondary border-border/60' };
      default:
        return { label: 'BAIXO', bg: 'bg-surface-secondary/50 text-text-muted border-border/40' };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* 1. BARRA DE FILTROS OPERACIONAIS (MODELO A - ALTA VELOCIDADE) */}
      <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex items-center gap-1.5 min-w-max">
          {EMAIL_FILTERS.map((f) => {
            const count = getFilterBadge(f.id);
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  playFeedback('toggle');
                  onSelectFilter(f.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-medusa-primary text-[#1C2420] font-semibold shadow-subtle'
                    : 'bg-surface border border-border/60 text-text-secondary hover:text-text-primary hover:border-border'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-black/15 text-[#1C2420] font-bold'
                      : 'bg-surface-secondary text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LISTAGEM DE TRIAGEM RÁPIDA */}
      {inbox.rows.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-border/60 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-[36px] text-text-muted">inbox</span>
          <p className="text-sm font-medium text-text-primary">
            Nenhuma mensagem encontrada neste filtro.
          </p>
          <p className="text-xs text-text-muted max-w-sm">
            Selecione o filtro &quot;Todos&quot; ou importe uma nova mensagem no Provedor Local para iniciar a triagem.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {inbox.rows.map((row: EmailInboxRow) => {
            const isSelected = selectedThreadId === row.thread.threadId;
            const latestMsg = row.thread.messages[row.thread.messages.length - 1];
            const senderName = latestMsg?.sender?.name || latestMsg?.sender?.address || 'Desconhecido';
            const provenance = latestMsg?.source?.origin === 'fixture' ? 'fixture' : 'real';
            const importanceStyle = getImportanceBadge(row.thread.importance);
            const pendingForThread = proposals.filter((p) => p.view?.state === 'aguardando_aprovacao');

            return (
              <div
                key={row.thread.threadId}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                onClick={() => {
                  playFeedback('press');
                  onSelectThread(row.thread.threadId);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playFeedback('press');
                    onSelectThread(row.thread.threadId);
                  }
                }}
                className={`group text-left p-4 rounded-2xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-medusa-primary/50 cursor-pointer ${
                  isSelected
                    ? 'bg-surface border-medusa-primary shadow-calm ring-1 ring-medusa-primary/30'
                    : 'bg-surface border-border/60 hover:border-border hover:shadow-subtle'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Não lido indicator */}
                    {row.thread.unreadCount > 0 ? (
                      <span className="w-2 h-2 rounded-full bg-medusa-primary flex-shrink-0" title="Não lido" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-border/60 flex-shrink-0" />
                    )}

                    {/* Sender */}
                    <span className="font-semibold text-xs sm:text-sm text-text-primary truncate">
                      {senderName}
                    </span>

                    {/* Provenance badge */}
                    <ProvenanceBadge
                      kind={provenance}
                      detail={provenance === 'fixture' ? 'Demonstração' : 'Provedor Local'}
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Importance pill */}
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${importanceStyle.bg}`}
                    >
                      {importanceStyle.label}
                    </span>

                    {/* Timestamp */}
                    <span className="text-[11px] font-mono text-text-muted">
                      {formatReceivedTime(row.thread.lastMessageAt)}
                    </span>
                  </div>
                </div>

                {/* Subject & snippet */}
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-text-primary group-hover:text-medusa-primary transition-colors">
                    {row.thread.subject}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                    {latestMsg?.snippet || '(Sem prévia de texto)'}
                  </p>
                </div>

                {/* Footer metadata: "Por que importa" + Ações */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-border/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Why reason chip */}
                    {row.why && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary bg-surface-secondary/70 border border-border/50 px-2.5 py-1 rounded-lg">
                        <span className="material-symbols-outlined text-[13px] text-medusa-primary">
                          insights
                        </span>
                        <span className="font-medium text-text-primary">{row.why}</span>
                      </span>
                    )}

                    {/* Propostas Guardian counter */}
                    {row.candidateCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 border border-[#71DBD2]/30 px-2 py-0.5 rounded-lg">
                        <span className="material-symbols-outlined text-[13px]">shield</span>
                        <span>{row.candidateCount} {row.candidateCount === 1 ? 'proposta' : 'propostas'} Guardian</span>
                      </span>
                    )}
                  </div>

                  {/* Quick Action Button to Workspace */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {pendingForThread.length > 0 && onApproveProposal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playFeedback('action');
                          onApproveProposal(pendingForThread[0].actionId);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-medusa-primary/15 text-[#18534B] dark:text-[#71DBD2] hover:bg-medusa-primary hover:text-[#1C2420] transition-colors border border-medusa-primary/30 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">done</span>
                        <span>Aprovar ({pendingForThread[0].view?.autonomy ?? 'L2'})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playFeedback('navigation');
                        onOpenWorkspace(row.thread.threadId);
                      }}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-surface-secondary text-text-primary hover:bg-medusa-primary hover:text-[#1C2420] transition-colors border border-border/60 flex items-center gap-1"
                    >
                      <span>Abrir Workspace</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
