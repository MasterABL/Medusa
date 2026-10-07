'use client';

import React, { useState } from 'react';
import type { EmailInbox } from '@/domains/email/selectors';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { playFeedback } from '@/lib/audioFeedback';

interface EmailAuditViewProps {
  inbox: EmailInbox;
  onOpenWorkspace: (threadId: string) => void;
}

export function EmailAuditView({ inbox, onOpenWorkspace }: EmailAuditViewProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    inbox.rows[0]?.thread.threadId ?? null
  );

  const selectedRow = inbox.rows.find((r) => r.thread.threadId === selectedThreadId) || inbox.rows[0];

  if (!selectedRow) {
    return (
      <div className="p-12 text-center rounded-2xl bg-surface border border-border/60 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-[36px] text-text-muted">fact_check</span>
        <p className="text-sm font-medium text-text-primary">
          Nenhuma trilha de auditoria disponível.
        </p>
        <p className="text-xs text-text-muted max-w-sm">
          Importe uma mensagem no Provedor Local para visualizar a governança e a árvore de decisões do Guardian.
        </p>
      </div>
    );
  }

  const latestMsg = selectedRow.thread.messages[selectedRow.thread.messages.length - 1];
  const provenance = latestMsg?.source?.origin === 'fixture' ? 'fixture' : 'real';
  const analysis = selectedRow.analyses[0];
  const candidates = analysis?.candidates ?? [];
  const risk = analysis?.risks?.[0];

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* 1. SELETOR DE MENSAGEM PARA AUDITORIA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border/60 shadow-subtle">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0">
          <label htmlFor="audit-thread-select" className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex-shrink-0">
            Mensagem sob Auditoria:
          </label>
          <select
            id="audit-thread-select"
            value={selectedRow.thread.threadId}
            onChange={(e) => {
              playFeedback('toggle');
              setSelectedThreadId(e.target.value);
            }}
            className="text-xs font-medium bg-surface-secondary border border-border/60 rounded-xl px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-medusa-primary max-w-sm truncate"
          >
            {inbox.rows.map((r) => (
              <option key={r.thread.threadId} value={r.thread.threadId}>
                {r.thread.subject}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            playFeedback('navigation');
            onOpenWorkspace(selectedRow.thread.threadId);
          }}
          className="self-end sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-secondary border border-border/60 hover:bg-medusa-primary hover:text-[#1C2420] transition-colors flex items-center gap-1.5 shadow-subtle"
        >
          <span>Abrir no Workspace</span>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </button>
      </div>

      {/* 2. TRILHA DE GOVERNANÇA: DO E-MAIL À DECISÃO */}
      <div className="p-6 rounded-2xl bg-surface border border-border/60 shadow-calm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-medusa-primary text-[20px]">
              verified_user
            </span>
            <h3 className="text-sm font-mono uppercase font-bold tracking-wider text-text-primary">
              Trilha de Decisão do Personal OS
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Explicação auditável de como o Medusa interpretou a mensagem, avaliou riscos e formulou recomendações.
          </p>
        </div>

        {/* Linha do tempo em 5 estágios */}
        <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
          {/* Estágio 1: Ingestão & Proveniência */}
          <div className="relative space-y-1.5">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-medusa-primary border-4 border-surface" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                1. Origem & Ingestão
              </span>
              <ProvenanceBadge kind={provenance} />
            </div>
            <p className="text-xs text-text-primary font-semibold">
              {selectedRow.thread.subject}
            </p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Recebido de <span className="font-mono text-text-primary">{latestMsg?.sender?.address}</span> em{' '}
              <span className="font-mono">{latestMsg?.receivedAt ? new Date(latestMsg.receivedAt).toLocaleString('pt-BR') : 'Data não informada'}</span>.{' '}
              {provenance === 'fixture'
                ? 'Ingestão em modo de demonstração (?demo=1).'
                : 'Ingestão local privada sem tráfego de dados para servidores externos.'}
            </p>
          </div>

          {/* Estágio 2: Análise Semântica & Extração */}
          <div className="relative space-y-1.5">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#18534B] dark:bg-[#71DBD2] border-4 border-surface" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
              2. Extração Semântica & NLP Local
            </span>
            <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50 text-xs space-y-1.5">
              <p className="text-text-primary font-medium">
                Evidências isoladas no corpo da mensagem:
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {analysis?.classification?.reasons.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border/60 text-[11px] text-text-secondary font-mono">
                    Regra #{i + 1}: &quot;{r}&quot;
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Estágio 3: Classificação & Avaliação de Risco */}
          <div className="relative space-y-1.5">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#E5A93C] border-4 border-surface" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
              3. Classificação & Avaliação de Risco
            </span>
            <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">
                  Domínio: {analysis?.classification?.domain.toUpperCase()} · Categoria: {analysis?.classification?.category.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border/60">
                  Urgência: {selectedRow.thread.importance?.toUpperCase() || 'BAIXA'}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {risk
                  ? `Severidade: ${risk.severity.toUpperCase()}. Justificativa: ${risk.reason}`
                  : 'Nenhum risco de perda de prazo ou impacto financeiro iminente identificado.'}
              </p>
            </div>
          </div>

          {/* Estágio 4: Formulação de Candidatos Guardian */}
          <div className="relative space-y-1.5">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-medusa-primary border-4 border-surface" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
              4. Formulação de Candidatos no Guardian
            </span>
            <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50 text-xs space-y-2">
              {candidates.length === 0 ? (
                <p className="text-[11px] text-text-muted italic">
                  Nenhum candidato formulado. O e-mail permanece como documento informativo.
                </p>
              ) : (
                candidates.map((c, i) => (
                  <div key={i} className="space-y-0.5 border-b border-border/40 pb-1.5 last:border-none last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary text-xs">
                        {'title' in c ? c.title : c.kind.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-medusa-primary/15 text-[#18534B] dark:text-[#71DBD2] font-bold">
                        {c.kind === 'finance' ? 'L3' : 'L2'} · {c.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-text-muted">
                      Confiança: {Math.round(c.confidence * 100)}% · Id: {c.id}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Estágio 5: Decisão & Consequência Operacional */}
          <div className="relative space-y-1.5">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#18534B] dark:bg-[#71DBD2] border-4 border-surface" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
              5. Consequência no Ecossistema Medusa
            </span>
            <div className="p-3.5 rounded-xl bg-[#FAFDF5] dark:bg-surface-secondary border border-[#D0EAA3] dark:border-border text-xs space-y-1">
              <span className="font-semibold text-[#18534B] dark:text-[#71DBD2] block">
                Garantia de Governança & Integridade:
              </span>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Todas as ações executadas no sistema exigem supervisão conforme a política do Guardian.
                Integrações externas não conectadas (como pagamentos de contas ou envio externo) são registradas
                com o status honesto <strong className="font-mono">AÇÃO APROVADA — EXECUTOR NÃO CONECTADO</strong>,
                nunca simulando sucesso em um serviço não autenticado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
