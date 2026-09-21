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

## Handoff histórico — TASK-CI-001 (concluída — PROVADO, ver EVIDENCE.md → E-023)

```
TASK ID: TASK-CI-001

WHY:
QA_GATE.md já mandata Test Gate (typecheck) e Build Gate (build) em toda tarefa, hoje executados
manualmente por Claude ou por um humano. Automatizar isso em CI reduz risco de esquecimento e dá
sinal objetivo em cada PR. Classificado via HUMAN GATE ANALYSIS (DECISIONS.md → D-011) como
escolha técnica normal, não decisão humana — não há provedor externo, custo, ou mudança de escopo
de produto envolvidos.

CURRENT STATE:
Nenhum workflow de GitHub Actions existe (.github/ não existia). package.json tem os scripts
`typecheck` e `build` prontos para uso direto num workflow. `npm run lint` existe no
package.json mas NÃO é utilizável em automação hoje — ESLint nunca foi inicializado neste repo
(pede setup interativo); ver BLOCKERS.md → BLOCK-007. Por isso lint fica fora do escopo.

EXACT SCOPE:
Criar .github/workflows/ci.yml disparado em pull_request contra main, rodando checkout,
setup-node, npm ci, npm run typecheck, npm run build. Nada além disso — sem lint.

FILES:
.github/workflows/ci.yml (novo, único arquivo).

ARCHITECTURAL RULES:
Nenhuma permissão de workflow além do mínimo de leitura do repositório. Nenhum segredo novo.

DO NOT TOUCH:
Todo src/**. Nenhum passo de deploy (Vercel já cobre isso). Nenhum segredo/variável de ambiente.

ACCEPTANCE CRITERIA:
Ver TASK_QUEUE.md → TASK-CI-001 → ACCEPTANCE CRITERIA (4 itens).

TEST COMMANDS:
O próprio workflow rodando com sucesso numa PR real é o teste.

BROWSER QA: N/A.

EXPECTED OUTPUT:
.github/workflows/ci.yml criado, commitado, empurrado, e rodando com sucesso em pelo menos uma PR
real (a própria PR #3 deste protocolo serve). Link do run registrado em EVIDENCE.md.
```

**Nota de execução**: `agy` inalcançável nesta sessão (mesmo motivo documentado em BLOCKERS.md →
BLOCK-001). Fallback Claude direto assume esta tarefa por ser pequena e bem definida.

---

## Handoff histórico — TASK-MERGE-PREP-001 (concluída — ver TASK_QUEUE.md)

```
TASK ID: TASK-MERGE-PREP-001

WHY:
As PRs #1 e #2 já têm implementação real e auditada (EVIDENCE.md → E-013 a E-019), mas suas
descrições no GitHub contêm números imprecisos ("42 testes"/"30/30") que precisam ser corrigidos
antes que um humano tome as decisões de merge (HDR-001, HDR-003, HDR-010) com informação precisa.

CURRENT STATE:
PR #1 (fix/foundation-hardening) e PR #2 (feature/agenda) abertas, não mescladas. PR #2 contém os
commits de PR #1 (dependência técnica confirmada, DECISIONS.md → D-008). Reexecução real de
tsc/build/QA feita na sessão anterior em worktree isolado — nenhum código foi alterado por essa
auditoria.

EXACT SCOPE:
Editar a descrição de PR #1 e PR #2 no GitHub para refletir os números reais (ver
TASK_QUEUE.md → TASK-MERGE-PREP-001 → SCOPE na íntegra). Nenhuma mudança de código.

FILES:
Nenhum arquivo de código-fonte. Apenas texto de descrição das PRs via GitHub.

ARCHITECTURAL RULES:
N/A — esta tarefa não escreve código.

DO NOT TOUCH:
Todo src/** (esta tarefa não deve tocar nenhum arquivo de produto). Não mesclar nenhuma PR (merge
é HDR-001, decisão humana).

ACCEPTANCE CRITERIA:
Ver TASK_QUEUE.md → TASK-MERGE-PREP-001 → ACCEPTANCE CRITERIA (3 itens).

TEST COMMANDS: N/A.

BROWSER QA: N/A.

EXPECTED OUTPUT:
Descrições de PR #1 e PR #2 atualizadas com números reais, registrado em EVIDENCE.md.
```

**Nota de execução**: `agy` está indisponível **nesta sessão** (container remoto isolado; o
usuário reporta `agy` funcional numa máquina Windows separada, mas essa instalação não é
alcançável daqui — ver `BLOCKERS.md` → BLOCK-001). Por `AGENT_RULES.md` → seção 7, o executor de
fallback (Claude direto) assume esta tarefa. `scripts/agent-orchestrator.cjs` foi executado e
confirmou exit 2 (`FALLBACK: CLAUDE_DIRECT`) antes desta execução direta — ver `EVIDENCE.md`.

---

## Rascunho histórico de handoff para TASK-AGENDA-001 (implementação já existe — ver EVIDENCE.md)

Preservado como referência do contrato original, não como uma tarefa ainda pendente de execução.

```
TASK ID: TASK-AGENDA-001

WHY:
A Agenda é o domínio temporal do Medusa. Já implementada (PR #2), auditada de verdade nesta
sessão anterior.

CURRENT STATE:
Implementação completa existe em feature/agenda (24 arquivos), não mesclada. Ver CURRENT_STATE.md.

EXACT SCOPE / FILES / ARCHITECTURAL RULES / DO NOT TOUCH / ACCEPTANCE CRITERIA:
Ver TASK_QUEUE.md → TASK-AGENDA-001 (status real por critério já preenchido).

TEST COMMANDS:
npx tsc --noEmit / npm run build — já executados de verdade, ver EVIDENCE.md → E-014.

BROWSER QA:
node scripts/qa-agenda.js — já executado de verdade, ver EVIDENCE.md → E-017.

EXPECTED OUTPUT:
Já entregue e auditado — ver EVIDENCE.md → E-013 a E-019. O que falta é merge (HDR-001) e
ratificação (HDR-003), não implementação.
```
