# TASK_QUEUE.md — Fila Operacional

Formato de cada tarefa (preserva o schema original + campos novos exigidos pela consolidação do
Master Plan — nenhum campo antigo foi removido):

```
ID
DOMAIN
PHASE            (novo — número da fase em MASTER_PLAN.md/ROADMAP.md)
PRIORITY
STATUS
DEPENDENCIES
OBJECTIVE / DESCRIPTION
SCOPE
DO NOT TOUCH     (novo — arquivos/áreas que esta tarefa não deve precisar mudar)
ACCEPTANCE CRITERIA
QA REQUIREMENTS / BROWSER QA / REGRESSION
EXPECTED EVIDENCE (novo — o que precisa estar em EVIDENCE.md antes de PROVADO)
```

Status operacional (ciclo de vida da tarefa): `PENDING`, `READY`, `IN_PROGRESS`, `BLOCKED`,
`PROVADO`, `PARTIAL`. Ao reportar evidência de resultado, usar o vocabulário de `AGENT_RULES.md`
(`PROVADO`/`PARCIAL`/`BLOQUEADO`/`NÃO IMPLEMENTADO`). `scripts/agent-orchestrator.cjs` lê o
`TASK ID:` de `ACTIVE_TASK.md` e envia o conteúdo de `HANDOFF.md` (o contrato real) ao executor —
nenhuma mudança de schema aqui quebra o orquestrador.

**Regra de desbloqueio**: a fila não avança pela primeira fase numericamente — avança pela
**primeira tarefa cujas DEPENDENCIES estão todas resolvidas**. Ver seção final "Primeira tarefa
desbloqueada".

---

## TASK-MERGE-PREP-001 (NOVA — primeira tarefa realmente desbloqueada)

```
ID: TASK-MERGE-PREP-001
DOMAIN: Foundation + Agenda (transversal às PRs #1 e #2)
PHASE: 1 e 3
PRIORITY: P0
STATUS: PROVADO (executada nesta sessão — ver EVIDENCE.md → E-020)
DEPENDENCIES: nenhuma (foi uma tarefa de correção de evidência/documentação, não de produto)

OBJECTIVE:
  Corrigir as descrições das PRs #1 e #2 no GitHub para refletir os números reais verificados
  nesta sessão (ver EVIDENCE.md → E-013 a E-019), e deixar um resumo consolidado pronto para que o
  humano tome as decisões HDR-001 (ordem de merge), HDR-003 (ratificação do agrupamento da List
  View) e HDR-010 (ratificação da expansão de Educação) com informação precisa, não alegada.

SCOPE:
  - Editar a descrição de PR #1: trocar "42 testes aprovados" por "23 asserções de teste aprovadas
    (0 falhas), 42 screenshots capturados como evidência visual".
  - Editar a descrição de PR #2: trocar "scripts/qa-agenda.js (30/30 aprovados)" por "29/30
    aprovados — a única falha é causada por bloqueio de TLS a fontes externas (Google Fonts) no
    ambiente onde foi originalmente medido, não um defeito funcional".
  - Adicionar um comentário em cada PR referenciando esta auditoria (EVIDENCE.md → E-013 a E-019)
    para rastreabilidade.
  - Não alterar nenhum código dentro das PRs nesta tarefa.

DO NOT TOUCH:
  - Nenhum arquivo em src/** — esta tarefa é exclusivamente de correção de texto/comunicação sobre
    as PRs já existentes, não de código.

ACCEPTANCE CRITERIA:
  1. Descrição de PR #1 não afirma mais "42 testes" sem qualificar a diferença entre asserções e
     screenshots.
  2. Descrição de PR #2 não afirma mais "30/30" sem qualificar a causa ambiental da 1 falha.
  3. Nenhum código-fonte foi alterado por esta tarefa.

QA REQUIREMENTS: nenhuma (não há código novo para testar).

EXPECTED EVIDENCE:
  Link/diff da edição de cada descrição de PR, registrado em EVIDENCE.md.

STATUS: PROVADO — executada por Claude (fallback direto, agy indisponível), descrições de PR #1 e
  PR #2 corrigidas via mcp__github__update_pull_request, evidência em EVIDENCE.md → E-020.
```

---

## TASK-AGENDA-001 (contrato original — implementação já existe, ver nota de estado)

**Nota de estado (atualizada nesta sessão):** esta tarefa foi escrita como o primeiro piloto do
protocolo antes de se descobrir que uma implementação real já existia em PR #2 (`feature/agenda`),
criada fora do fluxo formal deste Agent OS. O contrato abaixo é preservado porque **serve como o
checklist de auditoria contra o qual a implementação real foi verificada** — não porque a tarefa
ainda precisa ser "implementada do zero".

```
ID: TASK-AGENDA-001
DOMAIN: Agenda
PHASE: 3
PRIORITY: P0
STATUS: PARTIAL (implementado em PR #2, não mesclado, ratificação de HDR-003 pendente)
DEPENDENCIES:
  - HDR-001 (merge sequencial PR #1 → PR #2 — agora dependência técnica confirmada, D-008)
  - HDR-003 (ratificar o agrupamento Agora/Próximo/Depois/Mais tarde já implementado)

EXECUTOR: Antigravity preferencial; fallback Claude Code direto se Antigravity indisponível
  (AGENT_RULES.md → seção 7). Neste caso específico, a implementação já foi feita por um executor
  fora do protocolo formal (commit de autoria do próprio usuário/repositório) — a auditoria desta
  sessão foi feita por Claude a posteriori.

DO NOT TOUCH: src/components/education/** (violado pela branch que contém esta tarefa — ver
  HDR-010; a violação não veio do commit de Agenda em si, ver EVIDENCE.md → E-013).

DESCRIPTION / ESCOPO ORIGINAL: (preservado integralmente como checklist de auditoria)
  Views: Dia/Semana/Mês/Lista; 4 tipos (EVENT/TIME BLOCK/DEADLINE/ROUTINE); conflitos com duração
  real; tempo livre textual; Now Indicator; 24 cores pastel; categorias com domínio+edição;
  filtros por domínio; drawer de criação/edição com exclusão em 2 passos; painel de detalhe
  lateral; Context Panel específico; temas/motion/reduced-motion herdados; Local State explícito;
  acessibilidade com aria-label.

ACCEPTANCE CRITERIA — status real verificado nesta sessão:
  1. As 4 views trocam de fato, mantendo filtro/seleção coerente — PROVADO (qa-agenda.js real).
  2. Exatamente 820px usa layout mobile — PROVADO (código + qa-agenda.js real).
  3. Conflito mostra duração real ("Conflito · Nmin") — PROVADO (código + qa-agenda.js real).
  4. Categoria com domínio associado e editável — PROVADO (código + qa-agenda.js real).
  5. Filtro por domínio remove itens de fato — PROVADO (qa-agenda.js real: "Filtro Educação ativo
     mostra itens de estudo").
  6. `npx tsc --noEmit` e `npm run build` sem erro — PROVADO (reexecutado nesta sessão).
  7. Nenhum arquivo de education/** alterado — **PARCIAL**: o commit de Agenda em si não altera
     Educação, mas a branch que o contém (via PR #1 herdado) altera. Ver HDR-010.
  8. Nenhum literal fora dos tokens existentes — **NÃO AUDITADO** nesta sessão (precisa de revisão
     manual linha-a-linha antes de fechar como PROVADO).
  9. Nenhuma capacidade fora de escopo implementada — PROVADO (E-019: sem novas dependências).

QA REQUIREMENTS — status real: todos os itens interativos (criar/editar/excluir evento,
  filtro, temas, 4 views, conflito) foram testados de fato via `qa-agenda.js` real nesta sessão
  (EVIDENCE.md → E-017). `prefers-reduced-motion` **não foi testado especificamente para a Agenda**
  nesta sessão (o script de Agenda não cobre esse caso; `qa-browser.js` testa reduced-motion só
  para Educação) — item em aberto.

EXPECTED EVIDENCE: ver EVIDENCE.md → E-013 a E-019 (já preenchido).

STATUS: PARTIAL — implementação real e testada, merge e ratificação de HDR-003 pendentes; item 8
  (literais fora dos tokens) e reduced-motion específico da Agenda não auditados.
```

---

## Tarefas de fases futuras — mantidas em nível de Contract, não decompostas ainda

Por instrução explícita ("Master Plan não é backlog infinito"), as fases 2, 4 (parte de
ratificação), 5-13 **não são decompostas em tarefas finas nesta sessão** — cada uma só ganha
tarefas concretas quando seu HDR correspondente for resolvido e seu Contract puder ser escrito sem
suposição. O que existe hoje para cada uma:

- **FASE 2 (Auth)**: nenhuma tarefa ainda — bloqueada por HDR-011.
- **FASE 4 (Education — ratificação)**: nenhuma tarefa de código nova — bloqueada por HDR-010 (é
  uma decisão de governança, não uma tarefa de implementação).
- **FASE 5 (Hoje)**: nenhuma tarefa ainda. **Verificado nesta sessão**: `PRODUCT_CONTRACT.md` só
  define a responsabilidade geral de Hoje em uma linha ("resumo operacional... o que merece
  atenção agora") — não há layout, seções ou wireframe suficientes para escrever
  `ACCEPTANCE CRITERIA` verificáveis sem inventar a UI. Diferente da Agenda (que teve uma sessão
  de auditoria de protótipo antes de virar tarefa), Hoje precisa de uma rodada de definição de
  contrato/design antes de poder ser decomposta — isso não é tecnicamente bloqueado por merge de
  PR, mas por falta de especificação de produto suficiente. Registrar como necessidade real, não
  forçar uma implementação inventada.
- **FASES 6-13**: nenhuma tarefa ainda — cada uma bloqueada por pelo menos um HDR de definição de
  contrato (ver `DECISIONS.md` → HDR-005 e correlatos).

---

## Primeira tarefa desbloqueada

**`TASK-MERGE-PREP-001` — CONCLUÍDA nesta sessão** (`PROVADO`, ver `EVIDENCE.md` → E-020): as
descrições de PR #1 e PR #2 foram corrigidas para refletir os números reais.

**Estado da fila agora**: não há nenhuma outra tarefa executável autonomamente por Claude sem
decisão humana. Verificado sistematicamente: FASE 2 (Auth) bloqueada por HDR-011; FASE 3
(merge/ratificação da Agenda) bloqueada por HDR-001/HDR-003; FASE 4 (ratificação de Educação)
bloqueada por HDR-010; FASE 5 (Hoje) não tem contrato específico o suficiente para virar tarefa
sem inventar UI; FASES 6-13 bloqueadas por HDR-005 e correlatos. **Isto é um ponto de parada real
e válido** (`AGENT_RULES.md` → "nunca bloquear por executor indisponível" não se aplica aqui — o
bloqueio agora é de decisão humana real, exatamente o caso em que `BLOQUEADO`/parar é correto).

**Decisões que desbloqueariam a próxima tarefa, cada uma com o que ela libera:**
- **HDR-001** (ordem/aprovação de merge PR #1 → PR #2) → libera o fechamento formal das Fases 1 e 3.
- **HDR-003** (ratificar agrupamento da List View) → libera o fechamento formal da Fase 3.
- **HDR-010** (ratificar expansão multi-trilha de Educação) → libera o fechamento formal da Fase 4.
- **HDR-011** (escolher provedor de Auth) → libera o início real da Fase 2.
- Uma rodada de definição de contrato/design para Hoje → libera a decomposição da Fase 5a.
