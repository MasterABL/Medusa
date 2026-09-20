# DECISIONS.md — Registro de Decisões Arquiteturais

Formato: cada decisão tem status `DECIDIDO` (com data/contexto) ou `HUMAN DECISION REQUIRED`
(pendente, bloqueando alguma tarefa até ser resolvida por um humano).

---

## DECIDIDO

### D-001 — ShellGeometry como fonte única de verdade de layout
Toda largura/padding do Shell (Sidebar, Header, Context Panel, Main) é derivada de
`calculateShellGeometry()` em `src/types/shell.ts`, nunca recalculada de forma independente por
componente. Motivo: a duplicação anterior (3 arquivos calculando a mesma largura) causava risco de
dessincronização silenciosa. Ver `ARCHITECTURE.md`.

### D-002 — Roteamento entre domínios por `activeRoute`, não por rota do Next.js
Cada "módulo" (Educação, futuramente Agenda) é uma troca condicional em `src/app/page.tsx` sobre
`activeRoute` do `ShellContext`, não uma rota própria (`/agenda`). Motivo: é o padrão já
estabelecido e funcional para Educação; manter consistência até haver razão concreta para mudar.

### D-003 — Sem persistência real nesta fase
Todo estado de domínio vive em `useState` (memória de sessão) ou `localStorage` (preferências de
UI como tema). Nenhuma tarefa deve fingir persistência real sem que exista de fato um backend.
Interfaces devem indicar isso explicitamente ao usuário (padrão já usado por Educação: "Local
State · sessão").

### D-004 — Paleta de acento fixa, superfícies nunca em branco/preto absoluto
As 5 cores oficiais (`#71DBD2 #EEFFDB #ADE4B5 #D0EAA3 #FFF18C`) são acento, nunca fundo de
superfície. Bases de tema não usam `#FFFFFF`/`#000000` dominante. Ver `ARCHITECTURE.md` → Design
tokens.

### D-005 — Motion Lab isola timers de simulação
Qualquer timer que simule estado assíncrono (ex.: "sucesso após 2s") vive em `/dev/motion-lab`,
nunca em componentes de produção do Shell ou de domínio.

### D-006 — Semântica da ordem de fases: Auth precede Persistência, não UI
A ordem de fases do `MASTER_PLAN.md` (ex.: Auth na Fase 2, antes de Corpo/Finanças nas Fases 6/7)
governa quando o **Persistence Slice** de um domínio pode começar, não quando seu **Contract/
Foundation/UI/Local State** podem começar. Um domínio de fase posterior pode ter sua camada de UI
com Local State implementada antes de uma fase anterior fechar, desde que (a) não implemente
persistência real antes de Auth existir, e (b) rotule o estado como Local State explicitamente
(`AGENT_RULES.md` → Honestidade). Isso já aconteceu na prática: a Agenda (Fase 3) foi implementada
com UI completa antes de qualquer trabalho de Auth (Fase 2) começar — isso não é uma violação,
porque a Agenda não implementou persistência real. Ver `MASTER_PLAN.md` → modelo de ciclo de vida
de domínio.

### D-007 — Merge Gate ≠ Implementation Gate
Adotado formalmente (ver `QA_GATE.md`): uma tarefa/PR pode estar com `Implementation Gate` e
`Test Gate`/`Build Gate` em `PROVADO` (código existe, compila, buildaqui) sem que isso signifique
que está mesclada em `main`. Merge é um gate seguinte e distinto (`Review/Audit Gate → Merge →
Closed Gate`), e nenhum documento `.ai/` deve descrever uma funcionalidade como "concluída" apenas
porque existe evidência de implementação — precisa dizer explicitamente se está mesclada ou não.
Motivo: PR #1 e PR #2 têm evidência real de Test/Build Gate (verificado nesta sessão) mas nenhum
dos dois está mesclado em `main`.

### D-008 — Git topology: PR #2 (Agenda) depende tecnicamente de PR #1 (Foundation Hardening)
Verificado via `git merge-base --is-ancestor origin/fix/foundation-hardening origin/feature/agenda`
→ `YES`. A branch `feature/agenda` foi criada a partir de `fix/foundation-hardening` (contém os
commits `e616635` e `a7f988c` como ancestrais), não a partir de `main` diretamente, apesar de a PR
#2 no GitHub declarar `base: main`. Isso significa: **PR #2 não pode ser mesclada isoladamente sem
também trazer todo o conteúdo de PR #1** — não é uma preferência de ordem (como HDR-001 registrava
antes), é uma dependência estrutural do histórico Git. HDR-001 foi atualizado para refletir isso.

---

## HUMAN DECISION REQUIRED

### HDR-001 — Ordem de merge: PR #1 antes de PR #2 (ATUALIZADO — agora é dependência técnica, não recomendação)
**Atualizado nesta sessão com evidência real (ver D-008 e EVIDENCE.md → E-018):** `feature/agenda`
(PR #2) foi criada a partir de `fix/foundation-hardening` (PR #1), não de `main`. PR #2 **contém**
os commits de PR #1. Isso não é mais uma recomendação — é uma restrição estrutural do Git: mesclar
PR #2 sem PR #1 primeiro é impossível de forma limpa (traria o conteúdo de PR #1 junto, sem revisão
própria). **Decisão que ainda falta**: o humano aprova o conteúdo de PR #1 e PR #2 para merge
sequencial (PR #1 → PR #2), nessa ordem, depois de revisar os achados desta sessão (ver
`EVIDENCE.md` → E-013 a E-019)? Ou pede mudanças antes?

### HDR-002 — Reprodução independente das evidências do PR #1 (RESOLVIDO NESTA SESSÃO)
**Resolvido.** `npx tsc --noEmit` e `npm run build` foram executados de fato (branch `feature/agenda`,
que contém os commits de PR #1) — 0 erros de typecheck, build verde. `scripts/test-foundation-
hardening.js` rodou de verdade: 13/13 asserções passaram, resultado real "PROVADO 100%",
batendo com a alegação do PR. `scripts/qa-browser.js` rodou de verdade: 23 asserções reais, todas
aprovadas (0 falhas explícitas) — mas a alegação de "42 testes" no corpo do PR mistura o número de
**screenshots gerados** (42, correto) com o número de **asserções de teste** (23, não 42) — uma
imprecisão de descrição, não uma evidência falsa. Os "30 erros de console" reportados pelo script
são 100% `net::ERR_CERT_AUTHORITY_INVALID` de fontes do Google Fonts carregadas externamente,
causados pela limitação de TLS externo deste sandbox (`BLOCKERS.md` → BLOCK-004), não defeitos do
app. Ver `EVIDENCE.md` → E-014 a E-017 para os comandos e saídas completas. **Ação restante**: a
descrição da PR #1 no GitHub deveria ser corrigida para dizer "23 asserções aprovadas, 42
screenshots capturados" em vez de "42 testes aprovados" — isso é uma correção de texto, não uma
decisão técnica; fica registrada como a primeira tarefa desbloqueada (ver `TASK_QUEUE.md`).

### HDR-003 — List View da Agenda: agrupamento (RESOLVIDO DE FATO PELA IMPLEMENTAÇÃO, FALTA RATIFICAR)
**Atualizado nesta sessão:** PR #2 já implementa o agrupamento semântico "Agora/Próximo/Depois/Mais
tarde" (verificado por leitura de código em `ListView.tsx` e confirmado interativamente pelo
`qa-agenda.js` real: "Lista organiza itens nos blocos canônicos... PASSED"). Isso resolve a
pergunta original na prática. **O que falta não é mais escolher entre as duas opções — é o humano
ratificar que essa é de fato a decisão definitiva do produto** antes do merge, já que foi tomada
implicitamente durante a implementação (por quem escreveu o código de PR #2), não registrada aqui
antes de o código existir. Tratado como `DECIDIDO condicionalmente` até essa ratificação.

### HDR-004 — Persistência real: quando e com o quê?
Não há Supabase nem nenhum backend configurado no repositório. Antes de qualquer domínio (Agenda,
Corpo, Finanças...) prometer "salvar" algo além de `localStorage`/sessão, é preciso decidir: qual
backend, quando integrar, e se isso é um pré-requisito de algum domínio específico ou um projeto
transversal à parte. Ver `MASTER_PLAN.md` → Persistência.

### HDR-005 — Roadmap de domínios ainda sem especificação
Corpo, Finanças, Progresso, Guardian e Buscar não têm nenhuma especificação de produto no
repositório além dos nomes e responsabilidades gerais em `PRODUCT_CONTRACT.md`. Cada um precisa de
uma rodada de definição de contrato antes de virar tarefa executável. Ver `MASTER_PLAN.md`.

### HDR-006 — Hoje: contrato de consumo de dados da Agenda (REFINADO — split Foundation/Integration)
`PRODUCT_CONTRACT.md` já define que Hoje consome fatos temporais da Agenda, mas o formato exato
desse contrato (que dados, que shape, push ou pull) ainda não foi especificado. **Refinado nesta
sessão**: `MASTER_PLAN.md` agora separa "Hoje Foundation" (estrutura visual e contratos, pode
começar mesmo sem os outros domínios prontos) de "Hoje Integration" (consumo progressivo de dados
reais, domínio por domínio, só depois que cada domínio-fonte existir). A decisão pendente aqui é
apenas sobre o shape exato do contrato de consumo de cada domínio à medida que cada um fica pronto
— não bloqueia mais o início da Fase 5 (Hoje Foundation).

### HDR-007 — CI de testes (typecheck/build/QA automatizado em PR)
Não há GitHub Actions no repositório. **Atualizado nesta sessão:** o deploy/preview em si já
funciona via integração Vercel↔GitHub (confirmado em `EVIDENCE.md` → E-009) — o que falta decidir
é apenas se/quando configurar GitHub Actions para automatizar os gates de `QA_GATE.md`
(typecheck, build, QA de browser) em cada PR, já que isso hoje depende de execução manual por
Claude ou por um humano.

### HDR-008 — Escolha de framework de testes formal
Hoje a única verificação automatizada é via scripts Puppeteer ad-hoc. Decidir se vale adotar um
framework formal (Vitest, Playwright Test) ou manter o padrão de scripts próprios já em uso.

### HDR-010 — Ratificação da expansão multi-trilha de Educação (Faculdade/Inglês/Vestibular)
**Novo, encontrado nesta sessão.** O commit `e616635` ("expand study mode to multi-track
learning"), presente em `fix/foundation-hardening` (PR #1) e herdado por `feature/agenda` (PR #2),
modifica 7 arquivos de `src/components/education/**` — a área explicitamente marcada como
"congelada" em `ARCHITECTURE.md`. Essa mudança adiciona exatamente as 3 trilhas que
`MASTER_PLAN.md` já esperava para a Fase 4 (Faculdade, Inglês, Vestibular/ENEM), então não parece
arbitrária — mas **nenhuma decisão foi registrada aqui antes de o código existir**, violando o
processo (`AGENT_RULES.md` → Código: "nenhum arquivo [congelado] é tocado sem uma decisão humana
explícita e registrada em `DECISIONS.md`"). Verificado por leitura de código e pelo `qa-browser.js`
real desta sessão que a mudança parece funcional e não quebra o fluxo de Study Mode existente
(alternância de trilha funciona nas 3 opções, Focus Mode preservado, exercícios/tutor/notas
intactos). **Decisão pendente**: o humano ratifica essa expansão como o conteúdo real da Fase 4
(Education Stabilization), ou pede que seja revertida/refeita dentro do processo formal (com
ACTIVE_TASK/HANDOFF próprios)?

### HDR-011 — Escolha de provedor de Auth
`MASTER_PLAN.md` agora tem uma Fase 2 (Auth/Identity) explícita, pré-requisito de qualquer
Persistence Slice (Supabase RLS/user ownership). Não há nenhum provedor de autenticação configurado
no repositório hoje. O ambiente de execução já tem um MCP do Supabase conectado (o que sugere
Supabase Auth como candidato natural, já que ele resolveria Auth+Postgres+RLS de forma unificada),
mas isso não deve ser assumido como decidido — precisa de confirmação humana explícita antes de
qualquer tarefa de Auth ser promovida a `READY`. "Usar o que já existir no projeto" (instrução do
usuário) hoje resulta em: nada existe ainda: `package.json` não tem nenhuma dependência de auth.

### HDR-009 — Investimento em acesso persistente e autenticado ao Antigravity CLI
Existe um caminho de instalação legítimo e verificado para o Antigravity CLI real
(`https://antigravity.google/cli/install.sh` → binário `agy`), documentado em `BLOCKERS.md` →
BLOCK-001. Ele não foi executado nesta sessão porque (a) o próprio ambiente de execução recusa
rodar código externo sem uma regra de permissão Bash explícita do usuário, e (b) o modo headless
do `agy` exige uma autenticação interativa prévia que não é possível numa sessão não interativa, e
que talvez não sobreviva a um container efêmero mesmo se feita uma vez.

Decisão necessária: vale a pena o humano (1) conceder a permissão Bash necessária, (2) rodar a
instalação e o login interativo uma vez em um ambiente persistente (não este container efêmero), e
(3) manter esse ambiente disponível para que `scripts/agent-orchestrator.cjs` o invoque em modo
headless nas próximas sessões? Até essa decisão, o executor de fallback (Claude direto, ver
`AGENT_RULES.md` → "Executor e Fallback") é o caminho operacional real do roadmap.
