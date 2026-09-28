# Domínio Corpo

Código: `src/domains/body/`. Sem UI. Testes: `scripts/foundation-tests/domains/body.ts`.

## Limites deliberados

Corpo **não é** rastreador fitness nem sistema médico. Não há diagnóstico, inferência de doença nem
recomendação médica. Não existe integração com wearable ou dado de saúde real. O domínio trata rotina,
movimento e energia/sono/recuperação **relatados pelo usuário**, e planejamento seguro de atividade.
`IntensityDescriptor` (`leve | moderada | desafiadora`) é descritor de planejamento, nunca clínico.

## Fluxo Pergunta → Resposta → Sessão → Perfil

- `model/diagnosticQuestions.ts` — catálogo real de 14 perguntas (`single | multi | scale | free_text | duration`).
- `BodyAnswer` — `id, questionId, type, value, answeredAt, source, confidence?, notes?`.
- `services/diagnosticEngine.ts` — iniciar/responder/concluir/abandonar. Responder de novo **substitui**
  a resposta anterior; responder numa sessão concluída lança.
- `validators/` — valida o formato da resposta contra a pergunta (opção inexistente, escala fora da faixa,
  tipo divergente).
- `services/profileEngine.ts` — monta o `BodyProfile`. Cada campo é `ProfileField<T> = { value, origin }`
  com `origin: 'self_reported' | 'derived'`. Sem as 5 respostas obrigatórias, **não constrói** o perfil.

## Routine load (`services/routineLoadHeuristic.ts`)

Heurística **determinística e transparente** de organização de rotina, não diagnóstico:

- 60% do score = minutos comprometidos (trabalho + estudo + deslocamento + atividade) / 1440.
- +0,2 sono `ruim` (+0,1 `regular`); +0,2 energia `baixa` (+0,1 `moderada`) — ambos autorrelatados.
- `>= 0,66` alta · `>= 0,35` moderada · senão baixa. A evidência de cada fator vem na saída.

## Planejamento (`services/planningEngine.ts`)

`profile + janelas disponíveis → BodyPlan candidato` (status `draft`). Determinístico. Iniciante começa em
caminhada leve; academia/`tenho_academia` → treino em academia; senão treino em casa. Sem janelas
informadas, o plano diz isso em `notes` em vez de inventar horário. As janelas vêm de fora (Agenda);
o domínio nunca calcula disponibilidade de horário.

## Eventos e ações

Eventos: `BODY_PLAN_CREATED`, `BODY_SESSION_COMPLETED`, `ROUTINE_LOAD_CHANGED`, `RECOVERY_SUGGESTED`,
`BODY_SESSION_SCHEDULED`. **Emitido de verdade:** só `BODY_PLAN_CREATED` (por `createBodyPlan`, apenas quando o
plano foi de fato persistido). Os outros quatro são tipos declarados sem emissor: sessão concluída, mudança de
carga e agendamento confirmado dependem de fontes que ainda não existem (registro de sessão feita, histórico
de carga do dia anterior, confirmação vinda da Agenda).

| Ação | Teto |
|---|---|
| `CREATE_BODY_PLAN`, `SCHEDULE_LIGHT_ACTIVITY`, `MOVE_BODY_SESSION`, `PAUSE_BODY_PLAN`, `RESUME_BODY_PLAN` | L1 (com confiança; senão L2) |
| `SCHEDULE_WORKOUT` | L2 |

`SCHEDULE_WORKOUT`/`SCHEDULE_LIGHT_ACTIVITY`/`MOVE_BODY_SESSION` só produzem o pedido de agendamento;
quem decide horário e cria o item é a Agenda. Só `CREATE`/`PAUSE`/`RESUME` alteram o `BodyRepository`.

## Insights

`routine_load_high`, `recovery_suggested`, `workout_completed`, `plan_ready`, `schedule_window_found`, ou
`insufficient_evidence`. Todos com observação, evidência, impacto, severidade e confiança.

## Persistência

`BodyRepository` + `createInMemoryBodyRepository()`; `serialization.ts` valida na volta (plano íntegro,
perfil com `origin` em todos os campos).
