# CURRENT_STATE.md — Estado Real do Repositório

**Última verificação**: sessão "EXECUTION SPRINT — MAXIMUM AUTONOMY". Regra central: nunca parar
por "fila antiga acabou" sem antes auditar o estado inteiro do produto em busca de trabalho
executável não dependente de Human Gate. Investigou o bug P0 do Context Panel até a raiz,
encontrou e corrigiu uma violação real de honestidade (dados fabricados apresentados como reais em
`hoje`/`agenda`/`corpo`/`financas`/`progresso`) e executou `TASK-HOJE-FOUNDATION-001`. **Não afirme
nada aqui sem ter verificado.** Este arquivo deve ser atualizado a cada gate concluído.

## CHECKPOINT ATUAL (formato definido em AGENT_RULES.md → seção 8)

```
STATUS:        PARCIAL — nova PR aberta e provada (PR #4), mais 3 PRs anteriores ainda aguardando
               Merge Gate (HDR-001/HDR-005/HDR-011 inalterados). Sprint não esgotado: ver
               TASK_QUEUE.md → QUEUE AUDIT para o que ficou identificado mas não executado.
FASE ATUAL:    Fase 5 (Hoje) ganhou um recorte mínimo real e provado, sem esperar pela
               especificação completa (HDR-006). Fases 1/3/4 inalteradas (mesmo Merge Gate).
CONCLUÍDO NESTA SESSÃO:
  - Investigação P0 do Context Panel (12 pontos pedidos: quem controla o estado, onde vive,
    geometria real, breakpoints, modos) → raiz encontrada por teste comparativo real
    (`main` 42/48 vs `feature/agenda` 47/48) e leitura de código: 3 funções de geometria
    duplicadas em `main` (ContextPanel.tsx/ShellLayout.tsx/Header.tsx), já resolvidas por
    `calculateShellGeometry()` na branch não mesclada. Não duplicado — ver BLOCKERS.md → BLOCK-008.
  - Achado de honestidade: `src/app/page.tsx` em `main` apresentava estatísticas fabricadas
    ("14 rpm", "0.02%", "ALL GATES PROVED") como dados reais na rota padrão (`hoje`) e em todo
    fallback de aba não implementada (`agenda`/`corpo`/`financas`/`progresso`).
  - Evidência do legado `minha-vida` (`src/lib/hoje.js`) minerada e filtrada: reaproveitado
    `itemAtualId`/`montarLinhaDoTempo` (generalizáveis); descartado `ROTINA_PADRAO` (pessoal
    demais), clima/Google Calendar/IA (fora de escopo), gamificação (contradiz MASTER_PLAN.md).
  - TASK-HOJE-FOUNDATION-001 executada: Hoje Foundation v1 honesta (Local State, agrupamento
    Agora/Próximo/Depois/Mais tarde, motion reaproveitado de `.study-stage-enter`) + estado
    honesto de pendência para agenda/corpo/financas/progresso. PR aberta (draft):
    https://github.com/MasterABL/Medusa/pull/4. 39/39 checks reais (tsc/build/browser QA 4
    breakpoints/reduced-motion/regressão) — EVIDENCE.md → E-026.
  - Nenhum conector Stitch existe neste ambiente (verificado via SearchMcpRegistry) — registrado
    como limitação real, não suposta.
RESTANTE — identificado mas NÃO executado nesta sessão (ver QUEUE AUDIT para detalhe honesto):
  - Auditoria de qualidade de Educação/Study Mode.
  - Auditoria completa de Shell/motion/responsivo além do que já foi testado.
  - Mineração adicional do legado para Corpo/Finanças além do estado honesto já aplicado.
RESTANTE (decisões humanas reais / especificação de produto — nada executável por Claude hoje):
  - HDR-001: aprovação humana de merge (agora PR #1 → PR #2 → PR #3 → PR #4).
  - HDR-011: escolha de provedor de Auth (bloqueia só a Fase 2 e Persistence Slices futuros).
  - Layout final completo de Hoje/Corpo/Finanças/Progresso/Guardian/Buscar (HDR-005/HDR-006) — o
    recorte mínimo honesto de Hoje já não depende mais disso.
ÚLTIMO TESTE:
  node scripts/qa-hoje-foundation.js (novo, real, Puppeteer) → 39 PASSOU | 0 FALHOU.
  npx tsc --noEmit / npm run build em `feat/hoje-foundation` → ambos limpos.
FALHAS:
  A primeira rodada do próprio script de QA teve 8 falsos-positivos por comparar texto literal
  contra `innerText` transformado por `text-transform: uppercase` do CSS — diagnosticado e
  corrigido antes de aceitar o resultado (EVIDENCE.md → E-026).
PRÓXIMO PASSO:
  Auditoria de qualidade de Educação/Study Mode — não depende de nenhum HDR, escopo definido,
  candidata natural para a continuidade autônoma. Ver TASK_QUEUE.md → QUEUE AUDIT.
BLOCKERS:
  Ver BLOCKERS.md → BLOCK-001 (Antigravity — inalcançável desta sessão), BLOCK-006 (next@14.2.24
  CVE, dívida técnica não urgente), BLOCK-007 (ESLint não configurado, backlog não urgente),
  BLOCK-008 (Context Panel em `main` — já corrigido em branch não mesclada, aguarda HDR-001).
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
- Vercel builda preview automaticamente para as 3 PRs (confirmado real — `EVIDENCE.md` → E-009,
  E-013).

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
