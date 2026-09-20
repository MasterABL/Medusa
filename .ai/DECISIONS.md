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

---

## HUMAN DECISION REQUIRED

### HDR-001 — Ordem de merge: PR #1 (Foundation Hardening) antes da Agenda?
O PR #1 corrige exatamente a geometria do Context Panel e o tema Claro que a Agenda vai usar.
Implementar a Agenda antes de mesclar o PR #1 arrisca construir sobre a versão com bug já
identificado (Context Panel com 3 fontes de verdade duplicadas). Recomendação (não é decisão):
mesclar PR #1 primeiro. **Aguardando confirmação humana.**

### HDR-002 — Reprodução independente das evidências do PR #1
O PR #1 alega "42 testes aprovados" e "teste de hardening 100%". Antes de tratar isso como
`PROVADO`, alguém precisa rodar `scripts/qa-browser.js` e `scripts/test-foundation-hardening.js` de
fato nesta branch e anexar a saída real a `EVIDENCE.md`. **Aguardando execução.**

### HDR-003 — List View da Agenda: agrupamento por dia ou por Agora/Próximo/Depois/Mais tarde?
A auditoria do protótipo Figma Make encontrou que a implementação de referência agrupa por dia
civil (Hoje/Amanhã/dia da semana), enquanto o contrato de produto pede explicitamente os 4 grupos
semânticos "Agora/Próximo/Depois/Mais tarde". **Precisa de decisão explícita** antes de
`TASK-AGENDA-001` ser implementada (documentado dentro da própria tarefa como ponto a decidir, não
a assumir).

### HDR-004 — Persistência real: quando e com o quê?
Não há Supabase nem nenhum backend configurado no repositório. Antes de qualquer domínio (Agenda,
Corpo, Finanças...) prometer "salvar" algo além de `localStorage`/sessão, é preciso decidir: qual
backend, quando integrar, e se isso é um pré-requisito de algum domínio específico ou um projeto
transversal à parte. Ver `MASTER_PLAN.md` → Persistência.

### HDR-005 — Roadmap de domínios ainda sem especificação
Corpo, Finanças, Progresso, Guardian e Buscar não têm nenhuma especificação de produto no
repositório além dos nomes e responsabilidades gerais em `PRODUCT_CONTRACT.md`. Cada um precisa de
uma rodada de definição de contrato antes de virar tarefa executável. Ver `MASTER_PLAN.md`.

### HDR-006 — Hoje: contrato de consumo de dados da Agenda
`PRODUCT_CONTRACT.md` já define que Hoje consome fatos temporais da Agenda, mas o formato exato
desse contrato (que dados, que shape, push ou pull) ainda não foi especificado. Precisa de decisão
antes de Hoje virar tarefa executável.

### HDR-007 — CI de testes (typecheck/build/QA automatizado em PR)
Não há GitHub Actions no repositório. **Atualizado nesta sessão:** o deploy/preview em si já
funciona via integração Vercel↔GitHub (confirmado em `EVIDENCE.md` → E-009) — o que falta decidir
é apenas se/quando configurar GitHub Actions para automatizar os gates de `QA_GATE.md`
(typecheck, build, QA de browser) em cada PR, já que isso hoje depende de execução manual por
Claude ou por um humano.

### HDR-008 — Escolha de framework de testes formal
Hoje a única verificação automatizada é via scripts Puppeteer ad-hoc. Decidir se vale adotar um
framework formal (Vitest, Playwright Test) ou manter o padrão de scripts próprios já em uso.

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
