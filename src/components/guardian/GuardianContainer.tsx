'use client';

import React, { useState, useMemo } from 'react';
import { GUARDIAN_DATA, TopologyNode, SecuritySignal, IncidentEvidence } from './guardianFixtures';

export function GuardianContainer() {
  const [data] = useState(GUARDIAN_DATA);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-vault');
  const [activeTab, setActiveTab] = useState<'investigacao' | 'sinais' | 'integridade'>('investigacao');

  const selectedNode = useMemo(() => {
    return data.nodes.find((n) => n.id === selectedNodeId) || data.nodes[0];
  }, [data.nodes, selectedNodeId]);

  return (
    <main className="w-full pb-20 px-4 sm:px-8 max-w-6xl mx-auto flex flex-col gap-8 pt-6 flex-1">
      {/* ================= 1. CABEÇALHO OPERACIONAL: VIGILÂNCIA SILENCIOSA ================= */}
      <section aria-label="Estado Operacional da Sentinela" className="flex flex-col gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18534B] dark:bg-[#71DBD2] living-pulse" />
              <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
                Guardian · Console Topológico &amp; Observação Ativa
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2]">
                {data.telemetry.sentinelStatus}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Observação Topológica &amp; Análise de Sinais
            </h1>
          </div>

          {/* Telemetria de Rede e Sentinela */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Índice Geral</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-[#18534B] dark:text-[#71DBD2]">
                {data.telemetry.systemHealthScore}/100
              </span>
            </div>
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Taxa de Inspeção</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                {data.telemetry.packetInspectionRate}
              </span>
            </div>
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Latência Média</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                {data.telemetry.averageLatencyMs} ms
              </span>
            </div>
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Nós Monitorados</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                {data.telemetry.monitoredEntities} Ativos
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. TOPOLOGIA RELACIONAL COM VETORES E INSPETOR ================= */}
      <section aria-label="Topologia de Nodos" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#18534B] dark:text-[#71DBD2]">
              device_hub
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Topologia Relacional e Tráfego Criptográfico (6 Nodos)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            {data.telemetry.lastAuditTime}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-center">
          {/* Canvas SVG da Topologia */}
          <div className="bg-surface-elevated border border-border/70 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[340px] overflow-hidden">
            <svg viewBox="0 0 520 340" className="w-full h-full max-h-[340px] overflow-visible">
              {/* Conexões com Latência e Linhas */}
              {data.links.map((link, idx) => {
                const source = data.nodes.find((n) => n.id === link.from);
                const target = data.nodes.find((n) => n.id === link.to);
                if (!source || !target) return null;

                const isConnected = selectedNodeId === source.id || selectedNodeId === target.id;

                return (
                  <g key={idx}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isConnected ? '#71DBD2' : 'currentColor'}
                      strokeWidth={isConnected ? '2.5' : '1.2'}
                      strokeDasharray={isConnected ? 'none' : '4 3'}
                      className={isConnected ? 'text-medusa-primary' : 'text-border-strong opacity-40'}
                    />
                  </g>
                );
              })}

              {/* Nós Interativos */}
              {data.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isVault = node.type === 'vault';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer group"
                  >
                    {isVault && (
                      <circle r="30" className="fill-medusa-primary/10 animate-sentinel-pulse" />
                    )}

                    <circle
                      r={isVault ? '22' : '16'}
                      className={`transition-all duration-200 ${
                        isSelected
                          ? 'fill-surface stroke-medusa-primary stroke-[3px] shadow-lg'
                          : isVault
                          ? 'fill-[#18534B] dark:fill-[#71DBD2] stroke-surface stroke-2'
                          : 'fill-surface-secondary stroke-border-strong stroke-[1.5px] hover:stroke-medusa-primary'
                      }`}
                    />

                    <text
                      textAnchor="middle"
                      dy="4"
                      className={`text-[12px] select-none font-mono ${
                        isVault && !isSelected ? 'fill-white dark:fill-[#1C2420]' : 'fill-text-primary'
                      }`}
                    >
                      {node.type === 'vault' ? '🔒' : node.type === 'workstation' ? '💻' : node.type === 'mobile' ? '📱' : node.type === 'cloud' ? '☁️' : node.type === 'key' ? '🔑' : '🗄️'}
                    </text>

                    <text
                      y={isVault ? '34' : '26'}
                      textAnchor="middle"
                      className={`text-[9px] font-mono select-none ${
                        isSelected ? 'fill-text-primary font-bold' : 'fill-text-secondary'
                      }`}
                    >
                      {node.label.split(' ')[0]} ({node.trafficRate})
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Inspetor Detalhado do Nó Selecionado */}
          <div className="bg-surface-elevated border border-border/70 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Nó Inspecionado
                </span>
                <span className="text-[10px] font-mono uppercase bg-[#ADE4B5]/25 text-[#18534B] dark:text-[#ADE4B5] px-2 py-0.5 rounded-full font-bold">
                  {selectedNode.status}
                </span>
              </div>

              <h3 className="text-lg font-bold text-text-primary">
                {selectedNode.label}
              </h3>

              <div className="space-y-2 pt-1 text-[12px] font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">IP / Identificador</span>
                  <span className="font-bold text-text-primary tabular-nums">
                    {selectedNode.ipOrFingerprint}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">Taxa de Tráfego</span>
                  <span className="font-bold text-text-primary">
                    {selectedNode.trafficRate}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">Latência do Nó</span>
                  <span className="font-bold text-[#18534B] dark:text-[#71DBD2]">
                    {selectedNode.latencyMs} ms
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Último Heartbeat</span>
                  <span className="text-text-secondary">
                    {selectedNode.lastPing}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-muted">Cifra: ChaCha20-Poly1305</span>
              <button
                type="button"
                className="text-[11px] font-mono font-bold px-3 py-1 rounded-lg bg-surface border border-border/80 hover:border-medusa-primary text-text-primary transition-all"
              >
                Inspecionar Chaves
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. NAVEGAÇÃO DE INVESTIGAÇÃO, SINAIS & INTEGRIDADE ================= */}
      <section aria-label="Camada Investigativa" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-6">
        {/* Abas Operacionais */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'investigacao', label: 'Incidente em Curso (#INC-889)', badge: '1 Ativo' },
              { id: 'sinais', label: 'Feed de Sinais ao Vivo', badge: '5 Recentes' },
              { id: 'integridade', label: 'Integridade de Hardware & Kernel', badge: '4/4 OK' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-mono font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#18534B] dark:bg-medusa-primary text-white dark:text-[#1C2420] shadow-subtle'
                    : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-normal opacity-80">({tab.badge})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da Aba Selecionada */}
        {activeTab === 'investigacao' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-surface-elevated p-3.5 rounded-xl border border-border/70">
              <div>
                <span className="text-[10px] font-mono uppercase bg-alert/20 text-alert px-2 py-0.5 rounded font-bold">
                  {data.incidentInvestigation.severity}
                </span>
                <h3 className="text-base font-bold text-text-primary mt-1">
                  {data.incidentInvestigation.title}
                </h3>
                <span className="text-[11px] font-mono text-text-secondary">
                  Origem: {data.incidentInvestigation.source}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border/80 text-[11px] font-mono text-text-secondary hover:text-text-primary"
                >
                  Falso Positivo
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-lg bg-medusa-primary text-[#1C2420] font-bold text-[11px] font-mono shadow-subtle"
                >
                  Manter Quarentena
                </button>
              </div>
            </div>

            {/* Linha do Tempo da Investigação com Evidências Reais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {data.incidentInvestigation.timeline.map((step) => (
                <div
                  key={step.step}
                  className="bg-surface-elevated border border-border/70 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="font-bold text-text-muted">PASSO 0{step.step}</span>
                    <span className="text-text-muted">{step.time}</span>
                  </div>
                  <h4 className="text-[13px] font-bold text-text-primary">{step.title}</h4>
                  <p className="text-[11px] text-text-secondary leading-snug">{step.details}</p>
                  {step.artifactHash && (
                    <div className="pt-2 border-t border-border/50 text-[9px] font-mono text-text-muted truncate">
                      {step.artifactHash}
                    </div>
                  )}
                  {step.actionTaken && (
                    <div className="pt-2 border-t border-border/50 text-[10px] font-mono text-[#18534B] dark:text-[#ADE4B5] font-bold">
                      ✓ {step.actionTaken}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sinais' && (
          <div className="divide-y divide-border/60">
            {data.recentSignals.map((sig) => (
              <div key={sig.id} className="py-2.5 flex items-center justify-between text-[12px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-text-muted text-[11px]">{sig.timestamp}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sig.severity === 'atencao'
                        ? 'bg-alert'
                        : sig.severity === 'info'
                        ? 'bg-medusa-primary'
                        : 'bg-[#ADE4B5]'
                    }`}
                  />
                  <span className="font-bold text-text-primary">{sig.source}:</span>
                  <span className="text-text-secondary">{sig.event}</span>
                </div>
                <span className="text-[10px] text-text-muted">{sig.protocol}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'integridade' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.integrityChecklist.map((item, idx) => (
              <div key={idx} className="bg-surface-elevated border border-border/70 rounded-xl p-3.5 flex justify-between items-center">
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary">{item.component}</h4>
                  <span className="text-[10px] font-mono text-text-muted">Checagem: {item.timestamp}</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#18534B] dark:text-[#ADE4B5] bg-[#ADE4B5]/20 px-2 py-0.5 rounded">
                  ✓ {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
