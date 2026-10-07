# MEDUSA — Gmail / Agenda: arquitetura funcional

Rodada paralela ao trabalho visual do Anti (06/10/2026). Branch `feat/email-agenda-foundation`,
empilhada sobre `feat/personal-os-core` (PR #32). **Sem UI**: só contratos, serviços, adapters,
pipeline, regras e testes. Nenhum arquivo de `src/components`, `src/app`, `src/context`,
`src/types`, `src/fixtures` ou `src/lib` foi alterado.

> Não é um Gmail dentro do Medusa nem uma segunda Agenda. É a camada que **entende** o que
> chega por e-mail, **relaciona** com o resto da vida, **prioriza** e **propõe ação** —
> sempre pelo Guardian. A Agenda continua sendo a camada temporal oficial.

---

## 1. Nome da aba

Proposta: **Comunicação**, com o subtítulo "Gmail · Agenda". O nome diz o que entra (o que
outras pessoas e instituições mandam), não a ferramenta, e continua valendo quando Outlook ou
outro canal entrarem. Alternativa curta: **Entrada**. O identificador técnico do domínio é
`email` (`DomainId`), com `isLive: false` até existir a tela.

## 2. Estrutura da aba (ponto de partida para o Anti desenhar)

```text
COMUNICAÇÃO (Gmail · Agenda)
│
├── Caixa ............ filtros: Todos · Não lidos · Importantes · Preciso agir ·
│                      Aguardando resposta · Com prazo · Com evento ·
│                      Financeiro · Faculdade · Trabalho · Saúde
│                      cada linha: conversa + POR QUE importa + nº de propostas
│
├── Conversa ......... mensagens da thread + classificação + evidência do texto
│
├── Propostas ........ Tarefa · Evento · Prazo · Lembrete · Finanças · Resposta
│                      (cada uma com confiança, motivo, evidência e o nível do Guardian)
│
├── Contexto ligado .. Projeto · Tarefa · Prazo · Evento · Lembrete
│                      (relações por referência — nada copiado)
│
└── Acompanhamento ... prazos que passaram sem conclusão · e-mails meus sem resposta
```

Dados que a tela consome (prontos):

| Para | Contrato |
|---|---|
| Caixa com filtros e contagens | `selectEmailInbox(provider, threadAnalyses, filtro, now)` → `DataState<EmailInbox>` |
| Conversa | `analyzeThread(thread, opts)` → `{ thread, analyses, deduplicated }` |
| Proposta → aprovação → aplicar | `createEmailActionCenter(deps)` (`propose`, `apply`, `requestSensitive`) + Action Center universal |
| Hoje | `emailContextSource(...)` em `TodayDeps.extraSources` |
| Busca global | `createInMemorySearchIndex()` + `emailToSearchDocument`/`taskToSearchDocument`/... |
| Estado do Gmail/Calendar | `ProviderState` → `providerStateToDataState` |

## 3. Pipeline

```text
Provedor (Gmail · fixture · Outlook futuro)
   │  EmailMessage (metadados + snippet) · EmailContentForAnalysis (corpo transitório, opcional)
   ▼
extractContext ....... datas (relativas ao recebimento), horários, prazo, compromisso, valor,
   │                   local, pessoas, organização, disciplina, curso, projeto, documentos,
   │                   pedido de ação, esforço dito no texto — cada um com EVIDÊNCIA
   ▼
classifyEmail ........ categoria · domínio · importância (critical/high/medium/low) · motivos
   ▼
assessRisk ........... deadline · financial · medical · academic · work · meeting · security ·
   │                   document · request · follow_up · informational
   ▼
deriveCandidates ..... Tarefa · Evento · Prazo · Lembrete · Finanças · Resposta
   │                   + dedup contra Agenda/Tasks/RelationStore
   ▼
analyzeThread ........ dedup por conversa · cancelamento posterior anula o compromisso ·
   │                   estado da conversa (precisa agir / aguardando resposta / ...)
   ▼
Guardian (domínio email) ─ L1 executa · L2 aguarda · L3 aprovação humana
   ▼
apply (idempotente) → Task (TaskRepository) · CanonicalEvent · relações
   ▼
Reminder Engine (mesmo motor) · Priority Engine · Recommendation · Planner · Hoje
```

Tudo puro e determinístico: mesmo e-mail + mesmo `now` → mesma análise e mesmos ids de
candidato. Cada passo grava uma linha de auditoria.

## 4. Contratos (`src/domains/email/model/types.ts`)

| Contrato | Campos |
|---|---|
| `EmailMessage` | id, threadId, source (provider/externalId/account/origin), direction, sender, recipients, subject, snippet, receivedAt, isRead, isStarred, labels, attachments; derivados: importance, risk, domain, relatedProjectId/TaskId/EventId |
| `EmailThread` | threadId, messages, participants, subject, lastMessageAt, unreadCount, importance, status (`needs_action`/`waiting_reply`/`informational`/`done`/`snoozed`/`archived`) |
| `EmailReadingState` | unread · read · important · actionable · waiting · done · snoozed · archived |
| `EmailRisk` | type, severity, reason, deadline, financialImpact, temporalImpact, domain, confidence, evidence |
| `EmailExtraction` | cada campo é `Extracted<T>` = valor + evidência (campo, trecho ≤ 80, posição) + confiança |
| Candidatos | `TaskCandidate`, `CalendarEventCandidate` (title, start, end, timezone, participants, location, sourceEmailId, confidence), `DeadlineCandidate`, `ReminderIntentCandidate`, `FinanceCandidate`, `ReplyCandidate` |
| `CandidateAction` | responder · criar_tarefa · criar_evento · adicionar_prazo · abrir_documento · acompanhar_depois · ignorar · arquivar · marcar_importante · cancelar_evento |
| `EmailAuditEntry` | at, source, messageId, step, decision, reason, confidence, action, outcome, refs |

Fundação compartilhada criada nesta rodada (PR #32): `CanonicalEvent` + `EventSourceKind`
(`internal`, `google_calendar`, `outlook_calendar`, `gmail`, `education`, `body`, `finance`,
`spiritual`, `guardian`, `system`), `RelationStore` (e-mail → projeto → tarefa → prazo →
evento → lembrete por arestas com proveniência) e `src/foundation/persistence`.

## 5. A regra evento ≠ prazo ≠ tarefa ≠ finanças (testada)

| Texto | Vira |
|---|---|
| "reunião terça às 14h" | **Evento** (`CalendarEventCandidate`) |
| "consulta confirmada para amanhã às 18h" | **Evento crítico** + **Lembrete** T-15/T-5 |
| "deve ser entregue sexta" | **Prazo** + **Tarefa** |
| "responda este e-mail" | **Tarefa** + **Resposta** (lembrete de que alguém espera; enviar é L3) |
| "pagamento da fatura vence dia 10" | **Finanças** + **Prazo** + Lembrete; pagar é sempre humano |
| "call às 15h?" (sem data) | nada é agendado; o motivo fica na auditoria (o dia não é presumido) |
| "a reunião foi cancelada" | nenhum evento novo; se existir na Agenda, propõe cancelar (L3) |

Importância nunca vem do prestígio do remetente: newsletter do "presidente" continua baixa;
consulta marcada por um endereço desconhecido continua crítica. Risco vence propaganda:
"negativado em 5 dias… desconto de 50%" continua crítico.

## 6. Guardian

| Nível | Ações (`domínio email`) |
|---|---|
| **L1** (informativo, auditado) | `CLASSIFY_EMAIL`, `DETECT_EMAIL_EVENT`, `OPEN_EMAIL_DOCUMENT`; lembretes vão por `agenda/CREATE_REMINDER` (já existente) |
| **L1 com confiança** (sem histórico → L2) | `CREATE_TASK_FROM_EMAIL` (≥ 80% de aceitação), `MARK_EMAIL_IMPORTANT`, `MARK_EMAIL_READ` |
| **L2** (o usuário decide) | `SUGGEST_TASK_FROM_EMAIL`, `SUGGEST_EVENT_FROM_EMAIL`, `SUGGEST_DEADLINE_FROM_EMAIL`, `SUGGEST_REPLY`, `SUGGEST_FOLLOW_UP`, `ARCHIVE_EMAIL` |
| **L3** (aprovação humana sempre) | `SEND_EMAIL_REPLY`, `FORWARD_EMAIL`, `DELETE_EMAIL`, `CANCEL_EVENT_FROM_EMAIL`, `SCHEDULE_PAYMENT_FROM_EMAIL` |

Sobre "L2 criar automaticamente se a política permitir": no Guardian do Medusa, L2 nunca
executa sozinho. O equivalente fiel é `CREATE_TASK_FROM_EMAIL` com teto L1 e
`minTrustForL1: 0.8` — sem histórico vira proposta (L2); com aceitação real acumulada cria
sozinho. Isso está testado (2.12/2.13).

Garantias: propor o mesmo candidato devolve a mesma ação (um pedido de aprovação só); aplicar
é idempotente via `RelationStore` (segunda aprovação = "sem efeito", nenhuma duplicata); os
provedores só aceitam operação sensível com o id de uma ação **autorizada**, do tipo certo e
para a mesma mensagem.

## 7. Integrações com o Personal OS (nenhum motor paralelo)

| Para | Como |
|---|---|
| Lembretes | `reminderEventsFromEmail` → `CanonicalEvent` com `reminderPolicy` → `canonicalToEventContexts` → **o mesmo** Reminder Engine. Aceitar o evento depois usa o mesmo id → nenhum lembrete repetido. |
| Prioridade / NBA | `emailPriorityCandidates` → `rankCandidates` (existente) → `recommend` (existente). Recomendação carrega `targetRef.emailCandidateId`. |
| Planner | tarefa aceita entra em `TaskRepository` e o `suggestSchedule` existente a encaixa (ex.: 45 min às 19h). |
| Hoje | `emailContextSource`: **Atenção** (`email_risco`, `email_prazo`, `email_requer_acao`) e **Próximo** (evento detectado em e-mail, marcado `provisional`). **Recomendação**: antes de aceitar, `emailPriorityCandidates` + `recommend`; depois de aceita, a tarefa já sai do recomendador do próprio Hoje. Gmail desconectado → fonte "precisa de permissão", nunca "sem e-mails". |
| Busca | `SearchIndex` único (e-mail, thread, tarefa, projeto, evento, prazo, documento). |
| Acompanhamento | `detectFollowUps`: prazo vencido sem conclusão; e-mail meu sem resposta há 3 dias. Uma vez por janela e no máximo 2 por conversa. Só propõe (L2). |

Lembrete de compromisso vindo de e-mail sai **antes** de o usuário aceitar o evento (é L1
informativo): uma consulta confirmada por e-mail não fica sem aviso porque ninguém clicou em
"adicionar". Só com confiança ≥ 0,7 e importância crítica/alta.

## 8. Provedores

| Integração | Estado | O que está pronto |
|---|---|---|
| **Gmail** | **BLOQUEADO** | Contrato `EmailProvider` (seguras) + `EmailSensitiveOperations` (responder/encaminhar/excluir, só com ação aprovada). `fromGmailApiMessage` mapeia `users.messages.get?format=metadata` (sem corpo). Falta: backend + OAuth do Google; tokens nunca no cliente. |
| **Google Calendar** | **BLOQUEADO** | `CalendarProvider` (list/get/create/update/delete/freeBusy) + `fromGoogleCalendarEvent`. Mesma falta de backend/OAuth. |
| **Outlook Calendar** | **BLOQUEADO** | Contrato pronto; Microsoft Graph não implementado. |
| **Calendário interno do Medusa** | **PROVADO** (memória) | `createInternalCalendarProvider` sobre `Repository<CanonicalEvent>`; escrita só com ação autorizada; cancelar só com ação L3. |
| **Notificação nativa** | **BLOQUEADO** | canal declarado; exige app nativo; aparece como bloqueado, nunca fingido. |
| **Web Notification / Dynamic Island** | **PROVADO** (domínio) | entregues no E2E da telemedicina (ambiente injetado com permissão). |

Estados de provedor: `available` · `connected` · `permission-required` · `expired` ·
`rate-limited` · `error` · `offline` · `partial` → DataState honesto. Fixture de demonstração
sai sempre com `origin: 'fixture'`.

## 9. Privacidade e retenção

- Guardado: metadados (remetente, destinatários, assunto, data, rótulos, nomes de anexo) e o
  snippet do provedor.
- Corpo: **não guardado**. Se a integração entregar, entra como `EmailContentForAnalysis`
  (`retention: 'transient'`), é lido pela extração e descartado. Testado: nada do corpo
  aparece na análise serializada nem na auditoria, além de trechos de evidência ≤ 80
  caracteres.
- Busca: prévia ≤ 160 caracteres.
- Credenciais: nenhuma passa pelo domínio; provedores reais dependem de backend.
- Retenção sugerida quando houver backend: metadados e análise enquanto a conversa estiver
  na caixa; trilha de auditoria por 90 dias (o `AppendLog` já limita por quantidade).

## 10. Persistência

| Dado | Classe |
|---|---|
| Itens da Agenda | **real** (localStorage, `AgendaContext` do Anti) |
| Análises, candidatos, auditoria, relações, eventos aceitos de e-mail | **in-memory** |
| Tarefas, projetos, lembretes, eventos de contexto, trilha de auditoria | **adapter preparado** (`src/foundation/persistence`) |
| Histórico de ações | **somente exportação** |
| Gmail, Google Calendar, Outlook, Supabase | **BLOQUEADO** |

## 11. O que veio do minha-vida

Usado como inventário e fonte de decisões, não como código.

| Aproveitado (conceito) | Por quê |
|---|---|
| Classificação **determinística por regras**, motivo por regra | auditável linha a linha; decisão de risco não pode ser caixa-preta |
| **Risco antes da categoria** (`emailRiscoClassifier.js`) | negativação com "desconto" não pode cair em marketing |
| **Nunca inventar prazo**; "em N dias"; DD/MM sem ano vai para o ano seguinte, exceto texto no passado ("venceu em") | casos reais do classificador antigo |
| **Só metadados + snippet** (`format=metadata`) | minimização de conteúdo sensível |
| Remetentes acadêmicos (Blackboard, polo, `.edu`) | avisos da faculdade capturados no projeto antigo (`avisosFaculdade.js`) |
| Cadeia **E-mail → Risco → Contexto → NBA → Agenda** | mantida, agora com candidatos, Guardian e relações |
| Dedup por id de mensagem | reprocessar não pode repagar/duplicar |

| Descartado | Por quê |
|---|---|
| Schema `email_resumos`, rotas Vercel, Svelte, Supabase admin | arquitetura atual é Next + fundação própria; sem backend aqui |
| Gemini para extrair datas | primeiro regras; LLM pode entrar depois como camada opcional com evidência |
| Ação "pagar" sugerida para risco alto | dinheiro é sempre L3 humano; o Medusa só organiza prazo e lembrete |
| Escala de prioridade própria (`baixa..critica`) | o Medusa já tem `ImportanceTier`; usar a mesma evita conversão |

## 12. Testes

`npm run test:email` — **148/148**:

| Suíte | Cobre |
|---|---|
| understanding 36 | datas relativas ao recebimento, horário vs duração, prazo, faixa de horário, local, pessoa, disciplina, esforço, passado; classificação de saúde/faculdade/trabalho/finanças/propaganda; importância ≠ prestígio; risco vence propaganda; estados de leitura; privacidade do corpo |
| candidates 22 | evento ≠ prazo ≠ tarefa ≠ finanças; horário sem data; dedup contra Agenda/Tasks/relações; ids determinísticos; teto de 1 tarefa/1 evento/2 lembretes; conversa (convite + confirmação = 1 evento; cancelamento posterior; aguardando resposta) |
| guardian-providers 35 | L1/L2/L3; aprovação; idempotência entre sessões; L1 só com confiança; ações sensíveis presas à aprovação certa; fixture marcada; Gmail/Calendar bloqueados; 8 estados → DataState; mapeadores Gmail e Google Calendar; calendário interno |
| e2e 28 | **telemedicina** (e-mail → evento crítico → T-15/T-5 → Island + Web, nativo bloqueado → Guardian → Hoje "Próximo em 5 min" → aceitar não duplica), **faculdade** (prazo → tarefa → projeto → prioridade → recomendação → Planner 19h → Hoje), **financeiro** (risco → prazo L2 → pagamento L3 → Hoje), Gmail desconectado |
| inbox-followup 27 | 11 filtros, caixa ordenada com "por quê", acompanhamento sem spam (janela e teto), busca global, trilha de auditoria completa e persistível |

`npm run test:all` = foundation 64 · domains 676 · reminders 17 · personal-os 230 · email 148,
todos passando. `typecheck` limpo, `build` ok, `lint` 0 erros (8 avisos antigos, nenhum em
arquivo desta rodada).

## 13. Pendências

| Item | Classe |
|---|---|
| Cadeia Gmail → E-mail → Contexto → Risco → Prioridade → Tarefa/Projeto/Prazo/Evento → Lembrete → Guardian → Hoje | **PROVADO** (domínio, com fixture) |
| Evento ≠ prazo ≠ tarefa ≠ finanças; dedup; conversa | **PROVADO** |
| Guardian L1/L2/L3 e ações sensíveis | **PROVADO** |
| Acompanhamento sem spam | **PROVADO** (só propõe; a notificação do acompanhamento usaria o Reminder Engine) |
| Filtros, busca, auditoria | **PROVADO** (contrato + implementação em memória) |
| Gmail / Google Calendar / Outlook reais | **BLOQUEADO** (backend + OAuth) |
| Lembrete do prazo depois que a tarefa foi aceita | **PARCIAL** — o motor lembra eventos; prazo de tarefa aceita ainda não gera aviso sozinho |
| Persistência das análises/candidatos/relações | **PARCIAL** — adapters prontos, ninguém liga em produção |
| Extração por IA (casos fora das regras) | **NÃO IMPLEMENTADO** — por decisão: regras primeiro |
| Tela da aba Comunicação | **NÃO IMPLEMENTADO** — do Anti |
