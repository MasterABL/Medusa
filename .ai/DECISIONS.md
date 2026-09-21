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

### D-009 — List View da Agenda: agrupamento Agora/Próximo/Depois/Mais tarde (ex-HDR-003)
```
HUMAN GATE ANALYSIS
QUESTÃO: Agrupar por Agora/Próximo/Depois/Mais tarde ou por dia civil?
EVIDÊNCIA NO CONTRATO: EVIDENCE.md → E-006 já registrava que o contrato (derivado da auditoria do
  protótipo Figma Make) exige explicitamente os 4 grupos semânticos — o agrupamento por dia era o
  bug do protótipo, não uma alternativa válida de produto.
EVIDÊNCIA NO CÓDIGO: PR #2 implementa exatamente Agora/Próximo/Depois/Mais tarde (EVIDENCE.md → E-018).
PRECEDENTE: única implementação existente; testada e aprovada interativamente (E-017).
PODE SER INFERIDO?: SIM.
```
**Decidido**: o agrupamento semântico é o comportamento correto e definitivo. Não é mais uma
pendência — era a confirmação de um requisito já documentado (E-006), não uma escolha em aberto.

### D-010 — Educação multi-trilha (Faculdade/Inglês/Vestibular) ratificada (ex-HDR-010)
```
HUMAN GATE ANALYSIS
QUESTÃO: Ratificar a expansão multi-trilha de Educação como conteúdo real da Fase 4?
EVIDÊNCIA NO CONTRATO: a própria instrução original do usuário (mensagem do Master Plan, seção 9
  "EDUCAÇÃO") já especifica por escrito "Trilhas: Faculdade; Inglês; Vestibular/ENEM."
EVIDÊNCIA NO CÓDIGO: commit e616635 implementa exatamente essas 3 trilhas, testado (EVIDENCE.md →
  E-016), 0 falhas funcionais, Focus Mode/exercícios/tutor/notas preservados.
PRECEDENTE: nenhuma trilha alternativa cogitada em qualquer artefato.
PODE SER INFERIDO?: SIM — o humano já pediu essas trilhas por escrito antes do código existir; o
  código cumpriu o que já estava pedido.
```
**Decidido**: conteúdo ratificado. **Nota de processo preservada** (não é mais um bloqueio, é um
aprendizado registrado): a decisão deveria ter sido registrada aqui **antes** do código tocar uma
área congelada, não depois — `AGENT_RULES.md` → Código continua exigindo isso para a próxima vez.

### D-011 — GitHub Actions para automatizar checks já mandatados (ex-HDR-007, escopo restrito)
```
HUMAN GATE ANALYSIS
QUESTÃO: Configurar CI para automatizar os gates de QA_GATE.md por PR?
EVIDÊNCIA NA ARQUITETURA: QA_GATE.md MANDATA apenas Test Gate (typecheck) e Build Gate (build)
  manualmente em toda tarefa — automatizar é consistência de processo, não mudança de política.
PRECEDENTE: GitHub Actions é a escolha óbvia (o repo já está no GitHub); nenhuma alternativa paga
  ou de risco de segurança está envolvida se o workflow só rodar os comandos já obrigatórios.
PODE SER INFERIDO?: SIM, com escopo estritamente limitado a typecheck/build (os únicos comandos
  que QA_GATE.md de fato mandata) — nada de deploy, segredos, ou permissões novas.
```
**Decidido e executado nesta sessão**: `.github/workflows/ci.yml` criado com typecheck + build.
**Achado real durante a execução**: `npm run lint` não está de fato configurado neste repo —
`next lint` pede um setup interativo (nunca rodado), o que travaria/falharia em CI. Lint foi
**removido do escopo do workflow** (não estava em `QA_GATE.md` para começo de conversa — eu havia
incluído por engano no rascunho inicial da tarefa). Configurar ESLint de verdade fica registrado
como item de backlog de baixa prioridade (`BLOCKERS.md`), não bloqueia nada.

### D-012 — Agenda separada da fila de merge de PR #1/#2: cherry-pick sobre a correção de geometria, não espera por HDR-001

```
HUMAN GATE ANALYSIS
QUESTÃO: A Agenda pode ser levada a PROVADO/IMPLEMENTED sem esperar a aprovação de merge de PR #2?
EVIDÊNCIA NO CÓDIGO: `758cd8d` ("implement complete Medusa Temporal OS...") é um commit
  autocontido de 24 arquivos que não toca Educação e só depende de `ContextPanel.tsx` já usar
  `geometry` (a mesma fonte única de verdade que `fix/context-panel-geometry`, PR #5, já trouxe
  para `main` de forma independente).
PRECEDENTE: mesma lógica de `D-008` (dependência de topologia Git, não escolha) — só que em vez de
  esperar `fix/foundation-hardening` (PR #1, que também bundla a expansão de Educação, ainda sob
  ratificação de merge), a Agenda foi replantada sobre `fix/context-panel-geometry` (PR #5),
  que já contém a mesma classe de correção sem bundlar Educação.
PODE SER INFERIDO?: SIM — a instrução explícita desta sessão foi "o Capability Audit não altera o
  roadmap funcional" e "BLOCKs de infraestrutura não devem bloquear a Agenda". HDR-001 é sobre
  aprovação humana de merge, não sobre se o código pode existir e ser provado numa branch própria.
```
**Decidido e executado nesta sessão**: `758cd8d` foi cherry-picked de `origin/feature/agenda` para
uma nova branch `feat/agenda`, criada a partir de `fix/context-panel-geometry` (não de `main`
diretamente — dependência de topologia Git real, mesma natureza de `D-008`). Único conflito real
foi em `ContextPanel.tsx` (reconciliado: geometria de `fix/context-panel-geometry` + branch de
conteúdo `activeRoute === 'agenda'` de `758cd8d`). PR #6 aberta. **PR #6 depende de PR #5** —
mesclar PR #5 primeiro reduz o diff de PR #6 a apenas Agenda; mesclar PR #6 diretamente traz PR #5
junto (mesmo resultado final, ordem diferente). `HDR-001` agora também cobre esta relação.

### D-013 — Modelo de Desenvolvimento Medusa: FASE A (Experience) precede FASE B (Engineering), globalmente

**Decisão explícita do usuário, registrada diretamente aqui (não é uma HUMAN GATE ANALYSIS — o
humano já decidiu; isto documenta a decisão tomada).**

A partir desta sessão, o projeto opera com uma separação formal entre duas macro-fases,
ortogonais à numeração de Fases 0-14 de `MASTER_PLAN.md`:

```
FASE A — DESIGN / EXPERIENCE (estrutura, UI, UX, motion, loading, responsive, accessibility,
         microinterações, browser QA) → DESIGN SYSTEM CONSOLIDADO → BROWSER/VISUAL QA →
         HUMAN EXPERIENCE GATE
              ↓
FASE B — PRODUTO / ENGENHARIA (dados, persistência, APIs, integrações, Supabase, Google, IA,
         automações, regras de negócio) → INTEGRAÇÃO → END-TO-END QA
```

**Regra principal**: Fase B não começa, para NENHUM domínio, antes de a Fase A estar fechada para
TODAS as abas na ordem oficial `Hoje → Agenda → Educação → Corpo → Finanças → Progresso →
Guardian → Buscar` (ver `ROADMAP.md` → seção "Fase A/Fase B"). Isto é uma decisão explícita de
sequenciamento de produto, não uma dedução técnica.

**Compatibilidade com `D-006`**: `D-006` já estabelecia que um domínio pode ter Contract/
Foundation/UI/Local State prontos antes de sua vez numérica, e que Auth (Fase 2) só bloqueia o
Persistence Slice, não a UI. `D-013` **estende** esse princípio, não o contradiz: adiciona uma
restrição adicional que `D-006` não cobria — mesmo com Auth resolvido, nenhum domínio inicia seu
Persistence Slice/Integration (Fase B) enquanto a Experience (Fase A) de qualquer uma das 8 abas
na lista oficial ainda estiver aberta. Local State/fixtures continuam válidos e obrigatórios
durante a Fase A (nunca representados como dado real — `AGENT_RULES.md` → Honestidade).

**O que NÃO deve ser antecipado na Fase A** (lista fechada, expansível só por nova decisão):
Google Calendar OAuth, integrações externas reais, persistência definitiva, schemas finais de
produção, Gemini, OpenRouter, APIs reais, automações de produção, regras de negócio definitivas,
sincronizações externas, pipelines reais de dados. Modelar o ponto de integração futuro é
permitido; implementá-lo agora não é.

**Categorias de status de uma aba/domínio** (substituem "implementado"/"funciona" como critério de
fechamento — ver `ROADMAP.md` e `CURRENT_STATE.md` para a classificação atual de cada domínio):

```
BASE IMPLEMENTADA         — implementação funcional existe, serve de fundamento, não é a
                             experiência final.
EXPERIENCE EM REFINAMENTO — implementação existe e está passando por UI/UX/motion/responsive/
                             accessibility QA, mas ainda não recebeu o Human Experience Gate.
EXPERIENCE COMPLETE       — contrato de experiência fechado e provado (todos os itens da Fase A
                             + Human Experience Gate).
ENGINEERING COMPLETE      — etapa posterior: dados/integrações/lógica real implementados e
                             validados (só possível depois de EXPERIENCE COMPLETE + Fase A global
                             fechada).
```

**Aprendizado de motion generalizado como regra permanente** (originado no refinamento do Study
Mode desta sessão, `EVIDENCE.md` → E-029): quando um fluxo representa uma transformação de estado
contínua, preferir uma estrutura persistente que transforma (`unmount`/`remount` evitado) a um
swap abrupto; e motion só é considerado provado com evidência **em plena transição** (valor real
amostrado no meio da animação), nunca apenas por comparação antes/depois. Formalizado em
`QA_GATE.md` → "Experience-Complete Gate".

**Human Gate**: aprovação humana continua obrigatória para qualidade visual, experiência, decisão
de produto, aceitação de motion e fechamento de experiência — automação prova critérios técnicos,
não substitui essa decisão (`AGENT_RULES.md` → seção 11).

**Impacto imediato**: nenhuma tarefa de Fase B (Supabase, Auth real, Google, IA, automações) deve
ser promovida a `ACTIVE_TASK.md` enquanto a Fase A não estiver fechada para as 8 abas. Isto não
revoga trabalho de engenharia já existente (ex.: geometria do Shell, correções de bug) — essas
continuam válidas como infraestrutura de Fase A (estrutura/Shell fazem parte do escopo de Fase A).
Ver `TASK_QUEUE.md` para a marcação `DESIGN/EXPERIENCE` vs `ENGINEERING/INTEGRATION` em cada tarefa.

---

## HUMAN DECISION REQUIRED

### HDR-001 — Aprovação de merge de PR #1 → PR #2 (RESTRITO — só a aprovação em si, não a ordem)
```
HUMAN GATE ANALYSIS
QUESTÃO: (a) qual ordem de merge? (b) quem aprova o merge em si?
EVIDÊNCIA: D-008 (git topology) já prova que a ordem não é escolha — é mecânica.
PODE SER INFERIDO (ordem)?: SIM — resolvido, não é mais parte deste HDR.
PODE SER INFERIDO (aprovação do merge em si)?: NÃO — bate no critério explícito desta sessão
  ("exige aprovação explícita para merge/closure conforme a governança definida") e
  AGENT_RULES.md → Git proíbe Claude de mesclar em main sem essa aprovação.
```
**O que resta deste HDR, e só isso**: o humano aprova mesclar PR #1 e depois PR #2 (nessa ordem
obrigatória) em `main`, tendo em mãos os achados reais desta sessão (`EVIDENCE.md` → E-013 a E-019,
E-020)? A ordem não é mais uma pergunta — só a aprovação final é.

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

### HDR-004 — Persistência real: quando e com o quê?
Não há Supabase nem nenhum backend configurado no repositório. Antes de qualquer domínio (Agenda,
Corpo, Finanças...) prometer "salvar" algo além de `localStorage`/sessão, é preciso decidir: qual
backend, quando integrar, e se isso é um pré-requisito de algum domínio específico ou um projeto
transversal à parte. Ver `MASTER_PLAN.md` → Persistência.

### HDR-005 — Roadmap de domínios ainda sem especificação suficiente
```
HUMAN GATE ANALYSIS
QUESTÃO: Corpo/Finanças/Progresso/Guardian/Buscar podem virar tarefas executáveis agora?
EVIDÊNCIA NO CONTRATO: PRODUCT_CONTRACT.md dá apenas uma linha de responsabilidade geral por
  domínio (ex.: "Corpo: treinos e saúde... Responde 'como está meu corpo?'") — sem telas, campos,
  fluxos ou interações concretas.
PRECEDENTE: a Agenda só virou tarefa executável depois de uma auditoria completa de protótipo
  (EVIDENCE.md → E-006) que deu contrato de UI concreto — nenhum domínio destes teve equivalente.
PODE SER INFERIDO?: NÃO — escrever ACCEPTANCE CRITERIA verificáveis exigiria inventar telas,
  campos e fluxos que não estão em nenhum artefato, violando AGENT_RULES.md → Produto
  ("não inventar funcionalidade").
```
**Continua bloqueado** — mas note-se: não é "o humano precisa escolher entre opções", é "o humano
precisa fornecer especificação suficiente" (uma rodada de definição de contrato/produto, como a
que já existiu para a Agenda). Efeito prático idêntico (fica fora da fila até isso acontecer).

### HDR-006 — Hoje: contrato de consumo de dados + especificação visual própria
`PRODUCT_CONTRACT.md` já define que Hoje consome fatos temporais da Agenda, mas o formato exato
desse contrato (que dados, que shape, push ou pull) ainda não foi especificado — isso é adiável
(não bloqueia o início de "Hoje Foundation", só "Hoje Integration").
```
HUMAN GATE ANALYSIS (Hoje Foundation especificamente)
QUESTÃO: "Hoje Foundation" (estrutura visual/layout) pode virar tarefa executável agora?
EVIDÊNCIA NO CONTRATO: PRODUCT_CONTRACT.md dá uma linha ("resumo operacional... o que merece
  atenção agora") — sem seções, layout, ou wireframe.
PRECEDENTE: nenhum protótipo ou auditoria de design existe para Hoje (diferente da Agenda).
PODE SER INFERIDO?: NÃO — decompor em ACCEPTANCE CRITERIA exigiria inventar a estrutura visual
  (quais seções, que cards, que layout), o que é `AGENT_RULES.md` → Produto proíbe.
```
**Continua bloqueado**, mas pela mesma razão de HDR-005 (falta de especificação, não escolha entre
alternativas) — não pela integração de dados (essa parte, sim, pode esperar naturalmente até os
domínios existirem).

### HDR-008 — Escolha de framework de testes formal (BAIXA PRIORIDADE — não bloqueia nada hoje)
Hoje a única verificação automatizada é via scripts Puppeteer ad-hoc, e eles satisfazem
`QA_GATE.md` normalmente. Adotar um framework formal (Vitest, Playwright Test) é uma escolha
técnica sem provedor externo/custo/segurança envolvidos — poderia ser decidida autonomamente
quando alguma tarefa concreta precisar disso. **Nenhuma tarefa está bloqueada por esta pendência
hoje** — mantido apenas como nota de backlog, não como gate ativo.

### HDR-011 — Escolha de provedor de Auth
```
HUMAN GATE ANALYSIS
QUESTÃO: Qual provedor de Auth usar?
EVIDÊNCIA NO CONTRATO/ARQUITETURA/DECISÕES: nenhuma menção a provedor específico em nenhum artefato.
EVIDÊNCIA NO CÓDIGO: nenhuma dependência de auth em package.json em nenhuma branch.
PRECEDENTE: o MCP do Supabase está disponível neste ambiente de execução — isso é uma ferramenta
  acessível a mim, não uma decisão de arquitetura de produto já tomada por um humano.
PODE SER INFERIDO?: NÃO — bate exatamente nos critérios explícitos desta sessão ("exige escolher
  entre provedores, custos ou serviços externos"; "envolve segurança, autenticação, permissões ou
  política irreversível").
IMPACTO: define toda a Fase 2 e é pré-requisito de qualquer Persistence Slice futuro.
TASKS BLOQUEADAS: início real da Fase 2 (Auth) e, por consequência, todo Persistence Slice.
```
**Permanece decisão humana real.** `MASTER_PLAN.md` tem uma Fase 2 (Auth/Identity) explícita.
"Usar o que já existir no projeto" (instrução do usuário) hoje resulta em: nada existe ainda —
`package.json` não tem nenhuma dependência de auth em nenhuma branch.

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
