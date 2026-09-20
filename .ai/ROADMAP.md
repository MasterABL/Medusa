# ROADMAP.md — Roadmap por Fases com Gate Objetivo

Cada fase percorre obrigatoriamente esta esteira, nesta ordem. Uma fase não pode ser marcada
`PROVADO` sem evidência anexada em `EVIDENCE.md` para cada etapa abaixo.

```
CONTRACT       → o que esta fase faz, definido em PRODUCT_CONTRACT.md / MASTER_PLAN.md
  → PLAN       → tarefa(s) concretas em TASK_QUEUE.md com ACCEPTANCE CRITERIA
  → IMPLEMENTATION → código escrito em branch própria
  → TEST       → typecheck + (quando existir) testes automatizados
  → BUILD      → npm run build sem erro
  → BROWSER QA → execução real em navegador, com screenshot/asserção, não só leitura de código
  → REGRESSION → áreas congeladas (Educação, ShellGeometry) reconfirmadas intactas
  → EVIDENCE   → tudo acima registrado em EVIDENCE.md com comando/arquivo/saída real
  → GATE       → status final: PROVADO / PARCIAL / BLOQUEADO / NÃO IMPLEMENTADO
```

## Fase 1 — Foundation

| Etapa | Status |
|---|---|
| CONTRACT | PROVADO — definido em `ARCHITECTURE.md` |
| PLAN | PROVADO — PR #1 aberto cobre o plano |
| IMPLEMENTATION | PROVADO — código existe em `fix/foundation-hardening` |
| TEST | PARCIAL — `tsc --noEmit` alegado passando pelo autor do PR, não reexecutado nesta sessão |
| BUILD | PARCIAL — alegado, não reexecutado nesta sessão |
| BROWSER QA | PARCIAL — PR alega 42 testes + hardening test 100%, não reproduzido nesta sessão (ver HDR-002) |
| REGRESSION | PARCIAL — PR alega Educação congelada e validada, não reverificado nesta sessão |
| EVIDENCE | BLOQUEADO — nada disso foi re-executado e registrado em `EVIDENCE.md` ainda |
| **GATE** | **PARCIAL** — não mesclado a `main`; evidências alegadas, não reproduzidas |

## Fase 2 — Shell

| Etapa | Status |
|---|---|
| CONTRACT | PROVADO |
| PLAN | PROVADO |
| IMPLEMENTATION | PROVADO — em `main` |
| TEST | PARCIAL — sem suíte formal |
| BUILD | NÃO REEXECUTADO nesta sessão de bootstrap |
| BROWSER QA | PROVADO em auditorias anteriores deste projeto (fora deste bootstrap) |
| REGRESSION | PROVADO em auditorias anteriores |
| EVIDENCE | PARCIAL — evidência existe em relatórios de sessões anteriores, não centralizada em `EVIDENCE.md` até este bootstrap |
| **GATE** | **PROVADO** (baseline, com a ressalva de que o PR #1 é uma correção pendente sobre esta base) |

## Fase 3 — Hoje

Todas as etapas: **NÃO IMPLEMENTADO**. Bloqueado por HDR-006.

## Fase 4 — Agenda

| Etapa | Status |
|---|---|
| CONTRACT | PROVADO — `PRODUCT_CONTRACT.md`, contrato de produto do protótipo auditado |
| PLAN | PROVADO — `TASK-AGENDA-001` criada nesta sessão |
| IMPLEMENTATION | NÃO IMPLEMENTADO |
| TEST | NÃO IMPLEMENTADO |
| BUILD | NÃO IMPLEMENTADO |
| BROWSER QA | NÃO IMPLEMENTADO |
| REGRESSION | NÃO IMPLEMENTADO |
| EVIDENCE | NÃO IMPLEMENTADO |
| **GATE** | **NÃO IMPLEMENTADO** — próxima etapa é a execução de `TASK-AGENDA-001` |

## Fase 5 — Educação

| Etapa | Status |
|---|---|
| CONTRACT | PROVADO |
| PLAN | PROVADO |
| IMPLEMENTATION | PROVADO — em `main`, congelado |
| TEST/BUILD/BROWSER QA/REGRESSION | PROVADO em auditorias anteriores (fora deste bootstrap) |
| EVIDENCE | PARCIAL — não centralizada em `EVIDENCE.md` até este bootstrap |
| **GATE** | **PROVADO** (congelado — não reabrir sem `DECISIONS.md`) |

## Fases 6–14 — Corpo, Finanças, Progresso, Guardian, Buscar, Integrações, Persistência, QA Final, Production Gate

Todas as etapas de todas essas fases: **NÃO IMPLEMENTADO**. Cada uma tem pelo menos um
`HUMAN DECISION REQUIRED` registrado em `DECISIONS.md` antes de poder sair de CONTRACT.
