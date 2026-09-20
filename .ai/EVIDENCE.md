# EVIDENCE.md — Ledger de Evidência Real

Regra: nada entra aqui como "PROVADO" sem comando exato + saída real (ou caminho de
screenshot/arquivo). Uma alegação de terceiro (ex.: descrição de um PR) é registrada como
**alegada**, não como evidência, até ser reproduzida por Claude, Antigravity, ou um humano nesta
ou em outra sessão rastreável.

---

## E-001 — Baseline Git deste bootstrap

**Comando/sessão:** bootstrap do Agent Operating System, 2026-09-20.
**Executor:** Claude.

```
$ git remote -v
origin  (fetch/push apontando para MasterABL/Medusa)

$ git fetch origin
(sucesso)

$ git rev-parse origin/main
5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0

$ git merge-base origin/main origin/fix/foundation-hardening
5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0

$ git rev-list --left-right --count origin/main...origin/fix/foundation-hardening
0	2

$ git log --oneline origin/fix/foundation-hardening -8
a7f988c ...
e616635 ...
(demais commits herdados de main)

$ git checkout -b chore/agent-os-bootstrap origin/main
Switched to a new branch 'chore/agent-os-bootstrap'
```

**Conclusão suportada por evidência real:** `main` está em `5d4c5c0`; `fix/foundation-hardening`
tem exatamente 2 commits à frente de `main` e nenhum atrás; PR #1 está `open`/`merged: false`.

**Status:** PROVADO (fato de baseline, não uma alegação de qualidade de produto).

---

## E-002 — Ausência de CI configurado

**Comando:** `mcp__github__actions_list` (via GitHub MCP).
**Saída:** `{"total_count":0}`
**Status:** PROVADO (ausência confirmada, não suposta).

---

## E-003 — Estrutura real de `src/` em `main` (sem Agenda)

**Comando:** listagem de diretório local após `git checkout -b chore/agent-os-bootstrap
origin/main`.
**Saída (resumo):** `src/components/{education,shell}/**`, `src/context/ShellContext.tsx`,
`src/fixtures/islandFixtures.ts`, `src/types/shell.ts`, `src/app/{page.tsx,layout.tsx,
globals.css,icon.svg,dev/motion-lab/page.tsx}`. Nenhum diretório `src/components/agenda/`.
**Status:** PROVADO — confirma que `IMPLEMENTATION` da Agenda é `NÃO INICIADA` (não uma alegação,
uma ausência verificada por listagem real).

---

## E-004 — Antigravity CLI indisponível

**Comando:**
```
$ agy --version
/bin/bash: line 1: agy: command not found
```
**Exit code:** 127.
**Status:** PROVADO (ausência) — ver `BLOCKERS.md` → BLOCK-001.

---

## E-005 (ALEGADO, NÃO REPRODUZIDO) — Claims do PR #1

**Fonte:** corpo do PR #1, lido via `mcp__github__list_pull_requests` (dado de terceiro, não
comando executado por Claude nesta sessão).
**Alegação textual do PR:** "Suíte automatizada canônica (qa-browser.js) com 42 testes
aprovados"; "Teste de hardening... aprovado com 100% de sucesso."
**O que falta para virar evidência real:** checkout de `fix/foundation-hardening`, execução real
de `node scripts/qa-browser.js` e `node scripts/test-foundation-hardening.js`, e registro da
saída completa aqui.
**Status:** **ALEGADO — NÃO REPRODUZIDO NESTA SESSÃO.** Não deve ser citado como `PROVADO` em
nenhum outro documento `.ai/` até ser reproduzido.

---

## E-006 — Auditoria interativa do protótipo Figma Make da Agenda (herdada de sessão anterior)

**Origem:** sessão anterior deste mesmo projeto (fora deste bootstrap), na qual o protótipo
`https://www.figma.com/make/eDnnwmu3ArYjNjWx5qcDQG/...` foi lido via ferramentas MCP do Figma
(`get_design_context`, `ReadMcpResourceTool` contra `file://figma/make/source/...`) e testado
interativamente.
**Achados usados como contrato de produto para `TASK-AGENDA-001` (ver `TASK_QUEUE.md`):**
- Bug de breakpoint: layout mobile da Week View não é acionado exatamente em 820px (usa
  `< 820`, excluindo o próprio valor).
- Conflito entre itens mostra apenas a palavra "conflito", sem duração.
- Categoria pode ser criada com cor, mas sem associação a domínio e sem edição posterior.
- List View agrupa por dia, não por Agora/Próximo/Depois/Mais tarde (ponto em aberto — ver
  HDR-003 em `DECISIONS.md`).
- Paleta de 24 cores pastel identificada e considerada reutilizável.
- Protótipo não implementa `prefers-reduced-motion`.
**Status:** PROVADO como *auditoria de design* (o protótipo foi de fato inspecionado e testado
interativamente em sessão anterior) — mas **NÃO é evidência de implementação no Medusa**, apenas
contrato de referência. Ver `CURRENT_STATE.md` para a distinção explícita
`DESIGN = auditado` / `IMPLEMENTATION = próxima etapa`.

---

## E-007 — Este bootstrap não alterou nenhum código de produto

**Comando executado (após criação de todos os arquivos `.ai/**` e do orquestrador):**
```
$ git status --short
?? .ai/
?? scripts/agent-orchestrator.cjs

$ git diff --stat -- src/
(saída vazia)

$ git diff --stat origin/main -- .
(saída vazia — nada rastreado foi modificado; apenas arquivos novos e não rastreados existem)
```
**Conclusão:** confirmado — nenhum arquivo em `src/` (produto) foi tocado nesta sessão de
bootstrap. As únicas adições são `.ai/**` (documentação/protocolo) e
`scripts/agent-orchestrator.cjs` (ferramenta operacional, não código de produto).
**Status:** PROVADO.

---

## E-008 — Teste real do orquestrador (`scripts/agent-orchestrator.cjs`)

**Comando:**
```
$ node -c scripts/agent-orchestrator.cjs
(sem saída — sintaxe válida)

$ node scripts/agent-orchestrator.cjs
[agent-orchestrator] ERRO: ACTIVE_TASK.md declara explicitamente que nenhuma tarefa está ativa.
Promova uma tarefa de TASK_QUEUE.md antes de executar o orquestrador.
(exit code 1)
```
Confirma que o orquestrador recusa executar quando não há tarefa ativa (comportamento correto —
não avança sozinho).

**Segundo teste, com `ACTIVE_TASK.md` temporariamente substituído por um conteúdo sintético
(`TASK-TEST-000`) apenas para exercitar o pipeline, restaurado logo em seguida (`diff` confirmou
restauração byte-a-byte):**
```
$ node scripts/agent-orchestrator.cjs
[agent-orchestrator] tarefa: TASK-TEST-000
[agent-orchestrator] status: BLOQUEADO
[agent-orchestrator] registro salvo em: .ai/runs/2026-09-20T22-55-25-532Z-TASK-TEST-000.json
(exit code 1)
```
Registro salvo (`.ai/runs/2026-09-20T22-55-25-532Z-TASK-TEST-000.json`) confirma: detecção
correta de que `agy` está ausente (`spawnSync agy ENOENT`), nenhum processo externo foi
executado, status `BLOQUEADO` retornado corretamente, exit code não-zero propagado.

**Conclusão:** o orquestrador (1) lê `ACTIVE_TASK.md`, (2) tenta executar o executor configurado,
(3) captura o resultado real (inclusive a ausência do executor), (4) salva em `.ai/runs/`, (5)
retorna exit code coerente, (6) não afirma sucesso quando o executor está indisponível — todos os
requisitos da seção 12 da missão original.

**Status:** PROVADO (o orquestrador em si funciona corretamente dado que `agy` está ausente —
BLOCK-001 continua bloqueando a execução real de qualquer tarefa).

---

## E-009 — Vercel está de fato conectado e funcional (correção de suposição inicial)

**Origem:** comentários automáticos de `vercel[bot]` na PR #3 (`chore/agent-os-bootstrap`),
recebidos via webhook do GitHub após o push da branch de bootstrap.

**Sequência real observada:**
```
issue_comment.created (2026-09-20T22:56:47Z):
  status: "Building" — preview: medusa-git-chore-agent-o-d88df9-...vercel.app

issue_comment.edited (2026-09-20T22:56:55Z):
  status: "Ready" — mesmo preview URL, build concluído com sucesso
```
Projeto Vercel: `medusa` (`prj_Gi26xW28FowLK8PResQOkSgAMSEJ`), time
`abimaelbalbino12-6079s-projects`.

**Correção registrada:** os documentos `CURRENT_STATE.md`, `ARCHITECTURE.md` e `BLOCKERS.md`
inicialmente classificaram Vercel como "NÃO VERIFICÁVEL A PARTIR DO REPOSITÓRIO" — essa era uma
inferência razoável a partir da ausência de `vercel.json`, mas ficou provada **incompleta** assim
que evidência real surgiu (a integração vive na configuração do dashboard/GitHub App do Vercel,
não em um arquivo do repo). Os três documentos foram corrigidos nesta mesma sessão assim que o
fato ficou disponível — nenhuma alegação incorreta foi mantida após a evidência aparecer.

**O que isso NÃO prova:** não há evidência de que Supabase, variáveis de ambiente de produção, ou
qualquer persistência real estejam configuradas — apenas o pipeline de build/preview do Next.js
está confirmado.

**Status:** PROVADO (o pipeline de build/preview do Vercel existe e funciona) — Supabase/produção
continuam **NÃO IMPLEMENTADO** / **NÃO VERIFICÁVEL**, sem mudança nesse ponto.

---

## Índice de tarefas com evidência

| Tarefa | Gates com evidência real | Gates pendentes | Status conforme `QA_GATE.md` |
|---|---|---|---|
| Bootstrap do Agent OS (esta tarefa) | Contract, Plan, Implementation (apenas `.ai/` e script) | Test/Build (N/A — sem código de produto), Browser QA (N/A), Regression (ver E-007) | PARCIAL até E-007 ser confirmado |
| TASK-AGENDA-001 | Contract (E-006), Plan | Implementation, Test, Build, Browser QA, Regression, Evidence | NÃO IMPLEMENTADO |
