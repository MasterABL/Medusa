# ROADMAP.md — Roadmap por Fases com Gate Objetivo

Cada fase percorre obrigatoriamente esta esteira, nesta ordem. Uma fase não pode ser marcada
`PROVADO` sem evidência anexada em `EVIDENCE.md` para cada etapa abaixo. **Merge Gate é distinto de
Implementation Gate** (ver `DECISIONS.md` → D-007): uma fase pode ter Implementation/Test/Build/
Browser QA todos `PROVADO` num branch/PR e ainda não estar em `main`.

```
CONTRACT        → o que esta fase faz, definido em PRODUCT_CONTRACT.md / MASTER_PLAN.md
  → PLAN        → tarefa(s) concretas em TASK_QUEUE.md com ACCEPTANCE CRITERIA
  → IMPLEMENTATION → código escrito em branch própria
  → TEST        → typecheck + (quando existir) testes automatizados
  → BUILD       → npm run build sem erro
  → BROWSER QA  → execução real em navegador, com screenshot/asserção, não só leitura de código
  → REGRESSION  → áreas congeladas reconfirmadas intactas
  → EVIDENCE    → tudo acima registrado em EVIDENCE.md com comando/arquivo/saída real
  → REVIEW/AUDIT → Claude (ou humano) audita o diff contra QA_GATE.md e ACCEPTANCE CRITERIA
  → MERGE       → PR mesclado em main (nunca automático — decisão humana, AGENT_RULES.md → Git)
  → CLOSED GATE → status final pós-merge: PROVADO / PARCIAL / BLOQUEADO / NÃO IMPLEMENTADO
```

A numeração de gate abaixo é **idêntica** à numeração de fase em `MASTER_PLAN.md` — Gate N = fase N.

## Grafo de dependências (fases)

```
FASE 0 (Agent OS)
  ↓
FASE 1 (Foundation/Shell Closure)
  ├──→ FASE 2 (Auth/Identity)
  │      ↓ (só bloqueia Persistence Slice, não UI/Local State — ver MASTER_PLAN.md)
  ├──→ FASE 3 (Agenda) ─────────────┐
  ├──→ FASE 4 (Educação)            │
  ├──→ FASE 5a (Hoje Foundation)    │
  ├──→ FASE 9 (Guardian) [independente da cadeia de domínios abaixo]
  │                                  ↓
  │                          FASE 5b (Hoje Integration) — consome 3, 4, 6, 7, 8
  ├──→ FASE 6 (Corpo) ──┐
  ├──→ FASE 7 (Finanças) ┤ (6 e 7 são paralelizáveis entre si)
  │                       ↓
  │                  FASE 8 (Progresso) — deriva de 3/4/6/7
  │                       ↓
  │                  FASE 10 (Buscar) — indexa 3/4/6/7/8
  │                       ↓
  │                  FASE 11 (Cross-Domain Integration)
  │                       ↓
  │                  FASE 12 (Persistence/Data Hardening global)
  │                       ↓
  │                  FASE 13 (Intelligence/Automation)
  │                       ↓
  └──────────────────FASE 14 (Final QA/Production Gate)
```

**Qual tarefa está desbloqueada agora?** Uma tarefa está desbloqueada quando todas as fases na
coluna "Depende de" do `MASTER_PLAN.md` estão com Contract+Foundation resolvidos E nenhum
`HUMAN DECISION REQUIRED` relacionado segue pendente. Ver `TASK_QUEUE.md` para o cálculo atual.

## FASE 0 — Agent Operating System

| Etapa | Status |
|---|---|
| CONTRACT → EVIDENCE | PROVADO — `.ai/` completo, `scripts/agent-orchestrator.cjs` testado |
| REVIEW/AUDIT | PROVADO — autoauditado neste mesmo processo |
| MERGE | BLOQUEADO — PR #3 (draft) aberto, não mesclado |
| **GATE** | **PROVADO** (protocolo funcional) — Merge pendente não impede uso do protocolo |

## FASE 1 — Foundation / Shell Closure

| Etapa | Status |
|---|---|
| CONTRACT | PROVADO — `ARCHITECTURE.md` |
| PLAN | PROVADO — PR #1 cobre o plano |
| IMPLEMENTATION | PROVADO — código em `fix/foundation-hardening` |
| TEST | **PROVADO — reexecutado de verdade nesta sessão** (`npx tsc --noEmit`, 0 erros) |
| BUILD | **PROVADO — reexecutado de verdade** (`npm run build`, verde) |
| BROWSER QA | **PROVADO — reexecutado de verdade** (`test-foundation-hardening.js` 13/13; `qa-browser.js` 23/23 asserções, 0 falha real) |
| REGRESSION | PROVADO — asserções de Educação incluídas em `qa-browser.js` passaram |
| EVIDENCE | PROVADO — `EVIDENCE.md` → E-014, E-015, E-016 |
| REVIEW/AUDIT | PARCIAL — Claude auditou tecnicamente; falta ratificação humana de HDR-010 (Educação bundled) |
| MERGE | **BLOQUEADO** — não mesclado, aguardando HDR-001 |
| **GATE** | **PROVADO tecnicamente, BLOQUEADO para fechamento** (merge pendente) |

## FASE 2 — Auth / Identity

Todas as etapas: **NÃO IMPLEMENTADO**. Bloqueado por HDR-011 (escolha de provedor).

## FASE 3 — Agenda / Temporal OS

| Etapa | Status |
|---|---|
| CONTRACT | PROVADO — `PRODUCT_CONTRACT.md` + auditoria do protótipo Figma Make |
| PLAN | PROVADO — `TASK-AGENDA-001` |
| IMPLEMENTATION | PROVADO — PR #2 (`feature/agenda`) |
| TEST | **PROVADO — reexecutado** (0 erros de typecheck) |
| BUILD | **PROVADO — reexecutado** (build verde) |
| BROWSER QA | **PROVADO — reexecutado** (`qa-agenda.js` 29/30; a 1 falha é ambiental, não funcional — `BLOCKERS.md` → BLOCK-005) |
| REGRESSION | PROVADO — Educação confirmada intacta pelo mesmo `qa-agenda.js`/`qa-browser.js` |
| EVIDENCE | PROVADO — `EVIDENCE.md` → E-014, E-017, E-018 |
| REVIEW/AUDIT | PARCIAL — falta ratificação humana de HDR-003 (agrupamento da List View) |
| MERGE | **BLOQUEADO** — depende de Fase 1 mesclar primeiro (D-008) |
| **GATE** | **PROVADO tecnicamente, BLOQUEADO para fechamento** (merge + ratificação pendentes) |

## FASE 4 — Education Stabilization / Integration Contract

| Etapa | Status |
|---|---|
| CONTRACT | PARCIAL — expansão multi-trilha implementada sem contrato prévio registrado |
| IMPLEMENTATION | PROVADO — commit `e616635`, dentro de PR #1/#2 |
| TEST/BUILD/BROWSER QA | PROVADO — cobertos pela mesma reexecução de `qa-browser.js` |
| REVIEW/AUDIT | **BLOQUEADO** — tocou área congelada sem decisão prévia (HDR-010) |
| MERGE | BLOQUEADO — mesma dependência de Fase 1 |
| **GATE** | **PROVADO tecnicamente, BLOQUEADO na governança** (HDR-010 precisa ser resolvido antes do merge) |

## FASE 5 — Hoje (Foundation + Integration)

Todas as etapas: **NÃO IMPLEMENTADO**. 5a (Foundation) desbloqueada assim que Fase 1 mesclar; 5b
(Integration) parcialmente bloqueada por HDR-006 (shape do contrato de consumo).

## FASES 6-13 — Corpo, Finanças, Progresso, Guardian, Buscar, Integração, Persistência, Intelligence

Todas as etapas de todas essas fases: **NÃO IMPLEMENTADO**. Cada uma tem pelo menos um
`HUMAN DECISION REQUIRED` registrado em `DECISIONS.md` antes de poder sair de CONTRACT. Guardian
(Fase 9) é a exceção de dependência — pode iniciar seu CONTRACT assim que Fase 1 mesclar, sem
esperar Corpo/Finanças/Progresso/Buscar.

## FASE 14 — Final QA / Production Gate

Todas as etapas: **NÃO IMPLEMENTADO** como processo global agregado — mas os gates individuais por
tarefa (`QA_GATE.md`) já são aplicados a cada fase acima, então parte do trabalho de Fase 14 já
está sendo feito continuamente, não é um esforço do zero no fim.
