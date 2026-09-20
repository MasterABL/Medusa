'use client';

import React from 'react';
import Link from 'next/link';
import { useShell } from '@/context/ShellContext';
import { EducationContainer } from '@/components/education/EducationContainer';
import { AgendaContainer } from '@/components/agenda/AgendaContainer';

export default function HomePage() {
  const { setMode, mode, theme, setIslandState, activeRoute } = useShell();

  // Roteamento encapsulado: Agenda / Temporal OS
  if (activeRoute === 'agenda') {
    return <AgendaContainer />;
  }

  // Roteamento encapsulado: a experiência da Educação vive inteiramente no EducationContainer
  if (activeRoute === 'educacao') {
    return <EducationContainer />;
  }

  return (
    <main className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-10 pt-6 flex-1">
      {/* ================= PAINEL OPERACIONAL PRINCIPAL (ACIMA DA DOBRA) ================= */}
      <section aria-label="Painel Operacional" className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
                Life OS · Shell V2 Foundation
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] text-text-secondary">
                Terça-feira, 15 de Setembro
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Minha Vida · Shell Estrutural V2
            </h1>
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
              Arquitetura funcional completa: Header 3-Zone com Island centralizado na Main Shell Area, Sidebar c/ Drawer no Modo Foco e Context Panel Regional.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-text-muted bg-surface border border-border/60 px-3 py-1 rounded-full shadow-subtle">
              MODO: {mode.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono font-semibold tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/20 border border-[#71DBD2]/30 px-3 py-1 rounded-full shadow-subtle">
              TEMA: {theme.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bloco de Ação Direta Acima da Dobra (Fluxo Editorial Contínuo sem Gavetas Empilhadas) */}
        <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/60 shadow-calm flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Ação Operacional da Sessão
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted uppercase tabular-nums">
              Bloco: 09:00 — 12:30
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-medusa-primary flex items-center justify-center text-[#1C2420] flex-shrink-0 mt-0.5 shadow-subtle">
                <span className="material-symbols-outlined text-[19px]">terminal</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Em Execução Contínua
                </span>
                <h4 className="text-[15px] font-semibold text-text-primary tracking-tight">
                  Consolidação do Blueprint Estrutural &amp; Protocolo de Transição
                </h4>
                <p className="text-[12px] text-text-secondary leading-relaxed max-w-xl">
                  Sincronização assíncrona, View Transitions API e contenção estrita do eixo do Island.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIslandState('success')}
                className="bg-medusa-primary hover:opacity-90 active:scale-[0.98] text-[#1C2420] px-4 py-2 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Concluir</span>
              </button>
              <button
                type="button"
                onClick={() => setIslandState('idle')}
                className="bg-surface hover:bg-surface-secondary border border-border/60 text-text-secondary px-4 py-2 rounded-full text-[12px] font-medium transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                Pausar
              </button>
            </div>
          </div>

          {/* Inline Metrics Display (Editorial & Tabular Nums) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">Ritmo Mental</span>
              <div className="text-base font-bold text-text-primary tabular-nums">14 <span className="text-xs font-normal text-text-muted">rpm</span></div>
              <p className="text-[11px] text-text-muted">Cadência estável de fluxo</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">Tempo em Foco Puro</span>
              <div className="text-base font-bold text-text-primary tabular-nums">02h 45m</div>
              <p className="text-[11px] text-text-muted">Zero dispersões sonoras</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">Atenção Residual</span>
              <div className="text-base font-bold text-text-primary tabular-nums">0.02%</div>
              <p className="text-[11px] text-[#2c6956] dark:text-medusa-primary font-medium">Equilíbrio atingido</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 1: PROTOCOLO MOBILE DYNAMIC ISLAND ================= */}
      <section aria-label="Engenharia Mobile" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
            01 · Mobile Dynamic Island (Ciclo Orgânico &amp; Comportamento de Teclado)
          </span>
          <div className="h-px bg-border/60 flex-1" />
        </div>

        <div className="bg-surface p-6 sm:p-7 rounded-2xl border border-border/60 shadow-calm flex flex-col gap-3 text-[12px]">
          <h4 className="text-[15px] font-semibold text-text-primary tracking-tight">
            Protocolo de Engenharia Mobile
          </h4>
          <p className="text-text-secondary leading-relaxed">
            O Dynamic Island mobile é uma cápsula de fluxo vivo integrada diretamente à raiz do Shell: <strong>não gera overlay destrutivo</strong> nem bloqueia a leitura de dados subjacentes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 bg-surface-secondary/60 rounded-xl border border-border/50">
              <strong className="text-text-primary block mb-1">1. Ciclo de Vida:</strong>
              <p className="text-text-secondary">
                MINIMAL (idle) → TOUCH → EXPANSION (reflow orgânico) → INTERACTION → RETURN (180ms–260ms, cubic-bezier(0.16, 1, 0.3, 1)).
              </p>
            </div>
            <div className="p-3.5 bg-surface-secondary/60 rounded-xl border border-border/50">
              <strong className="text-text-primary block mb-1">2. Safe Areas &amp; Touch Targets:</strong>
              <p className="text-text-secondary">
                Respeito a <code className="font-mono text-[11px]">env(safe-area-inset-top)</code>. Touch targets interativos estritamente ≥ 44×44px.
              </p>
            </div>
            <div className="p-3.5 bg-surface-secondary/60 rounded-xl border border-border/50">
              <strong className="text-text-primary block mb-1">3. Prioridade do Teclado:</strong>
              <p className="text-text-secondary">
                Ao abrir teclado virtual, o Island contrai instantaneamente para 68px, liberando visão total dos campos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 2: MATRIZ ORTOGONAL DE LAYOUT ================= */}
      <section aria-label="Matriz Ortogonal" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
            02 · Matriz Ortogonal (Modos de Layout vs. Breakpoints Responsivos)
          </span>
          <div className="h-px bg-border/60 flex-1" />
        </div>

        <div className="bg-surface rounded-2xl overflow-hidden border border-border/60 shadow-calm p-6 text-[13px] text-text-secondary leading-relaxed flex flex-col gap-4">
          <p>
            Os <strong>Modos de Layout</strong> (Amplo, Compacto, Foco) e os <strong>Breakpoints Responsivos</strong> (Desktop ≥1024px, Tablet 768–1023px, Mobile &lt;768px) operam de forma ortogonal:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setMode('amplo')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                mode === 'amplo'
                  ? 'bg-medusa-primary/15 border-medusa-primary/40 text-text-primary shadow-subtle'
                  : 'bg-surface-secondary/60 border-border/50 text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="font-semibold text-text-primary block mb-1">Amplo:</span>
              Sidebar: 240px fixa<br />
              Main: Eixo livre fluido<br />
              Context: 320px dock
            </button>

            <button
              type="button"
              onClick={() => setMode('compacto')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                mode === 'compacto'
                  ? 'bg-medusa-primary/15 border-medusa-primary/40 text-text-primary shadow-subtle'
                  : 'bg-surface-secondary/60 border-border/50 text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="font-semibold text-text-primary block mb-1">Compacto:</span>
              Sidebar: 68px ícones<br />
              Main: Eixo expandido<br />
              Context: 260px slim
            </button>

            <button
              type="button"
              onClick={() => setMode('foco')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                mode === 'foco'
                  ? 'bg-medusa-primary/15 border-medusa-primary/40 text-text-primary shadow-subtle'
                  : 'bg-surface-secondary/60 border-border/50 text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="font-semibold text-text-primary block mb-1">Foco (Zen):</span>
              Sidebar: 0px (Drawer)<br />
              Main: 100% largura útil<br />
              Context: Oculto
            </button>
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 3: TOKENS DE MOTION & ACESSIBILIDADE ================= */}
      <section aria-label="Tokens de Motion e Acessibilidade" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
            03 · Tokens Oficiais de Motion, Acessibilidade ARIA &amp; WCAG AA
          </span>
          <div className="h-px bg-border/60 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-surface p-6 rounded-2xl border border-border/60 shadow-calm flex flex-col gap-4">
            <h4 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
              <span>Tabela Oficial de Motion</span>
            </h4>
            <div className="space-y-2 text-[12px] font-mono">
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50 flex justify-between">
                <span className="text-text-primary">Micro-interações</span>
                <span className="text-text-muted tabular-nums">100ms cubic-bezier(0.16, 1, 0.3, 1)</span>
              </div>
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50 flex justify-between">
                <span className="text-text-primary">Island State Switch</span>
                <span className="text-text-muted tabular-nums">220ms cubic-bezier(0.22, 1, 0.36, 1)</span>
              </div>
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50 flex justify-between">
                <span className="text-text-primary">Modo Layout (Sidebar/Header)</span>
                <span className="text-text-muted tabular-nums">340ms cubic-bezier(0.25, 1, 0.35, 1)</span>
              </div>
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50 flex justify-between">
                <span className="text-text-primary">Mobile Expansion</span>
                <span className="text-text-muted tabular-nums">180ms–260ms cubic-bezier(0.16, 1, 0.3, 1)</span>
              </div>
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50 flex justify-between">
                <span className="text-text-primary">Transição de Tema</span>
                <span className="text-text-muted tabular-nums">350ms–450ms cubic-bezier(0.4, 0, 0.2, 1)</span>
              </div>
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50 flex justify-between border-l-2 border-l-medusa-primary">
                <span className="text-text-primary">Reduced Motion</span>
                <span className="text-[#18534B] dark:text-[#71DBD2] font-semibold tabular-nums">120ms–150ms crossfade</span>
              </div>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-2xl border border-border/60 shadow-calm flex flex-col gap-4">
            <h4 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
              <span>Protocolo ARIA &amp; WCAG AA</span>
            </h4>
            <div className="space-y-2 text-[12px] text-text-secondary">
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50">
                <strong className="text-text-primary">Região Semântica do Island:</strong>
                <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                  &lt;section role=&quot;region&quot; aria-label=&quot;Camada Contextual Island&quot; aria-expanded=&quot;true|false&quot;&gt;
                </p>
              </div>
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50">
                <strong className="text-text-primary">Comportamento de Foco e Teclado:</strong>
                <p className="mt-0.5">
                  Anéis visíveis com <code className="font-mono text-[11px]">focus-visible:ring-2</code>. Tecla ESC fecha Drawer e modal ⌘K.
                </p>
              </div>
              <div className="p-2.5 bg-surface-secondary/60 rounded-xl border border-border/50">
                <strong className="text-text-primary">WCAG AA Conformity:</strong>
                <p className="mt-0.5">
                  Contraste testado e aprovado em todos os 3 temas oficiais: Claro, Sépia e Escuro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé do Shell V2 */}
      <footer className="flex items-center justify-between pt-4 border-t border-border/60 text-text-muted text-[10px] tracking-widest uppercase font-mono">
        <div className="flex items-center gap-3">
          <span>MEDUSA SHELL V2 · PRODUCTION BASELINE</span>
          <span>•</span>
          <Link href="/dev/motion-lab" className="hover:text-text-primary underline lowercase text-[11px] font-mono">
            /dev/motion-lab
          </Link>
        </div>
        <span className="text-[#2c6956] dark:text-medusa-primary font-semibold">ALL GATES PROVED</span>
      </footer>
    </main>
  );
}
