# CURRENT_STATE.md — Estado Real do Repositório

**Última verificação**: sessão de continuação do bootstrap do Agent Operating System (resolução
Claude↔Antigravity, fallback de executor, checkpoints). **Não afirme nada aqui sem ter
verificado.** Este arquivo deve ser atualizado a cada gate concluído.

## CHECKPOINT ATUAL (formato definido em AGENT_RULES.md → seção 8)

Este checkpoint descreve o próprio trabalho de bootstrap do Agent Operating System — que é, em si,
uma tarefa longa e retomável entre sessões, tratada aqui com o mesmo rigor de qualquer tarefa de
`TASK_QUEUE.md`.

```
STATUS:        PARCIAL (protocolo funcional; Antigravity real ainda não acionável)
FASE ATUAL:    Bootstrap do sistema de agentes concluído; PR #3 aberto (draft) contra main,
               aguardando decisão humana para prosseguir ao primeiro piloto (TASK-AGENDA-001).
CONCLUÍDO:
  - Os 12 arquivos obrigatórios de .ai/ existem e estão sincronizados com o estado real do repo.
  - scripts/agent-orchestrator.cjs implementa a cadeia de fallback completa (Antigravity → Claude
    direto → BLOQUEADO), com contrato de exit code estável (0/1/2/3) — ver AGENT_RULES.md §7.
  - Caminho legítimo de instalação do Antigravity CLI identificado, lido e verificado como seguro
    (checksum SHA512, instalação local, sem sudo) — ver BLOCKERS.md → BLOCK-001, EVIDENCE.md → E-010.
  - PR #3 (branch chore/agent-os-bootstrap) aberto como draft, sem tocar src/**, com QA do próprio
    protocolo (sintaxe, fallback, restauração de estado) documentado em EVIDENCE.md.
  - Vercel confirmado como pipeline de build/preview real e funcional (EVIDENCE.md → E-009).
RESTANTE:
  - Decisão humana sobre HDR-009 (investir em acesso persistente/autenticado ao Antigravity real).
  - Decisão humana sobre HDR-001 e HDR-003 para promover TASK-AGENDA-001 a READY.
  - GitHub Actions para automatizar os gates de Test/Build (HDR-007) — ainda não decidido.
ÚLTIMO TESTE:
  node scripts/agent-orchestrator.cjs (sem tarefa ativa) → exit 1 (esperado);
  node scripts/agent-orchestrator.cjs (tarefa sintética, agy ausente) → exit 2, status
  "FALLBACK: CLAUDE_DIRECT", registro salvo em .ai/runs/2026-09-20T23-06-47-875Z-TASK-TEST-001.json;
  git diff --stat -- src/ → vazio (nenhum código de produto tocado).
FALHAS:
  Tentativa de instalar o Antigravity CLI real foi recusada pelo classificador de segurança do
  próprio ambiente (código externo sem permissão explícita) — não é uma falha do protocolo, é uma
  barreira de ambiente documentada e respeitada (ver BLOCKERS.md → BLOCK-001). Sem workaround.
PRÓXIMO PASSO:
  Aguardar decisão humana sobre HDR-001/HDR-003 (para TASK-AGENDA-001) e HDR-009 (para Antigravity
  persistente). Até lá, o sistema já está pronto para que uma única instrução inicie a execução de
  TASK-AGENDA-001 via fallback Claude direto, seguindo o fluxo de AGENT_RULES.md → seção 9.
BLOCKERS:
  Ver BLOCKERS.md → BLOCK-001 (Antigravity), BLOCK-002 (PR #1 não mesclado), BLOCK-003 (GitHub
  Actions ausente — Vercel já não é mais um bloqueio, ver correção em BLOCKERS.md).
```

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
- Vercel: **CONFIGURADO E FUNCIONAL** (corrigido após verificação real — ver `EVIDENCE.md` →
  E-009). O projeto Vercel `medusa` está conectado ao repositório via integração GitHub (não por
  `vercel.json` no repo, mas por configuração no dashboard/App do Vercel) e builda deploys de
  preview automaticamente a cada push, incluindo esta branch de bootstrap. Isso não significa que
  produção esteja configurada com Supabase ou qualquer persistência real — apenas que o pipeline
  de build/preview do Vercel está ativo.
- Supabase: **NÃO IMPLEMENTADO** (nenhuma dependência ou arquivo de configuração no repo).
