'use client';

import React, { useState } from 'react';
import type { Finding } from '@/domains/guardian/model/types';
import { COVERAGE } from './guardianSession';

export interface GuardianTopologyRadarProps {
  findings: Finding[];
  running: boolean;
  onFilterCategory?: (category: string | null) => void;
}

/**
 * Radar de Topologia Operacional — Assinatura do Guardian.
 * Inteligência operacional silenciosa: conexões sutis entre os nós de auditoria e os domínios do Medusa.
 * Sem cyberpunk, sem terminal verde, sem estética militar: tons sóbrios de ardósia, teal e off-white.
 */
export function GuardianTopologyRadar({
  findings,
  running,
  onFilterCategory,
}: GuardianTopologyRadarProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const nodeStats = COVERAGE.map((c) => {
    const matching = findings.filter((f) => c.categories.includes(f.category));
    const awaiting = matching.filter((f) => f.status === 'awaiting_approval').length;
    const isClean = matching.length === 0;

    return {
      ...c,
      total: matching.length,
      awaiting,
      isClean,
    };
  });

  const handleSelect = (key: string) => {
    if (activeNode === key) {
      setActiveNode(null);
      onFilterCategory?.(null);
    } else {
      setActiveNode(key);
      const sel = COVERAGE.find((c) => c.key === key);
      onFilterCategory?.(sel ? sel.categories[0] : null);
    }
  };

  return (
    <div className="gd-topology-console" role="region" aria-label="Topologia de observação e integridade">
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className={`gd-sentinel-dot ${running ? 'gd-dot-running' : ''}`} aria-hidden="true" />
          <span className="dm-eyebrow text-[11px]">Topologia Operacional · 5 Frentes Ativas</span>
        </div>
        <span className="dm-faint text-[12px] font-mono">
          {running ? 'Varredura em execução…' : 'Observação contínua silenciosa'}
        </span>
      </div>

      {/* Diagrama de Conexões e Nós de Sinal */}
      <div className="gd-radar-stage">
        <svg className="gd-radar-svg" viewBox="0 0 760 110" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="gdLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(113, 219, 210, 0.2)" />
              <stop offset="50%" stopColor="rgba(173, 228, 181, 0.4)" />
              <stop offset="100%" stopColor="rgba(113, 219, 210, 0.2)" />
            </linearGradient>
          </defs>

          {/* Barramento dorsal de conexão entre os nós */}
          <line x1="60" y1="55" x2="700" y2="55" stroke="url(#gdLineGrad)" strokeWidth="2" strokeDasharray="4 4" />

          {/* Arcos de correlação entre nós vizinhos */}
          <path d="M 120,55 Q 220,15 320,55" fill="none" stroke="rgba(113, 219, 210, 0.25)" strokeWidth="1.5" />
          <path d="M 280,55 Q 380,95 480,55" fill="none" stroke="rgba(173, 228, 181, 0.25)" strokeWidth="1.5" />
          <path d="M 440,55 Q 540,15 640,55" fill="none" stroke="rgba(113, 219, 210, 0.25)" strokeWidth="1.5" />
        </svg>

        {/* Nós Interativos da Topologia */}
        <div className="gd-nodes-grid" role="list">
          {nodeStats.map((n) => {
            const isSelected = activeNode === n.key;
            return (
              <button
                key={n.key}
                type="button"
                role="listitem"
                className={`gd-node-btn ${isSelected ? 'gd-node-selected' : ''}`}
                onClick={() => handleSelect(n.key)}
                data-mode={n.mode}
                data-state={n.awaiting > 0 ? 'attention' : n.total > 0 ? 'pending' : 'healthy'}
                title={`${n.name}: ${n.what}`}
              >
                <div className="gd-node-beacon">
                  <span className="gd-node-pulse-ring" aria-hidden="true" />
                  <span className="material-symbols-outlined gd-node-icon" aria-hidden="true">
                    {n.key === 'code' ? 'code' : n.key === 'data' ? 'database' : n.key === 'security' ? 'key' : n.key === 'privacy' ? 'visibility_off' : 'flag'}
                  </span>
                </div>
                <div className="gd-node-info">
                  <strong className="gd-node-name">{n.name}</strong>
                  <span className="gd-node-status">
                    {n.awaiting > 0
                      ? `${n.awaiting} a decidir`
                      : n.total > 0
                      ? `${n.total} achados`
                      : n.mode === 'sem_fonte'
                      ? 'Sem fonte'
                      : 'Íntegro'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
