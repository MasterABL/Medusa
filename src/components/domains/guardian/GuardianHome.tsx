'use client';

import React, { useEffect, useMemo } from 'react';
import { GuardianDomainApi } from '@/domains/guardian';
import { Disclosure } from '../shared/Disclosure';
import { DemoBadge } from '../shared/DemoBadge';
import { DomainHeader } from '../shared/DomainHeader';
import { PendingApprovals } from '../shared/PendingApprovals';
import { executeApprovedBodyAction } from '../corpo/bodySession';
import { executeApprovedFinanceAction } from '../financas/financeSession';
import type { Action } from '@/foundation/types/action';
import { AutonomyPanel } from './AutonomyPanel';
import { FindingCard } from './FindingCard';
import { COVERAGE, getGuardianSession, guardianUi, runCycle, selectFinding, useGuardianState } from './guardianSession';
import { HUMAN_EVENTS, eventTime, healthOf, humanMessage, isOpen } from './guardianView';

/** Executor do domínio certo para um pedido pendente de OUTRO domínio; sem executor, falha às claras. */
function executeForDomain(action: Action): void {
  if (action.domain === 'finance') return executeApprovedFinanceAction(action);
  if (action.domain === 'body') return executeApprovedBodyAction(action);
  throw new Error(`o domínio "${action.domain}" ainda não tem executor ligado a esta tela`);
}

const MODE_TEXT = { real: 'observando', demo: 'sobre demonstração', sem_fonte: 'sem fonte conectada' } as const;

import { GuardianTopologyRadar } from './GuardianTopologyRadar';
import { GuardianPipelineTracker } from './GuardianPipelineTracker';

export function GuardianHome({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { version, running, cycles, lastReport } = useGuardianState();
  const { repo } = getGuardianSession();
  const [filteredCategory, setFilteredCategory] = React.useState<string | null>(null);

  useEffect(() => {
    if (cycles === 0 && !running) void runCycle();
  }, [cycles, running]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allFindings = useMemo(() => GuardianDomainApi.getOpenFindings(repo), [version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolved = useMemo(() => repo.listFindings({ status: 'resolved' }), [version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const events = useMemo(() => repo.listEvents().filter((e) => HUMAN_EVENTS.includes(e.type)).slice(-8).reverse(), [version]);

  const findings = useMemo(() => {
    if (!filteredCategory) return allFindings;
    return allFindings.filter((f) => f.category === filteredCategory);
  }, [allFindings, filteredCategory]);

  const awaiting = findings.filter((f) => f.status === 'awaiting_approval');
  const blocked = findings.filter((f) => f.status === 'blocked');
  const others = findings.filter((f) => f.status !== 'awaiting_approval' && f.status !== 'blocked');
  const health = healthOf(allFindings);

  useEffect(() => {
    const sel = guardianUi.get().selectedId;
    if (!sel || !repo.getFinding(sel)) selectFinding(awaiting[0]?.id ?? findings[0]?.id ?? null);
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const title =
    awaiting.length > 0 ? (
      <><span className="dm-accent-text dm-num">{awaiting.length}</span> ponto{awaiting.length > 1 ? 's precisam' : ' precisa'} da sua decisão.</>
    ) : (
      <>Nada precisa da sua decisão agora.</>
    );

  return (
    <div className="dm-root gd-root" data-domain="guardian">
      <DomainHeader
        eyebrow="Guardian · observação e evidência"
        title={title}
        subtitle={
          <>
            <strong>{health.verdict}</strong> {allFindings.length} achado{allFindings.length === 1 ? '' : 's'} aberto{allFindings.length === 1 ? '' : 's'}, {resolved.length} resolvido{resolved.length === 1 ? '' : 's'} e verificado{resolved.length === 1 ? '' : 's'} nesta sessão.
          </>
        }
        aside={
          <>
            <span className="gd-health" data-health={health.key}>
              <span className="material-symbols-outlined" aria-hidden="true">{health.icon}</span>
              {health.label}
            </span>
            <button type="button" className="dm-btn" data-size="sm" onClick={() => void runCycle()} disabled={running}>
              <span className="material-symbols-outlined" aria-hidden="true">{running ? 'progress_activity' : 'search_check'}</span>
              {running ? 'Verificando…' : 'Verificar agora'}
            </button>
            <button type="button" className="dm-btn" data-variant="quiet" data-size="sm" onClick={onReplayIntro}>
              <span className="material-symbols-outlined" aria-hidden="true">replay</span>
              Rever introdução
            </button>
          </>
        }
      />

      {/* 1. Radar de Topologia Operacional — 5 Frentes Conectadas */}
      <section className="dm-rise" aria-label="Topologia do sistema">
        <GuardianTopologyRadar
          findings={allFindings}
          running={running}
          onFilterCategory={setFilteredCategory}
        />
        <div className="mt-2">
          <DemoBadge label="Dados e segurança: demonstração" hint="Ainda não há adapter para os dados reais: estas duas fontes leem uma coleção e um texto de exemplo. Detecção, aprovação, correção e verificação são reais." />
        </div>
      </section>

      {/* 2. Ciclo em 7 Estágios: Observar → Detectar → Investigar → Propor → Autorizar → Corrigir → Verificar */}
      <section className="dm-rise" style={{ ['--i' as string]: 1 }} aria-label="Cadeia de resolução">
        <GuardianPipelineTracker
          findings={allFindings}
          resolvedCount={resolved.length}
        />
      </section>

      {filteredCategory && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary/70 border border-border/60">
          <span className="text-[13px] text-text-secondary">Filtrando por categoria selecionada na topologia</span>
          <button type="button" className="dm-btn" data-size="sm" data-variant="quiet" onClick={() => setFilteredCategory(null)}>
            Limpar filtro
          </button>
        </div>
      )}

      {awaiting.length > 0 && (
        <section className="gd-section dm-rise" style={{ ['--i' as string]: 2 }} aria-label="Precisa da sua decisão agora">
          <div className="flex items-center justify-between">
            <h2 className="dm-h2">Precisa da sua decisão agora</h2>
            <span className="dm-chip" data-tone="accent">{awaiting.length} pendência{awaiting.length > 1 ? 's' : ''}</span>
          </div>
          <p className="dm-muted text-[13px]">Nada aqui é aplicado sem você. Abra um achado para ver a evidência e o que muda.</p>
          <div className="gd-stack">{awaiting.map((f, i) => <FindingCard key={f.id} finding={f} defaultOpen={i === 0} />)}</div>
        </section>
      )}


      <PendingApprovals domain={['finance', 'body', 'spiritual', 'agenda', 'education', 'hoje']} version={version} heading="Pedidos de outros domínios aguardando você" execute={executeForDomain} onChanged={() => guardianUi.set((s) => ({ version: s.version + 1 }))} />

      {others.length > 0 && (
        <section className="gd-section" aria-label="Em andamento ou com atenção">
          <h2 className="dm-h2">Em andamento</h2>
          <div className="gd-stack">{others.map((f) => <FindingCard key={f.id} finding={f} />)}</div>
        </section>
      )}

      {blocked.length > 0 && (
        <section className="dm-card dm-card-pad gd-section" aria-label="Sem correção automática">
          <Disclosure
            summary={
              <span>
                <span className="dm-h2">Sem correção automática · {blocked.length}</span>
                <span className="dm-muted text-[13px] block mt-1">O Guardian achou, mas não tem como consertar sozinho. São decisões de produto: ele não muda política por conta própria.</span>
              </span>
            }
          >
            <div className="gd-stack" style={{ marginTop: 12 }}>{blocked.map((f) => <FindingCard key={f.id} finding={f} />)}</div>
          </Disclosure>
        </section>
      )}

      <section className="dm-card dm-card-pad gd-section dm-rise" style={{ ['--i' as string]: 2 }} aria-label="O que o Guardian fez recentemente">
        <h2 className="dm-h2">O que o Guardian fez recentemente</h2>
        {events.length === 0 ? (
          <p className="dm-muted text-[13px]">Ainda nada — rode uma verificação.</p>
        ) : (
          <ul className="gd-log">
            {events.map((e) => (
              <li key={e.id}>
                <span className="dm-faint dm-num text-[12px]">{eventTime(e)}</span>
                <span className="text-[13px] leading-snug">{humanMessage(e)}</span>
              </li>
            ))}
          </ul>
        )}
        {lastReport && <p className="dm-faint text-[12px]">Último ciclo: {lastReport.observed} observação(ões), {lastReport.newFindings} nova(s), {lastReport.awaitingApproval} aguardando aprovação, {lastReport.verifiedResolved} verificada(s) como resolvida(s).</p>}
      </section>

      <section className="dm-card dm-card-pad gd-section dm-rise" style={{ ['--i' as string]: 3 }} aria-label="Autonomia">
        <Disclosure summary={<span><span className="dm-h2">O que o Guardian pode fazer sozinho</span><span className="dm-muted text-[13px] block mt-1">Confiança nunca concede autoridade: ela só decide, dentro do teto da política, se uma ação reversível pode rodar sem você.</span></span>}>
          <AutonomyPanel />
        </Disclosure>
      </section>
    </div>
  );
}
