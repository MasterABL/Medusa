# CURRENT_STATE.md — Estado Real do Repositório

**Última verificação**: nesta sessão de bootstrap do Agent Operating System.
**Não afirme nada aqui sem ter verificado.** Este arquivo deve ser atualizado a cada gate concluído.

## Baseline Git

```
origin                  = https://github.com/MasterABL/Medusa
main (origin/main)      = 5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0
branch de trabalho atual = chore/agent-os-bootstrap (criada a partir de origin/main)
```

- `origin/fix/foundation-hardening` está **2 commits à frente** de `main`
  (`e616635`, `a7f988c`) e é a `head` do **PR #1 aberto, não mesclado**:
  "feat(shell): Foundation Hardening — Context Panel + Tema Claro".
- Nenhum outro PR aberto encontrado.
- Nenhum workflow de GitHub Actions configurado no repositório (`0` workflows).

## Foundation Hardening

- **Status**: PARCIAL — implementado e com PR aberto (#1), **ainda não mesclado a `main`**.
- O PR alega (na própria descrição, não reverificado nesta sessão): unificação de geometria via
  `ShellGeometry`/`SHELL_DIMENSIONS`, correção da escala de elevação do tema Claro, persistência
  local de `isContextOpen`, e "suíte automatizada canônica com 42 testes aprovados" +
  "teste de hardening com 100% de sucesso".
- **Importante (regra de honestidade)**: os números "42 testes" e "100% de sucesso" são uma
  alegação do autor do PR na descrição, não uma evidência reproduzida nesta sessão. Antes de
  tratar o PR #1 como `PROVADO`, um agente precisa rodar `scripts/qa-browser.js` e
  `scripts/test-foundation-hardening.js` de fato e registrar o resultado em `EVIDENCE.md`.
- **Decisão pendente**: mesclar PR #1 antes de iniciar a implementação real da Agenda, já que a
  Agenda vai depender de `ShellGeometry`/Context Panel corrigidos. Ver `DECISIONS.md`.

## Educação / Study Mode

- **Status**: PROVADO (baseline) — presente em `main`, commit `5d4c5c0` já inclui
  "fix(education): align data classification and audit transparency" e o commit anterior
  "feat(education): implement study mode flow and choreography".
- **Congelado**: nenhuma alteração funcional deve ser feita em `src/components/education/**`
  sem decisão humana explícita (ver `ARCHITECTURE.md` → Áreas Congeladas).

## Shell V2

- **Status**: PROVADO (baseline) — Sidebar, Header 3-zonas, Dynamic Island, Mobile Island unificado,
  Context Panel, Command Modal, 3 temas, 3 modos, motion tokens, reduced motion — todos presentes
  em `main` e auditados em rodadas anteriores deste projeto (fora deste bootstrap).
- Pendências conhecidas do Shell (não bloqueiam este bootstrap, mas devem entrar na fila): o PR #1
  ainda não mesclado é a correção mais recente pendente.

## Agenda

```
DESIGN         = auditado (protótipo Figma Make revisado linha a linha e testado interativamente
                 em sessão anterior; ver relatório de auditoria correspondente)
FIGMA          = encerrado (protótipo em https://www.figma.com/make/eDnnwmu3ArYjNjWx5qcDQG
                 servido como referência de contrato de produto e UX — não é código do Medusa)
IMPLEMENTATION = próxima etapa — NÃO INICIADA
```

- **Não existe nenhum arquivo em `src/components/agenda/` no repositório `MasterABL/Medusa`.**
  Confirmado por listagem completa de `src/` na branch `main`: apenas `app`, `components/education`,
  `components/shell`, `context`, `fixtures`, `types`.
- O protótipo Figma Make usa uma stack diferente (Vite + React 19 + Tailwind 4) e existiu apenas
  como reconstrução local de auditoria em uma sessão anterior — nunca foi commitado neste
  repositório. Nenhum código daquele protótipo deve ser copiado literalmente; ele serve como
  **referência de contrato**, não como fonte a ser portada 1:1 (a stack é incompatível: Next.js 14/
  React 18/Tailwind 3 aqui vs. Vite/React 19/Tailwind 4 lá).
- A tarefa `TASK-AGENDA-001` (ver `TASK_QUEUE.md`) formaliza o que já se sabe do contrato e das
  divergências encontradas na auditoria do protótipo.

## Corpo, Finanças, Progresso, Guardian, Buscar

- **Status**: NÃO IMPLEMENTADO. Nenhum arquivo, nenhuma especificação de UI encontrada no
  repositório. Ver `MASTER_PLAN.md` para os pontos marcados `HUMAN DECISION REQUIRED`.

## Antigravity CLI (`agy`)

- **Status**: NÃO DISPONÍVEL neste ambiente. `which agy` e `agy --version` retornam
  "command not found" (exit code 127). Ver `BLOCKERS.md` e seção "Automação Claude → Antigravity"
  do relatório de bootstrap.

## Infraestrutura de CI/Deploy

- GitHub Actions: **NÃO CONFIGURADO** (0 workflows).
- Vercel: **NÃO VERIFICÁVEL A PARTIR DO REPOSITÓRIO** (nenhum `vercel.json`; pode existir só no
  dashboard).
- Supabase: **NÃO IMPLEMENTADO** (nenhuma dependência ou arquivo de configuração no repo).
