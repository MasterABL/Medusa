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


---

# Guardian como runtime de observação → decisão → ação → verificação

Código: `src/domains/guardian/` (o runtime) sobre `src/foundation/guardian*` (política, confiança, aprovação, auditoria — **reaproveitados, não duplicados**).
Testes: `guardian-runtime.ts` (72), `integration-round2.ts`, `shared-consistency.ts`.

> **O que isto NÃO é:** um serviço que roda 24 h. Existe `runGuardianCycle(ctx)` — **runtime preparado para execução contínua**.
> Nenhum agendador existe; um cron/worker futuro só precisa chamá-lo com o mesmo repositório.

## Pipeline (cada etapa é uma função pequena e separada)

| Etapa | Onde | Regra |
|---|---|---|
| Observe/Detect | `auditors/*` + `runtime/ingest.ts` | auditor recebe evidência estruturada e devolve rascunhos; rascunho sem evidência é rejeitado |
| Dedupe | `runtime/ingest.ts` | mesma `dedupeKey` aberta → só conta ocorrência; volta depois de resolvido → **regressão** (mesmo `correlationId`) |
| Classify | `pipeline/classify.ts` | segurança crítica não cai de "alta"; confiança < 0,5 limita a "moderada"; autonomia exigida vem do teto da política |
| Explain | `pipeline/explain.ts` | texto gerado só dos dados: onde, observado, esperado, diferença, por que importa, hipótese |
| Assess | `pipeline/assess.ts` | usa a **mesma** `classify()` da fundação; devolve rota prevista (`auto`/`approval`/`blocked`) e motivo |
| Propose/Authorize | `runtime/handleFinding.ts` | cria `Action` no Action Bus → `dispatch` → decisão da fundação |
| Execute | `runtime/executeAndVerify.ts` | só via `GuardianLifecycle.beginExecution` (exige `AUTHORIZED`) |
| Verify | `pipeline/verify.ts` | esperado × observado; sem verificador → `unverifiable` |
| Record | repositório + Event Bus | eventos append-only; Event Bus recebe só ids/categoria/severidade |

## Auditores

| Auditor | Estado | Observação |
|---|---|---|
| Data | **real** | duplicidade (exata → propõe remoção), campo obrigatório, referência órfã |
| Security | **real** | segredo (a evidência mostra só prefixo e tamanho), config insegura |
| Code | **real** sobre o conteúdo recebido | arquivo grande, `catch` vazio, `@ts-ignore`; nunca sugere correção |
| Product | **real** | contrato × política × emissão. Rodou no registro real e achou 13 inconsistências; 7 (Finanças/Corpo) foram corrigidas, **6 seguem abertas** (ações de Agenda/Educação declaradas sem política — decisão de produto) |
| UX / Visual / Runtime / Integração | **contrato** | aceitam relatos de ferramentas futuras; relato sem referência/observação é rejeitado. Não existe "IA visual" |
| Privacidade do Espiritual | **real** | procura texto privado em canais de saída; evidência cita item e canal, nunca o texto |

## Trust e autonomia (participam da decisão)

- Chave de confiança = `(guardian, actionKey)`. Sem histórico, ação L1 vira **proposta**: "ainda não existe confiança suficiente".
- Só decisões **humanas** (aprovar/recusar) e **falhas** alimentam a confiança. Uma correção automática bem-sucedida **não** a aumenta (evita autoconfiança em laço); uma execução/verificação que falha registra `corrected` e abre **cooldown** da ação.
- Recusa humana → finding `blocked` + cooldown de 7 dias (não repropõe a mesma correção).
- Confiança **expira** (`expireStaleEvidence`, 90 dias por padrão) — chamada no início de cada ciclo.
- L2/L3 nunca sobem por confiança; irreversível com teto L1 é rebaixada para L2.
- Teto de 5 correções automáticas por ciclo; as excedentes ficam autorizadas e executam no ciclo seguinte.
- `previewDomainAutonomyChange` / `previewActionAutonomyChange` mostram **antes de aplicar**: o que passa a ser automático, o que passa a exigir aprovação, o que continua exigindo, o que continua bloqueado (sem executor) e avisos. Usa a `classify()` real; não altera a política.

## Ciclo de vida

Proposta: `PROPOSED → PENDING_APPROVAL → APPROVED | REJECTED | EXPIRED`, `APPROVED → EXECUTING → SUCCEEDED | FAILED` (transições inválidas lançam).
Finding: `detected → awaiting_approval → in_progress → resolved | unverified | failed | blocked`. **`unverified` nunca vira `resolved`** — só uma re-detecção posterior ou verificação.
Rejeitada ou expirada nunca executa (testado). Expirada volta a `detected` e é reavaliada.

## Remediadores

`createRemediationRegistry()`. O runtime nunca conserta nada sozinho: sem remediador registrado → `blocked`.
Embutidos: remoção de duplicata exata (lixeira recuperável, aborta se o registro mantido sumiu) e mascaramento de segredo — ambos sobre **interfaces** de armazenamento (`RecordStore`, `TextStore`), não sobre banco real.
`ROTATE_SECRET` **não tem** remediador (afeta sistemas externos).

## Persistência

`GuardianRepository` (findings, propostas, execuções, cooldowns, eventos append-only, `nextId`) + implementação em memória; o runtime não guarda estado em variável de módulo (verificado por varredura). Serialização versionada de finding e proposta.

## Classificação honesta

- **PROVADO (teste real):** pipeline completo, dedupe, regressão, aprovação/rejeição/expiração, auto-fix permitido e bloqueado (L2, L3, sem remediador, cooldown, cap por ciclo), verificação (verificada, falhou, não verificável), isolamento de falha de auditor, preview de autonomia, expiração de confiança.
- **PARCIAL:** trust, aprovações e auditoria da **fundação** continuam em memória do processo (só findings/propostas/eventos do Guardian passam pelo repositório); `expireOverdueApprovals` expira aprovações de **todos** os domínios; auditores de código/dados/segurança operam sobre evidência entregue, não varrem o repositório sozinhos.
- **NÃO IMPLEMENTADO:** agendador/loop contínuo, adapter de banco, coleta automática de evidência, auditores visuais/UX reais, notificação push de aprovação, UI.
