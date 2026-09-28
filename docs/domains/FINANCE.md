# Domínio Finanças

Código: `src/domains/finance/`. Sem UI. Testes: `scripts/foundation-tests/domains/finance.ts`.

## Responsabilidade

Modelar, calcular e propor — **nunca movimentar dinheiro**. Não existe integração bancária, Open Finance
ou pagamento real. Toda origem de saldo é declarada em `dataSource` (`manual | imported | integration`);
hoje só o caminho `manual` é real.

## Entidades (`model/types.ts`)

`FinancialAccount`, `Transaction` (valor sempre positivo; o sinal vem de `type`: `income | expense | transfer`),
`Category` (hierárquica via `parentId`), `Budget`, `RecurringCommitment`, `FinancialGoal`, `Projection`.
`BudgetConsumption` é **derivado** (consumido/restante/percentual/estado) e nunca persistido.
`FinancialGoal.currentAmount` é sempre recalculado a partir de `contributions`.

## Engines (`services/`)

| Engine | O que calcula | Observação |
|---|---|---|
| `cashflowEngine` | entradas, saídas, fluxo líquido, por conta | transferência não conta como entrada nem saída |
| `categoryEngine` | totais por categoria, `detectCategorySpike` | |
| `budgetEngine` | consumo, restante, `proximo_do_limite` (>= 80%), `estourado` | derivado |
| `recurrenceHeuristic` | candidatos a recorrência | **heurística, não IA** — devolve intervalo observado, consistência e confiança `baixa/moderada/alta` |
| `recurringCommitmentEngine` | próxima ocorrência, dias até vencer | mensal/semanal/anual, respeita `endDate` |
| `projectionEngine` | saldo projetado mês a mês | separa `observedBalance` de `projectedBalance` |
| `goalEngine` | progresso, marcos, ritmo (`evaluateGoalTrack`) | |
| `insightsEngine` | 6 tipos + `insufficient_evidence` | nunca inventa evidência |

**Limitação conhecida:** `api.getInsights` usa `total * 0.5` como "média histórica" para detectar pico de
categoria, porque ainda não existe janela multi-mês real. Está comentado no código como best-effort.

## Eventos (`events/types.ts`)

`TRANSACTION_CREATED`, `TRANSACTION_UPDATED`, `BUDGET_THRESHOLD_REACHED`, `PAYMENT_DUE_SOON`,
`PROJECTION_UPDATED`, `GOAL_PROGRESS_CHANGED`. **Emitidos de verdade:** `createTransaction`
(`TRANSACTION_CREATED`, e `BUDGET_THRESHOLD_REACHED` só na *travessia* de 80% ou 100%, nunca a cada transação
seguinte), `createFinancialReminder` (`PAYMENT_DUE_SOON`), `createProjection` (`PROJECTION_UPDATED`),
`contributeToGoal` (`GOAL_PROGRESS_CHANGED`). `TRANSACTION_UPDATED` é só tipo declarado (não há caso de uso de
edição de transação; `categorizeTransaction` altera a categoria sem emitir evento).

## Ações e Guardian

| Ação | Teto | Executa? |
|---|---|---|
| `CATEGORIZE_TRANSACTION`, `CREATE_BUDGET`, `CREATE_FINANCIAL_REMINDER`, `LINK_RECURRING_COMMITMENT`, `UPDATE_GOAL`, `CREATE_PROJECTION` | L1 | só com confiança acumulada; senão vira L2 |
| `ADJUST_BUDGET` | L2 | sempre proposta |
| `EXECUTE_PAYMENT`, `TRANSFER_FUNDS` | L3 | **nunca** — `executeFinanceAction` lança `FinanceExecutionError` mesmo se aprovada |

Fluxo: `insight → proposed action → Guardian → autorização → executor do domínio`.

## Agenda e Hoje

`adapters/agendaAdapter.ts` só monta um `AgendaSchedulingRequest` (`title/date/agendaDomain/source/description`,
com `finance` / `finance_deadline` / `sourceId`). A Agenda não recebe nenhum cálculo financeiro.
`adapters/hojeResolver.ts` devolve **uma** frase compacta do insight mais grave.

## Persistência

`FinanceRepository` (interface) + `createInMemoryFinanceRepository()`. O domínio não conhece localStorage,
React nem banco. `serialization.ts` faz roundtrip com envelope versionado e validação na volta.

## Fixtures

`fixtures/` — todo nome traz o sufixo `(fixture)`. Nunca usar como dado real.
