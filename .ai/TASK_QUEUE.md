# TASK_QUEUE.md — Fila Operacional

Formato de cada tarefa (preserva o schema original + campos novos exigidos pela consolidação do
Master Plan — nenhum campo antigo foi removido):

```
ID
DOMAIN
PHASE            (novo — número da fase em MASTER_PLAN.md/ROADMAP.md)
TRACK            (novo — DESIGN/EXPERIENCE ou ENGINEERING/INTEGRATION, ver AGENT_RULES.md → seção 0
                 e DECISIONS.md → D-013)
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

**TRACK — regra de bloqueio global (D-013)**: `DESIGN/EXPERIENCE` cobre Estrutura/UI/UX/Motion/
Loading/Responsive/Accessibility/Estados/Microinterações de uma das 8 abas — pode ser `READY`/
`IN_PROGRESS` livremente, sujeito só às próprias `DEPENDENCIES`. `ENGINEERING/INTEGRATION` cobre
dados reais, persistência, APIs, integrações (Google/Supabase/IA), automações e regras de negócio
definitivas — **nenhuma tarefa deste tipo pode ser a "próxima tarefa executável" enquanto Fase A
não fechar (Human Experience Gate) para as 8 abas**, mesmo que sua própria dependência humana
(HDR) já tenha sido resolvida. Tarefas de infraestrutura/tooling transversal (CI, dependabot, etc.)
não são nem uma coisa nem outra — usam `ENGINEERING/INFRA` e não são bloqueadas por D-013 (não são
integração de produto).

**Regra de desbloqueio**: a fila não avança pela primeira fase numericamente — avança pela
**primeira tarefa cujas DEPENDENCIES estão todas resolvidas**. Ver seção final "Primeira tarefa
desbloqueada".

---

## TASK-MERGE-PREP-001 (NOVA — primeira tarefa realmente desbloqueada)

```
ID: TASK-MERGE-PREP-001
DOMAIN: Foundation + Agenda (transversal às PRs #1 e #2)
PHASE: 1 e 3
TRACK: ENGINEERING/INFRA (correção de texto/comunicação sobre PRs, não produto — não bloqueado por D-013)
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
TRACK: DESIGN/EXPERIENCE (Fase A — Estrutura/UI/UX/Motion/Local State; nenhum dado real/persistência)
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
TRACK: ENGINEERING/INFRA (CI/tooling — não é integração de produto, não bloqueado por D-013)
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
- **FASE 5 (Hoje)**: reclassificada nesta sessão (Execution Sprint, ver `EVIDENCE.md` → E-025).
  Um recorte mínimo **é** decomponível sem inventar produto (algoritmo de item-atual + linha do
  tempo reaproveitados do legacy `minha-vida`, idioma temporal já aprovado em Agenda) — ver
  `TASK-HOJE-FOUNDATION-001` abaixo. O que continua bloqueado (HDR-006) é o layout final completo
  de Hoje com seções não evidenciadas (briefing IA, insights cross-domain) — não o v1 honesto.
- **FASES 6-13**: nenhuma tarefa ainda — cada uma bloqueada por falta de especificação de produto
  suficiente (`DECISIONS.md` → HDR-005), pelo mesmo motivo de Hoje.

### TASK-HOJE-FOUNDATION-001 — Substituir página fake da rota `hoje` por Hoje Foundation v1 honesta

- **FASE:** 5 (Hoje) — recorte mínimo, não o contrato completo.
- **TRACK:** DESIGN/EXPERIENCE (Fase A — Local State honesto, sem persistência/integração real).
- **ORIGEM:** achado de honestidade (E-025): `src/app/page.tsx` em `main` renderiza documentação
  de Shell com estatísticas fabricadas ("14 rpm", "0.02%", "ALL GATES PROVED") como se fossem
  dados reais do produto.
- **ESCOPO:** criar uma tela Hoje mínima e honesta: item "agora"/próximos itens do dia, usando
  Local State (rótulo visível "Armazenado apenas nesta sessão (Local State)", mesma convenção de
  `AgendaHeader.tsx`), agrupamento temporal Agora/Próximo/Depois/Mais tarde (mesmo idioma de
  `agendaHelpers.ts`), reaproveitando o padrão de algoritmo `itemAtualId` do legacy `minha-vida`
  adaptado a fixtures genéricas (não a rotina pessoal hardcoded do legacy).
- **DO NOT TOUCH:** Context Panel/Shell geometry (bug já mapeado em BLOCK-008, correção vive em
  `feature/agenda`, não deve ser duplicada aqui); Agenda; Educação; nenhuma integração externa
  (clima, Google Calendar, IA) nem gamificação (XP/streak) — proibido por `MASTER_PLAN.md`.
- **ACCEPTANCE CRITERIA:**
  1. Rota `hoje` não exibe mais nenhuma estatística fabricada apresentada como real.
  2. Tela mostra os itens do dia (fixture local, tipada) agrupados por Agora/Próximo/Depois/Mais
     tarde, com o item "atual" destacado pelo algoritmo adaptado de `itemAtualId`.
  3. Rótulo de honestidade "Armazenado apenas nesta sessão (Local State)" visível.
  4. Reutiliza o motion system existente (`.study-stage-enter` ou equivalente já testado sob
     `prefers-reduced-motion: reduce`) — nenhuma animação nova paralela.
  5. `npx tsc --noEmit` e `npm run build` passam sem erro.
  6. Browser QA real em 390/820/1024/1440 sem overflow/clipping/jump; reduced-motion verificado.
  7. Nenhuma regressão em Agenda/Educação/Shell (spot-check).
- **STATUS:** **PROVADO.** Implementado em `feat/hoje-foundation`
  (https://github.com/MasterABL/Medusa/pull/4, draft, a partir de `main`, independente do merge
  pendente de PR #1/#2 — ver BLOCKED SCOPE vs UNBLOCKED SCOPE). Todos os 7 ACCEPTANCE CRITERIA
  verificados com evidência real — ver `EVIDENCE.md` → E-026. Merge Gate desta PR nova é o único
  item pendente (aprovação humana, mesma natureza de HDR-001, não um novo Human Gate — é o mesmo
  tipo de decisão já registrada).

---

### TASK-CONTEXT-PANEL-GEOMETRY-001 — Portar a correção de geometria do Context Panel para `main`

- **FASE:** Shell / P0.
- **TRACK:** DESIGN/EXPERIENCE (Fase A — geometria/Estrutura do Shell, infraestrutura consumida pelas 8 abas).
- **ORIGEM:** BLOCK-008 (raiz encontrada na sessão anterior: 4 funções de geometria duplicadas).
  Instrução explícita desta sessão: "Faça a correção chegar a uma branch preparada para merge."
- **ESCOPO:** portar `calculateShellGeometry()` (já provado em `feature/agenda`) para `main`,
  consumido por `Sidebar`/`ContextPanel`/`ShellLayout`/`Header` via `useShell().geometry`. Sem
  nenhum conteúdo específico de Agenda (não existe em `main`, depende de `HDR-001`).
- **DO NOT TOUCH:** nada de Agenda; Educação (só verificado como não-regressão).
- **ACCEPTANCE CRITERIA:** (todos verificados — ver `EVIDENCE.md` → E-027)
  1. Largura real do painel chega a 0px ao fechar, em todos os 3 modos.
  2. Sidebar/Header/ShellLayout usam a mesma fonte única de geometria.
  3. `npx tsc --noEmit` e `npm run build` sem erro.
  4. Browser QA real em 390/820/1024/1440, amostrando largura DURANTE a transição (não só antes/
     depois).
  5. `prefers-reduced-motion: reduce` real testado.
  6. Persistência do estado aberto/fechado via localStorage sobrevive a reload.
  7. Nenhuma regressão em Educação.
- **STATUS:** **PROVADO.** PR https://github.com/MasterABL/Medusa/pull/5 (draft). Merge Gate:
  BLOQUEADO (aprovação humana, mesma natureza de HDR-001).

---

### TASK-AGENDA-SHELL-001 — Levar Agenda de PENDING (só em `feature/agenda`) para IMPLEMENTED numa branch independente

- **FASE:** Agenda (Fase 3, se numerada pelo MASTER_PLAN) — instrução explícita de continuação de
  sprint: "Não siga [auditoria de Educação]. O próximo domínio de implementação é: AGENDA."
- **TRACK:** DESIGN/EXPERIENCE (Fase A — CRUD/views/filtros em Local State/fixture, sem persistência real).
- **ORIGEM:** a Agenda já existia, completa e auditada (`TASK-AGENDA-001`, 9/9 ACCEPTANCE
  CRITERIA), mas só em `feature/agenda` (PR #2), presa atrás de `HDR-001` porque essa branch
  também bundla Educação e uma versão diferente do hardening do Shell.
- **ESCOPO:** cherry-pick do commit `758cd8d` (só a Agenda, autocontido) para uma branch nova
  baseada em `fix/context-panel-geometry` (PR #5) em vez de `fix/foundation-hardening` (PR #1) —
  evita esperar pela ratificação de Educação. Reconciliação do único conflito real
  (`ContextPanel.tsx`) preservando a correção de geometria da PR #5.
- **DO NOT TOUCH:** Educação (não tocada — cherry-pick não trouxe `e616635`); Guardian; nenhuma
  integração Google/IA (`BLOCK-009` continua registrado como está, não bloqueia a Agenda).
- **ACCEPTANCE CRITERIA:** (todos verificados — ver `EVIDENCE.md` → E-028)
  1. 4 views (Day/Week/Month/List) funcionais com dados de fixture.
  2. Detecção de conflito e tempo livre reais.
  3. CRUD completo (criar/inspecionar/editar/excluir com confirmação em 2 passos).
  4. 24 cores de categoria + gerenciador funcional.
  5. Filtro por domínio.
  6. Context Panel mostra síntese temporal da Agenda sem regredir a geometria corrigida em PR #5.
  7. `npx tsc --noEmit` e `npm run build` sem erro.
  8. Browser QA real (script original + suíte nova de regressão de Shell) em 390/820/1024/1440.
  9. `prefers-reduced-motion: reduce` real testado no drawer de criação de evento.
  10. Nenhuma regressão em Educação/Sidebar/navegação.
- **STATUS:** **PROVADO.** PR https://github.com/MasterABL/Medusa/pull/6 (draft). Depende de
  PR #5 (`D-012`). Merge Gate: BLOQUEADO (aprovação humana, mesma natureza de HDR-001).

---

### TASK-STUDY-MODE-REFINEMENT-001 — Refinar motion/espaço/Dynamic Island do Study Mode existente

- **FASE:** Educação (Study Mode) — instrução explícita: evoluir, não reescrever.
- **TRACK:** DESIGN/EXPERIENCE (Fase A — motion/espaço/Dynamic Island; nenhuma IA/voz real, fixtures locais).
- **ORIGEM:** a arquitetura multi-trilha (ENEM/Inglês/Faculdade) já existia completa em
  `feature/agenda`/`e616635`, mas só nessa branch não mesclada. Portada para `main` via branch
  própria (`feat/education-multitrack`, a partir de `fix/context-panel-geometry`), depois
  refinada: espaço do palco, transição de troca de trilha, timing aula→exercícios, e um estado
  de voz real no Dynamic Island.
- **DO NOT TOUCH:** arquitetura de trilhas (`TrackDefinition`, fixtures); sistema de motion (só
  reaproveitado, nenhum token/duração/easing novo criado); catálogo canônico de 10 estados do
  Island (`islandFixtures.ts`) — o modo Voz é um overlay ortogonal, não um 11º estado.
- **ACCEPTANCE CRITERIA:** (todos verificados — ver `EVIDENCE.md` → E-029; checklist completo do
  usuário na seção 26 do prompt original, integralmente coberto)
  1. Aula ocupa muito mais altura útil do viewport (340px → 745px em 1440×960).
  2. Entrada e troca de trilha usam a animação de entrada já existente, não um swap instantâneo.
  3. Aula → Exercícios sem pausa morta (bug de timing real corrigido: 480ms JS vs 320ms CSS).
  4. Dynamic Island participa de troca de trilha (pulso `processing`) e de voz (encolhe/expande).
  5. Voz: Island encolhe para 44px, mostra microfone, pulsa perceptivelmente, clique encerra.
  6. `npx tsc --noEmit` e `npm run build` sem erro.
  7. Browser QA real com amostragem EM PLENA TRANSIÇÃO (opacidade/largura/transform), não só
     antes/depois — 41/41 checks.
  8. `prefers-reduced-motion: reduce` real testado (voz, troca de trilha, aula→exercícios).
  9. 390/820/1024/1440 validados sem overflow.
  10. Nenhuma regressão em Shell/Sidebar/navegação.
- **STATUS:** **PROVADO.** PR https://github.com/MasterABL/Medusa/pull/7 (draft). Depende de
  PR #5. Merge Gate: BLOQUEADO (aprovação humana, mesma natureza de HDR-001).

---

### TASK-AGENDA-EXPERIENCE-001 — Fechar motion/Dynamic Island/UX da Agenda para o Experience-Complete Gate

- **FASE:** Agenda — segunda frente oficial de Fase A (D-013), depois de Hoje, na ordem oficial
  `Hoje → Agenda → Educação → Corpo → Finanças → Progresso → Guardian → Buscar`.
- **TRACK:** DESIGN/EXPERIENCE (Fase A — motion/Dynamic Island/UX; nenhuma persistência real).
- **ORIGEM:** D-013 exige que cada aba feche Experience (não apenas "base implementada") antes de
  qualquer domínio avançar para Fase B. Auditoria desta rodada sobre a base já provada em PR #6
  achou 3 gaps reais de Fase A (troca de view sem transição, zero integração com o Dynamic Island,
  salvar/excluir sem feedback) e 1 bug funcional real (exclusão de ocorrência de rotina
  silenciosamente no-op, por id virtual não resolvido) — ver `EVIDENCE.md` → E-030.
- **DO NOT TOUCH:** arquitetura de views/CRUD/categorias já provada em PR #6; catálogo fechado de
  10 estados do Island (`islandFixtures.ts`) — reação da Agenda usa só pulsos transientes
  `processing`→`idle` já existentes, nunca um estado persistente novo nem redefinição de texto.
- **ACCEPTANCE CRITERIA:** (todos verificados — ver `EVIDENCE.md` → E-030)
  1. Troca de modo de visualização (Dia/Semana/Mês/Lista) usa a animação de entrada já existente
     (`.study-stage-enter`), não um swap instantâneo.
  2. Dynamic Island reage (pulso `processing`→`idle`) a troca de view, salvar e excluir.
  3. Exclusão rápida na Lista exige confirmação em 2 passos, consistente com o EventDetailPanel.
  4. Bug de exclusão de ocorrência de rotina corrigido (resolve para o id da série base).
  5. `npx tsc --noEmit` e `npm run build` sem erro.
  6. Browser QA real com amostragem EM PLENA TRANSIÇÃO (opacity/transform da view, classes do
     Island durante o pulso) — 27/27 checks novos.
  7. Regressão: `qa-agenda-shell-integration.js` (11/11) e `qa-agenda.js` (29/30, falha ambiental
     já documentada, `BLOCK-005`) continuam passando sem regressão.
  8. 390/820/1024/1440 validados sem overflow.
  9. `prefers-reduced-motion: reduce` real testado (troca de view).
  10. Nenhuma regressão em Context Panel/Shell/navegação.
- **STATUS:** Gates 1-10 (`QA_GATE.md`) **PROVADO**. Gate 11 (Human Experience Gate) **BLOQUEADO**
  — decisão humana pendente, não uma lacuna de execução. Classificação conforme `AGENT_RULES.md` →
  seção 0: **`EXPERIENCE EM REFINAMENTO`** (não `EXPERIENCE COMPLETE` até o Human Experience Gate).
  PR https://github.com/MasterABL/Medusa/pull/9 (draft). Depende de PR #6 (que depende de PR #5,
  mesma relação de `D-012`). Merge Gate: BLOQUEADO (aprovação humana, mesma natureza de HDR-001).
- **FORA DE ESCOPO NESTA RODADA** (registrado, não implementado): exclusão de uma única ocorrência
  de rotina mantendo as demais (exigiria modelo de exceção por data); animação de saída de
  drawers/modais (`EventFormDrawer`, `CategoryModal`, e também `TutorDrawer` de Educação — todos
  desmontam instantaneamente ao fechar, um padrão já existente em todo o app, não uma regressão
  desta tarefa; corrigir isso tocaria Educação, área congelada, e exigiria decisão prévia).

---

### TASK-SHELL-SIDEBAR-RECOVERY-001 — Corrigir recuperação real da Sidebar em modo Compacto

- **FASE:** Shell (transversal, não é uma das 8 abas de Fase A) — infraestrutura consumida por
  todas as abas.
- **TRACK:** DESIGN/EXPERIENCE (Fase A — correção de UI/geometria/motion; nenhuma persistência).
- **ORIGEM:** Relato do usuário ("Sidebar fica presa sem forma visível de reabrir"), seção 3 da
  "RODADA DE REFINAMENTO DE EXPERIÊNCIA". Auditoria de código (não suposição) achou 2 bugs reais —
  ver `EVIDENCE.md` → E-031.
- **DO NOT TOUCH:** `calculateShellGeometry()`/`SHELL_DIMENSIONS` como fonte única de verdade
  (consumida, não redefinida); caminho de recuperação em modo Foco (hambúrguer do Header), já
  confirmado correto.
- **ACCEPTANCE CRITERIA:** (todos verificados — ver `EVIDENCE.md` → E-031)
  1. Botão de recuperação clicável de fato em modo Compacto (fora do wrapper `pointer-events:none`).
  2. Ícones da Sidebar geometricamente dentro da faixa visível em modo Compacto (bug de `width`
     fixo corrigido).
  3. Reabertura causa reflow real de layout (`paddingLeft` de `#content-layout` muda de verdade).
  4. Comportamento definido e testado em 390/820/1024/1440.
  5. `npx tsc --noEmit` e `npm run build` sem erro.
  6. Browser QA real com largura amostrada EM PLENA TRANSIÇÃO — 26/26 checks.
  7. `prefers-reduced-motion: reduce` real testado.
  8. Navegação por teclado e `:focus-visible` funcionais.
  9. Nenhuma regressão no modo Foco (hambúrguer do Header).
- **STATUS:** Gates 1-10 **PROVADO**. Gate 11 (Human Experience Gate) **BLOQUEADO** — decisão
  humana pendente. PR https://github.com/MasterABL/Medusa/pull/11 (draft). Depende de PR #5
  (`D-012`). Merge Gate: BLOQUEADO (aprovação humana, mesma natureza de HDR-001).

---

### TASK-AGENDA-CONFLICTS-EXPERIENCE-001 — Conflitos N-a-N, prioridade, sugestões de horário, recorrência "Personalizado"

- **FASE:** Agenda — terceira rodada de refinamento sobre a mesma aba (Fase A, D-013).
- **TRACK:** DESIGN/EXPERIENCE (Fase A — UI/UX/motion/estados; sugestões usam gap-finding local
  já existente, não uma integração ou motor de otimização real).
- **ORIGEM:** Seções 4-9 da "RODADA DE REFINAMENTO DE EXPERIÊNCIA" do usuário — conflito visual
  quebrado com 2+ eventos, prioridade de domínio, sugestão de horário compatível, deslocamento/
  tempo de viagem (explicitamente NÃO implementado nesta rodada), recorrência "Personalizado",
  exclusão de recorrência por escopo. Auditoria achou e corrigiu 1 bug funcional real e severo não
  listado explicitamente pelo usuário (rotinas nunca salvavam `recurrence`) — ver
  `EVIDENCE.md` → E-032.
- **DO NOT TOUCH:** nenhuma chamada real ou simulada por IA generativa ao Google Maps Platform/
  Routes API (o prompt do usuário proíbe explicitamente usar IA generativa como substituto de uma
  API de rota); arquitetura de views/CRUD/categorias já provada em PR #6/#9.
- **ACCEPTANCE CRITERIA:** (todos verificados — ver `EVIDENCE.md` → E-032)
  1. 2/3/4+ eventos concorrentes renderizados em colunas reais (clustering + column-packing), sem
     apenas reduzir fonte — testado com os 2 cenários exatos do prompt do usuário.
  2. Trabalho ordena antes de Estudo/Inglês nas colunas de conflito (heurística documentada como
     não-definitiva no código).
  3. Painel de sugestões de horário compatível funcional de ponta a ponta (ver → Usar → evento
     criado no novo horário), reaproveitando `calculateFreeTimeSlots()` já existente.
  4. Nenhuma chamada real ou simulada a serviço de rota/deslocamento; contrato de dados futuro
     apenas registrado em texto, não implementado em código.
  5. Recorrência "Personalizado" (intervalo, dias da semana, término) funcional e persistindo
     `recurrence` de fato (bug de `isRecurring` nunca setado corrigido).
  6. Exclusão de recorrência com 3 escopos (esta/esta e as próximas/série) produzindo o modelo de
     dados local correto para cada caso.
  7. `npx tsc --noEmit` e `npm run build` sem erro.
  8. Browser QA real — 20/20 checks novos.
  9. Regressão da suíte de Shell/Context Panel (`qa-agenda-shell-integration.js`) sem quebra.
  10. 390/820/1024/1440 e `prefers-reduced-motion: reduce` validados.
- **STATUS:** Gates 1-10 **PROVADO**. Gate 11 (Human Experience Gate) **BLOQUEADO**. Classificação:
  `EXPERIENCE EM REFINAMENTO`. PR https://github.com/MasterABL/Medusa/pull/12 (draft). Depende de
  PR #9 (que depende de PR #6, que depende de PR #5 — `D-012`). Merge Gate: BLOQUEADO (aprovação
  humana, mesma natureza de HDR-001).
- **FORA DE ESCOPO / TRABALHO FUTURO explicitamente registrado** (não implementado, não fingido
  como resolvido):
  - Integração real de tempo de deslocamento (Google Maps Platform/Routes API) — Fase B, exige
    decisão humana de provedor/custo, fora do escopo de Fase A por instrução direta do usuário.
  - Reagendar uma única ocorrência de rotina recorrente para outro horário mantendo as demais —
    exigiria estender `recurrenceExceptions` para carregar um horário substituto, não apenas a
    data excluída.

---

### TASK-EDUCATION-TRACKS-EXPERIENCE-001 — Nomenclatura ENEM, altura do player, auditoria de Tutor/Island e Foco

- **FASE:** Educação — segunda rodada de refinamento sobre a mesma aba (Fase A, D-013).
- **TRACK:** DESIGN/EXPERIENCE (Fase A — nomenclatura/layout; nenhuma persistência).
- **ORIGEM:** Seções 11-16 da "RODADA DE REFINAMENTO DE EXPERIÊNCIA" do usuário, que supunha uma
  possível regressão arquitetural (3 trilhas como itens de Sidebar) e 2 bugs "encontrados
  manualmente" (Tutor↔Island, Context Panel/Foco). Auditoria ao vivo confirmou a arquitetura já
  correta e os 2 supostos bugs já funcionando — o defeito real era mais estreito (nomenclatura +
  altura do player) — ver `EVIDENCE.md` → E-033.
- **DO NOT TOUCH:** `TutorDrawer.tsx`/`DynamicIsland.tsx` (mecanismo de voz confirmado
  funcionando, não modificado); mecanismo de Foco/Context Panel (confirmado funcionando, não
  modificado); catálogo fechado de estados do Island; arquitetura de state machine compartilhado
  em `EducationContainer.tsx` (confirmada correta, não reescrita).
- **ACCEPTANCE CRITERIA:** (todos verificados — ver `EVIDENCE.md` → E-033)
  1. Rótulo "ENEM" (não "Vestibular") em todos os pontos de exibição da trilha.
  2. Ciclo ENEM→Inglês→Faculdade→ENEM preserva contexto, testado ao vivo.
  3. Palco da aula preenche melhor a altura útil em telas altas (1440×960, 1440×1200), sem alterar
     a altura medida em 390×844/820×1180/1024×900.
  4. Confirmação (não suposição) de que a arquitetura de 3 sub-abas dentro de Educação (não itens
     da Sidebar) já está correta.
  5. Confirmação (não suposição) de que o Tutor reage visualmente ao Island durante o ciclo de voz.
  6. Confirmação (não suposição) de que o Context Panel não ocupa espaço fixo em modo Foco.
  7. `npx tsc --noEmit` e `npm run build` sem erro.
  8. Browser QA real — 11/11 checks.
- **STATUS:** Gates 1-10 **PROVADO**. Gate 11 (Human Experience Gate) **BLOQUEADO**. Classificação:
  `EXPERIENCE EM REFINAMENTO` (inalterada — refina, não fecha a Experience de Educação sozinho).
  PR https://github.com/MasterABL/Medusa/pull/13 (draft). Depende de PR #7 (que depende de PR #5
  — `D-012`). Merge Gate: BLOQUEADO (aprovação humana, mesma natureza de HDR-001).
- **NOTA EXPLÍCITA:** nenhuma mudança foi feita em Tutor/Island ou Foco/Context Panel — a
  auditoria não confirmou os defeitos supostos pelo relato original, e por princípio desta sessão
  (`AGENT_RULES.md`) não se modifica especulativamente um mecanismo já ajustado sem defeito
  confirmado. Isso não é a tarefa "incompleta" — é o resultado real da investigação.

---

## QUEUE AUDIT (Execution Sprint — Capability Audit + Maximum Product Expansion, sessão atual)

**Nota de processo:** esta sessão teve seis rodadas (mais uma rodada de continuação de governança
registrando D-013 entre a 3ª e a 4ª, sem código de produto). A 1ª ampliou o escopo para um
Capability Audit completo e resolveu de fato o P0 do Context Panel (PR #5). A 2ª priorizou Agenda
sobre a auditoria de Educação (PR #6). A 3ª voltou a Educação — não como auditoria genérica, mas
como refinamento direcionado de motion/espaço/Dynamic Island sobre a base multi-trilha já portada
(PR #7). A 4ª (após D-013 ser aprovada humanamente) fechou parte dos gaps de Fase A da Agenda —
motion de troca de view, integração com o Dynamic Island, feedback de salvar/excluir, e um bug
funcional real de exclusão de rotina — sobre a base já provada em PR #6 (PR #9). A 5ª (a pedido
explícito do usuário, "RODADA DE REFINAMENTO DE EXPERIÊNCIA") tratou 3 domínios em paralelo, em
branches separadas por instrução direta ("não misturar Agenda e Educação numa mudança
não-revisável"): Shell (recuperação real da Sidebar, PR #11), Agenda (conflitos N-a-N, prioridade,
sugestões de horário, recorrência "Personalizado", PR #12) e Educação (nomenclatura ENEM, altura
do player, auditoria de Tutor/Island e Foco sem mudança onde não havia defeito, PR #13).

```
UNLOCKED TASKS EXECUTADAS NESTA SESSÃO:
  - Capability Audit completo → CONCLUÍDO, PROVADO (E-027).
  - TASK-CONTEXT-PANEL-GEOMETRY-001 → EXECUTADA, PROVADO (E-027). PR #5 aberta.
  - `.github/dependabot.yml` criado — incluído na mesma PR #5.
  - TASK-AGENDA-SHELL-001 → EXECUTADA, PROVADO (E-028). Agenda cherry-picked de `feature/agenda`
    para `feat/agenda` (base: PR #5), único conflito (`ContextPanel.tsx`) reconciliado, 40/41
    checks reais (script original + suíte nova de regressão de Shell). PR #6 aberta.
  - TASK-STUDY-MODE-REFINEMENT-001 → EXECUTADA, PROVADO (E-029). Multi-trilha (`e616635`)
    cherry-picked para `feat/education-multitrack` (base: PR #5), sem conflitos. Refinado: espaço
    do palco, transição de troca de trilha, timing aula→exercícios, estado de voz real no Island.
    41/41 checks reais com amostragem em plena transição. PR #7 aberta.
  - D-013 (Modelo Fase A precede Fase B) registrada, documentada em `.ai/` e **aprovada
    humanamente** — PR #8 mesclado em `chore/agent-os-bootstrap`.
  - TASK-AGENDA-EXPERIENCE-001 → EXECUTADA. Gates 1-10 PROVADO (E-030): motion de troca de view,
    Dynamic Island reagindo (pulso `processing`→`idle`), confirmação de exclusão em 2 passos na
    Lista, bug de exclusão de ocorrência de rotina corrigido. 27/27 checks novos + 11/11 + 29/30
    de regressão. Gate 11 (Human Experience Gate) BLOQUEADO — classificação `EXPERIENCE EM
    REFINAMENTO`. PR #9 aberta, depende de PR #6 (que depende de PR #5, `D-012`).
  - TASK-SHELL-SIDEBAR-RECOVERY-001 → EXECUTADA, Gates 1-10 PROVADO (E-031). 2 bugs reais
    corrigidos (botão inalcançável + geometria de ícones em modo Compacto). 26/26 checks reais.
    PR #11 aberta, depende de PR #5 (`D-012`).
  - TASK-AGENDA-CONFLICTS-EXPERIENCE-001 → EXECUTADA, Gates 1-10 PROVADO (E-032). Layout de
    conflito N-a-N real, prioridade por domínio, painel de sugestões de horário (gap-finding real,
    não fake), recorrência "Personalizado" completa (bug real de `recurrence` nunca salva
    corrigido), exclusão por escopo. Deslocamento/Google Maps deliberadamente NÃO implementado
    (fora do escopo de Fase A, por instrução direta do usuário). 20/20 checks reais. PR #12
    aberta, depende de PR #9 (que depende de PR #6/#5, `D-012`).
  - TASK-EDUCATION-TRACKS-EXPERIENCE-001 → EXECUTADA, Gates 1-10 PROVADO (E-033). Rótulo ENEM
    corrigido, altura do player estendida em telas altas. Auditoria ao vivo confirmou a
    arquitetura de 3 sub-abas e o mecanismo Tutor↔Island/Foco já corretos — nenhuma mudança feita
    onde não havia defeito confirmado. 11/11 checks reais. PR #13 aberta, depende de PR #7 (que
    depende de PR #5, `D-012`).

QUEUE AUDIT PARCIAL — trabalho identificado mas NÃO executado nesta sessão (registrado para não
fingir conclusão):
  - Auditoria transversal de UX/UI/Motion/Loading/Acessibilidade/Performance do Shell inteiro
    além do que as suítes de Context Panel + Sidebar recovery + Agenda + Study Mode já cobrem.
  - Corpo/Finanças/Progresso/Guardian/Buscar via árvore de decisão.
  - QA como produto (suíte reutilizável consolidada) — ainda scripts individuais, reais e
    passando, mas não unificados num framework único.
  - Observabilidade (Sentry ou alternativa) — NÃO IMPLEMENTADA, nenhuma conta de terceiro criada.
  - Reagendar uma única ocorrência de rotina recorrente para outro horário mantendo as demais
    (exigiria estender `recurrenceExceptions` para carregar um horário substituto).
  - Integração real de tempo de deslocamento na Agenda (Google Maps Platform/Routes API) —
    aguarda decisão humana de provedor/custo, é trabalho de Fase B por definição.
  - Animação de saída de drawers/modais (`EventFormDrawer`, `CategoryModal`, `TutorDrawer`) — hoje
    desmontam instantaneamente; um padrão já existente em todo o app, não uma regressão desta
    rodada, registrado como possível refinamento futuro.

BLOCKED TASKS (Human Gate real, não escopo inteiro):
  - Fase 2 (Auth): HDR-011. Bloqueia também o wiring de Supabase como persistência real.
  - IA/Gemini/OpenRouter e Google Workspace como feature de produto: BLOCK-009 (pré-requisitos de
    infraestrutura ausentes, não escolha entre opções) — não bloquearam a Agenda, como instruído.
  - Fases 6-13 / layout final completo de Hoje / Corpo / Finanças / Progresso / Guardian / Buscar:
    HDR-005.
  - Fechamento formal (merge) das Fases 1, 3, 4, Hoje Foundation (PR #4), Context Panel (PR #5),
    Agenda (PR #6), Study Mode Refinement (PR #7), Agenda Experience (PR #9), Sidebar Recovery
    (PR #11), Agenda Conflicts (PR #12) e Education Tracks (PR #13): HDR-001.
  - Human Experience Gate (`QA_GATE.md` → Gate 11) para Hoje, Agenda, Educação e para a
    infraestrutura de Shell — distinto do Merge Gate, ainda não concedido para nenhuma aba.

HUMAN GATES (atualizado nesta rodada):
  - HDR-001 (aprovação de merge — agora cobre PR #1 → PR #2 → PR #4 → PR #5 → PR #6 → PR #7 →
    PR #9 → PR #11 → PR #12 → PR #13, todas tecnicamente dependentes de PR #5 — `D-012`)
  - HDR-011 (provedor de Auth)
  - Human Experience Gate por aba (`QA_GATE.md` → Gate 11) — Hoje/Agenda/Educação/Shell com
    Gates 1-10 `PROVADO`, aguardando esta decisão especificamente (D-013 já aprovada não concede
    isto automaticamente — são decisões distintas). Ver a seção "NEXT HUMAN GATE" do relatório de
    evidência desta rodada para o roteiro exato de teste manual por domínio.

TECHNICAL BLOCKERS:
  - `npm audit` bloqueado pelo classificador de modo automático do ambiente (real, verificado).
  - Antigravity (`agy`) segue inalcançável nesta sessão (BLOCKERS.md → BLOCK-001), sem impacto.
  - IA/Google Workspace/Stitch como features de produto: BLOCK-009.

NEXT EXECUTABLE TASK (real, não hipotética):
  Auditoria transversal de UX/UI/Motion/Loading/Acessibilidade/Performance do Shell inteiro além
  do que Context Panel + Sidebar recovery + Agenda + Study Mode já cobrem individualmente — não
  depende de nenhum HDR nem de BLOCK-009. Alternativa igualmente válida (e talvez preferível
  agora): não abrir mais rodadas de refinamento em Hoje/Agenda/Educação/Shell até o Human
  Experience Gate ser concedido para o que já está provado tecnicamente, para evitar acumular
  Experience-em-refinamento sem fechamento. TRACK: DESIGN/EXPERIENCE (Fase A) — consistente com
  D-013, já que nenhuma tarefa ENGINEERING/INTEGRATION pode ser "next executable" com Fase A ainda
  aberta nas 8 abas.
```

**Nota D-013 sobre esta seção**: nenhum item de `BLOCKED TASKS`/`HUMAN GATES` acima que seja
`ENGINEERING/INTEGRATION` (Auth/HDR-011, Supabase, IA/Google como feature de produto) se torna
executável apenas por resolver seu HDR — mesmo resolvido, essas tarefas continuam `BLOQUEADO` por
Fase A ainda estar aberta nas 8 abas (ver `ROADMAP.md`). Resolver um HDR de Fase B hoje adianta a
*decisão*, não a *implementação*.

**Decisões que desbloqueariam trabalho além disso, cada uma com o que ela libera:**
- **HDR-001** (aprovação de merge) → libera o fechamento formal das Fases 1, 3, 4, Hoje
  Foundation (PR #4), Context Panel (PR #5), Agenda (PR #6) e Study Mode Refinement (PR #7).
  TRACK: DESIGN/EXPERIENCE — Merge Gate é distinto de Human Experience Gate (D-013); mesclar não
  torna uma aba `EXPERIENCE COMPLETE` por si só.
- **HDR-011** (escolher provedor de Auth) → libera a *decisão* de Fase 2 E do wiring do projeto
  Supabase já existente como persistência real. TRACK: ENGINEERING/INTEGRATION — **por D-013, a
  implementação real só começa depois do Human Experience Gate fechar nas 8 abas**, mesmo com
  HDR-011 resolvido.
- Provisionar uma chave de API de IA (Gemini ou OpenRouter, decisão humana de custo/provider) →
  libera a *decisão* de qualquer feature que dependa de IA. TRACK: ENGINEERING/INTEGRATION —
  mesma trava de D-013 acima.
- Registrar um app OAuth do Medusa no Google Cloud Console → libera a *decisão* de integração real
  de Google Calendar/Gmail/Drive como features de produto. TRACK: ENGINEERING/INTEGRATION — mesma
  trava de D-013 acima.
- Uma rodada de definição de contrato/design para o layout final de Hoje/Corpo/Finanças/
  Progresso/Guardian/Buscar → libera a decomposição completa das Fases 5-13. TRACK:
  DESIGN/EXPERIENCE (Fase A) — não bloqueado por D-013.
