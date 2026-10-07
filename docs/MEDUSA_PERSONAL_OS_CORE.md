# MEDUSA — Personal OS Core

O sistema por trás das abas. Esta rodada não criou nenhuma tela. Ela criou o que permite ao Medusa responder:

> O que está acontecendo? O que importa? O que precisa ser feito? Quando? O que posso fazer sozinho? O que precisa de confirmação? O que devo lembrar?

```
vida real → eventos + tarefas + projetos + prazos → contexto → prioridade → decisão → ação → resultado
Agenda → Context → Guardian → Action → Hoje
```

---

## A. Baseline e relação com o Anti

| Item | Valor |
|---|---|
| Repositório | `MasterABL/medusa` |
| Branch | `feat/personal-os-core` (própria) |
| Base | `origin/feat/design-refinement-living-experience` @ `a8dcec6` (branch ativa do Anti) |
| Por que essa base | É onde vive o código atual: Foundation consolidada + Reminder Engine v1 (`28ca5b7`, "consolidate Foundation contracts, proactive reminders for telemedicina"). Os commits do Anti depois disso só mexem em `src/components/**`. |
| Foundation #31 | Continua aberto (draft). O conteúdo dele já foi consolidado pelo Anti em `28ca5b7` e é a base desta rodada. |
| PRs de domínio/UI | #27 → #28 → #29 / #30 continuam abertos e não foram tocados |
| Arquivos visuais tocados | **nenhum**: `src/components`, `src/app`, `src/context`, `src/types`, `src/fixtures` e `src/lib` têm diff zero |
| Checagem diária do Guardian | **desativada** (rotina `trig_01Qeju…` em `enabled=false`), como foi pedido |

---

## B. Personal OS — o que foi criado

| Área | Onde | O que faz |
|---|---|---|
| **Tasks** | `src/domains/tasks` | `Task` com prazo, esforço, domínio, projeto/marco, evento relacionado, dependências e recorrência, nos status `todo/in_progress/blocked/done/cancelled`. Evento ≠ tarefa. A executabilidade é **derivada do grafo**: dependência pendente, inexistente ou em ciclo, ou bloqueio manual com motivo. Inclui ordem topológica, "o que destrava quando X termina" e transições válidas. |
| **Projects** | `src/domains/projects` | Projeto com objetivo, marcos ordenados, prazos (rígidos ou metas), documentos e domínios. As tarefas são **ligadas por id**, nunca copiadas. Calcula progresso por marco (concluído / em andamento / não iniciado / atrasado), esforço restante (piso quando falta estimativa), próximas tarefas executáveis e **viabilidade do prazo contra o tempo realmente livre**: folgado, apertado, inviável, sem estimativa, vencido. |
| **Importância** | `src/foundation/context/importance.ts` | **Tabela de regras configurável** (não é mais um `if` fixo) com 4 níveis: `critical/high/medium/low`. Cada regra define categoria, nível e rigidez. Override por categoria e por evento; importância explícita no evento é respeitada. O contrato antigo (`high/medium/low`) continua funcionando. |
| **Contexto de evento** | `src/foundation/context/eventContext.ts` | Categoria, domínio, nível, rigidez, horário, duração, antecedência (inclui deslocamento), conflitos e quem cede neles (pela política existente da Agenda), dependências, projeto e tarefa relacionados. Usa a camada temporal da Agenda, sem recalcular tempo. |
| **Priority Engine** | `src/foundation/priority` | Pesos explícitos: importância 0,25, proximidade 0,30, rigidez 0,10, custo de atraso 0,10, pressão de tempo 0,15 e encaixe no contexto 0,10. Duas regras se sobrepõem a qualquer soma: **evento rígido em ≤15 min ou em andamento → máxima**; **não executável → bloqueada**. A explicação é estruturada (fator, peso, valor, contribuição). Dado que falta conta 0 e é marcado. |
| **Recomendações** | `src/foundation/recommendations` | Regras determinísticas sobre janelas livres reais, prioridade, esforço, prazo, energia, contexto ("antes de sair") e práticas curtas. Nunca recomenda etapa dependente. Divide tarefa longa de alta prioridade. Virar bloco passa pelo Guardian (`SUGGEST_FOCUS_BLOCK`, L2). |
| **Planner** | `src/foundation/planner` | `SuggestedSchedule` = Task + prazo + rotina + tempo livre + prioridade + deslocamento + horário protegido. Respeita trabalho, deslocamento, buffer e sono, as dependências entre blocos e o prazo; divide blocos longos. Não grava nada: gravar é `APPLY_SUGGESTED_SCHEDULE`, L2. |
| **Reminder Engine v2** | `src/foundation/reminders/engine.ts`, `channels.ts` | Estado explícito por lembrete. Gatilhos T-30, T-15, T-5 e horário exato; lembrete recorrente; **um disparo por gatilho**; gatilhos vencidos juntos → só o mais próximo sai; intervalo mínimo por evento; nunca lembra depois do início; cancela e reagenda a partir da Agenda; soneca; reconhecimento; follow-up sem spam; estado por canal. Toda entrega passa pelo Guardian (`CREATE_REMINDER`). Tem `exportState/importState` para persistência. |
| **Canais** | `channels.ts` | `dynamic_island` (entrega de verdade), `web_notification` (entrega se houver permissão; senão `permission_required` ou `blocked`), `native_mobile_notification` (**BLOQUEADO**: exige app nativo), `email` (**NÃO IMPLEMENTADO**). Nenhum devolve "delivered" sem ter entregue. |
| **Ações universais** | `src/foundation/actions` | `submitThroughGuardian` / `executeAuthorized` são a porta única para qualquer motor: ActionBus com correlação → contexto da decisão → `Guardian.evaluate` → lifecycle → resultado observado. O Action Center universal mostra domínio de origem, risco, autonomia, motivo, status, aprovação, execução e resultado. **Não é um segundo motor de decisão.** |
| **Context Aggregator / Hoje** | `src/foundation/context/aggregator.ts`, `sources.ts`, `today.ts` | Monta Agora, Próximo, Atenção, Ritmo e Recomendação a partir das fontes Agenda, Projetos/Tarefas, Lembretes, Guardian e Recomendações. Cada fonte reporta seu estado (pronta, parcial, desatualizada, offline, sem permissão, erro, não conectada); fonte faltando deixa o Hoje **parcial**, dizendo qual. |
| **Acadêmico** | `src/domains/academic` | Contratos de Programa, Disciplina, Atividade, Avaliação, Projeto acadêmico (→ Project), Curso → Módulo → Aula, ENEM (área, matéria, conteúdo, lacuna medida, sessão, revisão, simulado) e Inglês (habilidade, prática, rotina, progresso). Pontes: atividade → Task; prova → evento crítico (rascunho); prazos unificados; próxima aula → Task; prioridade ENEM; prática de inglês para a recomendação. |

### Mudanças em código existente (todas pequenas e aditivas)

- **`reminders/policy.ts`**: `classifyEventImportance` delega para a tabela de regras e mantém o formato antigo. Os testes de lembrete do Anti continuam passando (29/29).
- **`reminders/orchestrator.ts` (v1, ainda usado pela `AgendaContext`)**: dois bugs reais corrigidos.
  1. O T-5 podia **disparar duas vezes**: a janela tem ~2,5 min e o cooldown era de 2 min. Reproduzido antes da correção (T-6 → 1 entrega, T-3,5 → mais 1).
  2. `acknowledge` tirava o eventId com `split('_')`, o que quebra com ids que contêm `_`.
- **`types/autonomy.ts` + `guardian/policy.ts`**: nova opção `informationalOnly` na regra. Dá L1 sem histórico de confiança **só** para regra de baixo risco, reversível e com teto L1, e volta para L2 se o usuário vier rejeitando (`requer_atencao`). Sem isso, um lembrete de telemedicina cairia em "aguardando aprovação".
- **`foundation/domains`**: `CREATE_REMINDER` (L1 informativo), `SUGGEST_FOCUS_BLOCK` (L2) e `APPLY_SUGGESTED_SCHEDULE` (L2) declarados no contrato da Agenda e com regra. O auditor de produto continua consistente.

### Exemplo do dia (está nos testes)

```
10:00  Agora        → Trabalho
       Próximo      → Telemedicina em 5 min (crítica)
       Atenção      → Projeto Integrado vence amanhã (alta) · telemedicina em conflito com o trabalho
                      · lembrete crítico ainda sem reconhecimento
       Ritmo        → Treino às 18h
       Recomendação → reservar 45 min para "Levantamento bibliográfico" depois das 15h (forte)
```

---

## C. Integrações

| Ligação | Como | Prova |
|---|---|---|
| **Agenda → Reminder** | `eventContextsFor(agenda)` → `engine.syncEvents()` (planeja, reagenda, cancela) → `engine.tick(now)` | `reminders-v2` G1, 3.x, 5.x; `today-integration` 2.1 |
| **Reminder → Guardian** | cada entrega = `CREATE_REMINDER` via `submitThroughGuardian` + `executeAuthorized`; abrir pelo lembrete vira feedback explícito | G1.9–G1.10, 6.2, 9.1–9.2 |
| **Guardian → Hoje** | aprovações pendentes entram como Atenção (`guardianContextSource`) | `today-integration` 2.12–2.13 |
| **Hoje → Actions** | recomendação do Hoje → `proposeRecommendation` (L2) → Action Center universal | `today-integration` 2.11 |
| **Educação → Personal OS** | `src/domains/academic/services/bridges.ts`: Task, evento crítico, prazo, prática | `academic` |

**Ponto de encaixe técnico, ainda não aplicado** (é arquivo do Anti): a `AgendaContext` ainda usa o orquestrador v1, que agora está corrigido. Para trocar para o v2: criar o motor com `createDynamicIslandChannel(cb)` apontando para a mesma `showIslandNotification`, chamar `syncEvents(eventContextsFor(...), now)` e `tick(now)` no intervalo de 30 s que já existe, e salvar `exportState()` a cada mudança. A tela Hoje do Anti consome `selectToday(deps, now)`, que devolve `DataState<TodayContext>`.

---

## D. Persistência (estado real)

| Dado | Onde vive hoje | Classe |
|---|---|---|
| Itens da Agenda | `localStorage` (`medusa-agenda-items`), na `AgendaContext` (Anti) | **local** |
| Trilha de estudo, áudio, shell | `localStorage` (Educação, Shell) | **local** |
| Tasks, Projects | repositórios em memória + `createTaskPersistence`/`createProjectPersistence` + `bindRepositoryPersistence` | **in-memory**, **adapter preparado** |
| Acadêmico | repositórios em memória | **in-memory** |
| Eventos de contexto (Event Bus) | `createContextEventLog` / `snapshotEventHistory` (log limitado) | **adapter preparado** |
| Histórico de ações | `exportActionHistory` | **somente exportação** (restaurar ação autorizada poderia re-executá-la) |
| Relações entre entidades | `RelationStore.exportState/importState` | **in-memory**, pronta para o mesmo adapter |
| Reminder Engine (lembretes, entregas, ack) | memória do motor; `createReminderPersistence` + `bindStatePersistence` prontos | **adapter preparado** (ninguém liga em produção ainda) |
| Guardian (ações, auditoria, aprovações, resultados, feedback) | singletons em memória | **in-memory** |
| Backend / banco | não existe no Medusa (nenhum Supabase ou `fetch` em `src/`); `createUnavailableStorageAdapter('supabase', …)` declara isso | **BLOQUEADO** |
| Notificação nativa de celular | exige app nativo | **BLOQUEADO** |
| E-mail | sem serviço de envio | **NÃO IMPLEMENTADO** |

Nenhuma persistência falsa foi criada. Consequência registrada em teste (8.6): sem salvar o estado, recarregar a página faz um motor novo re-entregar um gatilho já entregue. O contrato para isso agora existe (`src/foundation/persistence`): `StorageAdapter` (memory / localStorage / Supabase bloqueado) → `PersistenceAdapter` versionado lido como DataState → `bind*Persistence`. Testado em `persistence` (21 checagens): "recarregar a página" com o adapter não repete o T-5; sem armazenamento o estado é *erro*, não *vazio*. O que falta é a camada de app chamar `hydrate()` ao abrir e `flush()` depois de mudar.

---

## E. Testes

`npm run test:all`:

| Suíte | Resultado |
|---|---|
| `test:foundation` | 64/64 |
| `test:domains` | 676/676 |
| `test:reminders` (v1, Anti) | passa |
| `test:personal-os` (**nova**) | **230/230** |

| Suíte Personal OS | Cobre |
|---|---|
| tasks-projects 31 | dependências (etapa 4 não recomendada antes da 2), ciclos, transições, marcos, prazos, viabilidade, seletores |
| context-priority 29 | regras e overrides de importância, contexto de evento, telemedicina T-5 = máxima, projeto amanhã = alta, treino em 3h = média, curso em 15 dias = baixa, bloqueada, explicação |
| reminders-v2 57 | **gates da telemedicina**, T-30/15/5/0 (T-30 agora no padrão crítico), um aviso por compromisso entre fontes (mesmo intent), um disparo por gatilho, superseded, expiração, recuperação, intervalo mínimo, cancelamento, reagendamento, ack, soneca, follow-up, recorrência, export/import, Guardian (rebaixa para L2 se o usuário rejeita) |
| actions 14 | L1, L2, L3, aprovação, rejeição, falha, sem efeito, Action Center universal, trilha causal |
| planner-recs 23 | 70 min → forte; 20 min antes de sair → inglês; energia; divisão; trabalho > estudo; deslocamento; buffer; sono; dependências; prazo; L2 para gravar |
| today-integration 23 | estados das fontes; Agora, Próximo, Atenção, Ritmo, Recomendação; integração Agenda → Reminder → Guardian → Hoje → Actions |
| academic 16 | atividade → Task, prova → evento crítico, prazos unificados, curso, ENEM, inglês |
| persistence 21 | memory/localStorage/Supabase bloqueado, versão e migração, snapshot corrompido, recarregar sem repetir lembrete, log limitado, matriz de persistência |
| events-relations 16 | evento canônico com 10 origens, canônico → EventContext → Reminder Engine, política de lembrete no evento, relações idempotentes e navegáveis |

Também: `npm run typecheck` sem erros; `npm run build` ok; `npm run lint` com 0 erros e 8 avisos antigos, todos em arquivos que esta rodada não toca.

---

## F. Pendências

| Item | Classe | Nota |
|---|---|---|
| Fundação Evento / Tarefa / Projeto / Prazo / Contexto / Prioridade / Lembrete / Ação / Resultado | **PROVADO** | testes acima |
| Telemedicina: crítica → T-5 → Dynamic Island + Web Notification | **PROVADO** (domínio) | Web Notification testada com ambiente injetado com permissão; no navegador real depende da permissão do usuário |
| Telemedicina com canal nativo | **BLOQUEADO** | o adapter existe; o canal exige app nativo |
| `AgendaContext` usando o motor v2 | **NÃO IMPLEMENTADO** | arquivo do Anti; o encaixe está descrito em C. O v1 que ela usa foi corrigido. |
| Persistência de lembretes, tarefas, projetos, eventos de contexto | **PARCIAL** | contratos e adapters prontos e testados (memory/localStorage); ninguém chama `hydrate/flush` em produção; Supabase **BLOQUEADO** |
| Um lembrete por compromisso, mesmo vindo de várias fontes | **PROVADO** | `intentKey`/`dedupKey`; a fonte que sobra herda os avisos na mesma sincronização |
| Evento canônico (Agenda, Google, Outlook, Gmail, domínios, sistema) e relações por referência | **PROVADO** (contrato) | `src/foundation/events`, `src/foundation/relations` |
| Hoje com Finanças, Corpo, Espiritual e Educação | **PARCIAL** | aparecem como fonte "não conectada" (o Hoje fica parcial e diz isso); o agregador aceita `extraSources` |
| Planner com vários dias, prazos e dependências | **PROVADO** (determinístico) | sem otimização global: é guloso por prioridade |
| Recomendação por IA generativa | **NÃO IMPLEMENTADO** | por decisão: regras primeiro |
| UI (Hoje, Agenda, Educação, Action Center) | **NÃO IMPLEMENTADO** | fora do escopo, é do Anti |
| Grant ligado ao `classify` | **NÃO IMPLEMENTADO** | continua decisão do dono; `informationalOnly` cobre só ações informativas |

---

## Finalização (06/10/2026)

Rodada paralela ao Anti, antes do Gmail/Agenda. Auditoria do que já estava aqui:
Context Engine, Tasks, Projects, Deadlines, Priority, Recommendation, Planner, Guardian,
Actions, Hoje, Acadêmico e canais estavam **PROVADOS** e não foram refeitos. Fechado:

1. **T-30 no padrão crítico** (`[30, 15, 5, 0]`); antes só existia por política.
2. **Um aviso só por compromisso entre fontes**: o mesmo compromisso vindo da Agenda e de
   um e-mail/Google Calendar com ids diferentes gera um conjunto de lembretes (por
   `dedupKey` explícita ou data + início + título normalizado). Se a fonte que cobria some,
   a outra herda na mesma sincronização. Estado exportado antes ganha o `intentKey` ao ser
   importado.
3. **Persistência preparada sem banco fingido** (`src/foundation/persistence`).
4. **Evento canônico + origem explícita** (`src/foundation/events/canonical.ts`) e
   **relações por referência** (`src/foundation/relations/graph.ts`), base do Gmail/Agenda.

Continua: o encaixe do motor v2 na `AgendaContext` (arquivo do Anti) e a camada de app
que liga `hydrate/flush`.
