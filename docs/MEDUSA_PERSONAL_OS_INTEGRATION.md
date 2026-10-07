# Medusa — Personal OS Integration + Product Truth Pass

Rodada funcional/arquitetural. O visual é do Anti; aqui a fundação que já existia
(Personal OS, Guardian, Reminder Engine v2, E-mail, Corpo, Espiritual) passou a ser
**usada pelo produto**, e os estados enganosos da tela foram corrigidos.

- Branch: `feat/personal-os-integration`, criada a partir de `feat/design-refinement-living-experience`
  (HEAD `81ee3f6`, estado visual mais novo do Anti) + merge de `docs/product-inventory`
  (PRs #32, #33, #34). Sem merge automático.
- Nenhum token, cor, componente visual ou tela nova foi criado. As intervenções na UI
  foram as mínimas para trocar fixture por dado real ou marcar o que continua sendo fixture.
- Supabase, Gmail, Google Agenda e Outlook continuam **BLOQUEADOS** (sem backend/OAuth).
  Persistência é `localStorage` (namespace `medusa:`), e a tela diz isso.

Legenda: **PROVADO** (teste automatizado e/ou QA no navegador cobrindo o caminho real) ·
**PARCIAL** (funciona com limitação declarada) · **BLOQUEADO** (depende de algo externo
indisponível) · **NÃO IMPLEMENTADO**.

---

## 1. Estado antes

Levantado na auditoria da UI do Anti (`81ee3f6`) e no inventário (PR #34):

- A UI quase não usava a fundação. Hoje, Guardian, Finanças, Corpo e Espiritual eram
  100% fixture, sem dizer isso.
- **Finanças**: "Contestar" mostrava *ESTORNO ENVIADO* sem existir nenhum executor ou banco.
- **Cronograma ENEM**: blocos gravados na data fixa `28/09/2026`, vários no mesmo horário.
- **Hoje**: tarefas, avisos e blocos inventados ("Revisar bibliografia", "Telemedicina"),
  e um bloco sintético "Revisão e Encerramento Diário" criado só para preencher a fila.
- **Sidebar**: contadores `3` (Agenda) e `14` (Educação) escritos no código.
- **Agenda**: semeava ~27 eventos de exemplo no primeiro acesso, que a Hoje e os
  lembretes tratavam como compromissos de verdade.
- **Dynamic Island**: fora de 4 domínios mostrava "Foco Contínuo · 32 min" sempre.
- **Guardian (painel lateral)**: "3 fluxos monitorados", "Zero invasão", "D+0 em tempo real" fixos.
- Hidratação do React: **8 erros por aba** no build de produção do Anti (medido com Chromium).
- Lembretes v1 (`globalReminderOrchestrator`) rodavam em paralelo ao Reminder Engine v2.

## 2. O que foi implementado

### 2.1 Runtime único (`src/foundation/runtime/personalOS.ts`) — PROVADO
Um runtime por aba do navegador, criado em `PersonalOSProvider`
(`src/context/PersonalOSContext.tsx`), que junta tarefas, projetos, lembretes v2, Guardian,
e-mail local, corpo e espiritual, com persistência por chave (`medusa:personal-os/*`).
Hidrata no mount, salva com debounce, `tick()` a cada 30 s (lembretes vencidos,
aprovações expiradas, virada do dia).

### 2.2 Executores honestos (`src/foundation/actions/executors.ts`) — PROVADO
Aprovar uma ação sem executor registrado deixa a ação em
**`aprovada_sem_executor`** → "Ação aprovada — executor não conectado". Nunca há
resultado "executado" sem executor. Executores reais registrados: Agenda
(`SUGGEST_FOCUS_BLOCK`, `APPLY_SUGGESTED_SCHEDULE`) e e-mail (via `emailCenter.apply`).

### 2.3 Snapshot do Guardian (`src/foundation/guardianSnapshot.ts`) — PROVADO
Ações, aprovações, auditoria, trust, outcomes, contextos e feedback sobrevivem a recarregar.
Regras de restauração: pendente continua decidível; autorizada ganha `restoredAt` e
**nunca é re-executada**; uma execução interrompida vira `FAILED` com outcome "falhou"
(nunca sucesso presumido).

### 2.4 P0s
| P0 | Correção | Estado |
|---|---|---|
| Finanças falso sucesso | Contestar → `finance/DISPUTE_CHARGE` (L2, irreversível) no Guardian → aprovação → "AÇÃO APROVADA — EXECUTOR NÃO CONECTADO". Idempotente por anomalia; intent marcado `[dados de exemplo]`. Anomalia de exemplo já resolvida mostra "Resolvido (exemplo)", não "Proposta ao Guardian". | PROVADO (J3 + QA 3.1–3.11) |
| Cronograma data fixa | `gerarBlocosAgendaSemana(plan, dias, hoje, ocupados)`: próximas datas reais, encaixe sequencial com buffer, respeita compromissos existentes, janela 06–23h, data local (sem `toISOString`). | PROVADO (cronograma C1–C7) |
| Hoje sem dados inventados | Estados REAL / FIXTURE / EMPTY / PARTIAL com selo (`ProvenanceBadge`); estado vazio de verdade; fixture só com `?demo=1`; bloco sintético removido; bloco já encerrado vira "Pendente de conclusão · Encerrou há N min" em vez de "0 min restantes". | PROVADO (QA 1.1–1.3b) |
| Sidebar | Agenda = compromissos restantes hoje (sem itens de exemplo); Guardian = aprovações pendentes; ponto da Hoje = tarefa atrasada ou aprovação pendente; `14` e o acento de Finanças removidos. | PROVADO (QA 1.3b, 1.4, 3.4, 3.10) |

### 2.5 Verdade adicional encontrada no navegador (não estava no pedido)
- **Agenda semeando exemplos** — primeiro acesso agora é Agenda vazia; exemplos só com
  `?demo=1`. Quem já tinha os exemplos salvos continua vendo-os na Agenda (camada
  congelada), mas `withoutAgendaExamples()` (`src/lib/agendaExamples.ts`) impede que eles
  gerem lembrete, prioridade, contador ou bloco na Hoje. — PROVADO (QA 1.1, 1.3b)
- **Hidratação** — o HTML estático é gerado na hora do build; relógio e itens lidos do
  `localStorage` na primeira renderização divergiam. Hoje/Sidebar/painel só usam hora e
  Agenda depois de `ready`. Resultado: **0 erros de hidratação** em todas as abas (era 8
  por aba no `81ee3f6`), inclusive com dados salvos e 1+ min depois do build. — PROVADO (QA 7)
- **Dynamic Island** — `routeIslandDefault()` (`src/lib/islandDefaults.ts`), usado pela
  ilha do desktop e do celular: Hoje/Agenda/Educação/Progresso mostram o compromisso real
  de agora (ou o próximo) via Context Aggregator, ou "Nada em andamento". — PARCIAL (sem
  teste dedicado; coberto visualmente)
- **Painel do Guardian** — contagem real de ações propostas/decididas e as 4 decisões mais
  recentes com o rótulo de estado real; casos de exemplo só no modo demo. — PARCIAL (visual)
- **Ações nascidas de exemplo** — `ActionView.example` marca ações vindas de e-mail fixture
  ou de anomalia de exemplo; o Guardian mostra o selo "Dados de exemplo". — PARCIAL (visual)

## 3. O que está ligado à UI

| Tela | Agora usa | Estado |
|---|---|---|
| Hoje · Agora | Agenda real (recorrência expandida), concluir/estender bloco persistido, check-in persistido, recomendação do motor com "Reservar na Agenda" (Guardian L2 → executor da Agenda) | PROVADO |
| Hoje · Tarefas & Projetos | criar / concluir / cancelar / bloquear (com motivo) / retomar tarefa, dependências (ciclo recusado), prioridade explicável, criar projeto com objetivo e prazo, progresso e viabilidade | PROVADO (QA 2.x; runtime-core) |
| Hoje · Histórico | estado do dia persistido | PROVADO |
| Hoje · Context Panel | status do armazenamento, Supabase não conectado, Google Agenda/Gmail "não conectado", próximo item real, marcos do dia reais; avisos da faculdade marcados como exemplo | PROVADO |
| Guardian · Ações / Auditoria | Action Center e audit log reais; aprovar/recusar passam pelo Guardian; exemplos só em demo | PROVADO (QA 3.5–3.10) |
| Finanças | contestação real no Guardian; estado real na lista de anomalias; selo "Dados de exemplo" no cabeçalho | PROVADO |
| Corpo · Modo Treino | cada série e carga vão para a sessão real; sessão sobrevive a recarregar; finalizar grava no histórico; histórico real na aba Fichas | PROVADO (QA 4.2–4.3; J4) |
| Espiritual | gratidão salva; oração concluída registra prática com minutos reais; revisão de memória usa SM-2 e mostra o intervalo calculado | PROVADO (QA 4.0–4.1; J5) |
| Lembretes | Reminder Engine v2 único (v1 removido do AgendaContext); entrega na Dynamic Island com "Abrir compromisso" que reconhece o lembrete | PROVADO (J1) |
| Dynamic Island / Sidebar | números calculados | PROVADO / PARCIAL |
| E-mail | **sem tela** (é do Anti). Camada funcional pronta: `useEmailWorkspace()` | PROVADO (email-local) |

## 4. O que continua fixture (sempre marcado)

Conteúdo das contas/transações/metas de Finanças · fichas de treino e números de
prontidão/medidas do Corpo · passagens bíblicas, planos de leitura e intenções de oração ·
avisos da faculdade · casos da Cadeia Causal e Radar do Guardian · trilhas da Educação ·
e-mails e tarefas do modo demo. Tudo isso aparece com "Dados de exemplo" ou só com `?demo=1`.

## 5. O que continua bloqueado

| Item | Por quê |
|---|---|
| Supabase | não conectado nesta rodada (decisão do pedido) — persistência local |
| Gmail / Outlook | sem OAuth/backend; `providerStates()` responde BLOQUEADO com motivo |
| Google Agenda / Outlook Agenda | idem |
| Executor de contestação bancária | não existe integração com banco/Open Finance |
| Notificação nativa de celular | só Web Notification + Dynamic Island |

## 6. E-mail — camada funcional

- `src/domains/email/providers/local.ts`: **provedor local**. O usuário cola um e-mail
  ("De:", "Assunto:", "Data:" em PT ou EN) e ele entra no mesmo pipeline de um provedor
  real (classificação → risco → extração → candidatos → Guardian → lembretes/Agenda).
  Origem `manual`, provedor `local`; id estável pelo conteúdo (reimportar não duplica).
- `os.importLocalEmail(raw | input)` no runtime.
- `src/lib/useEmailWorkspace.ts`: `inbox` (DataState: `permission-required` enquanto
  vazio), `providers`, `proposals` (as mesmas do Action Center do Guardian), `importLocal`,
  `approve`, `reject`, `analysis`, `candidates`, `filter`.
- Provas: suíte `email-local` (14 checagens), incluindo reimportar após recarregar.

## 7. O que veio do minha-vida — classificação P0–P3

Fonte: seção 27 do inventário (`docs/MEDUSA_COMPLETE_PRODUCT_INVENTORY.md`). O minha-vida
é fonte histórica, não de verdade.

| Prioridade | Capacidade | Situação no Medusa depois desta rodada |
|---|---|---|
| **P0** | Lembretes com prioridade/janelas e "nunca perder em silêncio" | Reminder Engine v2 único, T-30/15/5/0, dedup, ack, cooldown — PROVADO. Janelas de silêncio: NÃO IMPLEMENTADO |
| **P0** | Ação só com aprovação + nunca mentir sobre execução (Guardian L1/L2/L3, ledger, idempotência) | Guardian único com executores honestos e snapshot — PROVADO. Trust real alimentado por uso: PARCIAL |
| **P0** | Hoje = agenda real + próxima melhor ação | PROVADO (Context Aggregator + Recommendation) |
| **P0** | Persistência real entre aparelhos (Supabase + RLS) | BLOQUEADO (local por decisão) |
| **P1** | Gmail: avisos do EAD, filtro executivo | pipeline + provedor local — PROVADO; Gmail real BLOQUEADO |
| **P1** | Google Agenda bidirecional | contrato pronto — BLOQUEADO |
| **P1** | Treino com carga por dia e histórico | sessão real + progressão — PROVADO; wger/Personal Trainer IA: NÃO IMPLEMENTADO |
| **P1** | SRS SM-2 | SM-2 no Espiritual ligado à UI — PROVADO; baralho de Inglês: NÃO IMPLEMENTADO |
| **P1** | Projetos com tarefas e dependências | PROVADO (Kanban do Maestro: NÃO IMPLEMENTADO, P3) |
| **P1** | Planner nas brechas da agenda (Motor Matinal) | Planner respeita trabalho e sono (J2.7, pelo runtime) e deslocamento/buffer (`personal-os/planner-recs` 2.2–2.3); sem disparo automático de manhã — PARCIAL |
| **P2** | Finanças via Open Finance (Pluggy), fatura por `billForecastDate` | BLOQUEADO (sem backend) |
| **P2** | Clima + chuva nos trajetos, briefing por IA | NÃO IMPLEMENTADO |
| **P2** | Command palette que marca hábito/executa ação | NÃO IMPLEMENTADO (⌘K atual com 4 ações) |
| **P2** | Desfazer exclusão adiada + seleção múltipla | PARCIAL (Agenda) |
| **P2** | PWA instalável | NÃO IMPLEMENTADO |
| **P3** | Gamificação (XP, streak, loja, confete) | NÃO IMPLEMENTADO — reavaliar; não virar cemitério de features |
| **P3** | Ponte Android (MacroDroid) | NÃO IMPLEMENTADO |
| **P3** | Maestro (Blackout, Pacto de Ulisses) | NÃO IMPLEMENTADO |
| **P3** | Bíblia completa no banco + pool curado | NÃO IMPLEMENTADO (depende de backend) |

## 8. Jornadas (5) — `scripts/foundation-tests/integration/journeys.ts`

| Jornada | Caminho provado | Estado |
|---|---|---|
| J1 Consulta médica | Agenda → lembretes 14:30/14:45/14:55/15:00 sem duplicar → Island + Web Notification → Hoje "próximo em 10 min" → ack + check-in sobrevivem a recarregar → nada reenviado. Variante e-mail: proposta L2 → aprovar → Agenda 18:00, sem duplicar lembretes | PROVADO |
| J2 Faculdade | e-mail do professor → prazo/tarefa no Guardian → aprovar → tarefa → projeto → prioridade → recomendação → planner → Agenda | PROVADO |
| J3 Financeiro | transações → anomalia → Guardian → aprovação → "executor não conectado" → audit log | PROVADO |
| J4 Treino | ficha → sessão → série → descanso → progressão → histórico | PROVADO |
| J5 Espiritual | leitura → memorização SM-2 → oração → presença (sem cobrança de sequência) | PROVADO |

## 9. Testes

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npm run lint` | 8 warnings — os mesmos 8 do `81ee3f6` (nenhum novo) |
| `npm run build` | ok |
| `npm run test:foundation` | 64/64 |
| `npm run test:domains` | 676/676 |
| `npm run test:reminders` | 17/17 |
| `npm run test:personal-os` | 230/230 |
| `npm run test:email` | 148/148 |
| `npm run test:integration` (novo) | 85/85 — runtime-core 27, jornadas 37, cronograma 7, email-local 14 |

## 10. Browser QA — `scripts/qa-personal-os-integration.js`

Chromium real contra o **build de produção** (`next start`), 38/38:
Hoje vazio de verdade; tarefa criada sobrevive a recarregar; Contestar → Guardian →
Aprovar → "executor não conectado" (nunca "estorno enviado"); contador do Guardian sobe e
zera; auditoria registra `DISPUTE_CHARGE`; gratidão e série de treino sobrevivem a
recarregar; `?demo=1` marca fixtures; **390 / 820 / 1024 / 1440 sem rolagem horizontal**
em Hoje, Guardian e Finanças; `prefers-reduced-motion`; **zero erro de console/hidratação**.
Capturas em `qa-screenshots/personal-os-integration/` (ignorado pelo git).

Limitação do ambiente: o Google Fonts é bloqueado pelo proxy deste container, então os
ícones Material aparecem como texto nas capturas — não é defeito do app.

**Atenção para os scripts de QA do Anti**: como a Agenda e a Hoje não usam mais fixtures
fora do modo demo, scripts que dependem de "Revisar bibliografia" ou dos eventos semeados
(`qa-domains-browser.js`, `qa-agenda*.js`) precisam abrir com `?demo=1`. Não alterei esses
scripts.

## 11. Arquivos

Fundação: `src/foundation/runtime/personalOS.ts`, `actions/executors.ts`,
`guardianSnapshot.ts`, restaurações em `actionBus.ts`, `guardian/{approval,auditLog,trust}.ts`,
`guardianTrace/{outcome,decisionContext,feedback}.ts`, `actions/submit.ts`,
`types/action.ts`, `domains/{index,finance}.ts`.
E-mail: `src/domains/email/providers/local.ts`, `model/types.ts`, `index.ts`.
Ponte com a UI: `src/context/PersonalOSContext.tsx`, `src/lib/{dataMode,agendaExamples,islandDefaults,useEmailWorkspace,agendaBusy}.ts`,
`src/components/ui/ProvenanceBadge.tsx`, `src/fixtures/emailFixtures.ts`,
`src/components/hoje/useHojeData.ts`.
Telas (intervenção mínima): `hoje/{HojeContainer,TodayContextPanel,hojeTasksFixtures}`,
`guardian/{GuardianContainer,GuardianContextPanel,guardianFixtures}`,
`financas/FinanceContainer`, `corpo/BodyContainer`, `espiritual/SpiritualContainer`,
`shell/{Sidebar,DynamicIsland,MobileIsland,ContextPanel}`, `education/{cronogramaPlanner,EnemHub,CronogramaOverlay}`,
`context/AgendaContext`, `app/layout`.
Testes: `scripts/foundation-tests/integration/*`, `scripts/qa-personal-os-integration.js`,
`package.json` (`test:integration`).

## 12. O que agora o usuário consegue fazer que antes não conseguia

1. **Abrir o Medusa e ver o próprio dia, não um dia inventado.** Sem compromissos, a Hoje
   diz isso; com compromissos, mostra o de agora, o próximo e o que já passou sem concluir.
2. **Criar uma tarefa, fechar a aba e encontrá-la amanhã** — com prazo, minutos, projeto,
   dependência, bloquear com motivo, cancelar, retomar.
3. **Criar um projeto com objetivo e prazo** e ver progresso e viabilidade calculados.
4. **Receber os avisos de uma consulta às 14:30, 14:45, 14:55 e 15:00**, uma vez cada,
   e abrir o compromisso pelo aviso.
5. **Contestar uma cobrança e saber exatamente o que aconteceu**: proposta → aprovação no
   Guardian → "executor não conectado". Antes a tela dizia que o estorno tinha sido enviado.
6. **Aprovar ou recusar ações de verdade no Guardian** e ver o registro na auditoria,
   mesmo depois de recarregar.
7. **Aceitar uma recomendação e ela virar um bloco na Agenda.**
8. **Gerar o cronograma do ENEM para a semana real**, sem blocos empilhados nem por cima
   de compromisso existente.
9. **Registrar séries e cargas no treino e retomar a sessão** depois de recarregar.
10. **Guardar gratidão, registrar oração e revisar versículos com repetição espaçada real.**
11. **Colar um e-mail** (via `useEmailWorkspace`, quando o Anti fizer a tela) e ver o
    compromisso/prazo dele virar proposta no Guardian.
