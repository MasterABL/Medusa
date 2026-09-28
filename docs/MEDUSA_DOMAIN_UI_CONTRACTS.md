# Contratos de domínio para a UI (Stitch)

Este documento diz **o que dado existe hoje** atrás de cada tela futura. Não descreve layout, componente nem
estética: isso é decisão do design. A regra é `UI → view model → serviço de domínio → engine`, e a UI **nunca
reimplementa regra de negócio** (limiar de orçamento, nível de autonomia, progresso de meta, carga de rotina).

Legenda: **Disponível** = código real, testado, retorna dado calculado. **Futuro** = tipo/contrato existe, sem
emissor ou sem fonte de dado. **Não implementado** = não existe.

Todos os dados de exemplo nos testes são `fixture` (nome com sufixo "(fixture)") e nunca devem aparecer numa tela
como se fossem do usuário. Não existe nenhum dado real do usuário nesta base de código.

## Como consumir

Cada domínio expõe `api.ts` (funções puras recebendo um `Repository`) e um `index.ts` barrel. Repositórios hoje são
**em memória** (`createInMemory*Repository`); persistência real é um adapter futuro atrás da mesma interface.
Nada aqui é assíncrono ainda — quando existir banco, os retornos passam a ser `Promise` (mudança de contrato).

---

## Finanças — `src/domains/finance/api.ts`

| Contrato | Estado | Devolve |
|---|---|---|
| `getOverview(repo, from, to, now)` | Disponível | contas ativas, saldo total, fluxo de caixa, top 5 categorias |
| `getCashflow(repo, from, to)` | Disponível | entradas, saídas, fluxo líquido, nº de transações |
| `getBudgetsWithConsumption(repo, from, to)` | Disponível | orçamento + consumo/restante/percentual/estado **derivados** |
| `getGoals(repo, now)` | Disponível | meta + progresso 0-1 + ritmo (`no_prazo`/`fora_do_prazo`/…) |
| `getProjections(repo)` | Disponível | projeções salvas (`observedBalance` separado de `projectedBalance`) |
| `getRecurrenceCandidates(repo)` | Disponível | candidatos de **heurística de recorrência** com intervalo, consistência e confiança `baixa/moderada/alta` |
| `getInsights(repo, from, to, now)` | Disponível | insights `{ type, observation, evidence[], period?, impact?, severity, confidence, proposedActionType? }` ou `insufficient_evidence` |
| `resolveFinanceTodayContext(insights)` | Disponível | 1 frase compacta para o Hoje, ou `null` |

Ações que a UI pode disparar (todas passam pelo Guardian): `categorizeTransaction`, `createBudget`, `adjustBudget`,
`linkRecurringCommitment`, `contributeToGoal`, `createProjection`, `createFinancialReminder`. Entrada direta de dado:
`createTransaction`.

- **Sempre proposta, nunca executa:** `proposePayment`, `proposeTransfer` (L3). A UI deve mostrar isto como
  "pedido aguardando aprovação", **jamais** como pagamento feito.
- **Futuro:** `TRANSACTION_UPDATED`, edição de transação, média histórica real por categoria (hoje aproximada).
- **Não implementado:** qualquer integração bancária/Open Finance, pagamento, transferência real, importação de extrato.

## Corpo — `src/domains/body/api.ts`

| Contrato | Estado | Devolve |
|---|---|---|
| `getProfile(repo, id)` | Disponível | `BodyProfile` — cada campo `{ value, origin: 'self_reported' \| 'derived' }` |
| `getPlan(repo, id)` / `getActivePlans(repo)` | Disponível | `BodyPlan` (`draft/active/paused/completed`) |
| `getInsights(repo, routineLoadInput?, planId?, now)` | Disponível | insights de rotina/plano, ou `insufficient_evidence` |
| `getAvailableWindows(labels)` | Disponível, mas **só repassa** rótulos recebidos | quem calcula a janela real é a Agenda |

Diagnóstico: `BODY_DIAGNOSTIC_QUESTIONS` (14 perguntas, `single/multi/scale/free_text/duration`) →
`createDiagnosticSession` → `answerDiagnosticQuestion` → `completeDiagnosticSession` (devolve sessão + perfil).
Erros de validação são interpretáveis (`BodyValidationError.message`), a UI pode exibi-los.
Rotina: `computeRoutineLoad(input)` → `{ level: baixa|moderada|alta, score, evidence[] }`; **heurística de organização
de rotina, não diagnóstico** — a tela não deve apresentá-la como condição física.

- **Futuro:** `BODY_SESSION_COMPLETED`, `ROUTINE_LOAD_CHANGED`, `RECOVERY_SUGGESTED`, `BODY_SESSION_SCHEDULED`
  (tipos sem emissor); catálogo de atividades é pequeno (6) e extensível.
- **Não implementado:** dados de wearable/saúde, registro de treino executado, cargas/repetições, qualquer conteúdo clínico.

## Guardian — `src/foundation/guardian*`

| Contrato | Estado | Devolve |
|---|---|---|
| `Guardian.GuardianTrust.listTrustProfiles()` | Disponível | perfis por `(domínio, ação)` com `state`, amostras, taxa recente e **evidência bruta** |
| `Guardian.GuardianApproval.listApprovalRequests({status?})` | Disponível | pedidos `pending/approved/rejected/expired` com `reason`, `impact`, `expiresAt` |
| `Guardian.GuardianAuditLog.listRecent(n, {domain?})` / `listForAction(id)` | Disponível | histórico append-only |
| `Guardian.GuardianExplanation.explain(evaluation)` | Disponível | `{ reason, evidence[], impact, requestedDecision, autonomyLevel, auditReference }` — pronto para renderizar |
| `GuardianLifecycle.resolveApproval(id, 'approve'\|'reject')` | Disponível | resolve o pedido e move a Action |

- **Estados de Action:** `AWAITING_APPROVAL → AUTHORIZED → EXECUTING → SUCCESS|FAILED`, `REJECTED`, `CANCELLED`, `UNDONE`.
- **A UI não deve recalcular nível de autonomia.** Ela exibe `decision.level` e `explanation`.
- **Não implementado:** persistência (tudo em memória do processo), timer de expiração automática, notificação de
  pedido pendente, tela de aprovação, trust/permissões editáveis pelo usuário.
- Só existe um "usuário" implícito: não há identidade/multiusuário.

## Espiritual — `src/domains/spiritual/api.ts`

| Contrato | Estado | Devolve |
|---|---|---|
| `getProfile(repo, id)` | Disponível | foco definido pelo usuário (texto livre) |
| `getGoals(repo)` | Disponível | meta + progresso derivado (0-1) |
| `getPractices(repo)` | Disponível | práticas registradas |
| `getReflectionsMetadata(repo)` | Disponível | `{ id, createdAt, visibility, relatedPracticeId?, contentLength }` |
| ~~`getReflections()`~~ | **Deliberadamente ausente** | conteúdo de reflexão só sai do repositório, numa tela privada |

- **Privacidade:** a UI genérica (Hoje, Island, notificações) nunca deve receber conteúdo de reflexão. O evento
  `REFLECTION_CREATED` já carrega só metadado.
- **Futuro:** consentimento, escopo de acesso, criptografia em repouso, rotinas com lembrete.
- **Não implementado:** qualquer conteúdo religioso/teológico, sugestão prescritiva, compartilhamento (`visibility`
  só aceita `private`).

## Compartilhado

- **Hoje:** `getTodayContextSnapshot()` agrega insights recentes, mensagens proativas endereçadas a `hoje` e
  aprovações pendentes sem importar nenhum domínio. Cada domínio tem seu `*HojeResolver` que devolve **uma** frase.
- **Mensagens proativas:** cada uma tem evidência, urgência, prioridade, `cooldownKey`, expiração e `surfaceTargets`;
  `groupRecent(windowMs)` agrupa avisos simultâneos para sintetizar em vez de empilhar.
- **Island:** a fila aceita eventos de qualquer domínio usando **um dos 10 estados canônicos existentes**; não há 11º estado.
- **Agenda:** recebe `AgendaSchedulingRequest` com `agendaDomain` + `source { sourceType, sourceId }`. Espiritual ainda
  cai em `'external'` porque `AgendaDomain` não tem valor próprio (decisão da Agenda, não deste código).
- **Serialização:** `serialize/deserialize` com envelope `{ schemaVersion: 1, kind, data }`; payload inválido lança
  `SerializationError` ou o erro de validação do domínio.
