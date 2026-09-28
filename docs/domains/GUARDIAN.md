# Guardian

Código: `src/foundation/guardian/*` + `src/foundation/guardianLifecycle.ts`.
Testes: `scripts/foundation-tests/domains/guardian.ts` e `contract-tests.ts`.

## Princípio

Toda ação de qualquer domínio passa por `Guardian.evaluate()`. Nenhum domínio tem atalho.

```
Domain → Action → Policy → (Trust como evidência) → Autorização → Execução → Auditoria
```

## Peças

| Peça | Papel |
|---|---|
| `policy.ts` | mapa imutável `(domain, actionType) → teto L1/L2/L3`. Tipo sem regra = **L3, risco máximo**. Regra L1 com ação irreversível é rebaixada para L2. |
| `trust.ts` | perfil por `(domain, actionType)` derivado de aceito/rejeitado/corrigido. Estados `sem_evidencia`, `aprendendo`, `confiavel`, `requer_atencao`. Sempre com a evidência bruta. |
| `approval.ts` | `ApprovalRequest` `pending → approved | rejected | expired`. Resolver duas vezes lança. |
| `auditLog.ts` | append-only: só `record()` escreve; `listForAction()` lê o histórico de uma ação. |
| `explanation.ts` | `explain(evaluation)` → `{ reason, evidence, impact, requestedDecision, autonomyLevel, auditReference }`. Estruturado, sem cadeia de raciocínio. |
| `guardianLifecycle.ts` | liga aprovação ↔ estado da Action (ver abaixo). |

## Confiança nunca concede autoridade

A política decide o que é possível; a confiança só decide, dentro do teto, se uma ação L1 pode rodar
sozinha. Sem histórico (< 5 amostras e aceitação < 85%), uma ação L1 vira **L2 (proposta)**. L2/L3 nunca
sobem, com qualquer quantidade de aceitações — coberto por teste (50 aceitações, L3 continua L3).

## Máquina de estados

```
AWAITING_APPROVAL ──approve──▶ AUTHORIZED ──beginExecution──▶ EXECUTING ──▶ SUCCESS | FAILED
        │
        ├──reject───▶ REJECTED    (terminal — nunca executa)
        └──expiry───▶ CANCELLED   (terminal — aprovar depois lança)
```

- `resolveApproval` só age em `AWAITING_APPROVAL`; toda aprovação tem `expiresAt` (24h por padrão).
- `beginExecution` só aceita `AUTHORIZED` — executar antes de aprovar, ou depois de rejeitar, lança.
- Cada transição acrescenta uma linha ao audit log; decisão humana alimenta o Trust Engine.
- `ActionBus.undo` só desfaz ação **reversível** que já teve `SUCCESS`.

## Independência entre domínios

Um domínio novo só precisa registrar `AutonomyPolicyRule`s. Testado: um tipo de ação inexistente é L3 e passa
a L2 depois de **uma** regra registrada, sem tocar o núcleo do Guardian.

## O que NÃO existe

- Sem persistência: approvals, audit e trust vivem em memória do processo. Um adapter de banco é trabalho futuro.
- `expireOverdueApprovals` precisa ser chamado por alguém (não há timer interno).
- Nenhuma UI de aprovação.
- Condições de corrida reais entre processos não são testáveis em memória; só a idempotência sequencial é provada.
