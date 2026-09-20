# HANDOFF.md — Formato Claude → Antigravity

O Antigravity **nunca** recebe uma instrução do tipo "Implemente a Agenda." Ele recebe este
formato preenchido, gerado a partir de `ACTIVE_TASK.md`, `PRODUCT_CONTRACT.md`, `ARCHITECTURE.md`
e `AGENT_RULES.md`.

## Formato obrigatório

```
TASK ID
WHY
CURRENT STATE
EXACT SCOPE
FILES
ARCHITECTURAL RULES
DO NOT TOUCH
ACCEPTANCE CRITERIA
TEST COMMANDS
BROWSER QA
EXPECTED OUTPUT
```

## Processo

1. Claude confirma que a tarefa em `ACTIVE_TASK.md` está completa e sem `HUMAN DECISION REQUIRED`
   pendente que a bloqueie.
2. Claude preenche este formato a partir de `ACTIVE_TASK.md` (não reescreve do zero — copia os
   fatos já verificados).
3. Claude executa `scripts/agent-orchestrator.mjs`, que invoca `agy` com o handoff serializado.
4. O resultado (stdout, stderr, exit code) é salvo em `.ai/runs/<timestamp>-<task-id>.json`.
5. Claude lê o resultado, audita contra `QA_GATE.md`, e só então decide se a tarefa avança, fica
   `PARTIAL` ou volta para `BLOCKED`.
6. Claude nunca aceita a alegação do Antigravity de que algo está `PROVADO` sem reexecutar/
   reconferir pelo menos os gates de Test/Build/Browser QA (ver `AGENT_RULES.md` → Honestidade).

## Rascunho de handoff para TASK-AGENDA-001 (não enviado — `agy` indisponível nesta sessão)

```
TASK ID: TASK-AGENDA-001

WHY:
A Agenda é o próximo domínio na ordem arquitetural do Medusa (MASTER_PLAN.md, fase 4), com
contrato de produto já auditado a partir de um protótipo Figma Make navegável e testado
interativamente. É o primeiro piloto do protocolo de agentes deste repositório.

CURRENT STATE:
Nenhum arquivo de Agenda existe em src/components/agenda/ nesta branch. Shell V2 e Educação já
existem e estão estáveis em main. Um PR de hardening do Shell (Context Panel + tema Claro) está
aberto e ainda não mesclado (ver CURRENT_STATE.md) — confirmar com o humano se deve ser mesclado
antes desta tarefa começar.

EXACT SCOPE:
Ver TASK_QUEUE.md → TASK-AGENDA-001 → DESCRIPTION e ACCEPTANCE CRITERIA na íntegra. Não resumir
nem reinterpretar — copiar literalmente.

FILES:
Ver ACTIVE_TASK.md → FILES EXPECTED.

ARCHITECTURAL RULES:
Ver AGENT_RULES.md na íntegra, especialmente: reuso de ShellGeometry/tokens existentes, padrão de
integração de módulo por activeRoute (não rota própria do Next.js), sem magic numbers, sem
persistência real.

DO NOT TOUCH:
src/components/education/** (congelado). src/types/shell.ts (ShellGeometry/SHELL_DIMENSIONS —
só ler, nunca mudar a forma dos dados). src/fixtures/islandFixtures.ts (catálogo fechado de 10
estados).

ACCEPTANCE CRITERIA:
Ver TASK_QUEUE.md → TASK-AGENDA-001 → ACCEPTANCE CRITERIA (9 itens, copiar literalmente).

TEST COMMANDS:
npx tsc --noEmit
npm run build

BROWSER QA:
node scripts/qa-browser.js (adaptado/estendido para cobrir as rotas da Agenda) nos 4 breakpoints
390/820/1024/1440, com verificação explícita do valor exato 820px na Week View.

EXPECTED OUTPUT:
Diff de código limitado aos FILES declarados, saída real dos TEST COMMANDS, e um relatório de
Browser QA com screenshot ou asserção programática por breakpoint. Nenhuma alegação de "PROVADO"
sem esses três anexos.
```

**Nota de status**: este rascunho não foi enviado a nenhum executor nesta sessão porque o CLI
`agy` não está disponível neste ambiente (ver `BLOCKERS.md`). Ele existe para que, no momento em
que `agy` (ou outro executor) estiver disponível, o handoff já esteja pronto sem reinterpretação.
