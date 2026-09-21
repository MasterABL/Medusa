# BLOCKERS.md — Bloqueios Reais Registrados

Este arquivo só contém bloqueios verificados nesta sessão (comando executado, saída real). Nunca
um bloqueio hipotético ou "provavelmente".

---

## BLOCK-001 — Antigravity CLI (`agy`) indisponível nesta sessão (investigado em 3 sessões)

**Atualização mais recente (3ª sessão)**: o usuário informou que `agy` foi instalado e está
funcional numa máquina Windows. Reverificado nesta sessão de qualquer forma (nunca presumir):
```
$ which agy
(sem saída, exit code 1)

$ agy --version
/bin/bash: line 1: agy: command not found
(exit code 127)

$ hostname / uname -a
vm / Linux ... (container Linux isolado, não a máquina Windows do usuário)
```
**Conclusão nova e importante**: isso não é mais "agy não existe em lugar nenhum" — é
**"agy existe, mas não neste container"**. Esta sessão do Claude Code roda num ambiente de
execução remoto/nuvem, isolado, efêmero, sem qualquer acesso ao sistema de arquivos ou PATH da
máquina Windows do usuário. Instalar `agy` no Windows não o torna alcançável por esta sessão —
são dois ambientes de execução completamente separados, sem ponte de rede ou filesystem entre
eles. Isso não é um problema de permissão corrigível aqui; é uma fronteira arquitetural do
produto "Claude Code on the web"/sessão remota. Ver `AGENT_RULES.md` → seção 7 para a nota de
arquitetura correspondente.

**Caminho real para usar o `agy` do Windows**: o usuário precisaria rodar uma sessão do Claude
Code **na própria máquina Windows** (localmente, ou WSL com PATH compartilhado) apontando para
este mesmo repositório — não esta sessão remota. Isso é uma decisão de onde rodar a sessão, não
uma configuração que esta sessão possa mudar sozinha.

**Comando executado (verificação inicial, repetida em três sessões):**
```
$ which agy
(sem saída, exit code 1)

$ agy --version
/bin/bash: line 1: agy: command not found
(exit code 127)
```

**Investigação de caminho de instalação legítimo (nesta sessão):**

1. `npm view antigravity-cli` retorna um pacote real no registro do npm, mas **não é o produto
   oficial**: mantenedor único, sem repositório declarado, pacote de 2.1 kB descrito como
   "placeholder", binário chamado `kirox` (não `agy`), publicado uma única vez há 10 meses e nunca
   atualizado. **Não instalado — risco de supply chain sem benefício real.**
2. Pesquisa web confirmou o produto real: **Google Antigravity CLI**, instalável via
   `curl -fsSL https://antigravity.google/cli/install.sh | bash`, binário resultante chamado `agy`.
   Documentação oficial: `https://antigravity.google/docs/cli/install/` e
   `https://antigravity.google/docs/cli/headless/`.
3. O script de instalação foi **baixado e lido integralmente antes de qualquer execução** (nunca
   `curl | bash` às cegas). Achados da leitura: script hospedado no domínio oficial do produto,
   detecta plataforma, consulta um manifesto de release, baixa o binário, **verifica checksum
   SHA512 contra o manifesto antes de instalar**, escreve apenas em `~/.local/bin` (sem `sudo`,
   sem alteração de arquivos de sistema), e finaliza chamando `agy install` para configuração de
   shell. Nenhum código ofuscado, nenhuma chamada de rede para destino não documentado.
4. **A execução do script foi bloqueada pelo classificador de modo automático desta própria
   sessão** ("Permission for this action was denied... Reason: [Code from External]") — ou seja,
   o ambiente recusa por padrão executar código baixado de uma fonte externa, mesmo já revisado
   manualmente, sem uma regra de permissão Bash explícita do usuário. **Isto não foi contornado**
   (replicar os mesmos passos manualmente para burlar a recusa violaria o espírito da própria
   política de segurança do ambiente, e não foi feito).
5. Mesmo que a instalação fosse concluída, a documentação oficial de modo headless declara
   explicitamente: *"Headless mode uses your cached credentials. Authenticate once with an
   interactive `agy` session first."* e *"In a non-interactive environment with no terminal ...,
   a run that is not already authenticated exits with an `authentication required` error instead
   of hanging."* — ou seja, **autenticação exige uma sessão interativa prévia** (provavelmente
   OAuth de conta Google), que não é possível dentro desta sessão não interativa, e não há
   variável de ambiente de API key documentada como alternativa direta.
6. Consideração adicional: este ambiente de execução remota é **efêmero** (container reciclado
   entre sessões). Mesmo que uma autenticação interativa fosse feita uma vez, não há garantia de
   que as credenciais em cache sobreviveriam a um novo container, a menos que o usuário configure
   armazenamento persistente para o `$HOME` deste ambiente.

**Conclusão honesta:** existe um caminho de instalação **legítimo e tecnicamente seguro**
(`antigravity.google/cli/install.sh`), mas ele exige duas coisas que só um humano pode prover
nesta configuração de ambiente: (a) autorização explícita para executar código externo (uma regra
de permissão Bash), e (b) uma sessão interativa de login único. Nenhuma das duas foi simulada,
inventada ou contornada.

**Caminho operacional viável determinado nesta sessão:**
- **Curto prazo (esta e futuras sessões neste ambiente efêmero):** Claude executa diretamente as
  tarefas do `TASK_QUEUE.md`, seguindo o mesmo formato de `HANDOFF.md` como especificação de
  escopo — ver `AGENT_RULES.md` → seção "Executor e Fallback". Isto não é um desvio do protocolo;
  é o próprio protocolo de fallback, desenhado exatamente para este caso.
- **Médio prazo (se o humano decidir investir em Antigravity real):** (1) o humano concede
  permissão Bash para instalar `agy` neste tipo de ambiente (ou instala em um ambiente persistente
  próprio), (2) o humano realiza o login interativo uma única vez nesse ambiente persistente, (3) a
  partir daí, `scripts/agent-orchestrator.cjs` pode invocar `agy` em modo headless normalmente.
  Isso é uma decisão humana, registrada como `HDR-009` em `DECISIONS.md` — não foi assumida.

**Não tentado como contorno:** usar `--dangerously-skip-permissions` como configuração permanente
(proibido por `AGENT_RULES.md`); simular a saída de `agy` para fingir que a tarefa avançou;
replicar manualmente os passos do instalador para burlar a recusa do classificador de segurança.

**Status:** BLOQUEADO para execução real de Antigravity nesta sessão — mas **NÃO BLOQUEADO** para
o roadmap do Medusa, que segue via o executor de fallback (Claude direto), conforme
`AGENT_RULES.md` → "Executor e Fallback".

---

## BLOCK-002 — PR #1/#2 não mesclados (RESOLVIDO PARCIALMENTE NESTA SESSÃO — evidência agora real)

**Fatos verificados (baseline git):**
```
$ git rev-parse origin/main
5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0

$ git merge-base --is-ancestor origin/fix/foundation-hardening origin/feature/agenda
YES
```
PR #1 e PR #2 estão ambos `open`, `merged: false`. **Novo achado**: `feature/agenda` (PR #2) foi
criada sobre `fix/foundation-hardening` (PR #1), não sobre `main` — contém os commits de PR #1.
Ver `DECISIONS.md` → D-008, HDR-001 atualizado.

**Reexecução real feita nesta sessão** (worktree isolado em `/tmp/medusa-audit-agenda`, checkout de
`origin/feature/agenda`, `npm install`, servidor dev real em `localhost:3000`):
```
$ npx tsc --noEmit
(0 erros, exit 0)

$ npm run build
✓ Compiled successfully / ✓ Generating static pages (6/6)
(exit 0)

$ node scripts/test-foundation-hardening.js
13/13 asserções PASSED — "RESULTADO GERAL DO HARDENING VALIDATION: PROVADO 100%"
(bate com a alegação do PR)

$ node scripts/qa-browser.js
23 asserções reais, todas aprovadas, 0 falhas explícitas.
"42" no relatório = screenshots capturados, não testes — a descrição do PR confunde as duas
métricas ("42 testes aprovados" deveria ser "23 asserções aprovadas, 42 screenshots").
30 erros de console reportados = 100% `net::ERR_CERT_AUTHORITY_INVALID` de fontes do Google Fonts
carregadas de `fonts.googleapis.com`/`fonts.gstatic.com` (ver `src/app/layout.tsx`), causados pela
limitação de TLS externo deste sandbox (BLOCK-004), não defeitos reais do app.
```
Ver `EVIDENCE.md` → E-013 a E-017 para os comandos e saídas completas.

**O que passou a ser PROVADO:** Test Gate e Build Gate de PR #1+#2 combinados (código compila,
buildaqui, os scripts de QA já existentes rodam e não encontram defeito funcional real). Isso é
evidência de **Implementation Gate**, não de **Merge Gate** (ver `DECISIONS.md` → D-007) — o código
ainda não está em `main`.

**O que continua pendente:** correção do texto da descrição de PR #1 (números de teste imprecisos),
ratificação humana da expansão de Educação bundled nessas branches (`DECISIONS.md` → HDR-010), e a
decisão de merge sequencial em si (HDR-001).

**Status:** Test/Build Gate — PROVADO. Merge Gate — BLOQUEADO (decisão humana pendente, HDR-001).

---

## BLOCK-003 — Nenhum GitHub Actions configurado (Vercel corrigido — ver nota)

**Comando executado:**
```
mcp__github__actions_list → {"total_count":0}
```
Não há workflow do GitHub Actions no repositório.

**Correção registrada nesta sessão:** a suposição inicial de que Vercel também estava "não
verificável" estava **errada** e foi corrigida assim que uma evidência real apareceu (comentário
do bot `vercel[bot]` na PR #3 de bootstrap, mostrando build de preview real chegando a `Ready`
para a branch `chore/agent-os-bootstrap`). Vercel está de fato conectado ao repositório via
integração GitHub e builda preview a cada push. Ver `EVIDENCE.md` → E-009 e a correção em
`CURRENT_STATE.md`/`ARCHITECTURE.md`. Isso não é uma lacuna, é infraestrutura já ativa — só não
tínhamos evidência dela até este comentário automático.

**Impacto (apenas do lado GitHub Actions):** Nenhum gate deste protocolo (`QA_GATE.md`) pode ser
automatizado por *CI de testes* ainda (typecheck/build/QA automatizados); todo gate de teste
depende de execução manual por Claude ou por um humano. O pipeline de *deploy/preview* (Vercel)
já existe e funciona independentemente disso.

**Resolução necessária:** decisão humana sobre adotar GitHub Actions para automatizar os gates de
Test/Build (Vercel já cobre o build/preview, mas não os gates de typecheck/QA deste protocolo) —
registrada como HDR-007 em `DECISIONS.md`.

**Status:** GitHub Actions — NÃO IMPLEMENTADO (lacuna real, ainda não decidida). Vercel —
CONFIGURADO E FUNCIONAL (corrigido, não é mais um bloqueio).

---

## BLOCK-004 — Limitação de rede do ambiente para QA de navegador headless externo

**Origem:** confirmado em sessão anterior deste mesmo projeto (fora deste bootstrap): Chromium
headless (`/opt/pw-browsers/chromium` + `puppeteer-core`) falha validação TLS contra *qualquer*
host HTTPS externo neste ambiente (teste de controle contra `https://www.google.com` também
falhou), mas funciona normalmente contra `localhost`.

**Impacto:** Browser QA real (`QA_GATE.md` → gate 6) é executável neste ambiente **apenas**
contra o servidor de desenvolvimento local (`npm run dev` + `localhost`), nunca contra uma URL de
preview/produção externa (ex.: Vercel preview). Isso não bloqueia QA de `TASK-AGENDA-001` (que
roda contra `localhost`), mas bloqueia qualquer QA que dependa de uma URL pública.

**Não tentado como contorno:** desabilitar verificação de TLS (proibido pelas regras do
ambiente).

**Status:** BLOQUEADO (para QA contra URLs externas) — não bloqueia QA local.

---

## BLOCK-005 — Resultado real do `qa-agenda.js`: 29/30, não 30/30 como alegado no corpo da PR #2

**Comando executado** (mesmo worktree/servidor do BLOCK-002):
```
$ node scripts/qa-agenda.js
=== QA AGENDA COMPLETO: 29 PASSOU | 1 FALHOU ===
[FAIL] Zero erros graves no console do navegador (Erros: 2)
```
Os 2 "erros graves" são exatamente 2 `net::ERR_CERT_AUTHORITY_INVALID` do carregamento de Google
Fonts (`fonts.googleapis.com`), a mesma causa ambiental do BLOCK-004 — **não é um defeito real do
app**. As outras 29 asserções (roteamento, Day/Week/Month/List View, navegação temporal, CRUD de
evento com exclusão em 2 passos, 24 cores, filtro por domínio, Context Panel, 820px/390px,
temas, não-regressão de Educação) passaram de verdade.

**Impacto:** a alegação "scripts/qa-agenda.js (30/30 aprovados)" no corpo da PR #2 não bate
exatamente com o resultado real desta sessão — mas a causa da diferença é ambiental (a mesma
limitação de TLS externo já documentada), não funcional. Isso é análogo ao BLOCK-002: uma alegação
imprecisa que, investigada a fundo, não indica um defeito real do produto.

**Status:** PARCIAL — 29/29 verificações funcionais reais passaram; a 30ª depende de uma condição
de ambiente (acesso TLS externo) que não existe neste sandbox e provavelmente existiria num
ambiente de desenvolvimento normal com internet completa.

---

## BLOCK-006 — Vulnerabilidade de segurança conhecida em `next@14.2.24`

**Comando executado:**
```
$ npm install --no-audit --no-fund
npm warn deprecated next@14.2.24: This version has a security vulnerability. Please upgrade to a
patched version. See https://nextjs.org/blog/security-update-2025-12-11 for more details.
```
**Impacto:** achado real, não investigado a fundo nesta sessão (fora do escopo desta consolidação
de plano — não é um blocker de Agenda/Foundation, é uma dívida técnica transversal). Deve virar uma
entrada de `TASK_QUEUE.md` de manutenção, não bloqueia nenhuma fase do roadmap de produto.

**Status:** NÃO IMPLEMENTADO (correção ainda não avaliada nem agendada) — registrado para não ser
esquecido, não para bloquear o roadmap atual.

---

## BLOCK-007 — ESLint nunca foi configurado neste repo (achado durante TASK-CI-001)

**Comando executado:**
```
$ npm run lint
> next lint
? How would you like to configure ESLint? ...
(exit 1 — prompt interativo, sem TTY em CI/automação)
```
**Impacto:** `npm run lint` não é utilizável em automação hoje. `.github/workflows/ci.yml`
(TASK-CI-001) foi deliberadamente restrito a typecheck+build (os únicos gates que `QA_GATE.md`
de fato mandata) para não incluir um passo que travaria/falharia. Configurar ESLint de verdade
(rodar o wizard uma vez, commitar a config gerada) é uma tarefa de manutenção de baixa prioridade,
não bloqueia nenhum item do roadmap de produto.

**Status:** NÃO IMPLEMENTADO (backlog, não urgente).

---

## BLOCK-008 — Context Panel não recolhe corretamente em `main` (RESOLVIDO nesta sessão — PR #5)

**Prioridade do usuário:** P0. Duas sessões: a primeira investigou e decidiu não duplicar a
correção (aguardar `HDR-001`); esta sessão recebeu instrução explícita do usuário
("Faça a correção chegar a uma branch preparada para merge") e portou a correção para uma branch
própria e independente, já que ela não depende de nenhuma parte do escopo de Agenda bloqueado
por `HDR-001`.

**Causa raiz (achado original, confirmado por teste comparativo `main` vs `feature/agenda`):**
**4 funções de cálculo de geometria duplicadas e independentes** (não 3 — `Sidebar.tsx` também
tinha a sua própria, achado corrigido nesta sessão), cada uma com seus próprios literais
`260/320/68/240` hardcoded: `Sidebar.getSidebarWidth()`, `ContextPanel.getPanelWidthClass()`
(sempre `w-[260px]`/`w-[320px]`, nunca `0`), `ShellLayout.getMainPaddingStyle()`,
`Header.getHeaderPositionStyle()`. O box model do painel nunca chegava a 0px — só era deslocado
via `transform`.

**Correção portada nesta sessão** (branch `fix/context-panel-geometry`, a partir de `main`,
independente de PR #1/#2 — ver BLOCKED SCOPE vs UNBLOCKED SCOPE): `calculateShellGeometry()` (já
provado em `feature/agenda`, `D-001`) foi portado para `main` como fonte única de verdade, com os
4 componentes lendo de `useShell().geometry`. Conteúdo específico de Agenda (branch
`activeRoute === 'agenda'` do `ContextPanel.tsx` de `feature/agenda`) foi deliberadamente **não**
portado — não existe em `main` e depende de `HDR-001`.

**Achado NOVO durante o port, não presente no relatório original e ainda latente em
`feature/agenda` hoje:** com `box-sizing: border-box`, uma borda incondicional de 1px num
elemento com `width: 0` trava a caixa renderizada em 1px, não 0, porque o conteúdo não pode ficar
negativo. `Sidebar.tsx` (Foco) e `ContextPanel.tsx` (fechado) tinham exatamente esse problema —
corrigido removendo a LARGURA da borda (não só a cor) quando recolhidos. Isto explica por que o
teste anterior (47/48 em `feature/agenda`) não pegou isso: a asserção de largura não usava
tolerância zero/exata o bastante para expor 1px residual.

**Evidência real (branch `fix/context-panel-geometry`):**
```
$ npx tsc --noEmit   → 0 erros
$ npm run build      → sucesso
$ node scripts/qa-context-panel-geometry.js   → 39/39 aprovados
```
Cobertura: largura real (não classe CSS) amostrada EM PLENA TRANSIÇÃO (t~60ms) e no estado final,
nos 3 modos × 4 breakpoints, persistência via localStorage sobrevivendo a reload, reduced-motion,
e não-regressão de Educação. Ver `EVIDENCE.md` → E-027.

**PR:** https://github.com/MasterABL/Medusa/pull/5 (draft).

**Escopo bloqueado vs não bloqueado:** a correção em si estava 100% desbloqueada (não depende de
Agenda). O que resta bloqueado é só o Merge Gate desta nova PR (mesma natureza de `HDR-001`).

**Status:** **PROVADO.** Merge Gate: BLOQUEADO (aprovação humana pendente, mesmo tipo já
registrado em `HDR-001`, não um novo Human Gate).

---

## BLOCK-009 — Integrações de IA e Google Workspace: infraestrutura real, mas wiring de produto genuinamente bloqueado

**Contexto:** o Capability Audit desta sessão (E-027) verificou com ferramentas reais — não
suposição — o que está disponível. Este bloqueio separa "a ferramenta existe" de "posso wire-ar
isso no produto Medusa com segurança e honestidade".

**IA (Gemini/AI Studio/OpenRouter/Context7/Sentry):** confirmado via `ToolSearch` que nenhum
destes conectores existe neste ambiente, e via `filter_project_envs` que nenhuma chave de IA está
configurada no Vercel do projeto `medusa`. **Não é um Human Gate no sentido de "escolha entre
opções" ainda** — é a ausência total do pré-requisito técnico (uma chave de API). Assim que uma
chave for provisionada (decisão humana: qual provider, qual custo aceitável — isso sim é HDR-004-
adjacente), o wiring de código em si é trabalho normal, não um novo gate.

**Google Workspace (Gmail/Calendar/Drive) para features do produto (Hoje, Agenda, Educação):**
os conectores Gmail/Calendar/Drive estão conectados e funcionais **para esta sessão/operador**,
via OAuth da própria conta do Claude Code, não do produto Medusa. Usar esses conectores para
alimentar uma feature do Medusa (ex.: "Hoje mostra os compromissos do Google Calendar do
usuário") exigiria o Medusa ter seu **próprio app OAuth registrado no Google Cloud Console**,
consentimento explícito do usuário final dentro do produto, e armazenamento seguro de tokens no
backend — nenhuma dessas três coisas existe hoje, e nenhuma pode ser criada só com as ferramentas
desta sessão (registrar um app OAuth é uma ação humana no Google Cloud Console). Implementar uma
integração usando o acesso desta sessão como se fosse do produto seria uma integração fake
(mesma categoria de violação de honestidade corrigida em `TASK-HOJE-FOUNDATION-001`) — não feito.
Isto é um bloqueio técnico real (pré-requisito de infraestrutura ausente), não apenas um Human
Gate de escolha.

**Stitch:** confirmado (2ª vez, ferramentas diferentes) que não há conector MCP de Stitch neste
ambiente. Adicionalmente descoberto nesta sessão: existe de fato uma env var `Stitch_api_key` no
Vercel do projeto `medusa` (produção, valor nunca decriptado por esta sessão). Ainda assim,
inutilizável a partir daqui: sem conector MCP e sem endpoint documentado publicamente para chamar
a API do Stitch diretamente, tentar uma chamada HTTP às cegas com um segredo seria exatamente o
tipo de "fingir execução" proibido pelas regras desta sessão.

**Supabase:** ao contrário dos itens acima, este JÁ TEM infraestrutura real criada (projeto
"Medusa", plano free, restaurado e verificado nesta sessão) — mas ainda sem schema, sem Auth
configurado, e sem `@supabase/supabase-js` no `package.json`. Diferente do bloqueio de IA/Google,
aqui o único gate real que falta é a decisão de modelo de Auth (`HDR-011`) — a infraestrutura em
si não é o problema.

**Status:** IA — BLOQUEADO (pré-requisito técnico ausente, chave de API). Google Workspace —
BLOQUEADO (pré-requisito de infraestrutura: app OAuth próprio do produto). Stitch — BLOQUEADO
(sem via de acesso, mesmo com a chave existindo). Supabase — infraestrutura PROVADA existente,
wiring de produto aguarda `HDR-011`.

---

## Bloqueios que NÃO existem (registrado para evitar suposição futura)

- Não há bloqueio para ler/escrever no repositório local — acesso de leitura e escrita confirmado.
- Não há bloqueio para criar branches e (quando autorizado) abrir PRs via GitHub MCP — testado
  em sessões anteriores deste projeto.
- Não há bloqueio de `npx tsc --noEmit` ou `npm run build` — reexecutados de verdade nesta sessão
  (ver BLOCK-002), ambos passam sem erro.
- `shell/v2-fixes` **não é um blocker nem uma branch com conteúdo pendente** — verificado que
  aponta para o mesmo commit de `main` (`5d4c5c0`, `git diff` vazio entre as duas). É uma branch
  vazia, provavelmente criada como placeholder para trabalho futuro, sem PR aberta. Registrado
  aqui só para não ser confundido com trabalho perdido/não investigado.
