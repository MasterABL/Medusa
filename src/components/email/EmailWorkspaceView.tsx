'use client';

import React, { useState } from 'react';
import type { EmailThread, EmailAnalysis } from '@/domains/email/model/types';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { playFeedback } from '@/lib/audioFeedback';

interface EmailWorkspaceViewProps {
  thread: EmailThread | null;
  allThreads: EmailThread[];
  onSelectThread: (threadId: string) => void;
  analyses: EmailAnalysis[];
  proposals: Array<{
    actionId: string;
    messageId?: string;
    candidateId?: string;
    view?: {
      id: string;
      intent: string;
      autonomy?: string;
      reason?: string;
      state: string;
      stateLabel?: string;
    };
  }>;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onNavigateToRoute?: (route: string) => void;
}

export function EmailWorkspaceView({
  thread,
  allThreads,
  onSelectThread,
  analyses,
  proposals,
  onApprove,
  onReject,
  onNavigateToRoute,
}: EmailWorkspaceViewProps) {
  // Mobile switcher: 'thread' (60%) vs 'context' (40%)
  const [mobileTab, setMobileTab] = useState<'thread' | 'context'>('thread');

  if (!thread) {
    return (
      <div className="p-12 text-center rounded-2xl bg-surface border border-border/60 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-[40px] text-text-muted">mark_email_read</span>
        <h3 className="text-base font-semibold text-text-primary">
          Nenhuma conversa selecionada
        </h3>
        <p className="text-xs text-text-secondary max-w-sm">
          Selecione uma mensagem na lista abaixo ou volte para a visualização de Triagem para explorar sua caixa.
        </p>
        {allThreads.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-md pt-2">
            {allThreads.map((t) => (
              <button
                key={t.threadId}
                type="button"
                onClick={() => {
                  playFeedback('press');
                  onSelectThread(t.threadId);
                }}
                className="px-3 py-1.5 rounded-xl text-xs bg-surface-secondary border border-border/60 hover:border-medusa-primary text-text-primary transition-all text-left"
              >
                {t.subject}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const latestMsg = thread.messages[thread.messages.length - 1];
  const provenance = latestMsg?.source?.origin === 'fixture' ? 'fixture' : 'real';
  const topAnalysis = analyses[0];
  const candidates = topAnalysis?.candidates ?? [];
  const domain = topAnalysis?.classification?.domain;
  const category = topAnalysis?.classification?.category;
  const risks = topAnalysis?.risks ?? [];

  // Filas do Guardian relacionadas a esta conversa
  const threadProposals = proposals.filter((p) => {
    return thread.messages.some((m) => m.id === p.messageId);
  });

  return (
    <div className="flex flex-col gap-4 w-full animate-fade-in">
      {/* 1. SELETOR DE THREAD & CABEÇALHO DO WORKSPACE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border/60 shadow-subtle">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 min-w-0">
          <label htmlFor="thread-select" className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex-shrink-0">
            Conversa:
          </label>
          <select
            id="thread-select"
            value={thread.threadId}
            onChange={(e) => {
              playFeedback('toggle');
              onSelectThread(e.target.value);
            }}
            className="text-xs font-medium bg-surface-secondary border border-border/60 rounded-xl px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-medusa-primary max-w-[260px] sm:max-w-xs truncate"
          >
            {allThreads.map((t) => (
              <option key={t.threadId} value={t.threadId}>
                {t.subject}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Switcher (visível apenas em telas menores < 1024px) */}
        <div className="flex lg:hidden items-center p-1 rounded-xl bg-surface-secondary border border-border/60 self-center">
          <button
            type="button"
            onClick={() => {
              playFeedback('toggle');
              setMobileTab('thread');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mobileTab === 'thread'
                ? 'bg-medusa-primary text-[#1C2420] shadow-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Conversa (60%)
          </button>
          <button
            type="button"
            onClick={() => {
              playFeedback('toggle');
              setMobileTab('context');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mobileTab === 'context'
                ? 'bg-medusa-primary text-[#1C2420] shadow-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Contexto & Guardian (40%)
          </button>
        </div>
      </div>

      {/* 2. SPLIT WORKSPACE: 60% THREAD / 40% CONTEXTO (MODELO C) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
        {/* ================= PANE ESQUERDA: THREAD / CONVERSA (60% = 7 COLS) ================= */}
        <div
          className={`lg:col-span-7 flex flex-col gap-4 w-full ${
            mobileTab === 'context' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border/60 shadow-calm flex flex-col gap-5">
            {/* Header da Mensagem */}
            <div className="border-b border-border/60 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base sm:text-lg font-bold text-text-primary leading-snug">
                  {thread.subject}
                </h2>
                <ProvenanceBadge
                  kind={provenance}
                  detail={provenance === 'fixture' ? 'Demonstração' : 'Provedor Local'}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-secondary pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] flex items-center justify-center font-bold text-xs">
                    {(latestMsg?.sender?.name || latestMsg?.sender?.address || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary block">
                      {latestMsg?.sender?.name || 'Remetente Desconhecido'}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      {latestMsg?.sender?.address}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-text-muted sm:text-right">
                  <span>Recebido em: </span>
                  <span className="text-text-secondary font-semibold">
                    {latestMsg?.receivedAt ? new Date(latestMsg.receivedAt).toLocaleString('pt-BR') : 'Data não informada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Corpo da Mensagem com Destaques Semânticos */}
            <div className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-sans bg-surface-secondary/30 p-4 sm:p-5 rounded-xl border border-border/40">
              {latestMsg?.snippet || '(Sem conteúdo disponível)'}
            </div>

            {/* Evidências Extraídas inline */}
            {topAnalysis?.extraction && (
              <div className="p-3.5 rounded-xl bg-surface-secondary/60 border border-border/50 text-xs space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                  Entidades Detectadas pelo Motor Semântico:
                </span>
                <div className="flex flex-wrap gap-2">
                  {topAnalysis.extraction.dates?.map((d, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border/60 text-[11px] text-text-secondary flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-[13px] text-medusa-primary">event</span>
                      <span>Data: {d.value.date} ({d.value.raw})</span>
                    </span>
                  ))}
                  {topAnalysis.extraction.times?.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border/60 text-[11px] text-text-secondary flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-[13px] text-medusa-primary">schedule</span>
                      <span>Hora: {t.value.time}</span>
                    </span>
                  ))}
                  {topAnalysis.extraction.amounts?.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border/60 text-[11px] text-text-secondary flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-[13px] text-[#B87A1E] dark:text-[#E5A93C]">payments</span>
                      <span>Valor: R$ {a.value.amount.toFixed(2)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= PANE DIREITA: CONTEXTO & GUARDIAN ACTION DECK (40% = 5 COLS) ================= */}
        <div
          className={`lg:col-span-5 flex flex-col gap-4 w-full ${
            mobileTab === 'thread' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* 1. PAINEL DE CONTEXTO & RELAÇÕES NO PERSONAL OS */}
          <div className="p-5 rounded-2xl bg-surface border border-border/60 shadow-calm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-medusa-primary text-[18px]">
                  account_tree
                </span>
                <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-text-primary">
                  Contexto & Impacto na Vida
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary border border-border/60 text-text-secondary uppercase">
                {domain || 'PESSOAL'}
              </span>
            </div>

            {/* Motivos de Importância */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-mono uppercase text-text-muted block">
                Por que isso importa:
              </span>
              <p className="text-text-secondary leading-relaxed font-medium">
                {topAnalysis?.classification?.reasons?.[0] || 'Mensagem relevante para o seu planejamento semanal.'}
              </p>
            </div>

            {/* Riscos Detectados */}
            {risks.length > 0 && (
              <div className="p-3 rounded-xl bg-[#C45B5B]/10 border border-[#C45B5B]/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[#C45B5B] font-semibold">
                  <span className="material-symbols-outlined text-[14px]">report_problem</span>
                  <span>Risco Detectado: {risks[0].type.toUpperCase()}</span>
                </div>
                <p className="text-text-secondary text-[11px] leading-relaxed">
                  {risks[0].reason}
                </p>
              </div>
            )}

            {/* Relações com o ecossistema (Agenda / Projetos / Finanças) */}
            <div className="space-y-2 pt-1 border-t border-border/40 text-xs">
              <span className="text-[10px] font-mono uppercase text-text-muted block font-semibold">
                Relação no Personal OS:
              </span>

              {domain === 'education' || category === 'academic' ? (
                <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-medusa-primary text-[16px]">school</span>
                    <span className="font-medium text-text-primary">Educação · Contabilidade</span>
                  </div>
                  {onNavigateToRoute && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRoute('educacao')}
                      className="text-[10px] font-mono text-medusa-primary hover:underline"
                    >
                      Ver Projeto →
                    </button>
                  )}
                </div>
              ) : domain === 'body' || category === 'medical' ? (
                <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-medusa-primary text-[16px]">medical_services</span>
                    <span className="font-medium text-text-primary">Agenda · Consulta Dra. Ana Souza</span>
                  </div>
                  {onNavigateToRoute && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRoute('agenda')}
                      className="text-[10px] font-mono text-medusa-primary hover:underline"
                    >
                      Ver Agenda →
                    </button>
                  )}
                </div>
              ) : domain === 'finance' ? (
                <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#B87A1E] dark:text-[#E5A93C] text-[16px]">credit_card</span>
                    <span className="font-medium text-text-primary">Finanças · Fatura Nubank</span>
                  </div>
                  {onNavigateToRoute && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRoute('financas')}
                      className="text-[10px] font-mono text-medusa-primary hover:underline"
                    >
                      Ver Finanças →
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted">
                  Nenhuma entidade externa vinculada a este e-mail.
                </p>
              )}
            </div>
          </div>

          {/* 2. GUARDIAN ACTION DECK (AUTORIZAÇÃO, SUPERVISÃO & ESTADO HONESTO) */}
          <div className="p-5 rounded-2xl bg-surface border border-border/60 shadow-calm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-medusa-primary text-[18px]">
                  shield
                </span>
                <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-text-primary">
                  Guardian · Ações Propostas
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-medusa-primary/15 text-[#18534B] dark:text-[#71DBD2] font-bold">
                {candidates.length} CANDIDATOS
              </span>
            </div>

            {candidates.length === 0 ? (
              <p className="text-xs text-text-muted italic py-2">
                Nenhuma ação requerida para este e-mail. A mensagem é estritamente informativa.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {candidates.map((c, idx) => {
                  const matchingProposal = threadProposals.find((p) => p.candidateId === c.id) || threadProposals[idx] || threadProposals[0];
                  const autonomyLevel = matchingProposal?.view?.autonomy || (c.kind === 'finance' ? 'L3' : 'L2');
                  const state = matchingProposal?.view?.state || 'aguardando_aprovacao';
                  const isApproved =
                    state === 'aprovado' ||
                    state === 'executado' ||
                    state === 'aprovada_sem_executor' ||
                    c.status === 'accepted' ||
                    c.status === 'linked_existing' ||
                    c.matchedExisting !== undefined;
                  const isRejected = state === 'rejeitado' || c.status === 'dismissed';

                  return (
                    <div
                      key={c.id || idx}
                      className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                        isApproved
                          ? 'bg-[#18534B]/10 border-[#18534B]/30'
                          : isRejected
                          ? 'bg-surface-secondary/40 border-border/40 opacity-70'
                          : 'bg-surface-secondary/70 border-border/70 shadow-subtle'
                      }`}
                    >
                      {/* Top: Nível de Autonomia & Estado */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            autonomyLevel === 'L3'
                              ? 'bg-[#C45B5B]/15 text-[#C45B5B] border border-[#C45B5B]/30'
                              : autonomyLevel === 'L2'
                              ? 'bg-[#E5A93C]/15 text-[#B87A1E] dark:text-[#E5A93C] border border-[#E5A93C]/30'
                              : 'bg-surface border border-border/60 text-text-muted'
                          }`}
                        >
                          NÍVEL {autonomyLevel} · {autonomyLevel === 'L3' ? 'AÇÃO SENSÍVEL' : autonomyLevel === 'L2' ? 'SUPERVISIONADO' : 'INFORMATIVO'}
                        </span>

                        <span className="text-[10px] font-mono text-text-muted">
                          {isApproved ? 'APROVADO' : isRejected ? 'REJEITADO' : 'AGUARDANDO APROVAÇÃO'}
                        </span>
                      </div>

                      {/* Título & Descrição */}
                      <div>
                        <h4 className="font-semibold text-text-primary text-xs">
                          {('title' in c ? c.title : matchingProposal?.view?.intent) || (
                            c.kind === 'calendar_event'
                              ? 'Criar compromisso na Agenda'
                              : c.kind === 'deadline'
                              ? 'Definir prazo e registrar tarefa'
                              : c.kind === 'finance'
                              ? 'Registrar vencimento de fatura'
                              : 'Ação sugerida'
                          )}
                        </h4>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                          {c.evidence[0]?.excerpt ? `Evidência: "${c.evidence[0].excerpt}"` : matchingProposal?.view?.reason || matchingProposal?.view?.intent || ''}
                        </p>
                      </div>

                      {/* Regra / Política aplicada */}
                      <div className="text-[10px] font-mono text-text-muted bg-surface/60 p-2 rounded-lg border border-border/40">
                        <span>Regra Guardian: </span>
                        <span className="text-text-secondary">
                          {c.kind === 'calendar_event'
                            ? 'Política de Telemedicina #MED-01'
                            : c.kind === 'finance'
                            ? 'Política Financeira #FIN-02 (Pagamento exige confirmação explícita)'
                            : 'Supervisão de Prazos #PRZ-04'}
                        </span>
                      </div>

                      {/* Estado Pós-Aprovação HONESTO (Regra Crítica do Medusa) */}
                      {isApproved && (
                        <div className="p-2.5 rounded-lg bg-[#FAFDF5] dark:bg-surface-secondary border border-[#D0EAA3] dark:border-border text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 text-[#18534B] dark:text-[#71DBD2] font-semibold">
                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                            <span>
                              {c.kind === 'finance'
                                ? 'AÇÃO APROVADA — EXECUTOR NÃO CONECTADO'
                                : 'AÇÃO APROVADA & APLICADA'}
                            </span>
                          </div>
                          <p className="text-text-secondary text-[10px] leading-relaxed">
                            {c.kind === 'finance'
                              ? 'O prazo de vencimento foi registrado no seu sistema. Nenhum pagamento financeiro foi executado automaticamente (não há executor bancário conectado).'
                              : c.kind === 'calendar_event'
                              ? 'O compromisso foi sincronizado e aparece na sua Agenda local.'
                              : 'A tarefa foi vinculada ao projeto acadêmico correspondente.'}
                          </p>
                        </div>
                      )}

                      {/* Botões de Ação para Aprovação */}
                      {!isApproved && !isRejected && matchingProposal && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              playFeedback('action');
                              onApprove(matchingProposal.actionId);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-medusa-primary text-[#1C2420] font-semibold text-xs shadow-subtle hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">done</span>
                            <span>Aprovar Ação</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playFeedback('close');
                              onReject(matchingProposal.actionId);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-surface-secondary border border-border/60 text-text-secondary hover:text-text-primary text-xs transition-colors"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
