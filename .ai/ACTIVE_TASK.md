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

## Tarefa ativa

```
TASK ID: TASK-CI-001

OBJECTIVE:
Criar um workflow de GitHub Actions que rode, em cada PR contra main, exatamente os gates já
mandatados por QA_GATE.md: Test Gate (npm run typecheck) e Build Gate (npm run build).

CONTEXT:
Ver TASK_QUEUE.md → TASK-CI-001 (contrato completo), DECISIONS.md → D-011 (HUMAN GATE ANALYSIS
que concluiu que isto é uma escolha técnica normal, não uma decisão humana — automatiza checks já
obrigatórios, sem custo, sem segredo novo, sem mudança de escopo de produto).

FILES EXPECTED:
- .github/workflows/ci.yml (novo)

CONSTRAINTS:
Não tocar src/**. Nenhum segredo/variável de ambiente nova. Nenhum passo de deploy. Nenhuma
permissão de workflow além do mínimo de leitura do repositório.

ACCEPTANCE CRITERIA:
1. Workflow roda automaticamente em PRs contra main.
2. Roda exatamente typecheck + build — nada mais (lint removido do escopo: nunca foi mandatado
   por QA_GATE.md, e ESLint nem está configurado neste repo — ver BLOCKERS.md → BLOCK-007).
3. Nenhum segredo novo é necessário.
4. Nenhum arquivo de produto (src/**) é alterado.

TESTS: o próprio workflow rodando com sucesso é o teste.

BROWSER QA: N/A.

REGRESSION: N/A (não toca src/**).

EXPECTED EVIDENCE:
Link do workflow run com resultado real, registrado em EVIDENCE.md.
```

## CHECKPOINT ATUAL

```
STATUS:        IN_PROGRESS
FASE ATUAL:    Fallback Claude direto (agy inalcançável). Handoff preenchido, orquestrador a rodar.
CONCLUÍDO:     Handoff preenchido.
RESTANTE:      Criar .github/workflows/ci.yml, commitar, push, verificar run real.
ÚLTIMO TESTE:  (a rodar)
PRÓXIMO PASSO: node scripts/agent-orchestrator.cjs, depois criar o workflow.
BLOCKERS:      Nenhum.
```

---

## Última tarefa executada (arquivada)

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
