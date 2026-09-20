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

## BLOCK-002 — PR #1 (`fix/foundation-hardening`) não mesclado e evidências não reproduzidas

**Fatos verificados:**
```
$ git rev-parse origin/main
5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0

$ git merge-base origin/main origin/fix/foundation-hardening
5d4c5c0be19adfc82a8c94e9cc4f3aac420d74f0

$ git rev-list --left-right --count origin/main...origin/fix/foundation-hardening
0	2
```
PR #1 está `open`, `merged: false`, `draft: false` (via `mcp__github__list_pull_requests`). O
corpo do PR alega "42 testes aprovados" e "hardening test 100%", mas isso não foi reexecutado
nesta sessão.

**Impacto:** `MASTER_PLAN.md`/`ROADMAP.md` não podem marcar a Fase 1 (Foundation) como `PROVADO`.
Além disso, `TASK-AGENDA-001` depende de HDR-001: decidir se este PR entra antes da Agenda.

**Resolução necessária:** decisão humana (HDR-001) + reexecução real de
`scripts/qa-browser.js` e `scripts/test-foundation-hardening.js` na branch do PR.

**Status:** BLOQUEADO (decisão humana) / PARCIAL (evidência alegada, não reproduzida).

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

## Bloqueios que NÃO existem (registrado para evitar suposição futura)

- Não há bloqueio para ler/escrever no repositório local — acesso de leitura e escrita confirmado.
- Não há bloqueio para criar branches e (quando autorizado) abrir PRs via GitHub MCP — testado
  em sessões anteriores deste projeto.
- Não há bloqueio de `npx tsc --noEmit` ou `npm run build` em si — ainda não foram reexecutados
  neste bootstrap porque nenhuma mudança de produto foi feita (nada para testar); ver
  `EVIDENCE.md`.
