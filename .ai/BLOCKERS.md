# BLOCKERS.md — Bloqueios Reais Registrados

Este arquivo só contém bloqueios verificados nesta sessão (comando executado, saída real). Nunca
um bloqueio hipotético ou "provavelmente".

---

## BLOCK-001 — Antigravity CLI (`agy`) indisponível (investigado a fundo nesta sessão)

**Comando executado (verificação inicial, repetida em duas sessões):**
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
