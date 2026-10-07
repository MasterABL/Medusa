'use client';

import React, { useMemo } from 'react';
import { GUARDIAN_CASES } from './guardianFixtures';
import { usePersonalOS } from '@/context/PersonalOSContext';
import { useDemoMode } from '@/lib/dataMode';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';

const DOMAIN_LABEL: Record<string, string> = { finance: 'Finanças', agenda: 'Agenda', email: 'E-mail', education: 'Educação', body: 'Corpo', spiritual: 'Espiritual' };

/** Números e decisões do Guardian REAL (antes: "3 fluxos", "Zero invasão", "D+0" e casos fixos). */
export function GuardianContextPanel() {
  const { os, version } = usePersonalOS();
  const demo = useDemoMode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const views = useMemo(() => os.actionViews(100).filter((a) => a.type !== 'CREATE_REMINDER' && a.type !== 'CLASSIFY_EMAIL'), [os, version]);
  const pending = views.filter((a) => a.state === 'aguardando_aprovacao').length;
  const decided = views.length - pending;
  const resolvedPct = views.length ? Math.round((decided / views.length) * 100) : 0;
  return (
    <div className="space-y-6">
      {/* 1. Estado de Vigilância Silenciosa */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Vigilância Contextual
          </span>
          <span className="text-[11px] font-mono text-[#71DBD2] font-semibold">
            {pending ? `${pending} aguardando você` : 'Nada pendente'}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-text-primary">
            {views.length}<span className="text-xs font-normal text-text-muted ml-1">{views.length === 1 ? 'ação proposta' : 'ações propostas'}</span>
          </span>
          <span className="text-[11px] text-text-secondary font-mono">{decided} decidida(s)</span>
        </div>
        <div className="w-full bg-surface-secondary/70 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#71DBD2] h-full" style={{ width: `${resolvedPct}%` }} />
        </div>
        <div className="text-[10px] text-text-muted font-mono pt-0.5 flex justify-between">
          <span>Decididas</span>
          <span className="font-semibold text-text-secondary">{views.length ? `${resolvedPct}%` : '—'}</span>
        </div>
      </div>

      {/* 2. Casos no Radar do Guardian */}
      <div className="space-y-3 pb-5 border-b border-border/60">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Decisões Recentes
        </span>

        <div className="space-y-2">
          {views.length === 0 && !demo && (
            <p className="text-[11px] text-text-muted">Nenhuma ação proposta ainda. Quando algo precisar da sua aprovação, aparece aqui.</p>
          )}
          {views.slice(0, 4).map((a) => (
            <div key={a.id} className="p-3 rounded-xl bg-surface border border-border/60 flex flex-col gap-1 shadow-subtle">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary truncate">{DOMAIN_LABEL[a.domain] ?? a.domain}</span>
                <span className="text-[10px] font-mono text-[#71DBD2] font-semibold">{a.autonomy}</span>
              </div>
              <p className="text-[11px] text-text-muted line-clamp-1">{a.intent}</p>
              <p className="text-[10px] font-mono text-text-muted">{a.stateLabel}</p>
            </div>
          ))}
          {demo && <ProvenanceBadge kind="fixture" detail="casos de demonstração" />}
          {(demo ? GUARDIAN_CASES : []).map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-surface border border-border/60 flex flex-col gap-1 shadow-subtle"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary truncate">
                  {c.domainLabel}
                </span>
                <span className="text-[10px] font-mono text-[#71DBD2] font-semibold">
                  {c.autonomyLevel}
                </span>
              </div>
              <p className="text-[11px] text-text-muted line-clamp-1">
                {c.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Princípio de Governança */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Princípio do Medusa
        </span>
        <div className="p-3.5 rounded-xl bg-surface-secondary/50 border border-border/60 text-[11px] text-text-secondary leading-relaxed">
          <strong className="text-text-primary block font-mono text-[10px] uppercase mb-1">
            Mostrar Causalidade
          </strong>
          Toda intervenção do sistema tem origem em um evento concreto, passa por contexto real e obedece a políticas explícitas.
        </div>
      </div>
    </div>
  );
}
