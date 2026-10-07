'use client';

import React, { useMemo } from 'react';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { useEmailWorkspace } from '@/lib/useEmailWorkspace';
import { usePersonalOS } from '@/context/PersonalOSContext';
import { useDemoMode } from '@/lib/dataMode';
import { playFeedback } from '@/lib/audioFeedback';

interface EmailContextPanelProps {
  onOpenImport?: () => void;
  onSelectSubView?: (view: 'triagem' | 'radar' | 'workspace' | 'auditoria') => void;
}

export function EmailContextPanel({ onOpenImport, onSelectSubView }: EmailContextPanelProps) {
  const { inbox, providers, proposals } = useEmailWorkspace();
  const { os, version } = usePersonalOS();
  const demo = useDemoMode();

  const counts = useMemo(() => {
    if (inbox.status !== 'ready') {
      return { total: 0, unread: 0, actions: 0, deadlines: 0, events: 0 };
    }
    return {
      total: inbox.data.counts.todos ?? 0,
      unread: inbox.data.counts.nao_lidos ?? 0,
      actions: inbox.data.counts.preciso_agir ?? 0,
      deadlines: inbox.data.counts.com_prazo ?? 0,
      events: inbox.data.counts.com_evento ?? 0,
    };
  }, [inbox]);

  const upcomingImpacts = useMemo(() => {
    if (inbox.status !== 'ready') return [];
    return inbox.data.rows
      .flatMap((r) =>
        r.analyses.flatMap((a) =>
          a.candidates
            .filter((c) => c.status === 'proposed')
            .map((c) => ({
              threadId: r.thread.threadId,
              subject: r.thread.subject,
              kind: c.kind,
              label: 'title' in c ? c.title : c.kind,
              confidence: c.confidence,
              evidence: c.evidence[0]?.excerpt ?? '',
            }))
        )
      )
      .slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox, os, version]);

  return (
    <div className="flex flex-col gap-5 text-text-primary">
      {/* 1. STATUS DE INTEGRAÇÃO & PROVEDORES (ESTADO HONESTO) */}
      <ContextPanelSection
        label="Provedores de E-mail"
        rightSlot={
          <span className="text-[10px] font-mono text-text-muted">
            {providers.local_email.status === 'connected' ? '1 Conectado' : 'Offline'}
          </span>
        }
      >
        <div className="flex flex-col gap-2.5 text-[11px]">
          <p className="text-text-secondary leading-relaxed">
            O Medusa opera sob privacidade por desenho. Provedores de nuvem estão bloqueados
            sem credenciais; o motor contextual processa mensagens via Provedor Local.
          </p>

          <div className="flex flex-col gap-1.5 pt-1">
            {/* Provedor Local */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary/70 border border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#18534B] dark:bg-[#71DBD2]" />
                <span className="font-semibold text-text-primary text-[12px]">Provedor Local</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#18534B] dark:text-[#71DBD2] px-2 py-0.5 rounded bg-medusa-primary/15 border border-medusa-primary/30">
                CONECTADO
              </span>
            </div>

            {/* Gmail */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary/40 border border-border/40 opacity-80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="text-text-secondary text-[12px]">Google Gmail</span>
              </div>
              <ProvenanceBadge kind="blocked" detail="OAuth ausente" />
            </div>

            {/* Microsoft Outlook */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary/40 border border-border/40 opacity-80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="text-text-secondary text-[12px]">Microsoft Outlook</span>
              </div>
              <ProvenanceBadge kind="blocked" detail="Não configurado" />
            </div>
          </div>
        </div>
      </ContextPanelSection>

      {/* 2. TELEMETRIA DA CAIXA CONTEXTUAL */}
      <ContextPanelSection
        label="Síntese Situacional"
        rightSlot={
          <span className="text-[10px] font-mono text-text-secondary font-semibold tabular-nums">
            {counts.total} {counts.total === 1 ? 'mensagem' : 'mensagens'}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
          <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border/60">
            <span className="text-[10px] font-mono uppercase text-text-muted block">Não Lidas</span>
            <span className="text-base font-bold font-mono text-text-primary tabular-nums">
              {counts.unread}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border/60">
            <span className="text-[10px] font-mono uppercase text-text-muted block">Precisa Agir</span>
            <span className="text-base font-bold font-mono text-[#C45B5B] tabular-nums">
              {counts.actions}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border/60">
            <span className="text-[10px] font-mono uppercase text-text-muted block">Com Prazo</span>
            <span className="text-base font-bold font-mono text-text-primary tabular-nums">
              {counts.deadlines}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border/60">
            <span className="text-[10px] font-mono uppercase text-text-muted block">Com Evento</span>
            <span className="text-base font-bold font-mono text-[#18534B] dark:text-[#71DBD2] tabular-nums">
              {counts.events}
            </span>
          </div>
        </div>
      </ContextPanelSection>

      {/* 3. PROPOSTAS & GUARDIAN */}
      <ContextPanelSection
        label="Propostas Guardian"
        rightSlot={
          <span className="text-[11px] font-mono font-bold text-[#18534B] dark:text-[#71DBD2] tabular-nums">
            {proposals.length > 0 ? `${proposals.length} aguardando` : '0 pendentes'}
          </span>
        }
      >
        <div className="flex flex-col gap-2">
          {proposals.length === 0 ? (
            <p className="text-[11px] text-text-muted leading-relaxed">
              Nenhuma ação aguardando autorização no Guardian. Todas as transformações foram resolvidas ou arquivadas.
            </p>
          ) : (
            <div className="space-y-2">
              {proposals.slice(0, 3).map((p) => (
                <div
                  key={p.actionId}
                  className="p-2.5 rounded-xl bg-[#FAFDF5] dark:bg-surface-secondary border border-[#D0EAA3] dark:border-border text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#D0EAA3] text-[#1C2420] font-bold">
                      {p.view?.autonomy ?? 'L2'}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {p.view?.state === 'aguardando_aprovacao' ? 'Aguardando Aprovação' : p.view?.stateLabel || p.view?.state}
                    </span>
                  </div>
                  <h5 className="font-semibold text-text-primary text-[12px] truncate">
                    {p.view?.intent}
                  </h5>
                  <p className="text-[10px] text-text-secondary line-clamp-1">
                    {p.view?.reason || p.view?.intent}
                  </p>
                </div>
              ))}
              {onSelectSubView && (
                <button
                  type="button"
                  onClick={() => {
                    playFeedback('press');
                    onSelectSubView('workspace');
                  }}
                  className="w-full text-center text-[11px] font-medium text-[#18534B] dark:text-[#71DBD2] hover:underline pt-1"
                >
                  Ver no Workspace de Ações →
                </button>
              )}
            </div>
          )}
        </div>
      </ContextPanelSection>

      {/* 4. AÇÕES RÁPIDAS DE INGESTÃO */}
      <ContextPanelSection label="Ingestão Operacional" noBorder>
        <div className="flex flex-col gap-2 pt-1">
          {onOpenImport && (
            <button
              type="button"
              onClick={() => {
                playFeedback('press');
                onOpenImport();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-medusa-primary text-[#1C2420] font-semibold text-[12px] flex items-center justify-center gap-1.5 shadow-subtle hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">content_paste</span>
              <span>Colar / Importar E-mail</span>
            </button>
          )}

          <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-text-muted">
            <span>Modo Demonstração:</span>
            <span className="font-mono font-semibold text-text-secondary">
              {demo ? 'Ativo (?demo=1)' : 'Desativado'}
            </span>
          </div>
        </div>
      </ContextPanelSection>
    </div>
  );
}
