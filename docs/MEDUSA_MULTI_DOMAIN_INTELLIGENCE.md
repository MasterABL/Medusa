# MEDUSA — Multi-Domain Intelligence

Documentação da fundação arquitetural entregue na "Foundations Round" (ver
relatório da PR). Este documento explica **como** o sistema funciona; o
relatório da PR explica **o que** foi provado e **o que** ainda não foi.

Todo o código descrito aqui vive em `src/foundation/`, é 100% aditivo, e não
alterou nenhum componente de Agenda/Educação/Shell/Dynamic Island existente.

---

## 1. Princípios

1. **Domínios especialistas, plataforma comum.** Cada domínio (Educação,
   Agenda, Finanças, Corpo, Guardian...) tem sua própria inteligência,
   vocabulário e capacidade de agir — mas todos compartilham contexto, tempo,
   eventos, ações, objetivos, confiança, governança e experiência.
2. **Evento ≠ Ação.** Um evento diz "algo aconteceu"; uma ação diz "algo será
   feito". Ninguém executa nada sozinho ao emitir um evento.
3. **Nenhum domínio tem bypass.** Toda ação passa por
   `Domain → Action → Guardian Policy → Authorization → Execution`. Não existe
   atalho que pule o Guardian, mesmo para ações L1.
4. **Confiança é evidência, não permissão.** O motor de confiança (`trust.ts`)
   só descreve o que já aconteceu. Quem decide se isso já é suficiente pra
   liberar autonomia é a política (`policy.ts`) — nunca o próprio domínio.
5. **Granularidade é (domínio, tipo de ação), nunca domínio inteiro.**
   "Agenda = 80% de confiança" não existe neste sistema. "Agenda mover estudo
   dentro de janela = alta confiança" e "Agenda cancelar compromisso = sempre
   aprovação" convivem lado a lado.
6. **Fundação ≠ feature.** Todo domínio ainda não construído (Finanças, Corpo)
   está marcado explicitamente `isLive: false` e suas capabilities
   `implemented: false`. Nada aqui finge ser produto pronto.

---

## 2. Domínios

| Domínio | `isLive` | Papel |
|---|---|---|
| `hoje` | true | Não é especialista — é a camada de síntese/contexto/atenção (seção 13/3). |
| `agenda` | true | Especialista em tempo: disponibilidade, conflitos, buffers, recorrência. |
| `education` | true | Especialista em aprendizado: conteúdo, revisão, cronograma pedagógico. |
| `guardian` | false* | Governança em si já é lógica real (`src/foundation/guardian/`); a superfície de produto (dashboard) ainda não existe. |
| `finance` | false | Contrato futuro completo (`src/foundation/domains/finance.ts`) — zero implementação de produto. |
| `body` | false | Contrato futuro completo (`src/foundation/domains/body.ts`) — zero implementação de produto. |
| `spiritual` | — | Não registrado ainda de propósito — mas o tipo `DomainId` já o inclui, e o teste de contrato 1.1 prova que registrá-lo não exige nenhuma mudança estrutural. |

Registrar um domínio novo é sempre a mesma chamada:

```ts
import { registerDomain } from '@/foundation/domainRegistry';

registerDomain({
  id: 'spiritual',
  label: 'Espiritual',
  isLive: false,
  capabilities: [...],
  eventTypes: [...],
  actionTypes: [...],
});
```

Nenhum hardcode espalhado pelo sistema — quem precisar saber "quais domínios
existem" consulta `DomainRegistry.listDomains()`.

### Persona

Cada domínio pode ter uma `DomainPersona` (voz, tom, vocabulário, estilo de
interação, estilo de decisão). Propositalmente não-caricata: a diferença
aparece em como o texto é escrito e em quando o domínio toma iniciativa
(`initiativeLevel`), não num personagem fictício com nome próprio.

---

## 3. Eventos e Ações

### Domain Event Bus (`src/foundation/eventBus.ts`)

- `publish({ domain, type, payload, dedupeKey? })` — qualquer domínio publica.
- `subscribe(type | '*', listener)` — qualquer domínio (ou o próprio Guardian,
  ou Hoje, ou o Island) escuta, sem precisar importar o domínio emissor.
- Dedup por `dedupeKey` dentro de uma janela — dois eventos idênticos num
  curto intervalo contam como um só publish.

### Action Bus (`src/foundation/actionBus.ts`)

- `createAction({ domain, type, intent, payload, riskLevel, reversible })` —
  nasce `PROPOSED`.
- `dispatch(action)` — o ÚNICO caminho válido pra decidir o destino de uma
  ação. Por baixo dos panos chama `Guardian.evaluate()`.
- `updateStatus(id, status)` / `undo(id)` — transições e desfazer (só ações
  `reversible: true`, só depois de `SUCCESS`).

Fluxo completo (o mesmo do exemplo da seção 58 da missão), provado pelo teste
de contrato #5:

```
Educação emite LESSON_COMPLETED
  → listener cria Action CREATE_REVIEW_BLOCK (source = event.id)
  → ActionBus.dispatch(action)
      → Guardian.evaluate(action)
          → policy.classify() decide L1/L2/L3
          → se precisar, approval.createApprovalRequest()
          → auditLog.record() SEMPRE, mesmo em L1 automático
  → Action volta com status/autonomyLevel já definidos
```

---

## 4. Guardian

`src/foundation/guardian/` — quatro peças, uma fachada:

- **`policy.ts`** — mapa imutável `(domain, actionType) → AutonomyPolicyRule`.
  Sem regra registrada = **risco máximo (L3)** por padrão, nunca liberal.
  Uma ação `reversible: false` nunca auto-executa em L1, mesmo que a regra
  diga que pode (rede de segurança contra política mal configurada).
- **`trust.ts`** — `ActionTrustProfile` por `(domain, actionType)`, com um
  `state` interpretável (`sem_evidencia` / `aprendendo` / `confiavel` /
  `requer_atencao`) derivado da taxa de aceitação **recente** (últimas 10
  ocorrências), nunca uma média eterna.
- **`approval.ts`** — `ApprovalRequest` append-first: nasce `pending`, só
  muda de estado por `approve()`/`reject()`/expiração — nunca reescrita em
  silêncio, nunca resolvida duas vezes.
- **`auditLog.ts`** — append-only. Toda avaliação gera uma entrada, mesmo
  quando o resultado é "executa sozinho".
- **`index.ts` (`evaluate()`)** — a fachada única. Nenhum domínio deveria
  chamar as quatro peças acima diretamente.

### Autonomia L1/L2/L3 — exemplos reais registrados nesta rodada

| Domínio | Ação | Nível | Reversível |
|---|---|---|---|
| Agenda | Mover estudo dentro de janela autorizada | L1 | sim |
| Agenda | Reagendar compromisso importante | L2 | sim |
| Agenda | Cancelar compromisso | L3 | não |
| Educação | Criar revisão derivada de aula concluída | L1 | sim |
| Corpo | Encaixar caminhada curta em janela autorizada | L1 | sim |
| Finanças | Categorizar transação conhecida | L1 | sim |
| Finanças | Alterar orçamento | L2 | sim |
| Finanças | Realizar pagamento | L3 | não |

Mesmo um `actionType` com regra L1 só executa sozinho quando o trust profile
já sustenta isso (amostra + taxa de aceitação recente) — a "primeira vez" de
qualquer ação sempre passa por supervisão, mesmo que a política a autorize em
tese.

---

## 5. Comunicação proativa (`src/foundation/messaging/proactiveMessage.ts`)

Uma `ProactiveMessage` carrega `evidence` (o quê, por quê, baseado em quê,
impacto) e uma lista de `surfaceTargets` (`guardian` / `hoje` / `island` /
`notification`). `presentFor(message, surface)` adapta a apresentação por
canal — nunca repete o mesmo texto cru quatro vezes.

Anti-spam: `publish()` recusa uma nova mensagem do mesmo
`(domain, cooldownKey)` enquanto o cooldown anterior não expirou.
`groupRecent(windowMs)` permite sintetizar várias mensagens simultâneas de
domínios diferentes numa única apresentação em vez de empilhar N avisos.

---

## 6. Dynamic Island multi-evento (`src/foundation/island/eventQueue.ts`)

**Importante:** o catálogo de produção do Island (`IslandState`, em
`src/types/shell.ts`) continua **fechado em 10 estados canônicos**. Esta fila
não inventa um 11º estado — ela resolve outro problema: com vários domínios
emitindo eventos, qual deles deveria estar em exibição agora, usando os
mesmos 10 estados já existentes.

- Precedência: `severity` (critical > attention > info) → `priority`
  numérico → mais antigo primeiro (FIFO no empate).
- `wouldInterrupt(current, incoming)`: um evento `interruptible` cede lugar a
  um evento de maior precedência; o evento interrompido continua na fila e
  volta a competir pelo `peek()` depois.
- Dedup por `dedupeKey` dentro de uma janela, igual ao Event Bus.

---

## 7. Sound Map e Motion Identity

- **Sound Map** (`src/foundation/sound/soundMap.ts`): cada domínio registra
  um conjunto FECHADO de chaves válidas (`DomainSoundProfile.keys`). Uma
  chave fora desse conjunto é rejeitada por `isValidSoundKey()` — isso é o
  que impede som em hover/filtro banal/navegação trivial virar hábito por
  acidente. Não é um motor de síntese novo — continua reaproveitando
  `src/lib/audioFeedback.ts`.
- **Motion Identity** (`src/foundation/motion/motionIdentity.ts`): cada
  domínio tem uma `metaphor` (`construcao` / `deslocamento` / `fluxo` /
  `respiracao` / `contencao`) e uma lista de `primitives` — nomes de classes
  CSS **já existentes** no projeto (`stagger-item`, `fadeRise`, etc.). Não
  define keyframes novos; só nomeia a intenção e aponta pro primitivo certo.

---

## 8. Goals, Metrics e Context Panels

- **Goals** (`src/foundation/goals/goalModel.ts`): `Goal` com `Milestone[]`;
  `progress` é sempre derivado dos milestones (`computeGoalProgress`), nunca
  digitado à mão. `Insight` carrega `evidence[]` explícita.
- **Metrics** (`src/foundation/metrics/metricModel.ts`): `MetricDefinition`
  com `defaultVisibility: 'compact' | 'expanded'` — a base de progressive
  disclosure ("Hoje está estável" → `[Explorar]` → detalhe).
- **Context Panel Registry** (`src/foundation/contextPanel/`): cada domínio
  se registra com `implemented: true/false`. Educação e Agenda já apontam
  `true` (os componentes de UI já existem); Finanças/Corpo/Guardian ficam
  `false` até ganharem painel de verdade — nunca um `GenericContextPanel`
  fingindo ser específico.

---

## 9. Cross-domain: a ponte que já existia

Achado importante desta rodada: a Agenda **já é agnóstica ao significado**
dos itens que recebe. `AgendaItem` (em `src/types/agenda.ts`, código
pré-existente, não tocado nesta rodada) já tem:

```ts
domain: AgendaDomain; // 'personal' | 'education' | 'body' | 'finance' | 'work' | 'external'
source: AgendaSourceRef; // { sourceType, sourceId?, sourceLabel? }
```

Isso já satisfaz literalmente a seção 14 da missão ("a Agenda sabe que isso
veio de Corpo, mas não precisa saber qual músculo está sendo treinado") —
**nada precisou ser adicionado na Agenda para isso**. `AgendaSourceType` já
inclui `'finance_deadline'` e `'workout'`, ou seja, a ponte pra Finanças e
Corpo colocarem itens na Agenda sem a Agenda entender de dinheiro ou treino
já está pronta. `src/foundation/domains/finance.ts` documenta essa ponte
explicitamente.

---

## 10. O que fica pra próxima rodada (limites explícitos desta fase)

- **Nenhum Provider React chama `bootstrapDomains()` ainda.** A integração
  com a árvore de componentes (contexto real, hooks, UI do Guardian) é
  trabalho de UI — decisão consciente pra não competir com o trabalho de
  experiência em andamento em paralelo (Agenda/Cronograma/Educação/motion).
- **Nenhuma persistência real.** Todo estado aqui é um módulo em memória
  (mesmo padrão já usado em `src/lib/audioFeedback.ts`). Se algum dia for
  necessário persistir Guardian/Trust/Goals de verdade, é decisão de quem
  for integrar isso a um backend — não desta camada.
- **Dashboard do Guardian, questionário definitivo de Corpo, telas de
  Finanças**: nada disso existe. Só o contrato que os torna possíveis sem
  redesenhar Domain Registry/Guardian/Agenda quando chegar a hora.
- **Futuro Espiritual**: não implementado, mas o teste de contrato #1 prova
  que registrá-lo não pede nenhuma mudança estrutural.
