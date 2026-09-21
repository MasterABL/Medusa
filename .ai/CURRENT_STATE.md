# CURRENT_STATE.md — Estado Real do Repositório

**Última verificação**: sessão "CAPABILITY AUDIT + MAXIMUM PRODUCT EXPANSION SPRINT", 3ª rodada.
Rodada 1: Capability Audit real + P0 Context Panel corrigido de fato (PR #5, `EVIDENCE.md` →
E-027). Rodada 2: Agenda cherry-picked de `feature/agenda` (presa por `HDR-001`) para uma branch
própria `feat/agenda`, PROVADO com 40/41 checks reais, PR #6 (`EVIDENCE.md` → E-028). Rodada 3
(esta): Study Mode multi-trilha (ENEM/Inglês/Faculdade) cherry-picked da mesma linhagem não
mesclada e refinado (espaço do palco, transição de troca de trilha, timing aula→exercícios,
estado de voz real no Dynamic Island) — PROVADO com 41/41 checks reais, PR #7
(`EVIDENCE.md` → E-029). Sessões anteriores investigaram o Context Panel até a raiz, corrigiram
honestidade dos placeholders e executaram `TASK-HOJE-FOUNDATION-001` (PR #4). **Não afirme nada
aqui sem ter verificado.** Este arquivo deve ser atualizado a cada gate concluído.

**Rodada 4 (sessão de continuação, 2026-09-21)**: `D-013` (modelo Fase A precede Fase B,
globalmente, nas 8 abas) foi registrada, documentada em `.ai/` via PR #8 (`chore/agent-os-
bootstrap` ← `claude/adoring-mccarthy-bq0bsb`) e **aprovada humanamente** — ver `DECISIONS.md` →
D-013 (STATUS: APROVADA HUMANAMENTE). A partir desta rodada, D-013 é governança oficial vigente,
não mais uma proposta.

**Rodada 5 (mesma sessão de continuação)**: fechada a Experience da Agenda (segunda aba na ordem
oficial, depois de Hoje) sobre a base já provada em PR #6. Auditoria achou e corrigiu 3 gaps reais
de Fase A (troca de view sem transição, zero integração com o Dynamic Island, salvar/excluir sem
feedback) e 1 bug funcional real (exclusão de ocorrência de rotina recorrente silenciosamente
no-op, por id virtual não resolvido em `AgendaContext.deleteItem`) — PROVADO com 27/27 checks
novos + 11/11 + 29/30 de regressão, PR #9 (`EVIDENCE.md` → E-030). Gates 1-10 `PROVADO`; Gate 11
(Human Experience Gate) ainda não concedido — classificação `EXPERIENCE EM REFINAMENTO`, não
`EXPERIENCE COMPLETE`. Nenhuma implementação de Fase B foi antecipada.

**Rodada 6 (mesma sessão de continuação — "RODADA DE REFINAMENTO DE EXPERIÊNCIA" solicitada
explicitamente pelo usuário)**: três frentes paralelas em branches separadas (Shell, Agenda,
Educação — nenhuma mistura de domínios numa mesma PR, por instrução explícita do usuário), todas
com Baseline Gate/Auditoria feitos antes de codar, nenhuma trabalhando direto em `main`:
- **Shell — Sidebar recovery** (PR #11, a partir de `fix/context-panel-geometry`/PR #5): a
  reclamação "Sidebar fica presa" revelou 2 bugs reais (botão de recuperação existia mas ficava
  dentro de um wrapper `pointer-events:none`; ícones do modo Compacto geometricamente fora da
  faixa visível por causa de um `width` fixo em `240px` que não acompanhava o colapso). Ambos
  corrigidos. 26/26 checks reais — `EVIDENCE.md` → E-031.
- **Agenda — conflitos/prioridade/sugestões/recorrência** (PR #12, a partir de
  `feat/agenda-experience-complete`/PR #9): renderização de N eventos concorrentes reescrita com
  clustering + column-packing real (não apenas reduzir fonte); heurística de prioridade por
  domínio explicitamente rotulada como não-definitiva; painel "Conflito encontrado" com sugestões
  de horário reaproveitando `calculateFreeTimeSlots()` (motor real de gap-finding, não fake);
  recorrência "Personalizado" (intervalo/dias da semana/término) implementada de fato — achado e
  corrigido um bug real e severo: rotinas criadas pelo formulário nunca salvavam `recurrence`
  (`isRecurring` nunca era setado por nenhum controle de UI); exclusão de ocorrência recorrente com
  3 escopos (esta/esta e as próximas/toda a série) usando só campos já existentes + 1 campo novo
  (`recurrenceExceptions`, Local State). 20/20 checks reais — `EVIDENCE.md` → E-032.
- **Educação — nomenclatura + altura do player** (PR #13, a partir de
  `feat/education-multitrack`/PR #7): auditoria ao vivo confirmou que a arquitetura de 3 trilhas
  como sub-abas DENTRO de Educação (não itens da Sidebar) e o Study Mode compartilhado já estavam
  corretos — não uma regressão a corrigir. Defeito real e mais estreito: rótulo "Vestibular"
  inconsistente com "ENEM" pedido pelo usuário (corrigido em `educationFixtures.ts` e nos 2 lugares
  que duplicavam o array de trilhas). Altura do player em telas altas estendida com `max()` CSS
  (não um refactor de toda a cadeia flex). Tutor↔Dynamic Island (reação de voz) e Context
  Panel/Foco foram testados ao vivo com amostragem em plena transição e confirmados **já
  funcionando corretamente** (de PR #5/#7 anteriores) — nenhuma mudança feita neles, por não haver
  defeito confirmado. 11/11 checks reais — `EVIDENCE.md` → E-033.

Nenhum dos três domínios é declarado `EXPERIENCE COMPLETE` por esta rodada — Gates 1-10 `PROVADO`
tecnicamente, Gate 11 (Human Experience Gate) permanece uma decisão humana pendente e distinta,
conforme `QA_GATE.md` → seção 11.

## CHECKPOINT ATUAL (formato definido em AGENT_RULES.md → seção 8)

```
STATUS:        PARCIAL — 8 PRs abertos e provados tecnicamente (PR #4 Hoje Foundation, PR #5
               Context Panel geometry, PR #6 Agenda base, PR #7 Study Mode Refinement, PR #9
               Agenda Experience, PR #11 Shell Sidebar recovery, PR #12 Agenda
               conflitos/recorrência/sugestões, PR #13 Educação ENEM/player), mais
               PR #1/#2/#3/#8(mesclado)/#10(docs) do histórico. D-013 aprovada humanamente e
               oficial. Sprint não esgotado: ver TASK_QUEUE.md → QUEUE AUDIT.
FASE ATUAL:    D-013 (Fase A precede Fase B) oficializada e aprovada. Agenda recebeu uma segunda
               rodada de refinamento (PR #12: conflitos N-a-N, prioridade, sugestões de horário,
               recorrência "Personalizado", exclusão por escopo) sobre PR #9/#6. Educação recebeu
               correção de nomenclatura (ENEM) e altura do player (PR #13) sobre PR #7. Shell
               ganhou correção real de recuperação da Sidebar em modo Compacto (PR #11) sobre
               PR #5. Todos permanecem EXPERIENCE EM REFINAMENTO — nenhum Human Experience Gate
               concedido. Fase 5 (Hoje) com recorte mínimo provado (PR #4), inalterada. Fases
               1/3/4 inalteradas.
CONCLUÍDO NESTA SESSÃO:
  - Capability Audit real e completo (IA/Design/Knowledge/Dados/Google Workspace/Observabilidade/
    QA/Segurança) — ver EVIDENCE.md → E-027. Achados principais: nenhum conector de IA (Gemini/
    AI Studio/OpenRouter/Context7/Sentry) existe neste ambiente (verificado via ToolSearch, não
    suposto); existe uma chave real `Stitch_api_key` no Vercel do projeto `medusa` mas nenhuma via
    de acesso a ela; Google Workspace conectado só ao escopo desta sessão/operador, não ao
    produto; existe um projeto Supabase real chamado "Medusa" (plano free, criado 2026-09-14,
    estava pausado, restaurado nesta sessão) mas ainda vazio.
  - TASK-CONTEXT-PANEL-GEOMETRY-001: a correção de geometria (achada na sessão anterior, decidida
    NÃO duplicar então) foi portada para uma branch própria a partir de `main`
    (`fix/context-panel-geometry`), incluindo um 4º cálculo duplicado que a sessão anterior não
    tinha visto (Sidebar.getSidebarWidth) e um bug novo achado durante o port (borda de 1px que
    não zera com box-sizing:border-box quando width:0 — presente também em `feature/agenda`,
    ainda não reportado lá). PR #5, 39/39 checks reais (largura amostrada em plena transição, não
    só antes/depois) — EVIDENCE.md → E-027.
  - `.github/dependabot.yml` criado (gap real de segurança achado no audit, gratuito, incluído na
    PR #5).
  - Agenda (TASK-AGENDA-SHELL-001, PR #6) e Study Mode Refinement (TASK-STUDY-MODE-REFINEMENT-001,
    PR #7) — ver EVIDENCE.md → E-028, E-029.
  - D-013 (Modelo Fase A precede Fase B) registrada, documentada e **aprovada humanamente** — PR #8
    mesclado em `chore/agent-os-bootstrap`.
  - TASK-AGENDA-EXPERIENCE-001 (PR #9): motion de troca de view, Dynamic Island reagindo,
    confirmação de exclusão em 2 passos na Lista, bug real de exclusão de rotina corrigido — ver
    EVIDENCE.md → E-030. Gates 1-10 PROVADO, Gate 11 (Human Experience Gate) pendente.
  - TASK-SHELL-SIDEBAR-RECOVERY-001 (PR #11): 2 bugs reais corrigidos (botão de recuperação
    inalcançável + ícones do modo Compacto geometricamente fora da faixa visível) — ver
    EVIDENCE.md → E-031. 26/26 checks reais.
  - TASK-AGENDA-CONFLICTS-EXPERIENCE-001 (PR #12): layout de conflito N-a-N real (clustering +
    column-packing), heurística de prioridade por domínio, painel de sugestões de horário
    compatível (motor real de gap-finding), recorrência "Personalizado" completa, exclusão de
    ocorrência recorrente por escopo, bug real de recorrência nunca salva corrigido — ver
    EVIDENCE.md → E-032. 20/20 checks reais.
  - TASK-EDUCATION-TRACKS-EXPERIENCE-001 (PR #13): rótulo ENEM corrigido, altura do player em
    telas altas estendida, arquitetura de 3 trilhas e Tutor↔Island/Context Panel auditados e
    confirmados já corretos (nenhuma mudança onde não havia defeito) — ver EVIDENCE.md → E-033.
    11/11 checks reais.
RESTANTE — identificado mas NÃO executado nesta sessão (ver QUEUE AUDIT para detalhe honesto):
  - Auditoria transversal de UX/UI/Motion/Loading/Acessibilidade/Performance do Shell inteiro
    além do que Context Panel + Agenda + Study Mode + Sidebar recovery já cobrem individualmente.
  - Corpo/Finanças/Progresso/Guardian/Buscar via árvore de decisão.
  - QA consolidado como suíte reutilizável (hoje são scripts individuais, reais e passando).
  - Observabilidade (Sentry ou alternativa) — nenhuma conta de terceiro criada sem confirmação.
  - Reagendamento real de uma única ocorrência de rotina recorrente (hoje só marca exceção/corta a
    série — mover só aquela ocorrência para outro horário exigiria estender o modelo de exceção
    para carregar um horário substituto, registrado como trabalho futuro em `TASK_QUEUE.md`).
  - Integração real de tempo de deslocamento (Google Maps Platform/Routes API) na Agenda —
    deliberadamente NÃO implementada nesta rodada (fora do escopo de Fase A); apenas o contrato de
    dados futuro foi registrado em `TASK_QUEUE.md`, sem nenhuma chamada real a serviço externo.
RESTANTE (decisões humanas reais / pré-requisitos de infraestrutura — nada executável por Claude
hoje):
  - HDR-001: aprovação humana de merge (agora PR #1 → PR #2 → PR #3 → PR #4 → PR #5 → PR #6 →
    PR #7 → PR #9 → PR #11 → PR #12 → PR #13; PR #8 já mesclado).
  - HDR-011: escolha de provedor de Auth (bloqueia Fase 2 E o wiring do Supabase já existente) —
    e, por D-013, mesmo resolvido, a implementação real de Fase B ainda esperaria as 8 abas.
  - BLOCK-009: IA (falta chave de API), Google Workspace como feature de produto (falta app OAuth
    próprio do Medusa) — pré-requisitos de infraestrutura ausentes, não escolhas entre opções.
  - Layout final completo de Hoje/Corpo/Finanças/Progresso/Guardian/Buscar (HDR-005/HDR-006).
  - Human Experience Gate (`QA_GATE.md` → Gate 11) para Hoje, Agenda, Educação e para a
    infraestrutura de Shell — decisão humana distinta do Merge Gate, ainda não concedida para
    nenhuma aba. Ver a seção "NEXT HUMAN GATE" no relatório de evidência desta rodada para o que
    testar manualmente.
ÚLTIMO TESTE:
  node scripts/qa-shell-sidebar-recovery.js (novo, real, Puppeteer) → 26 PASSOU | 0 FALHOU.
  node scripts/qa-agenda-conflicts-recurrence.js (novo, real, Puppeteer) → 20 PASSOU | 0 FALHOU.
  node scripts/qa-education-tracks-experience.js (novo, real, Puppeteer) → 11 PASSOU | 0 FALHOU.
  npx tsc --noEmit / npm run build em `fix/shell-sidebar-recovery`,
  `feat/agenda-conflicts-experience` e `feat/education-tracks-experience` → todos limpos.
FALHAS:
  Nenhuma falha residual real nos 3 domínios. Bugs reais achados e corrigidos durante a auditoria
  (não bugs de teste): Sidebar (botão inalcançável + geometria de ícones), Agenda (renderização de
  conflito N-a-N quebrada, rotinas recorrentes nunca salvando `recurrence`). Um único bug real de
  produto foi introduzido e corrigido na própria rodada antes de reportar PROVADO (rótulo do botão
  de exclusão de `EventDetailPanel` quebrando a suíte antiga `qa-agenda.js` — corrigido tornando o
  rótulo condicional). Tutor↔Island e Context Panel/Foco: testados, SEM defeito confirmado, SEM
  mudança feita.
PRÓXIMO PASSO:
  Auditoria transversal de UX/UI/Motion/Loading/Acessibilidade/Performance do Shell inteiro além
  do que Context Panel + Sidebar recovery + Agenda + Study Mode já cobrem individualmente — não
  depende de nenhum HDR nem de BLOCK-009. Alternativa igualmente válida: aguardar o Human
  Experience Gate ser concedido para Hoje/Agenda/Educação antes de abrir mais rodadas de
  refinamento nessas abas. Ver TASK_QUEUE.md → QUEUE AUDIT.
BLOCKERS:
  Ver BLOCKERS.md → BLOCK-001 (Antigravity), BLOCK-006 (next@14.2.24 CVE), BLOCK-007 (ESLint não
  configurado), BLOCK-008 (Context Panel — RESOLVIDO, PR #5, aguarda só Merge Gate), BLOCK-009
  (IA/Google Workspace/Stitch — pré-requisitos de infraestrutura ausentes).
```

## Modelo FASE A / FASE B (`DECISIONS.md` → D-013, `AGENT_RULES.md` → seção 0)

A partir desta sessão, "design" no Medusa significa experiência completa (Estrutura/UI/UX/Motion/
Loading/Responsive/Accessibility/Estados/Microinterações + Human Experience Gate), não apenas uma
implementação visual inicial. Nenhuma aba avança para Fase B (dados reais/persistência/integrações/
IA/automações) antes de todas as 8 abas fecharem Fase A — ver `ROADMAP.md` para a grade completa.
Classificação atual por domínio (vocabulário `AGENT_RULES.md` → seção 0):

| Domínio | Classificação | Evidência |
|---|---|---|
| Hoje | BASE IMPLEMENTADA | PR #4, Gates 1-10 `PROVADO` (`EVIDENCE.md` → E-026), sem Human Experience Gate nem merge |
| Agenda | EXPERIENCE EM REFINAMENTO | PR #6 (base) + PR #9 (motion/Island/UX) + PR #12 (conflitos N-a-N, prioridade, sugestões, recorrência "Personalizado", exclusão por escopo), Gates 1-10 `PROVADO` (`EVIDENCE.md` → E-030, E-032), sem Human Experience Gate nem merge |
| Educação / Study Mode | EXPERIENCE EM REFINAMENTO | PR #7 (motion/espaço/Dynamic Island) + PR #13 (rótulo ENEM, altura do player), Gates 1-10 `PROVADO` (`EVIDENCE.md` → E-029, E-033); sem Human Experience Gate nem merge |
| Shell / Context Panel / Sidebar (transversal, não é uma das 8 abas) | BASE IMPLEMENTADA | PR #5 (geometria) + PR #11 (recuperação da Sidebar em modo Compacto), Gates 1-10 `PROVADO` (`EVIDENCE.md` → E-027, E-031); é infraestrutura de Fase A consumida por todas as abas, não uma aba em si |
| Corpo | NÃO IMPLEMENTADO | nenhum arquivo/spec no repositório |
| Finanças | NÃO IMPLEMENTADO | nenhum arquivo/spec no repositório |
| Progresso | NÃO IMPLEMENTADO | nenhum arquivo/spec no repositório |
| Guardian | NÃO IMPLEMENTADO | nenhum arquivo/spec no repositório (pode abrir Contract, `MASTER_PLAN.md` → Fase 9, mas isso não é Experience) |
| Buscar | NÃO IMPLEMENTADO | nenhum arquivo/spec no repositório |

Nenhuma linha acima é `EXPERIENCE COMPLETE` ou `ENGINEERING COMPLETE` hoje — a primeira exige Human
Experience Gate (`QA_GATE.md` → seção 11) por aba, ainda não concedido para nenhuma; a segunda por
definição só é alcançável depois de Fase B, que não começou para nenhum domínio.

## Onde estamos — Q&A de governança (formato exigido por esta auditoria)

**Onde estamos?** Três domínios (Hoje, Agenda, Educação) e a infraestrutura de Shell (Context
Panel) têm implementação provada tecnicamente (Gates 1-10 de `QA_GATE.md`) em branches próprias
(PR #4, #6, #7, #5) — nenhuma mesclada em `main`. Cinco abas (Corpo, Finanças, Progresso, Guardian,
Buscar) não têm nenhum código nem especificação.

**O que já foi provado?** Gates 1-10 (Contract→Merge Gate, exceto o próprio Merge) para PR #4, #5,
#6, #7 — ver `EVIDENCE.md` → E-026 a E-029. Isso cobre Estrutura/UI/UX/Motion/Loading/Responsive/
Browser QA real com evidência de transição em pleno andamento (não apenas antes/depois).

**O que está em refinamento?** Educação/Study Mode — a base multi-trilha existe e foi provada, mas
esta sessão registrou explicitamente que o trabalho de motion/Island/voz é evidência de aprendizado
de processo (estrutura persistente-que-transforma, evidência de motion em plena transição), não uma
autorização para avançar Educação para Fase B.

**O que está bloqueado?** (a) Merge Gate de todos os PRs abertos — decisão humana real (`HDR-001`);
(b) Human Experience Gate (`QA_GATE.md` → seção 11) — não concedido para nenhuma aba ainda,
distinto do Merge Gate; (c) Fase 2/Auth — `HDR-011`; (d) qualquer wiring de IA/Google/Supabase como
feature de produto — `BLOCK-009` e, agora também, `D-013` (Fase B global não abre enquanto Fase A
não fechar nas 8 abas, independente de HDRs individuais serem resolvidos).

**O que NÃO deve ser feito ainda?** Nenhuma integração real (Google Calendar/OAuth, Gemini,
OpenRouter, Supabase como persistência de produto, automações, regras de negócio definitivas,
schemas de produção) para nenhuma das 8 abas — mesmo que um Human Decision individual (ex.: HDR-011)
seja resolvido, isso libera a *decisão*, não o início da implementação de Fase B, que continua
esperando o fechamento global de Fase A (`D-013`).

**Qual é o próximo gate?** Human Experience Gate (`QA_GATE.md` → seção 11) para Hoje, Agenda e
Educação — os três domínios com Gates 1-10 já `PROVADO`. Nenhum dos três é `EXPERIENCE COMPLETE`
sem essa aprovação humana explícita, que é distinta e não substituível por automação.

**Nota de honestidade sobre este bloco**: os itens acima foram verificados contra o estado real de
`EVIDENCE.md`, `TASK_QUEUE.md` e as branches remotas listadas em "Baseline Git" abaixo nesta mesma
sessão de auditoria — nenhuma reformulação de dados foi inventada; onde este arquivo já divergia do
estado real de alguma outra forma não coberta pela tarefa desta sessão, isso não foi corrigido
silenciosamente (ver `ROADMAP.md` → "Nota de discrepância factual").

## Baseline Git

```
origin                   = https://github.com/MasterABL/Medusa
main (origin/main)       = 5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0
branch de trabalho atual = chore/agent-os-bootstrap (PR #3, draft, aberta contra main)
```

- `origin/fix/foundation-hardening` (**PR #1**, aberta, não mesclada) = `main` + 2 commits
  (`e616635` "expand study mode to multi-track learning", `a7f988c` "harden context panel...").
- `origin/feature/agenda` (**PR #2**, aberta, não mesclada) = `fix/foundation-hardening` + 1 commit
  próprio (`758cd8d` "implement complete Medusa Temporal OS..."). **PR #2 contém todos os commits
  de PR #1** — não pode ser mesclada isoladamente (ver `DECISIONS.md` → D-008).
- `origin/shell/v2-fixes` — branch vazia, aponta para o mesmo commit de `main`, sem PR, sem
  conteúdo próprio. Não é trabalho pendente, apenas um placeholder não utilizado.
- `origin/chore/agent-os-bootstrap` (**PR #3**, draft, aberta) — este trabalho de protocolo.
- `.github/workflows/ci.yml` **criado e funcional** nesta sessão (`TASK-CI-001`, D-011) — rodou
  de verdade em PR #3 com sucesso (`EVIDENCE.md` → E-023). Escopo: typecheck + build (lint fora,
  ver `BLOCKERS.md` → BLOCK-007).
- `origin/feat/hoje-foundation` (**PR #4**, draft, aberta contra `main`) — Hoje Foundation v1 +
  correção de honestidade em rotas pendentes. `main` + 1 commit próprio (`f58860e`). PROVADO
  (`EVIDENCE.md` → E-026). Independente de PR #1/#2/#3 (branch criada direto de `main`).
- `origin/fix/context-panel-geometry` (**PR #5**, draft, aberta contra `main`) — correção de
  BLOCK-008 (geometria do Shell unificada em `calculateShellGeometry()`). `main` + 1 commit
  próprio (`6a592f8`). PROVADO (`EVIDENCE.md` → E-027). Independente de PR #1/#2/#3/#4.
- `origin/feat/agenda` (**PR #6**, draft, aberta contra `main`) = `fix/context-panel-geometry` +
  2 commits próprios (cherry-pick de `758cd8d` reconciliado + suíte de QA nova). **PR #6 contém
  todos os commits de PR #5** — mesma relação estrutural de PR #2/PR #1 (`D-008`), agora
  registrada como `D-012`. PROVADO (`EVIDENCE.md` → E-028).
- `origin/feat/education-multitrack` (**PR #7**, draft, aberta contra `main`) =
  `fix/context-panel-geometry` + 2 commits próprios (cherry-pick de `e616635`, sem conflitos, +
  refinamento de motion/espaço/Island). **PR #7 também contém o commit de PR #5** (mesma relação
  de `D-012`). PROVADO (`EVIDENCE.md` → E-029).
- `origin/chore/agent-os-bootstrap` (**PR #8**, **MESCLADA** — commit `78ebfa8`) — formalizou e
  registrou a aprovação humana de `D-013` (Modelo Fase A precede Fase B). Não é mais um PR aberto.
- `origin/feat/agenda-experience-complete` (**PR #9**, draft, aberta contra `main`) =
  `feat/agenda` + 1 commit próprio (motion de troca de view, Dynamic Island, confirmação de
  exclusão em 2 passos na Lista, correção do bug de exclusão de rotina). **PR #9 também contém os
  commits de PR #5 e PR #6** (mesma relação de `D-012`, agora estendida a esta branch). Gates 1-10
  PROVADO (`EVIDENCE.md` → E-030); Gate 11 (Human Experience Gate) pendente.
- `origin/docs/agenda-experience-evidence` (**PR #10**, draft, aberta contra
  `chore/agent-os-bootstrap`) — registro de evidência de PR #9 (E-030), documentação apenas, sem
  código de produto.
- `origin/fix/shell-sidebar-recovery` (**PR #11**, draft, aberta contra `main`) =
  `fix/context-panel-geometry` + 1 commit próprio (recuperação da Sidebar em modo Compacto + fix
  de geometria dos ícones). **PR #11 também contém o commit de PR #5** (mesma relação de
  `D-012`). PROVADO (`EVIDENCE.md` → E-031).
- `origin/feat/agenda-conflicts-experience` (**PR #12**, draft, aberta contra `main`) =
  `feat/agenda-experience-complete` + 1 commit próprio (layout de conflito N-a-N,
  prioridade/contexto, sugestões de horário compatível, recorrência "Personalizado", exclusão por
  escopo). **PR #12 também contém os commits de PR #5, PR #6 e PR #9** (mesma relação de
  `D-012`, agora estendida a esta branch). PROVADO (`EVIDENCE.md` → E-032).
- `origin/feat/education-tracks-experience` (**PR #13**, draft, aberta contra `main`) =
  `feat/education-multitrack` + 1 commit próprio (rótulo ENEM, altura do player em telas altas).
  **PR #13 também contém o commit de PR #5** (mesma relação de `D-012`). PROVADO
  (`EVIDENCE.md` → E-033).
- Vercel builda preview automaticamente para todas as PRs (confirmado real — `EVIDENCE.md` →
  E-009, E-013).

## Foundation Hardening (PR #1)

- **Implementation/Test/Build/Browser QA Gate: PROVADO** (verificado de verdade nesta sessão —
  `EVIDENCE.md` → E-014, E-015, E-016). `npx tsc --noEmit` limpo, `npm run build` verde,
  `test-foundation-hardening.js` 13/13, `qa-browser.js` 23/23 asserções reais aprovadas.
- **Precisão da descrição da PR**: "42 testes aprovados" mistura o número de screenshots (42, real)
  com o número de asserções de teste (23, real, todas aprovadas) — impreciso, mas não falso na
  essência (nenhuma asserção real falhou).
- **Merge Gate: BLOQUEADO** — não mesclado a `main`. Ver `DECISIONS.md` → HDR-001.
- **Achado novo**: o commit `e616635` desta branch modifica 7 arquivos de
  `src/components/education/**` (área congelada) sem decisão prévia registrada em `DECISIONS.md`
  — ver HDR-010.

## Educação / Study Mode

- **Baseline em `main` (`5d4c5c0`)**: PROVADO, congelado, single-track ("Física · Mecânica
  Ondulatória" fixo).
- **Expansão multi-trilha (dentro de PR #1/#2, não mesclada)**: implementa alternância real entre
  Faculdade/Inglês/Vestibular (`TRACK_DEFINITIONS`, `StudyTrack`), testada de verdade via
  `qa-browser.js` (alternância de trilha no Dashboard e dentro do Study Mode, Focus Mode
  preservado, exercícios/tutor/notas por trilha — todas as asserções relacionadas passaram).
  **Status: Implementation/QA PROVADO — Governança BLOQUEADA** (tocou área congelada sem decisão
  prévia; ver `DECISIONS.md` → HDR-010, aguardando ratificação humana antes do merge).

## Shell V2 / ContextPanel

- **Baseline**: PROVADO — Sidebar, Header, Dynamic Island, Mobile Island, Command Modal, 3 temas,
  3 modos, motion tokens, reduced motion, todos em `main`.
- `src/components/shell/ContextPanel.tsx` é modificado tanto por PR #1 (hardening de geometria)
  quanto por PR #2 (síntese temporal específica da Agenda, 189 linhas) — mudança esperada e dentro
  do escopo já previsto por `TASK-AGENDA-001` (Context Panel por domínio), não uma violação de área
  congelada (o "congelado" é a forma dos dados de `ShellGeometry`/`SHELL_DIMENSIONS`, não o arquivo
  inteiro).

## Agenda / Temporal OS (PR #2)

```
DESIGN         = auditado (protótipo Figma Make, sessão anterior)
FIGMA          = encerrado, usado só como referência de contrato — nunca portado literalmente
IMPLEMENTATION = FEITA — existe em PR #2 (feature/agenda), NÃO MESCLADA
```

- **Implementation/Test/Build Gate: PROVADO** (`EVIDENCE.md` → E-014). **Browser QA Gate: PROVADO**
  — `qa-agenda.js` real deu 29/30 (a 1 falha é a mesma limitação ambiental de TLS externo, não um
  defeito do app; ver `BLOCKERS.md` → BLOCK-005).
- 24 arquivos novos em `src/components/agenda/**`, `src/context/AgendaContext.tsx`,
  `src/types/agenda.ts`, `scripts/qa-agenda.js`. Sem novas dependências em `package.json`
  (`EVIDENCE.md` → E-019) — consistente com Local State.
- Spot-check de código confirma pelo menos 4 dos 9 critérios de aceitação de `TASK-AGENDA-001`
  genuinamente implementados: breakpoint 820px correto, categoria com domínio associado e editável,
  List View agrupada em Agora/Próximo/Depois/Mais tarde (resolve `HDR-003` na prática), conflito
  com duração real no rótulo (`EVIDENCE.md` → E-018).
- **Merge Gate: BLOQUEADO** (depende de PR #1 primeiro — dependência técnica, `DECISIONS.md` →
  D-008). **Ratificação: BLOQUEADA** para o agrupamento da List View (`HDR-003`, tecnicamente
  resolvido pelo código, falta confirmação humana formal).

## Corpo, Finanças, Progresso, Guardian, Buscar

- **Status**: NÃO IMPLEMENTADO. Nenhum arquivo, nenhuma especificação de UI encontrada no
  repositório. Ver `MASTER_PLAN.md` para os pontos marcados `HUMAN DECISION REQUIRED`.

## Auth / Identity

- **Status**: NÃO IMPLEMENTADO. Nenhuma dependência de autenticação em `package.json` (nem em
  `main`, nem em PR #1, nem em PR #2). Pré-requisito de qualquer Persistence Slice — ver
  `MASTER_PLAN.md` → Fase 2, `DECISIONS.md` → HDR-011.

## Antigravity CLI (`agy`)

- **Status**: NÃO ALCANÇÁVEL nesta sessão remota. O usuário reporta `agy` instalado e funcional
  numa máquina Windows separada — mas essa instalação não é acessível por este container isolado
  (sem ponte de rede/filesystem entre os dois ambientes). Não é um problema de configuração
  corrigível remotamente. Ver `BLOCKERS.md` → BLOCK-001, `DECISIONS.md` → HDR-009.

## Infraestrutura de CI/Deploy

- GitHub Actions: **CONFIGURADO E FUNCIONAL** desde esta sessão — `.github/workflows/ci.yml`
  (typecheck + build), primeiro run real com `conclusion: success` em PR #3
  (`EVIDENCE.md` → E-023).
- Vercel: **CONFIGURADO E FUNCIONAL** — builda preview automaticamente para `main` e as 3 branches
  abertas (`fix/foundation-hardening`, `feature/agenda`, `chore/agent-os-bootstrap`), todas com
  deploy `Ready`/`success`. Confirma, de forma independente, que o build de produção passa nas
  três (`EVIDENCE.md` → E-009, E-013).
- Supabase: **NÃO IMPLEMENTADO** no código (nenhuma dependência), mas o MCP do Supabase está
  disponível neste ambiente de execução — candidato natural para Auth+Persistência quando essa
  fase for decidida (não assumido como decisão — ver `DECISIONS.md` → HDR-011).

## Dívida técnica registrada (não bloqueia roadmap de produto)

- `next@14.2.24` tem vulnerabilidade de segurança conhecida (aviso do npm ao instalar) — ver
  `BLOCKERS.md` → BLOCK-006. Não investigada a fundo nesta sessão; deve virar tarefa de manutenção.
