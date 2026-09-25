'use client';

import React from 'react';
import { useShell } from '@/context/ShellContext';

export function Sidebar() {
  const {
    mode,
    setMode,
    isDrawerOpen,
    closeDrawer,
    openCommand,
    activeRoute,
    setActiveRoute,
    breakpoint,
    geometry,
  } = useShell();

  const isCompact = mode === 'compacto';
  const isFocus = mode === 'foco';
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';

  // No Foco ou Mobile/Tablet, a sidebar permanente é 0px estrutural
  const isDrawerActive = (isFocus || isMobile || isTablet) && isDrawerOpen;

  const navItems = [
    { route: 'hoje', label: 'Hoje', icon: 'wb_sunny', badge: null, dot: true },
    { route: 'agenda', label: 'Agenda', icon: 'calendar_today', badge: '3', dot: false },
    { route: 'educacao', label: 'Educação', icon: 'menu_book', badge: '14', badgePill: true, dot: false },
    { route: 'corpo', label: 'Corpo', icon: 'fitness_center', badge: null, dot: false },
    { route: 'financas', label: 'Finanças', icon: 'account_balance_wallet', badge: null, dot: false, accentDot: true },
    { route: 'progresso', label: 'Progresso', icon: 'insights', badge: null, dot: false },
  ];

  // Conteúdo dos links de navegação compartilhado entre Sidebar e Drawer
  //
  // Achado de auditoria (real, pré-existente, não introduzido nesta rodada): este wrapper
  // ficava com `w-[240px]` FIXO mesmo em Modo Compacto (68px). Os ícones de navegação usam
  // `mx-auto` para centralizar quando colapsados — mas `mx-auto` centraliza contra a largura
  // REAL do próprio contêiner, então contra um contêiner de 240px eles ficavam centralizados
  // por volta de x≈98-142px, fora da faixa de 0-68px que o `<aside>` pai (com
  // `overflow-hidden`) de fato exibe. Resultado visual real (confirmado por screenshot antes
  // desta correção, com e sem o restante desta rodada): os ícones ficavam clipados/invisíveis
  // em Modo Compacto, sobrando só fragmentos de texto de rótulo vazando para fora da faixa
  // visível. A correção é fazer este wrapper acompanhar a largura real do `<aside>`
  // (`geometry.sidebarWidth`) em vez de um valor fixo — assim `mx-auto`/`items-center` centralizam
  // contra a largura verdadeira, e a transição de largura (`panel-transition`, mesmo token
  // `--duration-layout` já usado pelo `<aside>`) produz refluxo real da composição interna,
  // não apenas um clip estático de uma camada que não se move.
  const renderNavContent = (isDrawerContext = false) => {
    const isVisuallyCompact = isCompact || (isTablet && !isDrawerContext);
    const showLabels = !isVisuallyCompact || isDrawerContext;

    return (
      <div
        style={{ width: isDrawerContext ? '240px' : `${geometry.sidebarWidth}px` }}
        className="flex flex-col justify-between h-full pt-5 pb-5 overflow-hidden panel-transition"
      >
        <div className="flex flex-col gap-5 overflow-hidden">
          {/* Header da Sidebar */}
          <div className="flex items-center justify-between px-3 h-8 overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse flex-shrink-0 mx-2" />
              <div className={`sidebar-label-collapse flex items-center overflow-hidden whitespace-nowrap ${showLabels ? 'sidebar-label-in max-w-[140px]' : 'sidebar-label-out max-w-0 pointer-events-none'}`}>
                <span className="font-medium text-[15px] tracking-tight text-text-primary">
                  Minha Vida
                </span>
              </div>
            </div>

            <div className={`sidebar-label-collapse flex items-center gap-1 overflow-hidden ${showLabels ? 'sidebar-label-in max-w-[140px]' : 'sidebar-label-out max-w-0 pointer-events-none'}`}>
              {!isDrawerContext && (
                <button
                  type="button"
                  id="toggle-sidebar-collapse"
                  onClick={() => setMode(isCompact ? 'amplo' : 'compacto')}
                  aria-label="Alternar Largura da Sidebar (240px / 68px)"
                  title="Alternar Largura da Sidebar"
                  className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[18px]">first_page</span>
                </button>
              )}
              {isDrawerContext && (
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Fechar Navegação"
                  title="Fechar"
                  className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Recuperação da Sidebar em Modo Compacto (Desktop) — achado de auditoria: o botão de
              expandir dentro do header ficava dentro de `.sidebar-label-out`, que tem
              `pointer-events: none` quando recolhido, tornando-o inclicável e fora da faixa
              visível de 68px. Este botão dedicado fica sempre clicável, dentro da largura
              compacta, com o mesmo estilo dos ícones de navegação. Tablet fica de fora
              deliberadamente: lá a largura compacta é uma regra de breakpoint, não uma escolha
              reversível do usuário (calculateShellGeometry() ignora `mode` no tablet). */}
          {isCompact && !isTablet && !isDrawerContext && (
            <div className="flex justify-center px-2.5">
              <button
                type="button"
                id="btn-sidebar-expand-compact"
                onClick={() => setMode('amplo')}
                aria-label="Expandir Sidebar"
                title="Expandir Sidebar"
                className="btn-interactive w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span className="material-symbols-outlined text-[18px]">last_page</span>
              </button>
            </div>
          )}

          {/* Navegação Primária */}
          <nav aria-label="Rotas Operacionais" className="flex flex-col gap-1 px-2.5">
            {navItems.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <button
                  key={item.route}
                  id={`nav-item-${item.route}`}
                  type="button"
                  onClick={() => {
                    setActiveRoute(item.route);
                    if (isDrawerContext) closeDrawer();
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`nav-link btn-interactive relative flex items-center rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none text-left transition-all duration-280 ${
                    showLabels ? 'px-3 py-2 w-full gap-0' : 'justify-center w-11 h-10 mx-auto gap-0'
                  } ${
                    isActive
                      ? 'bg-surface text-text-primary font-medium shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                  title={item.label}
                >
                  {isActive && (
                    <div
                      className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-medusa-primary rounded-r transition-opacity duration-200 ${
                        showLabels ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  )}
                  <span
                    className={`material-symbols-outlined text-[19px] flex-shrink-0 ${
                      isActive ? 'text-[#2c6956] dark:text-medusa-primary' : 'text-text-muted'
                    }`}
                  >
                    {item.icon}
                  </span>

                  <div
                    className={`sidebar-label-collapse flex items-center flex-1 overflow-hidden whitespace-nowrap ${
                      showLabels ? 'sidebar-label-in max-w-[170px] ml-3' : 'sidebar-label-out max-w-0 ml-0 pointer-events-none'
                    }`}
                  >
                    <span className="text-[14px] truncate">{item.label}</span>
                    {item.dot && isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-medusa-primary flex-shrink-0" />
                    )}
                    {item.accentDot && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-medusa-accent flex-shrink-0" />
                    )}
                    {item.badge && !item.badgePill && (
                      <span className="ml-auto text-[11px] text-text-muted tabular-nums">
                        {item.badge}
                      </span>
                    )}
                    {item.badgePill && (
                      <span className="ml-auto font-medium text-[11px] px-2 py-0.5 rounded-full bg-medusa-secondary text-[#1C2420] tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            <div className="h-px bg-border my-1 mx-1" />

            {/* Quick Command Navigation Item */}
            <button
              type="button"
              id="btn-search-nav"
              onClick={() => {
                openCommand();
                if (isDrawerContext) closeDrawer();
              }}
              className={`btn-interactive flex items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface w-full text-left focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none transition-all duration-280 ${
                showLabels ? 'px-3 py-2 gap-0' : 'justify-center w-11 h-10 mx-auto gap-0'
              }`}
              title="Comandos / Busca (⌘K)"
            >
              <span className="material-symbols-outlined text-[19px] text-text-muted flex-shrink-0">
                search
              </span>
              <div
                className={`sidebar-label-collapse flex items-center flex-1 overflow-hidden whitespace-nowrap ${
                  showLabels ? 'sidebar-label-in max-w-[170px] ml-3' : 'sidebar-label-out max-w-0 ml-0 pointer-events-none'
                }`}
              >
                <span className="text-[14px]">Comandos / Busca</span>
                <span className="ml-auto font-mono text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                  ⌘K
                </span>
              </div>
            </button>
          </nav>
        </div>

      </div>
    );
  };

  return (
    <>
      {/* ==================== 1. SIDEBAR ESTRUTURAL PERMANENTE (AMPLO / COMPACTO / FOCO) ==================== */}
      {/* Preservação estrita do mesmo nó estrutural (zero remounts) com gaveta física */}
      {!isMobile && (
        <aside
          id="main-sidebar"
          aria-label="Navegação Principal"
          aria-hidden={isFocus}
          style={{
            width: `${geometry.sidebarWidth}px`,
            pointerEvents: isFocus ? 'none' : 'auto',
          }}
          className={`fixed left-0 top-0 h-full bg-surface-secondary z-40 panel-transition shadow-calm overflow-hidden ${
            geometry.sidebarWidth === 0
              ? 'border-r-0 border-transparent'
              : 'border-r border-border/70 dark:border-border/50'
          }`}
        >
          {renderNavContent(false)}
        </aside>
      )}

      {/* ==================== 2. DRAWER TEMPORÁRIO (MODO FOCO OU MOBILE/TABLET) ==================== */}
      {/* O Drawer é estritamente temporário e separado da Sidebar permanente */}
      <div
        id="drawer-backdrop"
        aria-hidden="true"
        onClick={closeDrawer}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-200 ${
          isDrawerActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        id="focus-drawer"
        aria-label="Navegação em Drawer Temporário"
        aria-hidden={!isDrawerActive}
        style={{
          transform: isDrawerActive ? 'translateX(0)' : 'translateX(-100%)',
          visibility: isDrawerActive ? 'visible' : 'hidden',
          pointerEvents: isDrawerActive ? 'auto' : 'none',
        }}
        className="fixed left-0 top-0 h-full w-[260px] max-w-[85vw] bg-surface-secondary border-r border-border z-50 transition-transform duration-280 shadow-2xl"
      >
        {renderNavContent(true)}
      </aside>
    </>
  );
}
