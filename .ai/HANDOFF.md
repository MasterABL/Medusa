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

Ver `AGENT_RULES.md` → seção 9 ("Fluxo Oficial de Orquestração") para o fluxo completo
`TASK_QUEUE → ACTIVE_TASK → PLAN → HANDOFF → EXECUTOR → CODE → TEST → BROWSER QA → REGRESSION →
AUDIT → status final → TASK_QUEUE.next`. Este documento cobre especificamente o passo `HANDOFF`
e a decisão de executor:

1. Claude confirma que a tarefa em `ACTIVE_TASK.md` está completa e sem `HUMAN DECISION REQUIRED`
   pendente que a bloqueie.
2. Claude preenche este formato a partir de `ACTIVE_TASK.md` (não reescreve do zero — copia os
   fatos já verificados).
3. Claude executa `scripts/agent-orchestrator.cjs`, que tenta invocar `agy` com o handoff
   serializado.
   - Se `agy` estiver disponível e autenticado: o script executa a tarefa através dele e o
     resultado (stdout, stderr, exit code) é salvo em `.ai/runs/<timestamp>-<task-id>.json`
     (exit code 0 = executado, precisa de auditoria).
   - Se `agy` estiver indisponível: o script retorna o status de fallback (exit code 2) sem
     inventar uma execução — ver `AGENT_RULES.md` → seção 7 ("Executor e Fallback"). Neste caso,
     **Claude implementa a tarefa diretamente**, usando este mesmo `HANDOFF.md` preenchido como a
     especificação exata do escopo (não um resumo, não uma reinterpretação).
   - Se `agy` estiver disponível mas a execução falhar de fato (exit code 3): Claude investiga a
     falha, decide entre tentar novamente, acionar o fallback (Claude direto), ou registrar
     `BLOQUEADO` com o motivo real em `BLOCKERS.md`.
4. Claude lê o resultado (de qualquer um dos três caminhos acima), audita contra `QA_GATE.md`, e
   só então decide se a tarefa avança, fica `PARTIAL`/`PARCIAL` ou volta para `BLOCKED`/`BLOQUEADO`.
5. Claude nunca aceita a alegação de que algo está `PROVADO` — nem do Antigravity, nem da própria
   execução direta de Claude — sem reexecutar/reconferir pelo menos os gates de Test/Build/Browser
   QA (ver `AGENT_RULES.md` → Honestidade). Executar a tarefa e auditar a tarefa são papéis
   distintos mesmo quando é o mesmo agente (Claude) fazendo os dois.
6. Antes de encerrar a tarefa ou a sessão, Claude atualiza o bloco de checkpoint (formato em
   `AGENT_RULES.md` → seção 8) em `CURRENT_STATE.md`, `ACTIVE_TASK.md`, `TASK_QUEUE.md` e
   `EVIDENCE.md`, para que qualquer sessão futura possa retomar sem depender de memória de
   conversa.

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
