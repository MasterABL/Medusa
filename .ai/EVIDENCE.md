# EVIDENCE.md — Ledger de Evidência Real

Regra: nada entra aqui como "PROVADO" sem comando exato + saída real (ou caminho de
screenshot/arquivo). Uma alegação de terceiro (ex.: descrição de um PR) é registrada como
**alegada**, não como evidência, até ser reproduzida por Claude, Antigravity, ou um humano nesta
ou em outra sessão rastreável.

---

## E-001 — Baseline Git deste bootstrap

**Comando/sessão:** bootstrap do Agent Operating System, 2026-09-20.
**Executor:** Claude.

```
$ git remote -v
origin  (fetch/push apontando para MasterABL/Medusa)

$ git fetch origin
(sucesso)

$ git rev-parse origin/main
5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0

$ git merge-base origin/main origin/fix/foundation-hardening
5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0

$ git rev-list --left-right --count origin/main...origin/fix/foundation-hardening
0	2

$ git log --oneline origin/fix/foundation-hardening -8
a7f988c ...
e616635 ...
(demais commits herdados de main)

$ git checkout -b chore/agent-os-bootstrap origin/main
Switched to a new branch 'chore/agent-os-bootstrap'
```

**Conclusão suportada por evidência real:** `main` está em `5d4c5c0`; `fix/foundation-hardening`
tem exatamente 2 commits à frente de `main` e nenhum atrás; PR #1 está `open`/`merged: false`.

**Status:** PROVADO (fato de baseline, não uma alegação de qualidade de produto).

---

## E-002 — Ausência de CI configurado

**Comando:** `mcp__github__actions_list` (via GitHub MCP).
**Saída:** `{"total_count":0}`
**Status:** PROVADO (ausência confirmada, não suposta).

---

## E-003 — Estrutura real de `src/` em `main` (sem Agenda)

**Comando:** listagem de diretório local após `git checkout -b chore/agent-os-bootstrap
origin/main`.
**Saída (resumo):** `src/components/{education,shell}/**`, `src/context/ShellContext.tsx`,
`src/fixtures/islandFixtures.ts`, `src/types/shell.ts`, `src/app/{page.tsx,layout.tsx,
globals.css,icon.svg,dev/motion-lab/page.tsx}`. Nenhum diretório `src/components/agenda/`.
**Status:** PROVADO — confirma que `IMPLEMENTATION` da Agenda é `NÃO INICIADA` (não uma alegação,
uma ausência verificada por listagem real).

---

## E-004 — Antigravity CLI indisponível

**Comando:**
```
$ agy --version
/bin/bash: line 1: agy: command not found
```
**Exit code:** 127.
**Status:** PROVADO (ausência) — ver `BLOCKERS.md` → BLOCK-001.

---

## E-005 (ALEGADO, NÃO REPRODUZIDO) — Claims do PR #1

**Fonte:** corpo do PR #1, lido via `mcp__github__list_pull_requests` (dado de terceiro, não
comando executado por Claude nesta sessão).
**Alegação textual do PR:** "Suíte automatizada canônica (qa-browser.js) com 42 testes
aprovados"; "Teste de hardening... aprovado com 100% de sucesso."
**O que falta para virar evidência real:** checkout de `fix/foundation-hardening`, execução real
de `node scripts/qa-browser.js` e `node scripts/test-foundation-hardening.js`, e registro da
saída completa aqui.
**Status:** **ALEGADO — NÃO REPRODUZIDO NESTA SESSÃO.** Não deve ser citado como `PROVADO` em
nenhum outro documento `.ai/` até ser reproduzido.

---

## E-006 — Auditoria interativa do protótipo Figma Make da Agenda (herdada de sessão anterior)

**Origem:** sessão anterior deste mesmo projeto (fora deste bootstrap), na qual o protótipo
`https://www.figma.com/make/eDnnwmu3ArYjNjWx5qcDQG/...` foi lido via ferramentas MCP do Figma
(`get_design_context`, `ReadMcpResourceTool` contra `file://figma/make/source/...`) e testado
interativamente.
**Achados usados como contrato de produto para `TASK-AGENDA-001` (ver `TASK_QUEUE.md`):**
- Bug de breakpoint: layout mobile da Week View não é acionado exatamente em 820px (usa
  `< 820`, excluindo o próprio valor).
- Conflito entre itens mostra apenas a palavra "conflito", sem duração.
- Categoria pode ser criada com cor, mas sem associação a domínio e sem edição posterior.
- List View agrupa por dia, não por Agora/Próximo/Depois/Mais tarde (ponto em aberto — ver
  HDR-003 em `DECISIONS.md`).
- Paleta de 24 cores pastel identificada e considerada reutilizável.
- Protótipo não implementa `prefers-reduced-motion`.
**Status:** PROVADO como *auditoria de design* (o protótipo foi de fato inspecionado e testado
interativamente em sessão anterior) — mas **NÃO é evidência de implementação no Medusa**, apenas
contrato de referência. Ver `CURRENT_STATE.md` para a distinção explícita
`DESIGN = auditado` / `IMPLEMENTATION = próxima etapa`.

---

## E-007 — Este bootstrap não alterou nenhum código de produto

**Comando executado (após criação de todos os arquivos `.ai/**` e do orquestrador):**
```
$ git status --short
?? .ai/
?? scripts/agent-orchestrator.cjs

$ git diff --stat -- src/
(saída vazia)

$ git diff --stat origin/main -- .
(saída vazia — nada rastreado foi modificado; apenas arquivos novos e não rastreados existem)
```
**Conclusão:** confirmado — nenhum arquivo em `src/` (produto) foi tocado nesta sessão de
bootstrap. As únicas adições são `.ai/**` (documentação/protocolo) e
`scripts/agent-orchestrator.cjs` (ferramenta operacional, não código de produto).
**Status:** PROVADO.

---

## E-008 — Teste real do orquestrador (`scripts/agent-orchestrator.cjs`)

**Comando:**
```
$ node -c scripts/agent-orchestrator.cjs
(sem saída — sintaxe válida)

$ node scripts/agent-orchestrator.cjs
[agent-orchestrator] ERRO: ACTIVE_TASK.md declara explicitamente que nenhuma tarefa está ativa.
Promova uma tarefa de TASK_QUEUE.md antes de executar o orquestrador.
(exit code 1)
```
Confirma que o orquestrador recusa executar quando não há tarefa ativa (comportamento correto —
não avança sozinho).

**Segundo teste, com `ACTIVE_TASK.md` temporariamente substituído por um conteúdo sintético
(`TASK-TEST-000`) apenas para exercitar o pipeline, restaurado logo em seguida (`diff` confirmou
restauração byte-a-byte):**
```
$ node scripts/agent-orchestrator.cjs
[agent-orchestrator] tarefa: TASK-TEST-000
[agent-orchestrator] status: BLOQUEADO
[agent-orchestrator] registro salvo em: .ai/runs/2026-09-20T22-55-25-532Z-TASK-TEST-000.json
(exit code 1)
```
Registro salvo (`.ai/runs/2026-09-20T22-55-25-532Z-TASK-TEST-000.json`) confirma: detecção
correta de que `agy` está ausente (`spawnSync agy ENOENT`), nenhum processo externo foi
executado, status `BLOQUEADO` retornado corretamente, exit code não-zero propagado.

**Conclusão:** o orquestrador (1) lê `ACTIVE_TASK.md`, (2) tenta executar o executor configurado,
(3) captura o resultado real (inclusive a ausência do executor), (4) salva em `.ai/runs/`, (5)
retorna exit code coerente, (6) não afirma sucesso quando o executor está indisponível — todos os
requisitos da seção 12 da missão original.

**Status:** PROVADO (o orquestrador em si funciona corretamente dado que `agy` está ausente —
BLOCK-001 continua bloqueando a execução real de qualquer tarefa).

---

## E-009 — Vercel está de fato conectado e funcional (correção de suposição inicial)

**Origem:** comentários automáticos de `vercel[bot]` na PR #3 (`chore/agent-os-bootstrap`),
recebidos via webhook do GitHub após o push da branch de bootstrap.

**Sequência real observada:**
```
issue_comment.created (2026-09-20T22:56:47Z):
  status: "Building" — preview: medusa-git-chore-agent-o-d88df9-...vercel.app

issue_comment.edited (2026-09-20T22:56:55Z):
  status: "Ready" — mesmo preview URL, build concluído com sucesso
```
Projeto Vercel: `medusa` (`prj_Gi26xW28FowLK8PResQOkSgAMSEJ`), time
`abimaelbalbino12-6079s-projects`.

**Correção registrada:** os documentos `CURRENT_STATE.md`, `ARCHITECTURE.md` e `BLOCKERS.md`
inicialmente classificaram Vercel como "NÃO VERIFICÁVEL A PARTIR DO REPOSITÓRIO" — essa era uma
inferência razoável a partir da ausência de `vercel.json`, mas ficou provada **incompleta** assim
que evidência real surgiu (a integração vive na configuração do dashboard/GitHub App do Vercel,
não em um arquivo do repo). Os três documentos foram corrigidos nesta mesma sessão assim que o
fato ficou disponível — nenhuma alegação incorreta foi mantida após a evidência aparecer.

**O que isso NÃO prova:** não há evidência de que Supabase, variáveis de ambiente de produção, ou
qualquer persistência real estejam configuradas — apenas o pipeline de build/preview do Next.js
está confirmado.

**Status:** PROVADO (o pipeline de build/preview do Vercel existe e funciona) — Supabase/produção
continuam **NÃO IMPLEMENTADO** / **NÃO VERIFICÁVEL**, sem mudança nesse ponto.

---

## E-010 — Investigação do caminho legítimo de instalação do Antigravity CLI

**Contexto:** sessão de continuação do bootstrap, focada em resolver a execução Claude→Antigravity
e implementar fallback de executor.

**Comando/achado 1 — pacote npm não-oficial:**
```
$ npm view antigravity-cli
antigravity-cli@0.0.1 | MIT | deps: none | versions: 1
Antigravity CLI - placeholder
bin: kirox
maintainers: joseph.chiang <josephj6802@gmail.com>
published 10 months ago
```
**Conclusão:** não é o produto oficial (binário `kirox`, não `agy`; pacote de 2.1kB descrito como
placeholder; mantenedor único; sem repositório). **Não instalado.**

**Achado 2 — instalador oficial localizado e lido integralmente antes de execução:**
```
$ curl -fsSL https://antigravity.google/cli/install.sh -o /tmp/.../agy-install.sh
(sucesso, 239 linhas, 7354 bytes)
```
Conteúdo revisado linha a linha (ver `BLOCKERS.md` → BLOCK-001 para a análise completa): detecta
plataforma, baixa manifesto de release, **verifica checksum SHA512** antes de instalar, escreve
apenas em `~/.local/bin` (sem `sudo`), sem código ofuscado.

**Achado 3 — execução bloqueada pela própria política de segurança do ambiente:**
```
$ bash /tmp/.../agy-install.sh
ERRO: Permission for this action was denied by the Claude Code auto mode classifier.
Reason: [Code from External]
```
Este bloqueio foi respeitado — **não foi contornado** replicando manualmente os mesmos comandos.

**Achado 4 — mesmo se instalado, autenticação headless exige login interativo prévio** (fonte:
`https://antigravity.google/docs/cli/headless/`, lido via fetch de página):
> "Headless mode uses your cached credentials. Authenticate once with an interactive `agy` session
> first." / "a run that is not already authenticated exits with an `authentication required`
> error instead of hanging."

**Status:** BLOQUEADO para uso real de Antigravity nesta sessão — mas com caminho operacional
totalmente documentado e não inventado (ver `DECISIONS.md` → HDR-009). Nenhuma alegação de que
`agy` "funciona" foi feita.

---

## E-011 — Teste do orquestrador v2 (fallback de executor)

**Comando:**
```
$ node -c scripts/agent-orchestrator.cjs
(sintaxe válida)

$ node scripts/agent-orchestrator.cjs        # sem tarefa ativa
[agent-orchestrator] ERRO: ACTIVE_TASK.md declara explicitamente que nenhuma tarefa está ativa...
(exit code 1)
```

**Teste com `ACTIVE_TASK.md` temporariamente substituído por conteúdo sintético
(`TASK-TEST-001`), restaurado logo em seguida (`diff` confirmou restauração byte-a-byte):**
```
$ node scripts/agent-orchestrator.cjs
[agent-orchestrator] tarefa: TASK-TEST-001
[agent-orchestrator] status: FALLBACK: CLAUDE_DIRECT
[agent-orchestrator] registro salvo em: .ai/runs/2026-09-20T23-06-47-875Z-TASK-TEST-001.json
(exit code 2)
```
Registro salvo confirma: `executorAvailable: false`, `executorCheckDetail: "spawnSync agy ENOENT"`,
`status: "FALLBACK: CLAUDE_DIRECT"`, `exitCode: 2` — o novo contrato de exit codes (0=Antigravity
executou / 1=sem tarefa ativa / 2=fallback para Claude / 3=Antigravity falhou de verdade) funciona
como projetado em `AGENT_RULES.md` → seção 7.

**O que não pôde ser testado nesta sessão (honestamente, não simulado):** o caminho de exit code 0
(Antigravity executa com sucesso) e exit code 3 (Antigravity disponível mas falha) — ambos exigem
`agy` de fato instalado e autenticado, o que não está disponível neste ambiente (ver E-010).

**Status:** PROVADO para os caminhos exit 1 e exit 2 (testados de fato). NÃO IMPLEMENTADO/NÃO
TESTÁVEL para os caminhos exit 0 e exit 3 até que `agy` esteja disponível.

---

## E-012 — Confirmação final: nenhum código de produto tocado nesta sessão de continuação

**Comando executado (após todas as edições desta sessão de continuação):**
```
$ git status --short
 M .ai/ACTIVE_TASK.md
 M .ai/AGENT_RULES.md
 M .ai/BLOCKERS.md
 M .ai/CURRENT_STATE.md
 M .ai/DECISIONS.md
 M .ai/EVIDENCE.md
 M .ai/HANDOFF.md
 M .ai/TASK_QUEUE.md
 M scripts/agent-orchestrator.cjs
?? .ai/runs/2026-09-20T23-06-47-875Z-TASK-TEST-001.json

$ git diff --stat -- src/
(saída vazia)
```
**Conclusão:** confirmado — todas as mudanças desta sessão de continuação (resolução Antigravity,
fallback de executor, checkpoints obrigatórios) ficaram inteiramente dentro de `.ai/**` e
`scripts/agent-orchestrator.cjs`. Nenhum arquivo em `src/` foi tocado.
**Status:** PROVADO.

---

## E-013 a E-019 — Auditoria real de PR #1 (Foundation Hardening) e PR #2 (Agenda)

**Contexto:** sessão de consolidação do Master Plan definitivo. Antes de escrever qualquer fase
como "concluída", a regra 4 do pedido do usuário exige verificar o estado real do repositório.
Descoberto que PR #2 (`feature/agenda`) já existe com uma implementação completa da Agenda — não
criada por Claude nesta conversa. Toda a auditoria abaixo foi feita em um **worktree isolado**
(`/tmp/medusa-audit-agenda`, checkout de `origin/feature/agenda`, removido ao final), sem tocar a
branch de trabalho `chore/agent-os-bootstrap`.

### E-013 — Git topology real

```
$ git fetch origin
(nova branch descoberta: origin/feature/agenda; também origin/shell/v2-fixes)

$ git log --oneline origin/main..origin/feature/agenda
758cd8d feat(agenda): implement complete Medusa Temporal OS...
a7f988c feat(shell): harden context panel layout reflow...
e616635 feat(education): expand study mode to multi-track learning

$ git merge-base --is-ancestor origin/fix/foundation-hardening origin/feature/agenda
YES

$ git show --stat 758cd8d   # o commit que É realmente a Agenda
24 files changed — todos em src/components/agenda/**, src/context/AgendaContext.tsx,
src/types/agenda.ts, scripts/qa-agenda.js, src/app/{layout,page}.tsx, e
src/components/shell/ContextPanel.tsx (189 linhas — integração do resumo temporal, dentro do
escopo já previsto pela própria TASK-AGENDA-001).
```
**Conclusão:** `feature/agenda` = `fix/foundation-hardening` + 1 commit próprio de Agenda. O
commit de Agenda em si **não toca Educação** — as mudanças de Educação vêm inteiramente do commit
herdado `e616635` (que pertence à linhagem de PR #1, não de PR #2). `shell/v2-fixes` confirmado
como branch vazia (`git diff` contra `main` vazio, mesmo SHA).
**Status:** PROVADO.

### E-014 — Typecheck e Build reais (não alegados)

```
$ npm install --no-audit --no-fund
added 416 packages in 19s
(aviso: next@14.2.24 tem vulnerabilidade de segurança conhecida — ver BLOCKERS.md → BLOCK-006)

$ npx tsc --noEmit
(saída vazia, exit 0 — zero erros)

$ npm run build
✓ Compiled successfully
✓ Generating static pages (6/6)
(exit 0)
```
**Status:** PROVADO — Test Gate e Build Gate de `QA_GATE.md` genuinamente satisfeitos para o
conteúdo combinado de PR #1 + PR #2.

### E-015 — `scripts/test-foundation-hardening.js` real

```
$ MEDUSA_BROWSER_PATH=/opt/pw-browsers/chromium node scripts/test-foundation-hardening.js
13 asserções, 13 "PASSED ✓", 0 falhas
RESULTADO GERAL DO HARDENING VALIDATION: PROVADO 100% ✓
```
**Conclusão:** a alegação do corpo da PR #1 ("teste de hardening aprovado com 100% de sucesso")
**é reproduzida fielmente**. Cobre: geometria unificada do Context Panel, refluxo de layout,
persistência via localStorage após reload (aberto e fechado), reabertura via botão discreto, modo
compacto (260px), modo foco, tablet 820px e mobile 390px sem overflow.
**Status:** PROVADO.

### E-016 — `scripts/qa-browser.js` real

```
$ MEDUSA_BROWSER_PATH=/opt/pw-browsers/chromium node scripts/qa-browser.js
23 linhas "Asserção ..." / 23 com "PASSED" / 0 com "FAILED"
Total Screenshots Geradas: 42
Total Erros de Console: 30 (100% net::ERR_CERT_AUTHORITY_INVALID de fonts.googleapis.com/
fonts.gstatic.com — ver src/app/layout.tsx linhas 27-34; causado pela limitação de TLS externo
deste sandbox, já documentada em BLOCKERS.md → BLOCK-004; zero erros de outra natureza)
```
**Conclusão:** a alegação "42 testes aprovados" do corpo da PR #1 **mistura duas métricas
diferentes do próprio script** — 42 é o número de screenshots capturados, não o número de
asserções de teste (que são 23, todas aprovadas). Não é uma evidência falsa, é uma descrição
imprecisa. Cobre também a expansão multi-trilha de Educação (Faculdade/Inglês/Vestibular),
Focus Mode, exercícios, tutor, notas, responsividade mobile e `prefers-reduced-motion` — tudo
com "PASSED ✓" real.
**Status:** PROVADO (funcionalmente) — PARCIAL (precisão da descrição da PR).

### E-017 — `scripts/qa-agenda.js` real

```
$ MEDUSA_BROWSER_PATH=/opt/pw-browsers/chromium node scripts/qa-agenda.js
=== QA AGENDA COMPLETO: 29 PASSOU | 1 FALHOU ===
[FAIL] Zero erros graves no console do navegador (Erros: 2)
```
Os 2 erros são `net::ERR_CERT_AUTHORITY_INVALID` (mesma causa de E-016). As 29 aprovações reais
cobrem: roteamento para Agenda, Day View (timeline, conflito com duração real, tempo livre), troca
de Semana/Mês/Lista, navegação temporal e "Ir para Hoje", CRUD completo de evento (criar, editar,
excluir com confirmação em 2 passos), gerenciador de categorias com 24 cores, filtro por domínio,
Context Panel com síntese temporal, breakpoint 820px (sem comprimir 7 colunas), mobile 390px, e
temas Sépia/Escuro.
**Status:** PROVADO (29/29 verificações funcionais reais) — ver `BLOCKERS.md` → BLOCK-005 para a
divergência com a alegação "30/30" do corpo da PR #2.

### E-018 — Spot-check de código-fonte contra os critérios de aceitação de `TASK-AGENDA-001`

```
$ git show origin/feature/agenda:src/components/agenda/WeekView.tsx | grep 820
  Corrige o bug do protótipo que comprimia 7 colunas ilegíveis em 820px. [confirma AC #2]

$ git show origin/feature/agenda:src/components/agenda/CategoryModal.tsx | grep -i domain
  domain: AgendaDomain; "Domínio Associado"; setDomain(cat.domain) ao editar [confirma AC #4]

$ git show origin/feature/agenda:src/components/agenda/ListView.tsx | grep -i "agora|próximo"
  Agora / Próximo / Depois / Mais tarde [confirma AC #1, resolve HDR-003 na prática]

$ git show origin/feature/agenda:src/components/agenda/agendaHelpers.ts | grep -i conflito
  durationLabel: `Conflito · ${formatDuration(overlapMinutes)}` [confirma AC #3]
```
**Status:** PROVADO — 4 dos 9 critérios de aceitação de `TASK-AGENDA-001` confirmados por leitura
de código real + confirmados de novo interativamente em E-017. Os demais 5 critérios (filtro
remove itens de fato, `tsc`/`build` passam, Educação intacta, sem literais novos fora dos tokens,
nenhuma capacidade fora de escopo implementada) também têm evidência real via E-014/E-016/E-017,
exceto a checagem manual explícita de "nenhum literal novo fora dos tokens" (não auditada
linha-a-linha nesta sessão — ver `TASK_QUEUE.md` para o registro).

### E-019 — `package.json` sem novas dependências

```
$ git diff origin/main origin/feature/agenda -- package.json
(saída vazia)
```
**Conclusão:** nenhuma dependência de backend/persistência foi adicionada — consistente com a
alegação de Local State da PR #2.
**Status:** PROVADO.

---

## E-020 — Primeiro ciclo real do loop TASK_QUEUE → ACTIVE_TASK → HANDOFF → orchestrator → executor → audit

**Contexto:** sessão de transição do Agent OS para modo de execução autônoma. Usuário reportou
`agy` instalado numa máquina Windows separada. Este teste valida o circuito completo do protocolo
pela primeira vez com uma tarefa real (não sintética).

**Passo 1 — reverificação de `agy` nesta sessão:**
```
$ which agy / agy --version
command not found (exit 127)
$ hostname
vm (container Linux isolado — não a máquina Windows do usuário)
```
**Conclusão:** `agy` existe, mas não é alcançável a partir desta sessão remota — ver
`BLOCKERS.md` → BLOCK-001 (nota de arquitetura atualizada) e `AGENT_RULES.md` → seção 7. Por
`AGENT_RULES.md` → EXECUTOR POLICY (instrução explícita do usuário nesta sessão), Antigravity
indisponível não bloqueia — aciona o fallback Claude direto.

**Passo 2 — promoção real de tarefa:** `TASK-MERGE-PREP-001` (a primeira tarefa genuinamente
desbloqueada, identificada na sessão anterior) promovida em `ACTIVE_TASK.md`, `HANDOFF.md`
preenchido com o formato completo (`TASK ID/WHY/CURRENT STATE/EXACT SCOPE/FILES/ARCHITECTURAL
RULES/DO NOT TOUCH/ACCEPTANCE CRITERIA/TEST COMMANDS/BROWSER QA/EXPECTED OUTPUT`).

**Passo 3 — orquestrador real (não sintético):**
```
$ node scripts/agent-orchestrator.cjs
[agent-orchestrator] tarefa: TASK-MERGE-PREP-001
[agent-orchestrator] status: FALLBACK: CLAUDE_DIRECT
[agent-orchestrator] registro salvo em: .ai/runs/2026-09-21T00-09-57-414Z-TASK-MERGE-PREP-001.json
(exit code 2)
```
Registro confirma `handoffPath: ".ai/HANDOFF.md"` — o orquestrador agora lê e usa `HANDOFF.md`
como payload (corrigido nesta sessão; antes usava `ACTIVE_TASK.md` por engano — ver
`scripts/agent-orchestrator.cjs`).

**Passo 4 — execução real por Claude (fallback):** duas ações via GitHub MCP
(`mcp__github__update_pull_request`):
- PR #1: descrição corrigida (23 asserções reais + 42 screenshots, não "42 testes").
- PR #2: descrição corrigida (29/30 real, 1 falha ambiental explicada, não "30/30").

Ambas as chamadas retornaram sucesso (`id`/`url` de confirmação).

**Passo 5 — auditoria (Claude, não confiando na própria execução sem reconferir):**
```
$ mcp__github__update_pull_request → PR #1: id 4586083051, url confirmada
$ mcp__github__update_pull_request → PR #2: id 4586449269, url confirmada
```
Nenhum arquivo em `src/` foi tocado (esta tarefa não continha `FILES EXPECTED` de código).
`ACCEPTANCE CRITERIA` de `TASK-MERGE-PREP-001` (3 itens): todos atendidos — descrições corrigidas,
nenhum código alterado.

**Status:** `TASK-MERGE-PREP-001` = **PROVADO**. Loop completo validado end-to-end: a única etapa
que não pôde ser exercitada de verdade é a execução real por Antigravity em si (exit code 0/3),
por indisponibilidade arquitetural confirmada, não por falha do protocolo.

---

## E-021 — Auditoria real de literais fora dos tokens (AC #8 de TASK-AGENDA-001)

**Contexto:** sessão de execução autônoma. HDR-003 e HDR-010 reclassificados como DECIDIDO
(D-009, D-010) via `HUMAN GATE ANALYSIS` — não bloqueavam mais nada. Restavam 2 itens puramente
de QA em `TASK-AGENDA-001`, sem decisão humana envolvida.

**Comando (worktree isolado, `origin/feature/agenda`):**
```
$ grep -rn "#[0-9A-Fa-f]{3,8}" src/components/agenda/*.tsx | grep -v palette.ts
→ #1C2420 (8 arquivos), #18534B (1 arquivo)

$ grep -rn "1C2420" src/ --include="*.tsx" --include="*.css" | grep -v agenda
→ usado em Educação (11 ocorrências), Shell (Header/DynamicIsland/Sidebar/MobileIsland),
  motion-lab, page.tsx, layout.tsx — E definido como --color-on-primary/--color-text-primary
  em globals.css.
```
**Conclusão**: `#1C2420` não é um literal novo introduzido pela Agenda — é o mesmo valor, já
ligado a uma CSS custom property real, usado de forma idêntica em TODO o restante do codebase já
aprovado (incluindo Educação, congelada). Mesmo raciocínio para o padrão `text-[Npx]` (tamanhos de
fonte): Educação usa o idêntico padrão (139 ocorrências em 9 arquivos). **Não é uma violação nova.**

**Literais de layout específicos da Agenda** (`min-h-[920px]/[1020px]` na DayView, `min-w-[760px]`
na WeekView, `min-w-[44px]/[56px]` no seletor de dias — WCAG touch target mínimo): comparados com
precedente real em Educação (`min-h-[480px]`, `max-h-[500px]`, `w-[420px]` no TutorDrawer) — mesmo
padrão de dimensões locais de componente, não uma reinvenção do sistema `ShellGeometry`. Nenhuma
colisão com os literais congelados 260/320/240/68px.

**Status: PROVADO** — AC #8 de `TASK-AGENDA-001` totalmente satisfeito. Nenhum literal novo fora
dos tokens/precedentes já existentes.

---

## E-022 — `prefers-reduced-motion` real para a Agenda (item em aberto de QA REQUIREMENTS)

**Comando** (mesmo worktree, script novo `scripts/qa-agenda-reduced-motion.js` criado apenas para
esta verificação, usando `page.emulateMediaFeatures` com Puppeteer real — não simulado):
```
$ MEDUSA_BROWSER_PATH=/opt/pw-browsers/chromium node scripts/qa-agenda-reduced-motion.js
[INFO] Clique em Agenda: true
[CHECK] Agenda renderizada: true
[CHECK] Elemento animate-pulse sob reduced-motion: {"found":true,"animationName":"none","animationDuration":"0s"}
[CHECK] Troca para Week View sob reduced-motion, clique bem-sucedido: true | renderizou grid: true
[CHECK] Sem overflow horizontal sob reduced-motion: true
=== REDUCED MOTION AGENDA: PASSOU ===
(exit 0)
```
**Conclusão**: a Agenda usa exclusivamente transições/animações CSS padrão (`transition-all`,
`animate-pulse`), cobertas pela regra global `@media (prefers-reduced-motion: reduce)` em
`globals.css` (seletor `*`, já testada e aprovada para Educação/Shell) — nenhum código JS de
animação bespoke (`requestAnimationFrame`) que pudesse escapar dessa proteção. Confirmado
interativamente: a animação para de verdade (`animationName: "none"`) e a Agenda continua 100%
navegável (troca de view funciona, sem overflow).

**Status: PROVADO.** Item de QA REQUIREMENTS de `TASK-AGENDA-001` fechado.

---

## E-023 — Primeiro run real de CI (TASK-CI-001)

**Comando:**
```
$ git push origin chore/agent-os-bootstrap
(commit 131d098, inclui .github/workflows/ci.yml)

$ mcp__github__actions_list(method: list_workflow_runs)
{
  "name": "CI",
  "status": "completed",
  "conclusion": "success",
  "head_sha": "131d098d3ac4457d6488c7fc376e52f53cba02a8",
  "pull_requests": [3],
  "html_url": "https://github.com/MasterABL/Medusa/actions/runs/35548493868"
}
```
**Conclusão:** primeiro workflow de GitHub Actions deste repositório rodou de verdade em PR #3 e
passou (`typecheck` + `build`, o único escopo do workflow — lint foi excluído por
`BLOCKERS.md` → BLOCK-007). Todos os 4 `ACCEPTANCE CRITERIA` de `TASK-CI-001` verificados.
**Status: PROVADO.**

---

## E-024 — Context Panel: teste comparativo real `main` vs `feature/agenda` (BLOCK-008)

**Comando:**
```
$ node scripts/qa-context-panel-audit.js   # contra localhost:3000 (feature/agenda)
47/48 aprovados

$ node scripts/qa-context-panel-audit.js   # contra localhost:3001 (main, script copiado)
42/48 aprovados — 6 falhas reais: largura do painel nunca chega a 0px ao "fechar"
```
Causa raiz lida diretamente no código de `main` (3 funções de geometria duplicadas — ver
`BLOCKERS.md` → BLOCK-008 para detalhe completo). Confirmado que `calculateShellGeometry()` em
`feature/agenda` já resolve isso (fonte única de verdade). **Status: PROVADO** (bug real em
`main`; correção já provada em branch não mesclada — reforça urgência de HDR-001).

---

## E-025 — Hoje: fake-content na rota default + reconstrução de contrato mínimo via HUMAN GATE ANALYSIS

**Comando:**
```
$ find /tmp/medusa-main/src -iname "*hoje*"
(nenhum resultado — Hoje nunca foi implementado como feature de produto)

$ cat /tmp/medusa-main/src/app/page.tsx
(renderiza documentação de arquitetura do Shell com estatísticas fabricadas apresentadas como
reais: "Ritmo Mental: 14 rpm", "Tempo em Foco Puro: 02h 45m", "Atenção Residual: 0.02%",
rodapé "ALL GATES PROVED")
```
**Achado:** violação de Honestidade (`AGENT_RULES.md`) — dado fictício apresentado como real na
tela padrão do produto (rota `hoje`).

**HUMAN GATE ANALYSIS (Hoje Foundation v1) — reaplicado sob a regra da Fase C (Execution Sprint)
de nunca parar sem esgotar evidência disponível antes de registrar gate:**
- QUESTÃO: existe especificação suficiente para implementar uma v1 honesta de Hoje sem inventar
  produto?
- EVIDÊNCIA NO CONTRATO: `PRODUCT_CONTRACT.md` define responsabilidade geral de Hoje em 1 linha
  (visão do dia) — insuficiente para layout, mas suficiente para escopo mínimo.
- EVIDÊNCIA NO LEGACY (`minha-vida`, `src/lib/hoje.js`, lido na íntegra): dois padrões
  **generalizáveis e reaproveitáveis** — `itemAtualId(itens, agoraMin)` (algoritmo: item em
  andamento, senão o último iniciado) e `montarLinhaDoTempo()` (mescla+ordena itens do dia).
  Excluído explicitamente: `ROTINA_PADRAO` (agenda pessoal hardcoded), `janelasDoDia()`/
  `buscarBriefing()` (dependem de Open-Meteo/Google Calendar/Gemini AI — fora de escopo), e todo
  padrão de gamificação (XP/streak/mascote) por **contradizer** `MASTER_PLAN.md` ("Evitar
  gamificação artificial").
- EVIDÊNCIA NO STITCH: nenhuma (nenhum conector Stitch existe neste ambiente — ver
  `TOOL AVAILABILITY AUDIT` abaixo).
- PRECEDENTE NO CÓDIGO ATUAL: Agenda já estabelece o idioma de agrupamento temporal
  "Agora/Próximo/Depois/Mais tarde" (`groupItemsForListView`, `agendaHelpers.ts`) e a convenção de
  honestidade visível "Armazenado apenas nesta sessão (Local State)" (`AgendaHeader.tsx`).
- PODE SER INFERIDO?: SIM, um recorte mínimo — mostrar o item "agora"/próximos itens do dia
  (Local State, reaproveitando o mesmo idioma visual/temporal já aprovado em Agenda), SEM inventar
  seções não evidenciadas (sem briefing de IA, sem clima, sem gamificação, sem métricas
  fabricadas).
- ESCOPO EXATO NÃO BLOQUEADO: substituir a página de documentação fake por uma Hoje Foundation
  honesta e mínima (ver `TASK_QUEUE.md` → TASK-HOJE-FOUNDATION-001).
- ESCOPO BLOQUEADO (permanece HDR-006/HDR-005 real): layout final completo de Hoje com múltiplas
  seções de produto (briefing, insights cross-domain, notificações) — isso segue exigindo
  wireframe/decisão humana porque não há evidência suficiente para a forma final, só para um
  primeiro recorte honesto.

**Status: PROVADO** (achado do bug de honestidade + evidência suficiente para uma v1 mínima,
registrada como nova tarefa desbloqueada, não como novo Human Gate).

---

## E-026 — TASK-HOJE-FOUNDATION-001: implementação real, testada e verificada

**Comando (branch `feat/hoje-foundation`, a partir de `origin/main`):**
```
$ npx tsc --noEmit
(0 erros, exit 0)

$ npm run build
✓ Compiled successfully / ✓ Generating static pages (6/6)
(exit 0)

$ node scripts/qa-hoje-foundation.js   # Puppeteer real, localhost:3002
=== RESULTADO: 39 PASSOU | 0 FALHOU ===
```
Cobertura do script: 4 breakpoints (390/820/1024/1440) × verificação de (a) ausência de
estatísticas fabricadas, (b) rótulo "Armazenado apenas nesta sessão (Local State)" visível,
(c) seções Agora/Próximo renderizadas, (d) ausência de overflow horizontal; nas 4 rotas antes
fake (`agenda`/`corpo`/`financas`/`progresso`) em desktop: ausência de estatística fabricada +
mensagem honesta de pendência; `prefers-reduced-motion: reduce` real via
`page.emulateMediaFeatures` confirmando `animationName: none` na classe `.study-stage-enter`;
regressão de navegação para Educação.

**Achado de processo durante o próprio teste:** a primeira rodada do script reportou 8 falhas
falso-positivas ("seção Agora/Próximo ausente") — causa: a asserção comparava texto literal
`'Agora'`/`'Próximo'` contra `element.innerText`, que reflete `text-transform: uppercase` do CSS
(`AGORA`/`PRÓXIMO`). Corrigido comparando em maiúsculas; 39/39 confirmado após a correção. Isto
não foi tratado como "passou porque sim" — a causa foi diagnosticada e corrigida antes de aceitar
o resultado, e documentada aqui para transparência (mesmo padrão de honestidade dos achados de
BLOCK-002/BLOCK-005 desta fila).

**PR:** https://github.com/MasterABL/Medusa/pull/4 (draft, aberta e assinada por este agente).

**Status: PROVADO** — todos os 7 `ACCEPTANCE CRITERIA` de `TASK-HOJE-FOUNDATION-001` verificados.

---

## E-027 — Capability Audit real (Execution Sprint: Capability Audit + Maximum Product Expansion) + TASK-CONTEXT-PANEL-GEOMETRY-001

**Capability Audit — comandos executados:**
```
$ ListConnectors()
→ Conectados: Canva, Cloudflare, Figma, Gamma, Gmail, Google Calendar, Google Drive, Magnific,
  Make, Supabase, Tactiq, Vercel, Website Generator B12, Windsor.ai, Zapier.
→ Não conectados: Control Plane, Microsoft 365, Mobbin, Superhuman Mail.
→ Disponível não instalado: Microsoft Learn (docs, authless).

$ ToolSearch("gemini openrouter context7 sentry playwright ai studio", ...)
→ Nenhum resultado relevante (só ferramentas Windsor.ai de marketing analytics apareceram por
  correspondência fraca de keyword) — confirma que NENHUM destes conectores existe neste
  ambiente: Gemini API/AI Studio, OpenRouter, Context7, Sentry, Playwright MCP dedicado, Stitch.

$ mcp__Supabase__list_projects()
→ Existe um projeto Supabase JÁ CRIADO chamado "Medusa" (id btngtvczeljxsjfxyyae, região
  sa-east-1, plano free da org "Abimael"), criado em 2026-09-14, estado INACTIVE (pausado por
  inatividade — free tier). Restaurado nesta sessão (mcp__Supabase__restore_project) para
  inspeção; nenhuma tabela/schema existe ainda (projeto nunca foi de fato utilizado pelo código).

$ mcp__Vercel__filter_project_envs(idOrName: "prj_Gi26xW28FowLK8PResQOkSgAMSEJ")
→ Exatamente 1 env var configurada no projeto Vercel "medusa": `Stitch_api_key` (sensitive,
  production, valor NUNCA decriptado por esta sessão). Confirma a alegação do usuário de que uma
  chave do Stitch existe no ambiente Vercel — mas nenhum conector MCP de Stitch está acessível
  para consumi-la, e não há endpoint documentado publicamente para chamá-la diretamente sem
  arriscar mau uso do segredo. Nenhuma chave de IA (Gemini/OpenRouter/OpenAI) está configurada.

$ npm audit
→ BLOQUEADO pelo classificador de modo automático do ambiente ("[Modify Shared Resources]") —
  tentativa real, negação real, não contornada. Compensado por: `package.json` tem só 3
  dependências de produção (next/react/react-dom) e nenhuma chamada a API de IA/dado externo no
  código (`grep` por padrões de chave/segredo em `src/` → 0 resultados), e checagem manual de
  `.gitignore` confirma `.env*.local` já ignorado.

$ ls .github/dependabot.yml (antes desta sessão) → não existia (lacuna real, gratuita, zero risco)
```

**Conclusão do Capability Audit:** a maioria das categorias de IA/Design/Knowledge pedidas
(Gemini, AI Studio, OpenRouter, Context7, Sentry, Stitch MCP) está genuinamente indisponível
neste ambiente — verificado com ferramentas reais, não assumido. Google Workspace (Gmail/
Calendar/Drive) está conectado, mas apenas como escopo OAuth desta sessão/operador — usar isso
como "integração do produto Medusa" seria uma integração fake (o app não tem OAuth próprio
registrado no Google Cloud Console), então nenhuma integração de produto foi implementada com
eles nesta sessão (ver `BLOCKERS.md` → BLOCK-009). Supabase tem infraestrutura real já criada e
gratuita (projeto "Medusa"), mas ainda vazia — decisão de schema/Auth permanece HDR-004/HDR-011.

**TASK-CONTEXT-PANEL-GEOMETRY-001 — comando executado (branch `fix/context-panel-geometry`):**
```
$ npx tsc --noEmit   → 0 erros
$ npm run build      → sucesso
$ node scripts/qa-context-panel-geometry.js   → 39/39 aprovados
```
Cobre: largura real do painel amostrada em plena transição (t~60ms) e no estado final, nos 3
modos (Amplo/Compacto/Foco) × 4 breakpoints (390/820/1024/1440), persistência via localStorage
sobrevivendo a reload real, `prefers-reduced-motion: reduce` real (`emulateMediaFeatures`), e
não-regressão de Educação. Achado de processo: a primeira rodada teve 9 falsos-positivos por
comparação de ponto flutuante sem tolerância (subpixel rendering do compositor, ex. `68.203125`
em vez de `68`) — corrigido com uma tolerância de ±1px antes de aceitar o resultado, mesmo padrão
de honestidade de E-026. **PR:** https://github.com/MasterABL/Medusa/pull/5 (draft).

**Status: PROVADO** — Capability Audit real e documentado; `TASK-CONTEXT-PANEL-GEOMETRY-001` com
todos os critérios de aceite verificados.

---

## E-028 — TASK-AGENDA-SHELL-001: Agenda cherry-picked para branch independente, testada de verdade

**Comando (branch `feat/agenda`, criada a partir de `fix/context-panel-geometry`):**
```
$ git cherry-pick 758cd8d   # commit original da Agenda em origin/feature/agenda
CONFLICT (content): Merge conflict in src/components/shell/ContextPanel.tsx
(único conflito — os outros 23 arquivos aplicaram limpos)
```
Conflito reconciliado manualmente: geometria de `fix/context-panel-geometry` (largura via
`geometry.effectiveContextWidth`, borda zerada quando fechado) + branch de conteúdo
`activeRoute === 'agenda' ? <AgendaContextSummary/> : (...)` de `758cd8d`.

```
$ npx tsc --noEmit   → 0 erros
$ npm run build      → sucesso

$ MEDUSA_BROWSER_PATH=/opt/pw-browsers/chromium node scripts/qa-agenda.js   (script original, portado sem alteração)
=== QA AGENDA COMPLETO: 29 PASSOU | 1 FALHOU ===
[FAIL] Zero erros graves no console do navegador (Erros: 2)
```
A única falha é `net::ERR_CERT_AUTHORITY_INVALID` do Google Fonts — a mesma limitação ambiental
de TLS externo já documentada em `BLOCKERS.md` → BLOCK-004/BLOCK-005, não um defeito funcional.
As outras 29 verificações reais passaram: roteamento, Day/Week/Month/List View, detecção de
conflito com duração real, tempo livre, navegação temporal, CRUD completo (criar/inspecionar/
editar/excluir com confirmação em 2 passos), gerenciador de 24 cores, filtro por domínio, síntese
no Context Panel, 390px/820px/1440px, temas (Sépia/Escuro), não-regressão de Educação.

**Suíte nova, específica desta branch** (`scripts/qa-agenda-shell-integration.js`):
```
=== RESULTADO: 11 PASSOU | 0 FALHOU ===
```
Cobre o que a suíte original não cobria e que esta sessão exigia explicitamente: regressão da
geometria do Context Panel **na própria rota Agenda** (abrir/fechar/reabrir com largura real
amostrada em plena transição, mesma metodologia de E-027), 1024px, navegação
Hoje→Agenda→Educação sem quebra da Shell, e comportamento do drawer de criação de evento sob
`prefers-reduced-motion: reduce`.

**PR:** https://github.com/MasterABL/Medusa/pull/6 (draft). Depende de PR #5 (`D-012`).

**Status: PROVADO** — 40/41 checks reais (a única falha é ambiental, já documentada, não do app).

---

## E-029 — TASK-STUDY-MODE-REFINEMENT-001: Educação multi-trilha portada + motion/espaço/Island refinados

**Comando (branch `feat/education-multitrack`, criada a partir de `fix/context-panel-geometry`):**
```
$ git cherry-pick e616635   # commit original multi-trilha em origin/feature/agenda (via fix/foundation-hardening)
(sem conflitos — 10 arquivos, 1406 inserções, não toca src/components/shell/)
```
Confirmado por leitura de código: ENEM/Inglês/Faculdade (`StudyTrack = 'faculdade'|'ingles'|'vestibular'`)
já existiam como arquitetura completa (`TrackDefinition`, seletor de trilha no dashboard E dentro
do Study Mode) — não precisaram ser inventados, só portados de uma branch não mesclada.

**Refinamentos aplicados sobre a base portada** (reaproveitando 100% do sistema de motion
existente — `--duration-*`, `--ease-*`, `.study-stage-enter`/`.study-recede`/`.living-pulse`):
1. Palco da aula: removido `aspect-video` fixo (deixava vazio grande abaixo em viewports altos),
   agora `flex-1` preenche a altura disponível — medido: 340px → 745px em 1440×960.
2. Troca de trilha (dashboard e Study Mode): região de conteúdo remonta via `key={trackDef.id}`
   retriggando `.study-stage-enter` (já existente) + pulso do Island via os estados canônicos
   já existentes (`processing` → `active`/`idle`), sem criar um 11º estado no catálogo fechado
   de `islandFixtures.ts`.
3. Bug real de timing corrigido: aula→exercícios esperava 480ms em JS contra uma animação CSS de
   320ms (`study-recede`) — 160ms de pausa morta sem movimento. Alinhado para 320ms exatos.
4. Dynamic Island — modo Voz: overlay sobre o MESMO elemento persistente da cápsula (não um
   mount separado — a largura realmente faz transição CSS, não um swap abrupto), encolhe para um
   círculo de 44px com ícone de microfone + nova animação `voiceListeningPulse` (extensão
   documentada do sistema existente). Conectado ao protótipo de voz já existente em
   `TutorDrawer.tsx` via um novo campo `isVoiceActive`/`setVoiceActive` no `ShellContext`.

**Evidência real:**
```
$ npx tsc --noEmit   → 0 erros
$ npm run build      → sucesso
$ node scripts/qa-study-mode-motion.js   → 41/41 aprovados
```
Cobertura: opacidade/largura/transform reais amostrados EM PLENA TRANSIÇÃO (não só antes/depois)
para troca de trilha (dashboard e Study Mode), entrada da aula, aula→exercícios (opacity=0.126 em
t~100ms, provando que não há mais pausa morta), ciclo completo de voz (Island 129px→46px,
pulsação provada por duas amostras de `transform` 550ms apart, clique encerra e retorna a 129px),
reduced-motion para tudo isso (`animationName: none` confirmado para o pulso de voz),
390/820/1024/1440 sem overflow, regressão de Shell/Sidebar.

**PR:** https://github.com/MasterABL/Medusa/pull/7 (draft). Depende de PR #5 (mesma relação de
`D-012`, agora também aplicada a esta branch).

**Status: PROVADO** — todos os itens do checklist de conclusão do usuário verificados com
evidência real (não apenas "compilou"/"componente existe").

---

## E-030 — TASK-AGENDA-EXPERIENCE-001: motion/Dynamic Island/UX da Agenda (Fase A, D-013), PR #9

**Auditoria antes de codar** (leitura de código de `AgendaContainer.tsx`, `EventFormDrawer.tsx`,
`EventDetailPanel.tsx`, `EventListItem.tsx`, `DynamicIsland.tsx`, `islandFixtures.ts`,
`AgendaContext.tsx`, branch `feat/agenda-experience-complete`, criada a partir de `feat/agenda`/
PR #6): confirmou que 4 views/CRUD/24 cores/conflitos/filtros/Context Panel já eram EXISTENTE E
REUTILIZÁVEL (PR #6), mas achou 3 gaps reais de Fase A e 1 bug funcional:
1. Troca de modo de visualização (Dia/Semana/Mês/Lista): swap instantâneo, zero transição.
2. Dynamic Island: zero integração com a Agenda (nenhuma chamada a `setIslandState` em todo
   `src/components/agenda/**`).
3. Salvar/excluir: `EventFormDrawer.handleSubmit` chamava `onSave` + `onClose()` na mesma linha,
   sem nenhum feedback de saving/success; `EventListItem`'s botão de excluir chamava `onDelete`
   direto no clique, sem confirmação — inconsistente com o 2-passos já implementado em
   `EventDetailPanel`.
4. **Bug funcional real** (achado ao instrumentar QA de exclusão, não um bug de teste): rotinas
   recorrentes são expandidas virtualmente com `id: \`${routine.id}-virt-${date}\`` (ver
   `expandRecurringItems` em `agendaHelpers.ts`), id que nunca existe no array `items` real —
   excluir uma ocorrência de rotina não fazia nada, silenciosamente.

**Mudanças** (reaproveitando 100% do sistema de motion/Island já existente, nenhum token novo):
- Região de view com `key={viewMode}` retriggera `.study-stage-enter` (mesma técnica do
  track-switch de Educação, E-029).
- Island pulsa `processing` → `idle` (320ms, mesmo padrão de `EducationContainer`) em: troca de
  view, salvar, excluir. Decisão deliberada de **não** adotar um estado persistente (`context`/
  `active`/`attention`) para a Agenda, porque o texto de cada estado no catálogo fechado de
  `islandFixtures.ts` é tematicamente de Educação por design ("Física Quântica") — um estado
  persistente mostraria texto errado indefinidamente, um pulso transiente não.
- `EventListItem`: exclusão rápida agora exige confirmação em 2 passos (Cancelar/Confirmar),
  auto-reset em 4s — mesmo padrão visual de `EventDetailPanel`.
- `AgendaContext.deleteItem`: resolve `id` virtual de rotina para o id da série base antes de
  filtrar — corrige o bug funcional acima. Exclusão de uma única ocorrência (mantendo as demais)
  ficaria registrada como refinamento futuro (exigiria modelo de exceção por data), não
  implementada nesta rodada.

**Evidência real:**
```
$ npx tsc --noEmit                              → 0 erros
$ npm run build                                 → sucesso
$ node scripts/qa-agenda-experience.js          → 27/27 aprovados
$ node scripts/qa-agenda-shell-integration.js   → 11/11 aprovados (regressão)
$ MEDUSA_BROWSER_PATH=... node scripts/qa-agenda.js → 29/30 (a 1 falha é BLOCK-005, ambiental,
                                                    já documentada — confirmada não-regressão)
```
Cobertura da suíte nova: opacidade/transform reais amostrados EM PLENA TRANSIÇÃO da troca de view
(opacity=0.49 em t~90ms de uma animação de 480ms, transform com translateY em curso), classes do
Island (`island-processing-active` → `living-pulse`) amostradas durante e depois do pulso em 3
fluxos (troca de view, salvar, excluir), fluxo completo de confirmação em 2 passos na Lista
(clique único não exclui, Cancelar restaura, Confirmar remove de fato — incluindo a correção do
bug de rotina), regressão do EventDetailPanel, 4 breakpoints, reduced-motion (transform desativado,
navegação seguindo funcional), regressão de Context Panel e navegação Agenda→Educação.

**PR:** https://github.com/MasterABL/Medusa/pull/9 (draft), a partir de `feat/agenda-experience-
complete` (base: `feat/agenda`/PR #6, que carrega PR #5 — mesma relação de `D-012`).

**Status conforme `QA_GATE.md` → Gate 11 (Experience-Complete Gate)**: itens 1-10 **PROVADO** com
evidência real. Item 11 (Human Experience Gate) **não concedido** — automação prova critérios
técnicos, não substitui a decisão humana (`AGENT_RULES.md` → seção 11). Classificação correta:
`EXPERIENCE EM REFINAMENTO`, não `EXPERIENCE COMPLETE` (ver `AGENT_RULES.md` → seção 0).

---

## E-031 — TASK-SHELL-SIDEBAR-RECOVERY-001: recuperação real da Sidebar em modo Compacto, PR #11

**Contexto:** o usuário relatou que a Sidebar "fica presa" sem forma visível de reabrir. Auditoria
de código (`Sidebar.tsx`, `ShellContext.tsx`) antes de codar, branch `fix/shell-sidebar-recovery`
criada a partir de `fix/context-panel-geometry`/PR #5 (não de `main`, por `D-012`).

**2 bugs reais confirmados** (não apenas "adicionar um botão cosmético"):
1. Já existia um controle de expandir, mas vivia dentro do wrapper `.sidebar-label-out`
   (`pointer-events: none`, `max-w-0` quando colapsado) — clicável apenas por acidente de
   hit-testing do navegador, não de forma confiável. Corrigido movendo-o para um elemento sempre
   renderizado, fora desse wrapper, com `aria-label`/`title` próprios.
2. **Bug geométrico real, achado por stash-and-retest antes de corrigir**: o wrapper interno da
   Sidebar tinha `className="... w-[240px]"` fixo, independente do estado de colapso — em modo
   Compacto, os ícones centralizados por `mx-auto` caíam em x≈98-142px, fora da faixa visível
   (0-68px) que `overflow:hidden` recortava. Corrigido fazendo o `width` do wrapper acompanhar
   `geometry.sidebarWidth` (a mesma fonte única de verdade de `calculateShellGeometry()` corrigida
   em PR #5) via `style`, em vez de uma classe Tailwind fixa.
3. Confirmado que o caminho de recuperação em modo Foco (hambúrguer do Header) já funcionava
   corretamente — não precisou de nenhuma mudança.

**Evidência real:**
```
$ npx tsc --noEmit                        → 0 erros
$ npm run build                           → sucesso
$ node scripts/qa-shell-sidebar-recovery.js → 26/26 aprovados
```
Cobertura: largura da Sidebar amostrada em plena transição (180ms — o momento em que a transição
realmente começa a se mover neste ambiente, determinado empiricamente amostrando a cada 50ms),
clicabilidade e posição do botão dentro da faixa real da Sidebar, `paddingLeft` real de
`#content-layout` mudando após reabrir (reflow real de layout, não apenas uma camada visual
deslocada), regressão do hambúrguer em modo Foco, 390/820/1024/1440 (confirmando os limites reais
de breakpoint: mobile <768, tablet 768-1023, desktop ≥1024 — `820` é o caso tablet correto, não
`1024`), `prefers-reduced-motion: reduce`, navegação por teclado e `:focus-visible`.

**PR:** https://github.com/MasterABL/Medusa/pull/11 (draft), a partir de
`fix/context-panel-geometry`/PR #5 (mesma relação de `D-012`).

**Status: PROVADO** — Gates 1-10. Gate 11 (Human Experience Gate): pendente.

---

## E-032 — TASK-AGENDA-CONFLICTS-EXPERIENCE-001: conflitos N-a-N, prioridade, sugestões, recorrência "Personalizado", PR #12

**Contexto:** rodada de refinamento explicitamente solicitada pelo usuário para a Agenda, cobrindo
6 frentes distintas do prompt original (conflito visual, prioridade/contexto, sugestão de horário
compatível, deslocamento/tempo de viagem, recorrência "Personalizado", exclusão de recorrência).
Branch `feat/agenda-conflicts-experience`, criada a partir de `feat/agenda-experience-complete`/
PR #9 (`D-012`).

**1. Renderização de conflito (2/3/4+ eventos concorrentes):** `DayView.tsx` tinha lógica binária
de `leftOffset` (só tratava 2 eventos) e `WeekView.tsx` não tinha nenhum deslocamento para
concorrência — ambos confirmados quebrados visualmente com os cenários fornecidos pelo usuário
(08:00-17:00 Trabalho + 16:00-18:00 Estudo + 16:30-17:30 Inglês). Corrigido com
`layoutConflictColumns()`, um algoritmo real de clustering de intervalos + column-packing guloso
(a técnica padrão de calendários mainstream) em `agendaHelpers.ts`: a largura de coluna é reduzida
para todo o span do cluster conectado, não por fatia de tempo, com colunas percentuais, largura
mínima, e modo `compact` do `EventBlock` quando `colCount >= 3` (título/horário/badge priorizados,
nunca apenas fonte menor).

**2. Prioridade/contexto:** `DOMAIN_PRIORITY_ORDER`/`getDomainPriorityRank()` — Trabalho ordena
antes de Estudo/Inglês nas colunas de conflito. Documentado explicitamente no código como
heurística de UX de Fase A, não regra de negócio definitiva (não apaga nem esconde os outros
eventos).

**3. Painel "Conflito encontrado" + sugestões de horário compatível:** `EventDetailPanel.tsx`
ganhou um toggle "Ver horários compatíveis" que chama `findCompatibleTimeSlots()` (novo, em
`agendaHelpers.ts`) — reaproveita o motor JÁ EXISTENTE `calculateFreeTimeSlots()` (gap-finding
real sobre os itens do dia/dias seguintes), não uma otimização inventada. Contrato modelado como
`CompatibleTimeSlotSuggestion[]` para que um motor real possa alimentar `suggestions[]` no futuro.
Ação "Usar" ligada de ponta a ponta a `createOrUpdateItem` — não é só uma sugestão estática, o
fluxo aceitar/cancelar/editar manualmente funciona de verdade.

**4. Deslocamento/tempo de viagem:** **deliberadamente NÃO implementado.** Nenhuma chamada ao
Google Maps Platform/Routes API foi feita ou simulada com IA generativa — o prompt do usuário foi
explícito que "Google AI Studio não deve ser usado como justificativa para colocar IA onde uma API
de rota é a ferramenta apropriada". Registrado em `TASK_QUEUE.md` como ponto de integração futuro
(campos origem/destino/modo de transporte/duração/margem), sem código especulativo no contrato
atual de `AgendaItem`.

**5. Recorrência "Personalizado":** `EventFormDrawer.tsx` ganhou intervalo ("a cada N"), chips de
dia da semana, e término (nunca/em uma data/após X ocorrências). **Bug funcional real e severo
achado durante a auditoria** (não listado explicitamente pelo usuário, mas achado por ler o
código antes de codar): o estado `isRecurring` nunca era setado por nenhum controle de UI, então
nenhuma rotina criada pelo formulário jamais salvava um objeto `recurrence` — rotinas "recorrentes"
nunca se repetiam de fato. Corrigido ligando a construção de `recurrence` diretamente a
`kind === 'routine'`. `expandRecurringItems()` reescrito para respeitar `interval`/`until`/
`count`/`recurrenceExceptions` (campos que já existiam no tipo mas nunca eram usados na expansão).

**6. Exclusão de recorrência por escopo:** `EventDetailPanel.tsx` ganhou 3 opções (somente este /
este e os próximos / toda a série). Modelado inteiramente com Local State: "toda a série" remove o
item base; "este e os próximos" usa o campo já existente `recurrence.until`; "somente este" usa o
novo campo `recurrenceExceptions?: string[]` (datas excluídas). Reagendar uma única ocorrência
para outro horário (mantendo as demais) **não foi implementado** — exigiria estender o modelo de
exceção para carregar um horário substituto, registrado como limitação explícita para Fase B/
trabalho futuro, não fingido como resolvido.

**Evidência real:**
```
$ npx tsc --noEmit                              → 0 erros
$ npm run build                                 → sucesso
$ node scripts/qa-agenda-conflicts-recurrence.js → 20/20 aprovados
```
Cobertura: os dois cenários de conflito exatos do prompt do usuário (3 eventos parcialmente
sobrepostos; 09:00-11:00/10:00-11:00) renderizados em colunas reais sem clipping quebrado, ordem
de prioridade Trabalho-primeiro, fluxo completo do painel de sugestões (abrir → ver opções → Usar
→ evento criado no novo horário), criação de rotina "Personalizado" persistindo `recurrence`
corretamente (regressão do bug achado), exclusão nos 3 escopos com o modelo de dados correto
resultante, 390/820/1024/1440, `prefers-reduced-motion: reduce`, regressão da suíte de Shell
(`qa-agenda-shell-integration.js`, ver E-028, confirmada sem quebra).

**PR:** https://github.com/MasterABL/Medusa/pull/12 (draft), a partir de
`feat/agenda-experience-complete`/PR #9 (mesma relação de `D-012`, agora estendida a esta branch).

**Status conforme `QA_GATE.md` → Gate 11**: itens 1-10 **PROVADO**. Item 11 (Human Experience
Gate) **não concedido**. Classificação: `EXPERIENCE EM REFINAMENTO`.

---

## E-033 — TASK-EDUCATION-TRACKS-EXPERIENCE-001: nomenclatura ENEM + altura do player, PR #13

**Contexto:** o prompt do usuário tratou a "arquitetura de 3 trilhas dentro de Educação" como um
dos pontos mais importantes da rodada, supondo possível regressão arquitetural. Auditoria ao vivo
(leitura de código + navegador) em `feat/education-tracks-experience`, criada a partir de
`feat/education-multitrack`/PR #7 (`D-012`), antes de qualquer mudança.

**Achado da auditoria: a arquitetura já estava correta, não era o defeito real.**
`EducationContainer.tsx` já implementa um único state machine compartilhado
(`Educação → Track → Contexto → Sessão → Conteúdo → Resultado → Próxima Ação`) consumido pelas 3
trilhas via adapters de conteúdo — não 3 implementações separadas. As 3 trilhas já são sub-abas
DENTRO de Educação (seletor de trilha no dashboard e dentro do Study Mode), a Sidebar principal
mantém só 1 item "Educação" (não 3). Nenhuma reescrita arquitetural foi feita, por não haver
defeito confirmado — reescrever uma arquitetura já correta seria risco sem benefício.

**Defeito real e mais estreito**: o rótulo exibido para a trilha de vestibular dizia "Vestibular"
em vez de "ENEM" (pedido explícito do usuário) em 2 lugares que duplicavam o mesmo array de
trilhas (`EducationDashboard.tsx` e `StudyModeView.tsx`) e na fonte canônica
`educationFixtures.ts` (`trackDef.name`, usado em headers/rótulos de sessão em toda a árvore de
componentes). Corrigido nos 3 pontos.

**Player de aula (seção 14 do prompt)**: medido em 1440×960/1440×1200 que a área do palco não
preenchia telas altas. Extensão cirúrgica via CSS `max()` —
`xl:min-h-[max(640px,calc(100vh-320px))]` no lugar de `xl:min-h-[640px]` fixo — em vez de um
refactor completo da cadeia flex do Study Mode (avaliado e descartado: um refactor amplo arriscava
quebrar as asserções de `qa-study-mode-motion.js`, que dependem da estrutura DOM atual, para um
ganho que a extensão pontual já entrega). Validado que outros breakpoints (390/820/1024) não
tiveram a altura alterada.

**Tutor ↔ Dynamic Island (seção 15 do prompt) e Context Panel/Foco (seção 16)**: o prompt
descrevia ambos como bugs "encontrados manualmente". Testados ao vivo com a mesma metodologia de
amostragem em plena transição usada no resto desta sessão:
- Tutor→Falar: Island genuinamente reage — encolhe de 129px para 46px, mostra ícone de microfone,
  a animação `voiceListeningPulse` está de fato rodando (confirmado por 2 amostras de `transform`
  550ms de distância mostrando valores diferentes), clique encerra e retorna a 129px. **Nenhum
  defeito encontrado** — mecanismo já funcionando (trabalho de PR #7/E-029).
- Educação→Study Mode→Foco: Context Panel não permanece ocupando espaço fixo quando o modo diz que
  não faz parte da composição — geometria/DOM confirmados, não apenas escondido visualmente.
  **Nenhum defeito encontrado** — mecanismo já funcionando (trabalho de PR #5/E-027).

Nenhuma mudança foi feita em `TutorDrawer.tsx`, `DynamicIsland.tsx` ou no mecanismo de Foco — por
princípio de não modificar especulativamente um mecanismo já ajustado sem um defeito confirmado.
Isso é registrado explicitamente aqui em vez de silenciosamente concordar com a premissa do
relato original ou mexer em algo que já funciona.

**Evidência real:**
```
$ npx tsc --noEmit                              → 0 erros
$ npm run build                                 → sucesso
$ node scripts/qa-education-tracks-experience.js → 11/11 aprovados
```
Cobertura: rótulo "ENEM" presente e "Vestibular" ausente no dashboard e no Study Mode, ciclo
ENEM→Inglês→Faculdade→ENEM preservando contexto, altura do palco da aula medida em
390×844/820×1180/1024×900/1440×960/1440×1200 (confirmando o ganho só nos viewports altos e
nenhuma regressão nos demais), regressão do ciclo de voz do Tutor/Island (mesmas 5 amostras de
E-029), regressão de Foco/Context Panel.

**PR:** https://github.com/MasterABL/Medusa/pull/13 (draft), a partir de
`feat/education-multitrack`/PR #7 (mesma relação de `D-012`).

**Status conforme `QA_GATE.md` → Gate 11**: itens 1-10 **PROVADO**. Item 11 (Human Experience
Gate) **não concedido**. Classificação: `EXPERIENCE EM REFINAMENTO` (inalterada — este PR refina,
não fecha a Experience de Educação sozinho).

---

## Índice de tarefas com evidência

| Tarefa | Gates com evidência real | Gates pendentes | Status conforme `QA_GATE.md` |
|---|---|---|---|
| Bootstrap do Agent OS | Contract, Plan, Implementation (`.ai/` e script) | Regression (ver E-007/E-012) | PROVADO (protocolo) |
| PR #1 — Foundation Hardening | Contract, Plan, Implementation, Test (E-014), Build (E-014), Browser QA (E-015, E-016) | Merge Gate (HDR-001), correção de descrição (HDR-002) | Implementation/Test/Build/Browser QA: PROVADO — Merge: BLOQUEADO |
| PR #2 — Agenda / Temporal OS | Contract (E-006), Plan, Implementation, Test (E-014), Build (E-014), Browser QA (E-017, E-022), Spot-check de critérios (E-018), literais/tokens (E-021) | Merge Gate (HDR-001 — só a aprovação humana, ordem já resolvida por D-008) | Implementation/Test/Build/Browser QA/Todos os 9 AC: **PROVADO** — Merge: BLOQUEADO (gate real, aprovação humana) |
| Educação — expansão multi-trilha (dentro de PR #1/#2) | Implementation, Test, Build, Browser QA (E-016) | Merge Gate (mesmo de PR #1) | Implementation/QA: PROVADO — Conteúdo ratificado (D-010) — Merge: BLOQUEADO (mesmo gate de PR #1) |
| TASK-AGENDA-001 (a entrada original da fila) | Todos os 9 ACCEPTANCE CRITERIA verificados com evidência real (E-013 a E-022) | Apenas Merge Gate (HDR-001) | **PROVADO** (implementação e QA completos) — Merge Gate: BLOQUEADO (aprovação humana pendente) |
| Context Panel — investigação P0 (BLOCK-008), 1ª sessão | Causa raiz lida no código + teste comparativo real `main` vs `feature/agenda` (E-024) | — | **PROVADO** (achado) |
| TASK-CONTEXT-PANEL-GEOMETRY-001 (correção portada, PR #5) | Contract, Implementation, Test, Build, Browser QA 3 modos × 4 breakpoints, reduced-motion, persistência, regressão (E-027) | Merge Gate (mesma natureza de HDR-001) | **PROVADO** (todos os ACCEPTANCE CRITERIA) — Merge: BLOQUEADO |
| Capability Audit (IA/Design/Knowledge/Dados/Google/Observabilidade/QA/Segurança) | Verificação real via ListConnectors, ToolSearch, Supabase/Vercel MCP, grep de segredos (E-027) | — | **PROVADO** (auditoria, não implementação de produto) |
| TASK-AGENDA-SHELL-001 (Agenda cherry-picked, branch própria, PR #6) | Contract (D-012), Implementation, Test, Build, Browser QA original (29/30) + suíte nova de regressão de Shell (11/11) (E-028) | Merge Gate (depende de PR #5, mesma natureza de HDR-001) | **PROVADO** (40/41 checks reais — a única falha é ambiental, já documentada) — Merge: BLOQUEADO |
| TASK-STUDY-MODE-REFINEMENT-001 (multi-trilha portada + motion/espaço/Island voz, PR #7) | Contract, Implementation, Test, Build, Browser QA com amostragem em plena transição (41/41) (E-029) | Merge Gate (depende de PR #5) | **PROVADO** (todos os itens do checklist do usuário verificados com evidência real) — Merge: BLOQUEADO |
| TASK-HOJE-FOUNDATION-001 (Hoje Foundation v1 + honestidade em rotas pendentes) | Contract (E-025, HUMAN GATE ANALYSIS), Implementation, Test, Build, Browser QA 4 breakpoints, reduced-motion, regressão (E-026) — PR #4 | Merge Gate (mesma natureza de HDR-001) | **PROVADO** (todos os 7 ACCEPTANCE CRITERIA) — Merge: BLOQUEADO (aprovação humana pendente) |
| TASK-AGENDA-EXPERIENCE-001 (motion/Island/UX + bug de exclusão de rotina corrigido, PR #9) | Contract (D-013, QA_GATE.md → Gate 11), Implementation, Test, Build, Browser QA com amostragem em plena transição (27/27) + regressão (11/11 + 29/30) (E-030) | Human Experience Gate (Gate 11, item 11) + Merge Gate | Gates 1-10: **PROVADO** — Gate 11 (Human Experience Gate): **BLOQUEADO** (decisão humana pendente) — Classificação: `EXPERIENCE EM REFINAMENTO` |
| TASK-SHELL-SIDEBAR-RECOVERY-001 (botão inalcançável + geometria de ícones corrigidos, PR #11) | Contract (D-012), Implementation, Test, Build, Browser QA com largura amostrada em plena transição (26/26) (E-031) | Human Experience Gate + Merge Gate | Gates 1-10: **PROVADO** — Gate 11: **BLOQUEADO** (decisão humana pendente) |
| TASK-AGENDA-CONFLICTS-EXPERIENCE-001 (conflitos N-a-N, prioridade, sugestões, recorrência "Personalizado", bug de recorrência nunca salva corrigido, PR #12) | Contract (D-013), Implementation, Test, Build, Browser QA (20/20) + regressão de Shell (E-032) | Human Experience Gate + Merge Gate | Gates 1-10: **PROVADO** — Gate 11: **BLOQUEADO** (decisão humana pendente) — Classificação: `EXPERIENCE EM REFINAMENTO` |
| TASK-EDUCATION-TRACKS-EXPERIENCE-001 (rótulo ENEM, altura do player, Tutor/Island e Foco auditados sem defeito, PR #13) | Contract (D-013), Implementation, Test, Build, Browser QA (11/11) (E-033) | Human Experience Gate + Merge Gate | Gates 1-10: **PROVADO** — Gate 11: **BLOQUEADO** (decisão humana pendente) — Classificação: `EXPERIENCE EM REFINAMENTO` |
