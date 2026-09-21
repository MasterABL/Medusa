# ACTIVE_TASK.md — Contrato da Tarefa Ativa

Este arquivo contém, a qualquer momento, **no máximo uma tarefa**: a que está de fato em
`IN_PROGRESS`. É o documento que pode ser enviado diretamente ao Antigravity via `HANDOFF.md`.

Formato obrigatório:

```
TASK ID
OBJECTIVE
CONTEXT
FILES EXPECTED
CONSTRAINTS
ACCEPTANCE CRITERIA
TESTS
BROWSER QA
REGRESSION
EXPECTED EVIDENCE
```

---

## Estado atual

**Nenhuma tarefa está ativa neste momento.** `TASK-CI-001` foi concluída nesta sessão (`PROVADO`
— run real: `github.com/MasterABL/Medusa/actions/runs/35548493868`, `conclusion: success`; ver
`EVIDENCE.md` → E-023) e removida do slot ativo.

**Estado da fila**: todas as tarefas desbloqueadas nesta sessão (`TASK-MERGE-PREP-001`,
`TASK-AGENDA-001`, `TASK-CI-001`) foram executadas e verificadas com evidência real. O que resta
depende de `HDR-001` (aprovação de merge) ou `HDR-011` (provedor de Auth) — ambas decisões
humanas reais, ou de uma rodada de definição de produto para Hoje/Corpo/Finanças/Progresso/
Guardian/Buscar. Ver `TASK_QUEUE.md` → `QUEUE AUDIT` para a análise completa.

## CHECKPOINT ATUAL

```
STATUS:        BLOQUEADO (real — ver TASK_QUEUE.md → QUEUE AUDIT)
FASE ATUAL:    3 tarefas executadas nesta sessão (TASK-MERGE-PREP-001, auditoria completa de
               TASK-AGENDA-001, TASK-CI-001), todas PROVADO com evidência real.
CONCLUÍDO:     Ver CURRENT_STATE.md para o detalhamento completo.
RESTANTE:      HDR-001 (merge), HDR-011 (Auth), especificação de produto para Fases 5-13.
ÚLTIMO TESTE:  GitHub Actions run 35548493868 — conclusion: success.
FALHAS:        Nenhuma (um erro de escopo em TASK-CI-001 — lint incluído indevidamente — foi
               corrigido antes de commitar, não chegou a falhar em produção).
PRÓXIMO PASSO: Aguardar decisão humana (HDR-001 ou HDR-011) ou fornecimento de especificação de
               produto para qualquer domínio futuro.
BLOCKERS:      Nenhum bloqueio técnico. 2 gates humanos reais (ver acima).
```

---

## Últimas tarefas executadas (arquivadas)

```
TASK ID: TASK-MERGE-PREP-001 [CONCLUÍDA — PROVADO]

OBJECTIVE:
Corrigir as descrições das PRs #1 (Foundation Hardening) e #2 (Agenda) no GitHub para refletir os
números reais verificados na auditoria da sessão anterior (EVIDENCE.md → E-013 a E-019), e deixar
um resumo preciso para as decisões humanas pendentes (HDR-001, HDR-003, HDR-010).

CONTEXT:
Ver TASK_QUEUE.md → TASK-MERGE-PREP-001 (contrato completo), BLOCKERS.md → BLOCK-002/BLOCK-005,
EVIDENCE.md → E-013 a E-019. Esta tarefa não implementa nem altera nenhum código de produto — é
correção de comunicação/evidência sobre PRs já existentes.

FILES EXPECTED:
- Nenhum arquivo de código. Apenas comentários/edições de descrição nas PRs #1 e #2 via GitHub.

CONSTRAINTS:
Não alterar nenhum arquivo em src/**. Não mesclar nenhuma PR (isso é HDR-001, decisão humana).
Não implementar nenhuma funcionalidade de produto.

ACCEPTANCE CRITERIA:
1. Descrição de PR #1 não afirma mais "42 testes aprovados" sem qualificar a diferença entre
   asserções (23, todas aprovadas) e screenshots (42).
2. Descrição de PR #2 não afirma mais "30/30" sem qualificar que a única falha real é causada por
   uma limitação ambiental de TLS externo, não um defeito funcional.
3. Nenhum código-fonte foi alterado.

TESTS: N/A (nenhum código novo).

BROWSER QA: N/A (nenhuma UI nova).

REGRESSION: N/A (nenhum código tocado).

EXPECTED EVIDENCE:
Link/confirmação da edição de cada descrição de PR, registrado em EVIDENCE.md.
```

## CHECKPOINT ATUAL (AGENT_RULES.md → seção 8)

```
STATUS:        IN_PROGRESS
FASE ATUAL:    Executor: fallback Claude direto (agy indisponível nesta sessão — ver BLOCKERS.md →
               BLOCK-001, nova nota sobre Windows/ambiente remoto). Orquestrador executado, exit 2
               confirmado, HANDOFF.md consumido corretamente.
CONCLUÍDO:     Handoff preenchido, orquestrador testado.
RESTANTE:      Editar as descrições reais das PRs #1 e #2 no GitHub, registrar em EVIDENCE.md.
ÚLTIMO TESTE:  node scripts/agent-orchestrator.cjs → exit 2, status FALLBACK: CLAUDE_DIRECT.
FALHAS:        Nenhuma.
PRÓXIMO PASSO: Claude edita as duas descrições de PR via GitHub MCP.
BLOCKERS:      Nenhum.
```

---

## Histórico — rascunho original de `TASK-AGENDA-001` (não ativar; implementação já existe)

`TASK-AGENDA-001` não está mais `PENDING` — uma implementação real já existe em PR #2
(`feature/agenda`), auditada de verdade na sessão anterior (`EVIDENCE.md` → E-013 a E-019,
`TASK_QUEUE.md` → status `PARTIAL`). O rascunho abaixo é preservado como referência histórica do
contrato original, contra o qual a implementação real foi verificada — não deve ser reativado como
"a implementar do zero".

```
TASK ID: TASK-AGENDA-001

OBJECTIVE:
Implementar a primeira versão real da Agenda dentro do Shell existente do Medusa, cobrindo as
4 views (Dia/Semana/Mês/Lista), modelo de dados de 4 tipos, conflitos com duração, tempo livre,
Now Indicator, 24 cores, categorias com domínio e edição, filtros, temas, drawer, detalhe,
Context Panel, acessibilidade e reduced motion — sem persistência real e sem tocar Educação.

CONTEXT:
Ver PRODUCT_CONTRACT.md (responsabilidade da Agenda), ARCHITECTURE.md (Shell/ShellGeometry/
padrão de integração de módulo), CURRENT_STATE.md (Agenda: implementada em PR #2, não mesclada),
e EVIDENCE.md (achados da auditoria do protótipo Figma Make + auditoria real do código de PR #2).

FILES EXPECTED (já existem em PR #2 — ver EVIDENCE.md → E-013):
- src/components/agenda/** (24 arquivos), src/context/AgendaContext.tsx, src/types/agenda.ts,
  scripts/qa-agenda.js, src/app/{layout,page}.tsx, src/components/shell/ContextPanel.tsx.

CONSTRAINTS:
Ver AGENT_RULES.md na íntegra.

ACCEPTANCE CRITERIA:
Ver TASK_QUEUE.md → TASK-AGENDA-001 → ACCEPTANCE CRITERIA (status real por item já preenchido).

TESTS / BROWSER QA / REGRESSION:
Já executados de verdade na sessão anterior — ver EVIDENCE.md → E-014 a E-018.

EXPECTED EVIDENCE:
Já preenchido em EVIDENCE.md → E-013 a E-019.
```
