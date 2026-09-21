# CURRENT_STATE.md — Estado Real do Repositório

**Última verificação**: sessão "CAPABILITY AUDIT + MAXIMUM PRODUCT EXPANSION SPRINT", 3ª rodada.
Rodada 1: Capability Audit real + P0 Context Panel corrigido de fato (PR #5, `EVIDENCE.md` →
E-027). Rodada 2 (esta): instrução explícita do usuário para reprioritizar Agenda acima da
auditoria de Educação — Agenda cherry-picked de `feature/agenda` (presa por `HDR-001`) para uma
branch própria `feat/agenda`, PROVADO com 40/41 checks reais, PR #6 (`EVIDENCE.md` → E-028).
Sessões anteriores investigaram o Context Panel até a raiz, corrigiram honestidade dos
placeholders e executaram `TASK-HOJE-FOUNDATION-001` (PR #4). **Não afirme nada aqui sem ter
verificado.** Este arquivo deve ser atualizado a cada gate concluído.

## CHECKPOINT ATUAL (formato definido em AGENT_RULES.md → seção 8)

```
STATUS:        PARCIAL — 3 PRs abertos e provados (PR #4 Hoje Foundation, PR #5 Context Panel
               geometry, PR #6 Agenda), mais PR #1/#2/#3 aguardando Merge Gate. Sprint não
               esgotado: ver TASK_QUEUE.md → QUEUE AUDIT para o que ficou identificado mas não
               executado.
FASE ATUAL:    Agenda agora PROVADA numa branch independente (PR #6), não apenas em
               `feature/agenda`/PR #2. P0 do Shell (Context Panel) RESOLVIDO (PR #5). Fase 5
               (Hoje) com recorte mínimo provado (PR #4). Fases 1/3/4 inalteradas.
CONCLUÍDO NESTA SESSÃO:
  - Capability Audit real e completo (IA/Design/Knowledge/Dados/Google Workspace/Observabilidade/
    QA/Segurança) — ver EVIDENCE.md → E-027. Achados principais: nenhum conector de IA (Gemini/
    AI Studio/OpenRouter/Context7/Sentry) existe neste ambiente (verificado via ToolSearch, não
    suposto); existe uma chave real `Stitch_api_key` no Vercel do projeto `medusa` mas nenhuma via
    de acesso a ela; Google Workspace conectado só ao escopo desta sessão/operador, não ao
    produto; existe um projeto Supabase real chamado "Medusa" (plano free, criado 2026-09-14,
    estava pausado, restaurado nesta sessão) mas ainda vazio.
  - TASK-CONTEXT-PANEL-GEOMETRY-001: a correção de geometria (achada na sessão anterior, decidida
    NÃO duplicar então) foi portada para uma branch própria a partir de `main`
    (`fix/context-panel-geometry`), incluindo um 4º cálculo duplicado que a sessão anterior não
    tinha visto (Sidebar.getSidebarWidth) e um bug novo achado durante o port (borda de 1px que
    não zera com box-sizing:border-box quando width:0 — presente também em `feature/agenda`,
    ainda não reportado lá). PR #5, 39/39 checks reais (largura amostrada em plena transição, não
    só antes/depois) — EVIDENCE.md → E-027.
  - `.github/dependabot.yml` criado (gap real de segurança achado no audit, gratuito, incluído na
    PR #5).
RESTANTE — identificado mas NÃO executado nesta sessão (ver QUEUE AUDIT para detalhe honesto):
  - Auditoria de qualidade de Educação/Study Mode (continua sendo a next executable task mais
    óbvia, ainda não puxada em 2 sessões seguidas — não por bloqueio, por escolha de priorizar
    Capability Audit + P0 nesta rodada).
  - Auditoria transversal de UX/UI/Motion/Loading/Acessibilidade/Performance do Shell inteiro.
  - Corpo/Finanças/Progresso/Guardian/Buscar via árvore de decisão.
  - QA consolidado como suíte reutilizável (hoje são scripts individuais, reais e passando).
  - Observabilidade (Sentry ou alternativa) — nenhuma conta de terceiro criada sem confirmação.
RESTANTE (decisões humanas reais / pré-requisitos de infraestrutura — nada executável por Claude
hoje):
  - HDR-001: aprovação humana de merge (agora PR #1 → PR #2 → PR #3 → PR #4 → PR #5).
  - HDR-011: escolha de provedor de Auth (bloqueia Fase 2 E o wiring do Supabase já existente).
  - BLOCK-009: IA (falta chave de API), Google Workspace como feature de produto (falta app OAuth
    próprio do Medusa) — pré-requisitos de infraestrutura ausentes, não escolhas entre opções.
  - Layout final completo de Hoje/Corpo/Finanças/Progresso/Guardian/Buscar (HDR-005/HDR-006).
ÚLTIMO TESTE:
  node scripts/qa-context-panel-geometry.js (novo, real, Puppeteer) → 39 PASSOU | 0 FALHOU.
  npx tsc --noEmit / npm run build em `fix/context-panel-geometry` → ambos limpos.
FALHAS:
  A primeira rodada do próprio script de QA teve 11 falhas: 9 por comparação de ponto flutuante
  sem tolerância (subpixel rendering, ex. `68.203125` em vez de `68`) e 2 por um bug real (borda
  de 1px não zerada com box-sizing:border-box) — diagnosticado, corrigido no código E no teste
  antes de aceitar o resultado (EVIDENCE.md → E-027).
PRÓXIMO PASSO:
  Auditoria transversal de UX/UI/Motion/Loading/Acessibilidade/Performance do Shell (Agenda +
  Context Panel já cobertos pelas suítes existentes) — Educação segue identificada mas
  reordenada para depois de Agenda por instrução explícita do usuário. Ver TASK_QUEUE.md → QUEUE
  AUDIT.
BLOCKERS:
  Ver BLOCKERS.md → BLOCK-001 (Antigravity), BLOCK-006 (next@14.2.24 CVE), BLOCK-007 (ESLint não
  configurado), BLOCK-008 (Context Panel — RESOLVIDO, PR #5, aguarda só Merge Gate), BLOCK-009
  (IA/Google Workspace/Stitch — pré-requisitos de infraestrutura ausentes).
```

## Baseline Git

```
origin                   = https://github.com/MasterABL/Medusa
main (origin/main)       = 5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0
branch de trabalho atual = chore/agent-os-bootstrap (PR #3, draft, aberta contra main)
```

- `origin/fix/foundation-hardening` (**PR #1**, aberta, não mesclada) = `main` + 2 commits
  (`e616635` "expand study mode to multi-track learning", `a7f988c` "harden context panel...").
- `origin/feature/agenda` (**PR #2**, aberta, não mesclada) = `fix/foundation-hardening` + 1 commit
  próprio (`758cd8d` "implement complete Medusa Temporal OS..."). **PR #2 contém todos os commits
  de PR #1** — não pode ser mesclada isoladamente (ver `DECISIONS.md` → D-008).
- `origin/shell/v2-fixes` — branch vazia, aponta para o mesmo commit de `main`, sem PR, sem
  conteúdo próprio. Não é trabalho pendente, apenas um placeholder não utilizado.
- `origin/chore/agent-os-bootstrap` (**PR #3**, draft, aberta) — este trabalho de protocolo.
- `.github/workflows/ci.yml` **criado e funcional** nesta sessão (`TASK-CI-001`, D-011) — rodou
  de verdade em PR #3 com sucesso (`EVIDENCE.md` → E-023). Escopo: typecheck + build (lint fora,
  ver `BLOCKERS.md` → BLOCK-007).
- `origin/feat/hoje-foundation` (**PR #4**, draft, aberta contra `main`) — Hoje Foundation v1 +
  correção de honestidade em rotas pendentes. `main` + 1 commit próprio (`f58860e`). PROVADO
  (`EVIDENCE.md` → E-026). Independente de PR #1/#2/#3 (branch criada direto de `main`).
- `origin/fix/context-panel-geometry` (**PR #5**, draft, aberta contra `main`) — correção de
  BLOCK-008 (geometria do Shell unificada em `calculateShellGeometry()`). `main` + 1 commit
  próprio (`6a592f8`). PROVADO (`EVIDENCE.md` → E-027). Independente de PR #1/#2/#3/#4.
- `origin/feat/agenda` (**PR #6**, draft, aberta contra `main`) = `fix/context-panel-geometry` +
  2 commits próprios (cherry-pick de `758cd8d` reconciliado + suíte de QA nova). **PR #6 contém
  todos os commits de PR #5** — mesma relação estrutural de PR #2/PR #1 (`D-008`), agora
  registrada como `D-012`. PROVADO (`EVIDENCE.md` → E-028).
- Vercel builda preview automaticamente para todas as PRs (confirmado real — `EVIDENCE.md` →
  E-009, E-013).

## Foundation Hardening (PR #1)

- **Implementation/Test/Build/Browser QA Gate: PROVADO** (verificado de verdade nesta sessão —
  `EVIDENCE.md` → E-014, E-015, E-016). `npx tsc --noEmit` limpo, `npm run build` verde,
  `test-foundation-hardening.js` 13/13, `qa-browser.js` 23/23 asserções reais aprovadas.
- **Precisão da descrição da PR**: "42 testes aprovados" mistura o número de screenshots (42, real)
  com o número de asserções de teste (23, real, todas aprovadas) — impreciso, mas não falso na
  essência (nenhuma asserção real falhou).
- **Merge Gate: BLOQUEADO** — não mesclado a `main`. Ver `DECISIONS.md` → HDR-001.
- **Achado novo**: o commit `e616635` desta branch modifica 7 arquivos de
  `src/components/education/**` (área congelada) sem decisão prévia registrada em `DECISIONS.md`
  — ver HDR-010.

## Educação / Study Mode

- **Baseline em `main` (`5d4c5c0`)**: PROVADO, congelado, single-track ("Física · Mecânica
  Ondulatória" fixo).
- **Expansão multi-trilha (dentro de PR #1/#2, não mesclada)**: implementa alternância real entre
  Faculdade/Inglês/Vestibular (`TRACK_DEFINITIONS`, `StudyTrack`), testada de verdade via
  `qa-browser.js` (alternância de trilha no Dashboard e dentro do Study Mode, Focus Mode
  preservado, exercícios/tutor/notas por trilha — todas as asserções relacionadas passaram).
  **Status: Implementation/QA PROVADO — Governança BLOQUEADA** (tocou área congelada sem decisão
  prévia; ver `DECISIONS.md` → HDR-010, aguardando ratificação humana antes do merge).

## Shell V2 / ContextPanel

- **Baseline**: PROVADO — Sidebar, Header, Dynamic Island, Mobile Island, Command Modal, 3 temas,
  3 modos, motion tokens, reduced motion, todos em `main`.
- `src/components/shell/ContextPanel.tsx` é modificado tanto por PR #1 (hardening de geometria)
  quanto por PR #2 (síntese temporal específica da Agenda, 189 linhas) — mudança esperada e dentro
  do escopo já previsto por `TASK-AGENDA-001` (Context Panel por domínio), não uma violação de área
  congelada (o "congelado" é a forma dos dados de `ShellGeometry`/`SHELL_DIMENSIONS`, não o arquivo
  inteiro).

## Agenda / Temporal OS (PR #2)

```
DESIGN         = auditado (protótipo Figma Make, sessão anterior)
FIGMA          = encerrado, usado só como referência de contrato — nunca portado literalmente
IMPLEMENTATION = FEITA — existe em PR #2 (feature/agenda), NÃO MESCLADA
```

- **Implementation/Test/Build Gate: PROVADO** (`EVIDENCE.md` → E-014). **Browser QA Gate: PROVADO**
  — `qa-agenda.js` real deu 29/30 (a 1 falha é a mesma limitação ambiental de TLS externo, não um
  defeito do app; ver `BLOCKERS.md` → BLOCK-005).
- 24 arquivos novos em `src/components/agenda/**`, `src/context/AgendaContext.tsx`,
  `src/types/agenda.ts`, `scripts/qa-agenda.js`. Sem novas dependências em `package.json`
  (`EVIDENCE.md` → E-019) — consistente com Local State.
- Spot-check de código confirma pelo menos 4 dos 9 critérios de aceitação de `TASK-AGENDA-001`
  genuinamente implementados: breakpoint 820px correto, categoria com domínio associado e editável,
  List View agrupada em Agora/Próximo/Depois/Mais tarde (resolve `HDR-003` na prática), conflito
  com duração real no rótulo (`EVIDENCE.md` → E-018).
- **Merge Gate: BLOQUEADO** (depende de PR #1 primeiro — dependência técnica, `DECISIONS.md` →
  D-008). **Ratificação: BLOQUEADA** para o agrupamento da List View (`HDR-003`, tecnicamente
  resolvido pelo código, falta confirmação humana formal).

## Corpo, Finanças, Progresso, Guardian, Buscar

- **Status**: NÃO IMPLEMENTADO. Nenhum arquivo, nenhuma especificação de UI encontrada no
  repositório. Ver `MASTER_PLAN.md` para os pontos marcados `HUMAN DECISION REQUIRED`.

## Auth / Identity

- **Status**: NÃO IMPLEMENTADO. Nenhuma dependência de autenticação em `package.json` (nem em
  `main`, nem em PR #1, nem em PR #2). Pré-requisito de qualquer Persistence Slice — ver
  `MASTER_PLAN.md` → Fase 2, `DECISIONS.md` → HDR-011.

## Antigravity CLI (`agy`)

- **Status**: NÃO ALCANÇÁVEL nesta sessão remota. O usuário reporta `agy` instalado e funcional
  numa máquina Windows separada — mas essa instalação não é acessível por este container isolado
  (sem ponte de rede/filesystem entre os dois ambientes). Não é um problema de configuração
  corrigível remotamente. Ver `BLOCKERS.md` → BLOCK-001, `DECISIONS.md` → HDR-009.

## Infraestrutura de CI/Deploy

- GitHub Actions: **CONFIGURADO E FUNCIONAL** desde esta sessão — `.github/workflows/ci.yml`
  (typecheck + build), primeiro run real com `conclusion: success` em PR #3
  (`EVIDENCE.md` → E-023).
- Vercel: **CONFIGURADO E FUNCIONAL** — builda preview automaticamente para `main` e as 3 branches
  abertas (`fix/foundation-hardening`, `feature/agenda`, `chore/agent-os-bootstrap`), todas com
  deploy `Ready`/`success`. Confirma, de forma independente, que o build de produção passa nas
  três (`EVIDENCE.md` → E-009, E-013).
- Supabase: **NÃO IMPLEMENTADO** no código (nenhuma dependência), mas o MCP do Supabase está
  disponível neste ambiente de execução — candidato natural para Auth+Persistência quando essa
  fase for decidida (não assumido como decisão — ver `DECISIONS.md` → HDR-011).

## Dívida técnica registrada (não bloqueia roadmap de produto)

- `next@14.2.24` tem vulnerabilidade de segurança conhecida (aviso do npm ao instalar) — ver
  `BLOCKERS.md` → BLOCK-006. Não investigada a fundo nesta sessão; deve virar tarefa de manutenção.
