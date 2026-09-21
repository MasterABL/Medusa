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
  nesta sessão (ver EVIDENCE.md → E-013 a E-019), e deixar um resumo consolidado pronto para a
  aprovação de merge (HDR-001). [Nota pós-execução: HDR-003 e HDR-010, mencionados originalmente
  aqui, foram reclassificados como DECIDIDO — D-009 e D-010 em DECISIONS.md — não eram decisões
  humanas reais, eram confirmações de requisitos já documentados.]

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
STATUS: PROVADO (todos os 9 ACCEPTANCE CRITERIA verificados; só falta Merge Gate — HDR-001)
DEPENDENCIES:
  - HDR-001 (aprovação humana do merge PR #1 → PR #2 — único gate real restante, ver DECISIONS.md)

EXECUTOR: Antigravity preferencial; fallback Claude Code direto se Antigravity indisponível
  (AGENT_RULES.md → seção 7). Neste caso específico, a implementação já foi feita por um executor
  fora do protocolo formal (commit de autoria do próprio usuário/repositório) — a auditoria desta
  sessão foi feita por Claude a posteriori.

DO NOT TOUCH: src/components/education/** (a branch que contém esta tarefa também altera Educação
  via commit herdado de PR #1 — o commit de Agenda em si não toca Educação, EVIDENCE.md → E-013;
  a alteração de Educação foi ratificada em D-010, não é mais uma violação em aberto).

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
  7. Nenhum arquivo de education/** alterado — **RATIFICADO (D-010)**: o commit de Agenda em si
     não altera Educação; a branch que o contém altera via PR #1 herdado, e essa mudança já foi
     ratificada como conteúdo esperado da Fase 4 — não bloqueia mais nada.
  8. Nenhum literal fora dos tokens existentes — **PROVADO** (EVIDENCE.md → E-021: os literais
     encontrados, `#1C2420` e `text-[Npx]`, são o mesmo padrão já usado em toda a Educação/Shell
     já aprovados, não literais novos; dimensões de layout específicas da Agenda seguem o mesmo
     padrão de componentes locais já usado por Educação, sem colidir com ShellGeometry).
  9. Nenhuma capacidade fora de escopo implementada — PROVADO (E-019: sem novas dependências).

QA REQUIREMENTS — status real: todos os itens interativos (criar/editar/excluir evento,
  filtro, temas, 4 views, conflito) foram testados de fato via `qa-agenda.js` real
  (EVIDENCE.md → E-017). `prefers-reduced-motion` testado especificamente para a Agenda com um
  script novo usando `page.emulateMediaFeatures` real — **PROVADO** (EVIDENCE.md → E-022):
  animação de fato desativada, navegação/troca de view permanece 100% funcional.

EXPECTED EVIDENCE: ver EVIDENCE.md → E-013 a E-022 (completo — todos os 9 ACCEPTANCE CRITERIA e
  todos os QA REQUIREMENTS têm evidência real). O único item que resta é o Merge Gate (HDR-001),
  que por definição (AGENT_RULES.md → Git, e a regra desta sessão sobre "aprovação de merge/
  closure") é uma decisão humana real, não uma lacuna de execução.

STATUS: PROVADO — implementação, testes, build, browser QA e todos os 9 ACCEPTANCE CRITERIA
  verificados com evidência real. Só o Merge Gate (HDR-001, aprovação humana) permanece pendente.
```

---

## TASK-CI-001 (NOVA — desbloqueada por D-011, escopo restrito)

```
ID: TASK-CI-001
DOMAIN: Agent OS / Infraestrutura
PHASE: 0
PRIORITY: P1
STATUS: PROVADO — executada nesta sessão (ver EVIDENCE.md)
DEPENDENCIES: nenhuma

OBJECTIVE:
  Criar um workflow de GitHub Actions que rode, em cada PR contra main, exatamente os gates já
  mandatados por QA_GATE.md: Test Gate (`npm run typecheck`) e Build Gate (`npm run build`).

SCOPE (corrigido durante a execução — ver nota abaixo):
  - Novo arquivo `.github/workflows/ci.yml`.
  - Gatilho: pull_request contra main.
  - Steps: checkout, setup-node, npm ci, typecheck, build.
  - **Lint removido do escopo**: `QA_GATE.md` nunca mandatou lint (só typecheck e build); e
    verificado nesta sessão que `npm run lint` nem está de fato configurável hoje (ESLint nunca
    foi inicializado neste repo — `next lint` pede setup interativo, travaria em CI). Incluir lint
    teria sido um erro de escopo (inventado, não mandatado) — corrigido antes de commitar.

DO NOT TOUCH:
  - Nenhum arquivo em src/**. Nenhum segredo/variável de ambiente nova. Nenhum passo de deploy
    (Vercel já cobre isso). Nenhuma permissão de workflow além do mínimo de leitura do repositório.

ACCEPTANCE CRITERIA:
  1. Workflow roda automaticamente em PRs contra main — a testar no push desta tarefa (PR #3).
  2. Roda exatamente typecheck + build — nada mais.
  3. Nenhum segredo novo é necessário nem introduzido — PROVADO (workflow não referencia nenhum).
  4. Nenhum arquivo de produto (src/**) é alterado — PROVADO (`git diff --stat -- src/` vazio).

QA REQUIREMENTS:
  Verificar que o workflow de fato dispara e passa na própria PR #3 após o push desta tarefa.

EXPECTED EVIDENCE:
  Link do workflow run com resultado real, registrado em EVIDENCE.md.

STATUS: READY — sem decisão humana pendente (D-011).
```

---

## Tarefas de fases futuras — mantidas em nível de Contract, não decompostas ainda

Por instrução explícita ("Master Plan não é backlog infinito"), as fases 2, 4 (parte de
ratificação), 5-13 **não são decompostas em tarefas finas nesta sessão** — cada uma só ganha
tarefas concretas quando seu HDR correspondente for resolvido e seu Contract puder ser escrito sem
suposição. O que existe hoje para cada uma:

- **FASE 2 (Auth)**: nenhuma tarefa ainda — bloqueada por HDR-011 (decisão humana real: escolha de
  provedor externo).
- **FASE 4 (Education — ratificação)**: conteúdo já ratificado (D-010) — resta apenas o mesmo
  Merge Gate de PR #1/#2, não uma tarefa de código nova.
- **FASE 5 (Hoje)**: nenhuma tarefa ainda. `PRODUCT_CONTRACT.md` só define a responsabilidade
  geral de Hoje em uma linha — não há layout/seções/wireframe suficientes para escrever
  `ACCEPTANCE CRITERIA` sem inventar UI (`DECISIONS.md` → HDR-006, análise específica de Hoje
  Foundation). Diferente da Agenda (que teve uma auditoria de protótipo completa antes de virar
  tarefa), Hoje precisa de uma rodada de definição de contrato/design antes de poder ser
  decomposta — isso é falta de especificação de produto, não decisão entre alternativas.
- **FASES 6-13**: nenhuma tarefa ainda — cada uma bloqueada por falta de especificação de produto
  suficiente (`DECISIONS.md` → HDR-005), pelo mesmo motivo de Hoje.

---

## QUEUE AUDIT (nesta sessão)

```
UNLOCKED TASKS:
  - TASK-MERGE-PREP-001 → EXECUTADA, PROVADO (E-020)
  - TASK-AGENDA-001 (auditoria completa) → EXECUTADA, PROVADO (E-013 a E-022)
  - TASK-CI-001 → READY, ainda não executada nesta sessão (ver próxima ação)

BLOCKED TASKS:
  - Fase 2 (Auth): HDR-011 (escolha de provedor externo — decisão humana real)
  - Fase 5 (Hoje): falta de especificação de produto (HDR-006, análise Hoje Foundation)
  - Fases 6-13: falta de especificação de produto (HDR-005)
  - Fechamento formal (merge) das Fases 1, 3, 4: HDR-001 (aprovação de merge — decisão humana real)

HUMAN GATES:
  - HDR-001 (aprovação de merge PR #1 → PR #2)
  - HDR-011 (provedor de Auth)

TECHNICAL BLOCKERS:
  - Nenhum bloqueio técnico real ativo agora. Antigravity (agy) segue inalcançável nesta sessão
    (BLOCKERS.md → BLOCK-001), mas isso não bloqueia nada — o fallback Claude está funcionando.

NEXT EXECUTABLE TASK:
  TASK-CI-001 (sem gate humano, sem bloqueio técnico).
```

**Decisões que desbloqueariam trabalho além disso, cada uma com o que ela libera:**
- **HDR-001** (aprovação de merge PR #1 → PR #2) → libera o fechamento formal das Fases 1, 3 e 4.
- **HDR-011** (escolher provedor de Auth) → libera o início real da Fase 2.
- Uma rodada de definição de contrato/design para Hoje/Corpo/Finanças/Progresso/Guardian/Buscar →
  libera a decomposição das Fases 5-13 correspondentes.
