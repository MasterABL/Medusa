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
