'use client';

import React, { useMemo } from 'react';
import type { EmailInbox, EmailInboxRow } from '@/domains/email/selectors';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { playFeedback } from '@/lib/audioFeedback';

interface EmailRadarViewProps {
  inbox: EmailInbox;
  onOpenWorkspace: (threadId: string) => void;
  onApproveProposal?: (actionId: string) => void;
  proposals?: Array<{ actionId: string; view?: { intent?: string; autonomy?: string; state: string } }>;
}

export function EmailRadarView({
  inbox,
  onOpenWorkspace,
  onApproveProposal,
  proposals = [],
}: EmailRadarViewProps) {
  // Categorização em 3 Níveis Conceituais do Modelo B:
  // 1. URGENTE: risco crítico/alto, com prazo iminente ou saúde/segurança
  // 2. PRECISA DE AÇÃO: com propostas no Guardian, precisa agir ou aguardando resposta
  // 3. INFORMATIVO: leitura, newsletters, notificações sem ação requerida
  const { urgentRows, actionRows, infoRows } = useMemo(() => {
    const urgent: EmailInboxRow[] = [];
    const action: EmailInboxRow[] = [];
    const info: EmailInboxRow[] = [];

    for (const row of inbox.rows) {
      const isUrgent =
        row.thread.importance === 'critical' ||
        (row.thread.importance === 'high' && row.analyses.some((a) => a.classification.category === 'medical' || a.classification.domain === 'finance'));

      const needsAction =
        row.thread.status === 'needs_action' ||
        row.candidateCount > 0 ||
        row.analyses.some((a) => a.readingStates.includes('actionable'));

      if (isUrgent) {
        urgent.push(row);
      } else if (needsAction) {
        action.push(row);
      } else {
        info.push(row);
      }
    }

    return { urgentRows: urgent, actionRows: action, infoRows: info };
  }, [inbox.rows]);

  const renderRadarCard = (row: EmailInboxRow, tier: 'urgent' | 'action' | 'info') => {
    const latestMsg = row.thread.messages[row.thread.messages.length - 1];
    const sender = latestMsg?.sender?.name || latestMsg?.sender?.address || 'Desconhecido';
    const provenance = latestMsg?.source?.origin === 'fixture' ? 'fixture' : 'real';

    const topAnalysis = row.analyses[0];
    const domain = topAnalysis?.classification?.domain;
    const category = topAnalysis?.classification?.category;
    const topRisk = topAnalysis?.risks?.[0];
    const candidate = topAnalysis?.candidates?.[0];

    const tierBadge = {
      urgent: { label: 'URGENTE', border: 'border-[#C45B5B]/40', bg: 'bg-[#C45B5B]/10', text: 'text-[#C45B5B]', icon: 'warning' },
      action: { label: 'PRECISA DE AÇÃO', border: 'border-[#E5A93C]/40', bg: 'bg-[#E5A93C]/10', text: 'text-[#B87A1E] dark:text-[#E5A93C]', icon: 'pending_actions' },
      info: { label: 'INFORMATIVO', border: 'border-border/60', bg: 'bg-surface-secondary/40', text: 'text-text-muted', icon: 'info' },
    }[tier];

    return (
      <div
        key={row.thread.threadId}
        className={`p-4 sm:p-5 rounded-2xl bg-surface border ${tierBadge.border} shadow-subtle hover:shadow-calm transition-all flex flex-col gap-3.5`}
      >
        {/* Top Header: Badge, Sender, Provenance */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${tierBadge.bg} ${tierBadge.text}`}>
              <span className="material-symbols-outlined text-[12px]">{tierBadge.icon}</span>
              <span>{tierBadge.label}</span>
            </span>

            <span className="text-xs font-semibold text-text-primary">
              {sender}
            </span>

            <ProvenanceBadge kind={provenance} />
          </div>

          <span className="text-[11px] font-mono text-text-muted">
            {row.thread.lastMessageAt ? new Date(row.thread.lastMessageAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
          </span>
        </div>

        {/* Assunto & Snippet */}
        <div>
          <h4 className="text-sm sm:text-base font-semibold text-text-primary">
            {row.thread.subject}
          </h4>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">
            {latestMsg?.snippet || '(Sem prévia de texto)'}
          </p>
        </div>

        {/* Bloco de Impacto & Causalidade (Contexto Primeiro) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-surface-secondary/60 border border-border/50 text-xs">
          {/* Risco detectado */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-text-muted block">
              Risco & Impacto Detectado:
            </span>
            <span className="font-medium text-text-primary">
              {topRisk?.reason || row.why || 'Impacto operacional sob monitoramento'}
            </span>
          </div>

          {/* Relação com o Personal OS */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-text-muted block">
              Relação no Sistema:
            </span>
            <span className="font-medium text-text-secondary">
              {domain === 'education' || category === 'academic'
                ? 'Educação · Projeto de Contabilidade'
                : domain === 'body' || category === 'medical'
                ? 'Corpo / Saúde · Consulta Telemedicina'
                : domain === 'finance'
                ? 'Finanças · Fatura / Vencimento'
                : 'Comunicação Pessoal'}
            </span>
          </div>
        </div>

        {/* Footer com Ação Recomendada & Botão */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="material-symbols-outlined text-[16px] text-medusa-primary">
              arrow_circle_right
            </span>
            <span>
              <strong className="text-text-primary">Ação Recomendada:</strong>{' '}
              {candidate
                ? candidate.kind === 'calendar_event'
                  ? 'Registrar compromisso e agendar lembrete na Agenda'
                  : candidate.kind === 'deadline' || candidate.kind === 'task'
                  ? 'Criar tarefa com prazo no Projeto correspondente'
                  : candidate.kind === 'finance'
                  ? 'Registrar data de vencimento no módulo de Finanças'
                  : 'Revisar conteúdo no Workspace'
                : 'Apenas arquivar ou marcar como lido'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playFeedback('navigation');
              onOpenWorkspace(row.thread.threadId);
            }}
            className="self-end sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-secondary border border-border/60 hover:bg-medusa-primary hover:text-[#1C2420] transition-colors flex items-center gap-1.5 shadow-subtle"
          >
            <span>Ver no Workspace</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      {/* 1. TELEMETRIA SUPERIOR DO RADAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-border/60 shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-muted block">Crítico / Urgente</span>
          <span className="text-2xl font-bold font-mono text-[#C45B5B] tabular-nums">
            {urgentRows.length}
          </span>
          <span className="text-[10px] text-text-secondary mt-1 block">Atenção imediata</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border/60 shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-muted block">Precisa Agir</span>
          <span className="text-2xl font-bold font-mono text-[#B87A1E] dark:text-[#E5A93C] tabular-nums">
            {actionRows.length}
          </span>
          <span className="text-[10px] text-text-secondary mt-1 block">Aguardando decisão</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border/60 shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-muted block">Informativo</span>
          <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
            {infoRows.length}
          </span>
          <span className="text-[10px] text-text-secondary mt-1 block">Sem risco de prazo</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border/60 shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-muted block">Propostas Guardian</span>
          <span className="text-2xl font-bold font-mono text-[#18534B] dark:text-[#71DBD2] tabular-nums">
            {proposals.length}
          </span>
          <span className="text-[10px] text-text-secondary mt-1 block">Sob supervisão</span>
        </div>
      </div>

      {/* 2. NÍVEL 1: URGENTE */}
      <section aria-label="Nível Urgente" className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#C45B5B]/30 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C45B5B] living-pulse" />
          <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-[#C45B5B]">
            1. Urgente · Impacto Imediato ({urgentRows.length})
          </h3>
        </div>
        {urgentRows.length === 0 ? (
          <p className="text-xs text-text-muted italic py-2">
            Nenhuma mensagem com impacto crítico ou emergencial detectada.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {urgentRows.map((r) => renderRadarCard(r, 'urgent'))}
          </div>
        )}
      </section>

      {/* 3. NÍVEL 2: PRECISA DE AÇÃO */}
      <section aria-label="Nível Precisa de Ação" className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E5A93C]/30 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5A93C]" />
          <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-[#B87A1E] dark:text-[#E5A93C]">
            2. Precisa de Ação · Supervisão Guardian ({actionRows.length})
          </h3>
        </div>
        {actionRows.length === 0 ? (
          <p className="text-xs text-text-muted italic py-2">
            Nenhuma ação pendente de supervisão no momento.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {actionRows.map((r) => renderRadarCard(r, 'action'))}
          </div>
        )}
      </section>

      {/* 4. NÍVEL 3: INFORMATIVO */}
      <section aria-label="Nível Informativo" className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-text-secondary">
            3. Informativo · Apenas Leitura ({infoRows.length})
          </h3>
        </div>
        {infoRows.length === 0 ? (
          <p className="text-xs text-text-muted italic py-2">
            Nenhuma mensagem informativa arquivada.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {infoRows.map((r) => renderRadarCard(r, 'info'))}
          </div>
        )}
      </section>
    </div>
  );
}
