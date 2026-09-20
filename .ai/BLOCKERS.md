# BLOCKERS.md — Bloqueios Reais Registrados

Este arquivo só contém bloqueios verificados nesta sessão (comando executado, saída real). Nunca
um bloqueio hipotético ou "provavelmente".

---

## BLOCK-001 — Antigravity CLI (`agy`) indisponível

**Comando executado:**
```
$ which agy
(sem saída, exit code 1)

$ agy --version
/bin/bash: line 1: agy: command not found
(exit code 127)
```

**Impacto:** Nenhuma tarefa pode ser delegada a Antigravity nesta sessão. `HANDOFF.md` mantém um
rascunho pronto para `TASK-AGENDA-001`, mas ele não foi (e não pôde ser) enviado a nenhum
executor.

**Não tentado como contorno:** instalar `agy` sem instrução explícita do humano; usar
`--dangerously-skip-permissions` como configuração permanente (proibido por `AGENT_RULES.md`);
simular a saída de `agy` para fingir que a tarefa avançou.

**Resolução necessária:** decisão humana sobre como/quando instalar e autenticar `agy` neste
ambiente, ou decisão de que Claude executa as tarefas de implementação diretamente (sem
Antigravity) até que o CLI esteja disponível.

**Status:** BLOQUEADO.

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
