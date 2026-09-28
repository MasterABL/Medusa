# Domínio Espiritual

Código: `src/domains/spiritual/`. Sem UI. Testes: `scripts/foundation-tests/domains/spiritual.ts`.

## Limites deliberados

Infraestrutura de domínio apenas. **Não** assume religião nem crença, **não** define conteúdo teológico,
**não** há IA prescritiva. `focusAreas`, `label` e `content` são texto livre do usuário — nunca enum
prescrito pelo sistema. Todas as capabilities continuam `implemented: false` no registro do domínio
(`isLive: false`): existe motor real por baixo, mas não existe produto.

## Entidades

`SpiritualProfile`, `SpiritualPractice`, `SpiritualReflection`, `SpiritualGoal`, `SpiritualRoutine`.
`SpiritualGoal.currentPracticeCount` é **derivado** das práticas vinculadas (`relatedGoalId`) e nunca
aceito manualmente: `createGoal` exige `0` e `validateGoalConsistency` detecta descolamento do histórico.

## Privacidade (seção 26)

- Metadado × conteúdo: `listReflectionMetadata()` devolve só `{ id, createdAt, visibility, relatedPracticeId,
  contentLength }` — nunca o texto nem um trecho.
- O evento `REFLECTION_CREATED` carrega apenas `reflectionId` e `contentLength`.
- O contrato público (`api.ts`) **não tem** `getReflections()`; só `getReflectionsMetadata()`.
- `visibility` só aceita `'private'`; qualquer outro valor é rejeitado (não existe mecanismo de compartilhar).
- `serialization.ts` de reflexão contém o conteúdo: só para um adapter de persistência privado.
- **Não implementado:** consentimento formal, escopo de acesso por consumidor, criptografia em repouso.

## Registrar × agir

Registrar prática/reflexão/meta é **entrada de dado** do usuário e não passa pelo Guardian. Só ações derivadas
pelo sistema viram `Action`:

| Ação | Teto |
|---|---|
| `SCHEDULE_PRACTICE` | L1 |
| `UPDATE_GOAL_PROGRESS` | L1 |

Orquestração real: `recordPractice` → evento `PRACTICE_COMPLETED` → se há meta vinculada, `UPDATE_GOAL_PROGRESS`
pelo Guardian → progresso recalculado pelo histórico → marcos do tipo "N práticas" atingidos automaticamente.
Sem confiança acumulada a ação é L2 e o progresso **não** muda sozinho.

## Agenda e Hoje

A Agenda só recebe `domain / sourceType / sourceId`. Como `AgendaDomain` (`src/types/agenda.ts`, código da
Agenda, não tocado) ainda não tem valor para Espiritual, a ponte cai em `'external'` — comportamento
documentado, não erro. `hojeResolver` devolve "Meta X avançou — N/M práticas", nunca conteúdo de reflexão.

## Persistência

`SpiritualRepository` + `createInMemorySpiritualRepository()`.


---

# Espiritual: propósito + Bíblia + prática + continuidade + estudo

Testes: `spiritual-intelligence.ts` (89), `integration-round2.ts` (cenários 3 e 4), `shared-consistency.ts`.

**Limites:** não assume tradição nem autoridade espiritual. Tradição/língua/tradução preferida só **personalizam** (`SpiritualProfile.tradition`). O domínio nunca gera texto de escritura; texto bíblico só existe se um `BibleTextProvider` o devolver.

| Peça | Arquivo | O que é |
|---|---|---|
| Referência bíblica | `model/bible.ts` | 66 livros / 1189 capítulos (validado em teste); cânone `open` para outras tradições; parse/format/ordenação |
| Plano de leitura | `services/readingPlanEngine.ts` | posição, o que vem depois, o que ficou, dias desde a última leitura; **retomar move a âncora sem apagar histórico**; pausa congela |
| Estudo | `services/studyEngine.ts` | texto × explicação de IA × reflexão pessoal com origem declarada e validada; conclusão + próxima exploração; perguntas por **template** (não IA) |
| Práticas | `services/practiceEngine.ts` | oração, leitura, estudo, contemplação, silêncio; intenção, frequência, duração, contexto, status; continuidade sem "streak" |
| Propósito | `services/purposeEngine.ts`, `suggestionEngine.ts` | liga práticas/estudos/planos/metas; continuidade em vez de pontos; propósito pausado suprime sugestões |
| Versículo do dia | `services/dailyVerse.ts` | referência escolhida de forma determinística; sem candidato → `null`; plano de hoje tem prioridade; texto só do provedor |
| IA contextual | `services/aiContext.ts` | contexto **autorizado por consentimento**; resposta estruturada que se declara não-autoridade; assistente por template |
| Privacidade | `services/privacy.ts` | leitura de conteúdo privado sempre registrada; coleta de itens privados só para auditoria |
| Agenda | `adapters/agendaSuggestions.ts` | oração→bloco de horário · leitura→compromisso · estudo→sessão · contemplação/silêncio→prática; prioridade espiritual |
| Hoje | `adapters/hojeIntelligence.ts` | até 3 itens; só metadado; mensagens proativas com cooldown |

## Linguagem

Nenhuma mensagem usa culpa (`GUILT_WORDS` é testada contra todas as mensagens de continuidade). Em vez de "você falhou 4 dias": "Você ficou alguns dias sem orar. Quer retomar hoje?".

## Privacidade (reforçada)

- Reflexões, orações, intenções de prática e itens privados de estudo **não têm flag de consentimento** — não dá nem para pedir.
- `assertContextIsPrivacySafe` recusa contexto que contenha trecho de item privado (mesma heurística que o Guardian usa nos canais de saída — `shared/privateText.ts`).
- Cenário provado: eventos, mensagens proativas e contexto de IA de uma sessão completa foram auditados pelo Guardian sem achar a reflexão; controle positivo mostra que um vazamento em log seria pego.
- Heurísticas de resposta de IA (voz divina, citação longa sem referência) são **heurísticas**, não moderação teológica.

## Classificação honesta

- **PROVADO:** tudo acima com teste real, incl. plano atrasado→retomada, separação texto/IA/reflexão, versículo sem fabricação, contexto de IA sem privados, Agenda/Hoje só com metadado.
- **PARCIAL:** repositório em memória; `SpiritualRoutine` (rodada anterior) coexiste com `PracticeDefinition` (sobreposição conhecida, não removida); Agenda cai em `external` (a Agenda não tem `spiritual`); o Hoje da fundação só vê o que for publicado explicitamente.
- **NÃO IMPLEMENTADO:** texto bíblico (nenhum provedor real — existe um corpus em outro repositório, `biblia_texto`, que um adapter futuro pode envolver), IA/LLM real, consentimento persistido, criptografia em repouso, UI, cânones prontos além dos 66 livros.
