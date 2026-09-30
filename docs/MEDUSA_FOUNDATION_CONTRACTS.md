# MEDUSA — Foundation Round: contratos de domínio, estados de dado e adapters

Esta rodada prepara a base técnica (arquitetura → dados → contratos → estados → adapters → regras → testabilidade) para que as telas aprovadas do Stitch possam ser implementadas depois **sem reorganizar arquitetura**. Não há nenhuma tela, layout, componente visual, cor, animação ou placeholder de UI neste PR.

> Regra que guiou tudo: **dados e domínio não dependem da composição visual.** O mesmo contrato alimenta qualquer composição (ex.: um `WorkoutView` serve tanto a "Sessão Cinética" quanto ao "Ritmo Biológico").

---

## A. Baseline

| Item | Valor |
|---|---|
| Repositório | `MasterABL/medusa` |
| Branch | `feat/foundation-domain-contracts` |
| Base | `cfbb0ab` (PR de domínios — `claude/domain-buildout-finance-body-guardian-spiritual`) |
| Árvore de trabalho ao começar | limpa; nenhum checkout destrutivo, reset ou descarte |
| `main` | não tocada |

**Por que essa base e não `main`:** a camada `src/foundation` + `src/domains` (EventBus, ActionBus, Guardian, repositórios, use cases) só existe nessa linha; partir de `main` obrigaria a recriá-la. **Por que não a branch de UI (`claude/domain-ui-implementation`):** ela contém telas; este PR é só Foundation.

**Trabalho paralelo respeitado (não sobrescrito nem alterado):**
- `feat/agenda-temporal-os`, `feat/agenda-experience-complete`, `feat/agenda-conflicts-experience` — UI/tipos da Agenda. **Zero arquivos de `src/types/`, `src/components/`, `src/context/`, `src/app/` foram alterados** (verificado por diff). `agendaHelpers.ts` e `src/types/agenda.ts` são usados como referência e em teste de paridade, nunca editados.
- `claude/domain-ui-implementation` (PR de UI) — intocada.

---

## B. Arquitetura reaproveitada (auditoria antes de criar)

Pergunta aplicada a cada item: *"isso já existe em outra parte do Medusa?"*

| Necessidade | Já existia → decisão |
|---|---|
| Padrão `model/ repository/ services/ useCases/ adapters/ fixtures/` por domínio | **Reusado**: todo arquivo novo segue o mesmo layout |
| Repositório por interface + fábrica em memória | **Reusado** (mesmo padrão; interfaces novas são *separadas* pra não quebrar implementadores) |
| EventBus com `dedupeKey` e `correlationId` | **Reusado** — dedup não foi reimplementado |
| ActionBus / Policy / Trust / Approval / AuditLog / Lifecycle | **Reusados** sem alterar comportamento |
| Cooldown (achado/ação) e retry | **Reusado** (`guardian-runtime`); só se prova que entram na mesma trilha |
| `RecurringCommitment` (conta fixa) | **Reusado** — "contas fixas" do legado mapeiam pra ele |
| Conflito/tempo livre da Agenda | **Reusado como referência**; o domínio novo prova paridade por teste |
| `GUILT_WORDS` (linguagem sem culpa do Espiritual) | **Reusado** no teste de mensagens de presença |
| Modelo de autonomia L1/L2/L3 | **Reusado**; nenhum nível novo |
| `BodySession` (slot planejado) | **Mantido**; execução de treino ganhou nome próprio (`WorkoutSession`) p/ não colidir |
| Estado de dado (loading/empty/erro…) | **Não existia** em lugar nenhum → criado (`DataState<T>`) |
| Fatura, parcelas, Tenho/Comprometido/Livre, duplicidade, sync | **Não existia** em `src/` → criado (conhecimento vem do MINHA-VIDA) |
| Memorização SM-2, gratidão, histórico, presença | **Não existia** → criado |
| Contexto da decisão, resultado observado, feedback, grant, trilha causal, Action Center | **Não existia** (só pedaços soltos) → criado como *leitura que costura* o que já existe |
| Deslocamento/buffer como intervalos, política de prioridade explícita | **Não existia** → criado |

**Mudanças em código pré-existente (todas aditivas e opcionais):**
- `Action` ganhou `correlationId?` e `sourceEventId?` (e `createAction` os aceita). Sem eles, nada muda.
- `Transaction` ganhou `externalId?`, `installment?`, `invoiceMonth?`; `FinancialAccount` ganhou `cardCycle?`.
- Barrels (`index.ts`) ganharam exports novos.

**MINHA-VIDA como inventário, não como fonte de código:** nenhum layout, componente Svelte, hack ou arquitetura foi copiado. Extraiu-se *conhecimento de produto* (regras, bugs já pagos, formatos de dado) e ele foi re-expresso em vocabulário Medusa.

---

## C. Contratos

**Procedência:** `MINHA-VIDA` (conhecimento importado) · `MEDUSA` (já existia, evoluído/consumido) · `NOVA` (não existia em nenhum dos dois).

### Transversal

| Contrato | Domínio | Fonte | Estado |
|---|---|---|---|
| `DataState<T>` (9 estados) + construtores/leitores (`ready`, `partial`, `combine`, `dataOf`, `needsCaveat`, `describe`…) | todos | NOVA | PROVADO |
| `DataOrigin` (`real` \| `fixture` \| `derived` \| `manual`) | todos | NOVA | PROVADO — fixture "contamina" qualquer combinação |

### Corpo

| Contrato | Fonte | Estado |
|---|---|---|
| `WorkoutSheet` / `SheetExercise` / `RepsSpec` (reps em texto livre, faixa só quando legível) | MINHA-VIDA (treino A/B) | PROVADO |
| `LoadEntry` + `LoadProgression` (atual, anterior, tendência, delta; uma carga por exercício/dia) | MINHA-VIDA | PROVADO |
| `WorkoutSession` + `WorkoutView` ("o que estou fazendo agora?": ficha, exercício atual, posição, série atual/planejadas, reps, carga atual/anterior, descanso, exercício anterior/próximo) | NOVA (regra de carga: MINHA-VIDA) | PROVADO |
| `BodyMetricEntry` + `MetricWindowSummary` (sono em horas, passos, calorias, peso, duração; lacuna ≠ zero) | MINHA-VIDA (`corpo_registros`) | PROVADO |
| `BodyTrainingRepository` (+ em memória) | MEDUSA (padrão) | PROVADO |
| Rotina/horários de treino | **MEDUSA já tinha** (`BodyPlan`/`BodySession`/`profile.availabilityWindows`) — nada novo | REUSADO |

Não existe HRV, REM, sono profundo, SNC, biofeedback, vagal ou qualquer sensor. `frequencia_cardiaca_media` do legado **não** foi importada (integração bloqueada na origem).

### Finanças

| Contrato | Fonte | Estado |
|---|---|---|
| `FinanceSnapshot` — **Tenho / Comprometido / Livre / Sustento** com fórmulas documentadas | NOVA | PROVADO |
| `CardInvoice` / `InvoiceLine` (à vista vs parcelada vs projetada; mês da fatura; estorno abate) | MINHA-VIDA (bugs reais de fatura) | PROVADO |
| `ObligationItem` / vencimentos (fatura, conta fixa não acertada, pendente) | NOVA (conta fixa: MEDUSA `RecurringCommitment`) | PROVADO |
| `DuplicateGroup` (sugere, nunca apaga; confiança alta/média) | MINHA-VIDA (manual + Open Finance) | PROVADO |
| `OpenFinanceSyncState` → `DataState` (sem conexão, não autorizado, erro, velho, parcial, ok) | MINHA-VIDA (Pluggy) | PROVADO |
| `ProjectionWithAssumptions` (sempre `kind: 'estimativa'`, com premissas e confiança) | NOVA (reusa `computeNextOccurrence`) | PROVADO |
| Contas, transações, categorias, metas, orçamento | MEDUSA (já existia) | REUSADO |
| Carteira de investimentos | — | **NÃO IMPLEMENTADO** (fora de escopo: `investido` só aparece como valor à parte, sem tratar ativos) |

### Espiritual

| Contrato | Fonte | Estado |
|---|---|---|
| `ScriptureMemoryCard` / `SrsState` / `MemoryReviewLog` (SM-2; só referência, nunca texto bíblico) | MINHA-VIDA (memorização), algoritmo próprio | PROVADO |
| `GratitudeEntry` + `GratitudeMetadata` (privada; só metadado sai) | MINHA-VIDA | PROVADO |
| `SpiritualHistoryItem` (linha do tempo unificada, sem conteúdo privado) | NOVA | PROVADO |
| `PresenceSummary` (continuidade **sem** streak/XP/nível/selo/ranking/recompensa) | NOVA (decisão de produto) | PROVADO — teste trava a ausência desses campos |
| `SpiritualDayFlow` (presença → versículo → leitura → prática → memória → continuidade) | NOVA | PROVADO |
| Versículo do dia, Bíblia, plano de leitura, estudo, prática, propósito | MEDUSA (já existia) | REUSADO |

### Guardian

| Contrato | Fonte | Estado |
|---|---|---|
| `Action.correlationId` / `sourceEventId` (cadeia causal) | MEDUSA evoluído | PROVADO |
| `DecisionContextRecord` (com base em quê decidiu; sem conteúdo privado por limite de tamanho) | NOVA | PROVADO |
| `ActionOutcome` (`efeito_confirmado` / `sem_efeito` / `falhou` / `nao_verificavel`) | MINHA-VIDA (outcomes) | PROVADO |
| `ActionFeedback` (explícito/implícito + regra de quando vira confiança) | MINHA-VIDA, regra MEDUSA | PROVADO |
| `AutonomyGrant` (modelo + leitura; **não ligado** ao `classify`) | MINHA-VIDA (grants) | PARCIAL — ver F |
| `CausalTrace` + `verifyTraceIntegrity` (10 estágios + violações) | NOVA | PROVADO |
| `ActionCenterView` (pendentes, autonomia recente, histórico, linhas de autonomia) | NOVA | PROVADO |
| Policy, Trust, Approval, Audit, Lifecycle, dedup, cooldown | MEDUSA | REUSADO |
| Execuções legadas (`agent_action_executions`) → Medusa | MINHA-VIDA | PROVADO (ver armadilha abaixo) |

### Agenda

| Contrato | Fonte | Estado |
|---|---|---|
| `TimelineEntry` (evento, rotina, **deslocamento**, **buffer** como intervalos) | NOVA | PROVADO |
| `TemporalConflict` (hard/soft + resolução sugerida) | MEDUSA (detecção) + NOVA (resolução) | PROVADO — paridade com `detectTimeConflicts` |
| `PriorityPolicy` (work > personal > body > finance > education > external) | MEDUSA (ordem já usada p/ colunas) | PROVADO — paridade com `layoutConflictColumns` |
| `FreeSlot` / `suggestSlots` (deslocamento e buffer descontados) | MEDUSA (cálculo) + NOVA | PROVADO — paridade com `calculateFreeTimeSlots` |
| `RoutineBlock` + rotina fixa do legado | MINHA-VIDA | PROVADO |
| `AgendaContextSnapshot` (atual, próximo, folga real até o próximo) | NOVA | PROVADO |
| `AgendaSource` (fronteira de dados) | MEDUSA (padrão) | PROVADO |

---

## D. Serviços, seletores e adapters

UI → **seletor** (`selectX` → `DataState<...>`) → **serviço/repositório** → **fonte**. Componentes não devem conhecer Supabase, APIs, localStorage, Open Finance, fixtures ou legado.

| Domínio | Seletores | Serviços | Adapters (MINHA-VIDA, tradução pura de linhas) |
|---|---|---|---|
| Corpo | `selectWorkoutView`, `selectMetrics` | `sessionEngine`, `progressionEngine`, `metricsEngine` | `mapSheets`, `mapLoads`, `mapMetrics` |
| Finanças | `selectFinanceSnapshot`, `selectProjection`, `selectInvoices`, `selectDuplicates` | `snapshotEngine`, `invoiceEngine`, `obligations`, `runwayProjection`, `duplicateDetection`, `syncState` | `mapAccount`, `mapTransaction`, `mapFixedBill` |
| Espiritual | `selectMemoryQueue`, `selectHistory`, `selectPresence`, `selectDayFlow` | `memorySrs`, `presence` | `mapGratitude`, `mapMemoryCards`, `readLegacyReference` |
| Guardian | `selectActionCenter` | `causalTrace`, `outcome`, `feedback`, `grant`, `decisionContext`, `actionCenter` | `mapExecution`, `legacyLevelToMedusa` |
| Agenda | `selectDay`, `selectTimeline`, `selectContext`, `selectSlotSuggestions` | `timeline`, `conflicts`, `freeTime`, `time` | `mapRoutine` |

Adapters **não abrem conexão** nem escrevem: a leitura real (ex.: Supabase) fica para uma camada de infraestrutura que implementa as interfaces `*Repository`/`AgendaSource` — e ainda não existe aqui (ver F).

**Fixtures:** só em `*/fixtures/` (já existentes) e nos testes; repositórios aceitam `origin: 'fixture'`, que viaja até o `DataState` e nunca vira "real".

---

## E. Regras protegidas por teste

`npm run test:all` — `test:domains` **676 checagens**, 0 falhas (373 existentes + **303 novas** em 7 suítes: data-state 21, body-foundation 47, finance-foundation 68, spiritual-foundation 40, guardian-foundation 44, agenda-foundation 42, legacy-adapters 41); `test:foundation` 64/64.

**Finanças**
- Tenho soma só corrente/poupança/dinheiro ativos; cartão, investimento, outra moeda e inativa ficam fora, cada um com motivo.
- Fatura = transações (nunca o saldo do cartão); mês da fatura da fonte vence o cálculo local; sem fechamento → aproximado e declarado; estorno abate.
- Parcelas nunca contadas em dobro (só a mais avançada da série projeta); valor da parcela não é dividido de novo.
- Comprometido = faturas na janela + contas fixas não acertadas + pendentes; conta já paga não recai; fatura vencida tratada como paga (premissa declarada).
- Livre negativo **não é truncado**; Sustento só existe com ≥ 7 dias de dados, Livre > 0 e gasto observado; confiança cai com lacunas.
- Projeção é sempre `estimativa` com premissas; horizonte longo derruba a confiança.
- Dados ausentes: sem contas → `empty`; sem contas fixas → `partial` dizendo isso; fixture nunca vira real.
- Duplicidade: parcelas diferentes, valores/contas diferentes e canceladas nunca agrupam; só sugere.

**Corpo**
- Carga atual = mais recente; anterior = imediatamente anterior; mesmo dia corrige (não cria ponto falso); uma só entrada = `sem_base`.
- Sessão: ordem da ficha por `order`; série atual; descanso calculado a partir da série que acabou de ser feita; exercício anterior/próximo; conclusão automática; imutabilidade.
- Métricas: média só sobre dias com dado (lacuna ≠ zero), dias faltantes listados.

**Espiritual**
- SM-2: 1 → 6 → `round(intervalo × EF')`; "errei" zera repetições e vence amanhã sem resetar o EF; EF ≥ 1.3.
- Presença não tem streak/pontos/nível/selo/ranking/recompensa; nenhuma mensagem usa `GUILT_WORDS`.
- Histórico e gratidão **nunca** expõem conteúdo privado em nenhum campo.

**Guardian**
- Cadeia completa de 10 estágios ligada por `correlationId`; executar ação que exigia aprovação sem aprovação é **violação** detectada; execução sem resultado é **aviso**.
- Feedback implícito positivo **não** vira confiança; explícito positivo em ação já aprovada não conta duas vezes; feedback negativo repetido derruba a autonomia seguinte.
- `nao_verificavel` nunca é sucesso; `efeito_confirmado` exige evidência.
- Grant em regra de teto L2/L3 é inerte; grant vencido/revogado não vale.
- Dedup (EventBus) e cooldown (runtime) entram na mesma trilha — sem sistema paralelo.

**Agenda**
- Paridade exata com `calculateFreeTimeSlots`, `detectTimeConflicts` e a ordem de prioridade de `layoutConflictColumns`.
- **Trabalho vence estudo/inglês** em conflito; fixo vence flexível; empate determinístico.
- Deslocamento ocupa tempo (nunca livre); buffer não some do tempo livre; invadir buffer é conflito `soft`.
- Item inválido vira `issue` com motivo (dia fica `partial`), nunca descartado em silêncio.

**Adapters**
- Reps "FALHA" não ganha número; carga corrompida não vira 0 kg; cartão sem ciclo fica sem ciclo; referência bíblica ilegível não é chutada; marcos sem fim (acordar) não ocupam tempo; **L3 legado ≠ L3 Medusa** (ver abaixo).

---

## F. O que NÃO foi tocado

- **Nenhuma tela final dos cinco domínios foi implementada.** Nada em `src/components/`, `src/app/`, `src/context/` ou `src/types/` foi alterado (diff = 0 linhas).
- **O Stitch não foi alterado** (nem projeto, nem design system). Nenhum layout, composição, componente, paleta ou animação foi escolhido.
- **Os cinco domínios aguardam aprovação visual do Anti** (Espiritual, Finanças, Corpo, Guardian, Agenda — 2 modelos cada).
- Nenhum dado inventado, nenhuma integração falsa, nenhuma métrica fabricada do Guardian, nenhuma carteira de investimentos.
- **Não feito (decisões do dono / infraestrutura):**
  1. **Grant → `policy.classify()`**: ligar permissão explícita à política *muda a autonomia do produto*. Só o modelo e a leitura existem; é decisão do dono.
  2. **Camada de leitura real** (Supabase/Pluggy → `*Repository`): as interfaces estão prontas e os adapters traduzem as linhas, mas quem lê o banco ainda não existe no Medusa.
  3. **Fórmulas do Comprometido/Livre/Sustento** (janela de 30 dias, regime de caixa, "fatura vencida = paga") são uma proposta justificada, não validada pelo dono.
  4. **Memorização SM-2** recomeça do zero ao importar (o legado usava escada fixa 1/3/7/14/30 e não mediu facilidade).

**Achados durante a rodada (sem alterar código alheio):**
- `detectTimeConflicts` da Agenda **não filtra itens `cancelled`** (o domínio novo filtra). Registrado para o responsável pela Agenda.
- `projectCashflow` (Finanças, existente) **não conhece acerto**: contaria de novo uma conta já paga no mês. Não foi modificado; a projeção nova calcula por conta própria e o teste cobre o caso.
- Bug real encontrado pelo cenário legado: janela de Comprometido com fim inclusivo contava a mesma conta mensal duas vezes (vence hoje e daqui a 30 dias) — corrigido e coberto (`3.11b`).
- **Armadilha de vocabulário:** no MINHA-VIDA "L3" é a autonomia *máxima* (roda sozinho); no Medusa "L3" é *alto impacto, sempre com aprovação*. O adapter traduz pelo significado (`auto_l3` → L1 do Medusa), e nada é importado como L3.

---

## G. QA

| Verificação | Resultado | Classe |
|---|---|---|
| `npm run typecheck` | sem erros | PROVADO |
| `npm run build` | compila; rotas inalteradas | PROVADO |
| `npm run lint` | 0 erros; 10 avisos **pré-existentes** em 7 arquivos que este PR não toca (`layout.tsx`, `EventBlock.tsx`, `EventListItem.tsx`, `TutorDrawer.tsx`, `DynamicIsland.tsx`, `MobileIsland.tsx`, `AgendaContext.tsx`) | PROVADO |
| `npm run test:foundation` | 64/64 | PROVADO |
| `npm run test:domains` | 676/676 | PROVADO |
| Paridade com helpers da Agenda | 3 comparações (livre, conflito, prioridade), 6 cenários | PROVADO |
| Adapters contra linhas legadas | 41 checagens, inclusive pipeline legado → snapshot | PROVADO |
| Seletores → `DataState` | todos os 9 estados alcançáveis | PROVADO |
| Grant ligado à política | não ligado (decisão do dono) | PARCIAL |
| Leitura real de banco/Open Finance | não existe nesta camada | NÃO IMPLEMENTADO |
| Telas dos cinco domínios | aguardam aprovação visual | NÃO IMPLEMENTADO (por desenho) |
| Validação contra o Stitch aprovado | não há telas aprovadas ainda | BLOQUEADO (depende do Anti) |

### Como uma tela consome isto (sem implementar nenhuma)

```ts
// Qualquer composição visual lê o MESMO contrato:
const state = BodySelectors.selectWorkoutView(repo, now);        // DataState<WorkoutView>
switch (state.status) {                                          // 9 estados, nenhum adivinhado
  case 'ready':   /* state.data.currentExercise, currentLoadKg, previousLoadKg… */ break;
  case 'partial': /* dado existe, mas falta: state.missing */ break;
  case 'empty':   /* state.reason */ break;
  default:        /* loading | stale | error | offline | permission-required | approval-required */
}
DataStates.describe(state); // texto legível sem depender de cor (leitor de tela)
```
