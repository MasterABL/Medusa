'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useShell } from '@/context/ShellContext';
import { ISLAND_STATE_LIST, ISLAND_FIXTURES } from '@/fixtures/islandFixtures';
import { IslandState, Theme, ShellMode } from '@/types/shell';

interface StaggerItem {
  id: string;
  title: string;
  category: string;
  value: number;
  isNew?: boolean;
}

export default function MotionLabPage() {
  const {
    islandState,
    setIslandState,
    isQuiet,
    toggleQuiet,
    theme,
    setTheme,
    mode,
    setMode,
    openCommand,
  } = useShell();

  // Demonstration state sequence simulation (isolated to Motion Lab)
  const [isSimulatingSequence, setIsSimulatingSequence] = useState(false);
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic List Stagger Demo State
  const [items, setItems] = useState<StaggerItem[]>([
    { id: 'item-1', title: 'Respiração Circadiana Matinal', category: 'Bio-Ritmo', value: 98 },
    { id: 'item-2', title: 'Refinamento Arquitetural Medusa', category: 'Sistemas', value: 100 },
    { id: 'item-3', title: 'Síntese de Filosofia e Ação', category: 'Leituras', value: 84 },
  ]);

  const clearSequenceTimer = () => {
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearSequenceTimer();
  }, []);

  // Simular Sequência Real: Ação -> Processing -> Success -> Idle
  const handleSimulateRealSequence = () => {
    clearSequenceTimer();
    setIsSimulatingSequence(true);
    setIslandState('processing');

    sequenceTimerRef.current = setTimeout(() => {
      setIslandState('success');
      sequenceTimerRef.current = setTimeout(() => {
        setIslandState('idle');
        setIsSimulatingSequence(false);
      }, 1800);
    }, 1200);
  };

  // Simular Sequência com Erro: Ação -> Processing -> Error
  const handleSimulateErrorSequence = () => {
    clearSequenceTimer();
    setIsSimulatingSequence(true);
    setIslandState('processing');

    sequenceTimerRef.current = setTimeout(() => {
      setIslandState('error');
      setIsSimulatingSequence(false);
    }, 1200);
  };

  // Disparar Attention (2 pulsos discretos)
  const handleTriggerAttention = () => {
    clearSequenceTimer();
    setIslandState('attention');
  };

  // Disparar Error (micro-shake)
  const handleTriggerError = () => {
    clearSequenceTimer();
    setIslandState('error');
  };

  // Dynamic List Actions: Inserção Dinâmica vs Atualização Ordinária
  const handleAddDynamicItem = () => {
    const nextId = `item-${Date.now()}`;
    const newItem: StaggerItem = {
      id: nextId,
      title: `Novo Bloco Sincronizado #${items.length + 1}`,
      category: 'Fluxo',
      value: Math.floor(Math.random() * 20) + 80,
      isNew: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItemOrdinary = () => {
    // Atualização ordinária: atualiza dado SEM reanimar a lista inteira
    setItems((prev) =>
      prev.map((it, idx) => (idx === 0 ? { ...it, value: it.value + 1, isNew: false } : { ...it, isNew: false }))
    );
  };

  const handleResetList = () => {
    setItems([
      { id: 'item-1', title: 'Respiração Circadiana Matinal', category: 'Bio-Ritmo', value: 98 },
      { id: 'item-2', title: 'Refinamento Arquitetural Medusa', category: 'Sistemas', value: 100 },
      { id: 'item-3', title: 'Síntese de Filosofia e Ação', category: 'Leituras', value: 84 },
    ]);
  };

  return (
    <main className="w-full pb-24 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1">
      {/* Header do Motion Lab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              Ambiente de Desenvolvimento Isolado
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
            MEDUSA · Motion &amp; Interaction Lab
          </h1>
          <p className="text-[12px] text-text-secondary">
            Laboratório isolado para testes determinísticos de motion, Living OS, View Transitions e gramática interativa.
          </p>
        </div>

        <Link
          href="/"
          className="btn-interactive self-start sm:self-auto px-3.5 py-1.5 rounded-full border border-border/60 bg-surface text-text-secondary hover:text-text-primary text-[11px] font-mono shadow-subtle flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          <span>Voltar ao Produto</span>
        </Link>
      </div>

      {/* ================= SEÇÃO 1: CATÁLOGO FECHADO DOS 10 ESTADOS DO ISLAND ================= */}
      <section
        id="lab-island-states"
        aria-label="Catálogo dos 10 Estados do Island"
        className="bg-surface rounded-2xl p-6 border border-border/60 shadow-calm flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-muted">
              01 · Seletor Direto de Estados do Dynamic Island
            </span>
          </div>
          <span className="text-[10px] font-mono text-text-muted tabular-nums">
            Estado Atual: <strong className="text-text-primary">{islandState.toUpperCase()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {ISLAND_STATE_LIST.map((st) => {
            const isSelected = islandState === st;
            const fix = ISLAND_FIXTURES[st];
            return (
              <button
                key={st}
                type="button"
                id={`btn-state-${st}`}
                onClick={() => {
                  clearSequenceTimer();
                  setIslandState(st as IslandState);
                }}
                className={`btn-interactive px-3 py-1.5 rounded-full text-[11px] font-mono border ${
                  isSelected
                    ? 'bg-medusa-primary text-[#1C2420] font-semibold border-medusa-primary shadow-subtle'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary border-border/60'
                }`}
              >
                <span className="tabular-nums">{fix.num}.</span> {fix.label}
              </button>
            );
          })}
        </div>

        {/* Quiet State Controller */}
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
          <span className="text-text-secondary">
            <strong className="text-text-primary font-medium">Quiet State (160ms):</strong> Opacidade reduzida para <code className="font-mono bg-surface-secondary px-1.5 py-0.5 rounded border border-border/50 text-[10px]">opacity: 0.38</code> estritamente sem blur.
          </span>
          <button
            type="button"
            id="btn-lab-quiet-toggle"
            onClick={() => toggleQuiet()}
            className={`btn-interactive px-3.5 py-1 rounded-full font-mono text-[11px] border ${
              isQuiet
                ? 'bg-medusa-accent text-[#1C2420] font-semibold border-medusa-accent shadow-subtle'
                : 'bg-surface border-border/60 text-text-primary hover:bg-surface-secondary shadow-subtle'
            }`}
          >
            {isQuiet ? 'Desativar Quiet State' : 'Ativar Quiet State'}
          </button>
        </div>
      </section>

      {/* ================= SEÇÃO 2: GRAMÁTICA DE INTERAÇÃO & SEQUÊNCIAS REAIS ================= */}
      <section
        id="lab-interaction-grammar"
        aria-label="Gramática de Interação"
        className="bg-surface rounded-2xl p-6 border border-border/60 shadow-calm flex flex-col gap-4"
      >
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-muted">
            02 · Gramática de Interação (Simulações de Ciclo de Vida Semântico)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Sequência de Sucesso Real */}
          <div className="p-4 rounded-xl border border-border/60 bg-surface-secondary/50 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                <span>Ciclo de Sucesso</span>
                <span className="text-[10px] font-mono text-medusa-support font-bold">✓ Real</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                press → processing (expansão) → success (settle) → idle.
              </p>
            </div>
            <button
              type="button"
              id="btn-trigger-success-flow"
              disabled={isSimulatingSequence}
              onClick={handleSimulateRealSequence}
              className="btn-interactive w-full py-2 rounded-lg bg-medusa-primary text-[#1C2420] text-[11px] font-semibold shadow-subtle disabled:opacity-50"
            >
              Simular Sucesso
            </button>
          </div>

          {/* Card 2: Sequência de Erro com Micro-Shake */}
          <div className="p-4 rounded-xl border border-border/60 bg-surface-secondary/50 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                <span>Micro-Shake de Erro</span>
                <span className="text-[10px] font-mono text-medusa-tertiary font-bold">1.5px X</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                Deslocamento lateral amortecido de 1.5px no Island sem mover a tela.
              </p>
            </div>
            <button
              type="button"
              id="btn-trigger-error-shake"
              onClick={handleTriggerError}
              className="btn-interactive w-full py-2 rounded-lg bg-surface border border-medusa-tertiary text-text-primary text-[11px] font-medium shadow-subtle"
            >
              Disparar Erro (Shake)
            </button>
          </div>

          {/* Card 3: Attention (2 Pulsos Discretos) */}
          <div className="p-4 rounded-xl border border-border/60 bg-surface-secondary/50 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                <span>Attention (2 Pulsos)</span>
                <span className="text-[10px] font-mono text-[#614E00] dark:text-medusa-accent font-bold">1.2s Settle</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                Exatamente dois pulsos calmos e repouso, sem flash agressivo.
              </p>
            </div>
            <button
              type="button"
              id="btn-trigger-attention-pulses"
              onClick={handleTriggerAttention}
              className="btn-interactive w-full py-2 rounded-lg bg-medusa-accent text-[#1C2420] text-[11px] font-semibold shadow-subtle"
            >
              Disparar Attention
            </button>
          </div>

          {/* Card 4: Command Center ⌘K com Quiet State */}
          <div className="p-4 rounded-xl border border-border/60 bg-surface-secondary/50 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                <span>Command ⌘K</span>
                <span className="text-[10px] font-mono text-text-muted">Overlay</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                Abertura do Command Center colocando o Island em Quiet State imediato.
              </p>
            </div>
            <button
              type="button"
              id="btn-trigger-command-modal"
              onClick={openCommand}
              className="btn-interactive w-full py-2 rounded-lg bg-surface border border-border/60 text-text-primary text-[11px] font-medium shadow-subtle"
            >
              Abrir Command Center
            </button>
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 3: TRANSIÇÕES COORDENADAS DE TEMA (380ms) & MODO (280ms) ================= */}
      <section
        id="lab-coordination"
        aria-label="Transições Coordenadas de Tema e Modo"
        className="bg-surface rounded-2xl p-6 border border-border/60 shadow-calm grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Controle de Temas */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-muted">
              03A · Transição Coordenada de Tema (380ms)
            </span>
            <span className="text-[10px] font-mono text-text-muted uppercase tabular-nums">{theme}</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Coordenada entre canvas, superfícies, bordas e controles. Zero white halos no Dark Mode e sem animação em backdrop-filter.
          </p>
          <div className="flex items-center gap-2">
            {(['light', 'sepia', 'dark'] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                id={`btn-lab-theme-${t}`}
                onClick={() => setTheme(t)}
                className={`btn-interactive flex-1 py-2 rounded-xl text-[11px] font-mono border ${
                  theme === t
                    ? 'bg-surface-secondary font-bold text-text-primary border-medusa-primary shadow-subtle'
                    : 'bg-surface text-text-secondary border-border/60 hover:text-text-primary'
                }`}
              >
                {t === 'light' ? 'Claro (Aurora)' : t === 'sepia' ? 'Sépia (Paper)' : 'Escuro'}
              </button>
            ))}
          </div>
        </div>

        {/* Controle de Modos */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-muted">
              03B · Transição Coordenada de Modo (280ms)
            </span>
            <span className="text-[10px] font-mono text-text-muted uppercase tabular-nums">{mode}</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Amplo (240px) ⇄ Compacto (68px) ⇄ Foco (0px + Drawer). Island mantém rigorosamente o centro visual.
          </p>
          <div className="flex items-center gap-2">
            {(['amplo', 'compacto', 'foco'] as ShellMode[]).map((m) => (
              <button
                key={m}
                type="button"
                id={`btn-lab-mode-${m}`}
                onClick={() => setMode(m)}
                className={`btn-interactive flex-1 py-2 rounded-xl text-[11px] font-mono border ${
                  mode === m
                    ? 'bg-surface-secondary font-bold text-text-primary border-medusa-primary shadow-subtle'
                    : 'bg-surface text-text-secondary border-border/60 hover:text-text-primary'
                }`}
              >
                {m === 'amplo' ? 'Amplo' : m === 'compacto' ? 'Compacto' : 'Foco'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 4: LISTA DINÂMICA COM STAGGER (INITIAL VS DYNAMIC VS UPDATE) ================= */}
      <section
        id="lab-dynamic-list"
        aria-label="Demonstração de Stagger de Lista Dinâmica"
        className="bg-surface rounded-2xl p-6 border border-border/60 shadow-calm flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-muted">
              04 · Stagger em Listas Dinâmicas (Regra Arquitetural)
            </span>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Initial entry tem stagger. Inserção dinâmica anima apenas o novo elemento. Atualização ordinária NÃO reanima a lista.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-add-dynamic-item"
              onClick={handleAddDynamicItem}
              className="btn-interactive px-3 py-1.5 rounded-lg bg-medusa-primary text-[#1C2420] text-[11px] font-semibold shadow-subtle flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Inserir Dinâmico</span>
            </button>
            <button
              type="button"
              id="btn-update-item-ordinary"
              onClick={handleUpdateItemOrdinary}
              className="btn-interactive px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-text-secondary hover:text-text-primary text-[11px] shadow-subtle"
            >
              Atualizar Ordinário (+1)
            </button>
            <button
              type="button"
              id="btn-reset-list"
              onClick={handleResetList}
              className="btn-interactive px-2.5 py-1.5 rounded-lg text-text-muted hover:text-text-primary text-[11px]"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                animationDelay: item.isNew ? '0ms' : `${idx * 20}ms`,
              }}
              className={`p-3.5 rounded-xl border border-border/60 bg-surface-secondary/40 flex items-center justify-between text-xs transition-colors ${
                item.isNew ? 'stagger-item border-medusa-primary/40' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary" />
                <div>
                  <span className="font-semibold text-text-primary">{item.title}</span>
                  <span className="text-[10px] font-mono text-text-muted ml-2">[{item.category}]</span>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="text-text-secondary tabular-nums">Score: {item.value}%</span>
                {item.isNew && (
                  <span className="text-[9px] bg-medusa-secondary text-[#1C2420] px-1.5 py-0.5 rounded-full font-bold">
                    NOVO
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SEÇÃO 5: CONTRATO DE TOKENS E ACESSIBILIDADE ================= */}
      <section
        id="lab-motion-tokens"
        aria-label="Contrato de Motion Tokens"
        className="bg-surface rounded-2xl p-6 border border-border/60 shadow-calm flex flex-col gap-4 text-xs"
      >
        <div className="border-b border-border/60 pb-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-muted">
            05 · Matriz Oficial de Tokens de Motion do Medusa
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-[11px]">
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50">
            <span className="text-text-muted block text-[9px] uppercase">Micro</span>
            <strong className="text-text-primary text-[13px] tabular-nums">100ms</strong>
            <span className="text-text-muted block text-[9px] mt-1">Snappy ease</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50">
            <span className="text-text-muted block text-[9px] uppercase">Island</span>
            <strong className="text-text-primary text-[13px] tabular-nums">180ms</strong>
            <span className="text-text-muted block text-[9px] mt-1">Snappy ease</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50">
            <span className="text-text-muted block text-[9px] uppercase">Layout Mode</span>
            <strong className="text-text-primary text-[13px] tabular-nums">280ms</strong>
            <span className="text-text-muted block text-[9px] mt-1">Smooth ease</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50">
            <span className="text-text-muted block text-[9px] uppercase">Theme</span>
            <strong className="text-text-primary text-[13px] tabular-nums">380ms</strong>
            <span className="text-text-muted block text-[9px] mt-1">Smooth ease</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50">
            <span className="text-text-muted block text-[9px] uppercase">Mobile Island</span>
            <strong className="text-text-primary text-[13px] tabular-nums">220ms</strong>
            <span className="text-text-muted block text-[9px] mt-1">Reflow orgânico</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/50 text-[11px] text-text-secondary leading-relaxed flex items-center justify-between">
          <span>
            <strong className="text-text-primary">Prefers-Reduced-Motion:</strong> Desativa breathing, stagger, scale e shake; substitui por crossfade tonal de 140ms.
          </span>
          <span className="font-mono text-medusa-support font-semibold">ATIVO NO SISTEMA</span>
        </div>
      </section>
    </main>
  );
}
