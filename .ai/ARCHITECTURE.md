# ARCHITECTURE.md — Arquitetura Técnica do Medusa

Documento vivo. Reflete o que existe **de fato** no repositório na branch `main` (commit
`5d4c5c0` no momento em que este arquivo foi escrito), não a aspiração. Alterações estruturais
aqui exigem atualização deste arquivo no mesmo PR.

## Stack

- Next.js 14.2.24 (App Router), React 18.3. **Nota de segurança** (achado real via `npm install`
  nesta sessão): esta versão do Next.js tem uma vulnerabilidade de segurança conhecida — ver
  `BLOCKERS.md` → BLOCK-006. Não é um bloqueio de roadmap, é dívida técnica registrada.
- Tailwind CSS 3.4 + `tailwind.config.ts`.
- TypeScript 5.6, `tsc --noEmit` como typecheck.
- Sem framework de testes formal instalado (nenhum Jest/Vitest/Playwright em `devDependencies`).
- QA de browser via scripts próprios em `scripts/*.js` usando `puppeteer-core`.
- Nenhum workflow de GitHub Actions configurado (`0` workflows encontrados via API).
- Nenhum `vercel.json` no repositório, mas a integração GitHub↔Vercel está de fato ativa: um push
  a qualquer branch (confirmado com `chore/agent-os-bootstrap`) dispara build de preview real que
  chega a `Ready` (ver `EVIDENCE.md` → E-009). **CONFIGURADO E FUNCIONAL** (corrigido nesta
  sessão — a suposição inicial de "não verificável" estava desatualizada).
- Nenhuma dependência de Supabase encontrada em `package.json`. **NÃO IMPLEMENTADO.**

## Shell

- `src/components/shell/ShellLayout.tsx` — composição raiz: Sidebar + Main + Context Panel +
  Command Modal + Mobile Island wrapper.
- `src/context/ShellContext.tsx` — único provider de estado do Shell: `theme`, `mode`,
  `breakpoint`, `isContextOpen`, `isDrawerOpen`, `isCommandOpen`, `islandState`, `activeRoute`,
  e o objeto `geometry` (ver ShellGeometry abaixo).
- Roteamento entre "módulos" (Educação, futuramente Agenda) **não usa rotas do Next.js** — é feito
  por um switch em `src/app/page.tsx` sobre `activeRoute` vindo do `ShellContext`
  (`if (activeRoute === 'educacao') return <EducationContainer />;`). Qualquer novo domínio segue
  o mesmo padrão até que uma decisão explícita mude essa estratégia (ver `DECISIONS.md`).

## ShellGeometry

- Definido em `src/types/shell.ts`: `SHELL_DIMENSIONS` (constantes nomeadas de largura) e
  `calculateShellGeometry(mode, breakpoint, isContextOpen)`, que é a **única fonte de verdade**
  para larguras/paddings do Shell.
- `Header`, `ShellLayout`, `Sidebar` e `ContextPanel` consomem `geometry` do `ShellContext` — não
  recalculam largura de forma independente. Esta unificação foi o objeto do PR #1
  ("Foundation Hardening"), ainda não mesclado a `main` no momento deste documento.
- **Regra de arquitetura**: nenhum componente novo deve reintroduzir literais de largura
  (`260px`, `320px`, `240px`, `68px` etc.) fora de `SHELL_DIMENSIONS`.

## Context Panel

- `src/components/shell/ContextPanel.tsx`. Painel lateral regional, oculto fora de desktop e no
  Modo Foco. Historicamente teve um problema de "parecer permanentemente fixo" por duplicar a
  geometria em 3 arquivos — resolvido no PR #1 via `ShellGeometry` (ver `DECISIONS.md`).
- **Regra de produto**: o Context Panel é sempre um resumo. Nunca deve virar uma segunda instância
  completa do módulo ativo.

## Dynamic Island / Mobile Island

- `src/components/shell/DynamicIsland.tsx` (desktop, dentro do Header) e
  `src/components/shell/MobileIsland.tsx` (mobile, dentro do `ShellLayout`, dois componentes
  distintos que compartilham o mesmo `islandState` via `ShellContext` — unificados no PR de
  hardening do Mobile Island, já em `main`).
- Catálogo fechado de 10 estados em `src/fixtures/islandFixtures.ts`: `idle`, `context`, `active`,
  `processing`, `success`, `attention`, `error`, `summary`, `focus`, `collapsed`.
- Timers de simulação de estado (fake success/processing) foram removidos da produção e confinados
  a `/dev/motion-lab` (`src/app/dev/motion-lab/page.tsx`).

## Design tokens

- Definidos em `src/app/globals.css` como CSS custom properties por tema
  (`:root`, `html.sepia`, `html.dark`), com pares `--color-x` e `--color-x-rgb` para permitir
  opacidade via `rgb(var(--color-x-rgb) / <alpha-value>)` no `tailwind.config.ts`.
- Paleta oficial de acento: `#71DBD2`, `#EEFFDB`, `#ADE4B5`, `#D0EAA3`, `#FFF18C` — usada como
  `medusa.primary/secondary/support/tertiary/accent`, nunca como cor de fundo dominante de
  superfície.
- Bases de tema: Claro `#ECF1ED`→`#F3F7F4`→`#FAFCFA` (3 degraus reais, corrigido no PR #1), Sépia
  `#F8F7F0`, Escuro `#111614`. Nenhum tema usa `#FFFFFF`/`#000000` como superfície dominante.

## Motion

- Tokens de duração/easing como CSS custom properties (`--duration-micro/island/layout/theme/
  mobile`, `--ease-snappy/smooth`) em `globals.css`.
- Bloco `@media (prefers-reduced-motion: reduce)` existente e testado no Shell — desliga
  transform/animation e reduz a crossfade de opacidade/cor em ~140ms.
- **Nota**: o protótipo standalone da Agenda (ver `EVIDENCE.md`) NÃO tinha essa regra — qualquer
  implementação real da Agenda deve herdar o bloco já existente no Shell, não recriar um novo.

## State management

- Sem biblioteca externa de estado. `ShellContext` (React Context + `useState`) para estado do
  Shell; cada módulo/domínio mantém seu próprio estado local em `useState` dentro do seu
  Container (padrão já usado por `EducationContainer.tsx`).
- Toda persistência hoje é `localStorage` (tema, `isContextOpen`) ou memória de sessão
  (`useState`, perdido no F5). **Nenhuma persistência real (banco de dados) existe no repositório
  nesta branch.**

## Testes

- **NÃO IMPLEMENTADO** como suíte formal (sem Jest/Vitest/Testing Library).
- Existe verificação de tipos (`npx tsc --noEmit`) e build (`npm run build`) — necessários, não
  suficientes para QA (ver `AGENT_RULES.md`).

## Browser QA

- `scripts/qa-browser.js` — script Puppeteer portável (aceita `MEDUSA_BROWSER_PATH` e
  `MEDUSA_QA_ARTIFACTS_DIR` via variável de ambiente, corrigido em rodada de auditoria anterior),
  cobre troca de tema/modo, estados do Island, mobile, reduced motion e asserções de tokens.
- `scripts/test-click.js`, `scripts/debug-drawer.js`, `scripts/check-404.js`,
  `scripts/record-motion-transitions.js` — utilitários pontuais de depuração.
- `scripts/test-foundation-hardening.js` existe apenas em `fix/foundation-hardening` (PR #1),
  ainda não em `main`.

## Supabase / Vercel

- Supabase: nenhuma dependência, nenhum arquivo de configuração (`supabase/`, client SDK) presente
  no repositório. Status: **NÃO IMPLEMENTADO**.
- Vercel: integração GitHub ativa e funcional — cada push builda um preview real (confirmado nesta
  sessão, ver `EVIDENCE.md` → E-009). Não há `vercel.json` no repo (config vive no dashboard), mas
  isso não impede o pipeline de build/preview. Status: **CONFIGURADO E FUNCIONAL** (apenas o
  pipeline de build/preview — nenhuma evidência de Supabase ou persistência real em produção).

## Nota de Governança (D-013 — Modelo Fase A / Fase B)

Dynamic Island (`DynamicIsland.tsx`/`MobileIsland.tsx`) e Context Panel (`ContextPanel.tsx`) são
elementos de contrato de experiência, não decoração — fazem parte do que `AGENT_RULES.md` → seção 0
e `QA_GATE.md` → seção 11 exigem para uma aba ser `EXPERIENCE COMPLETE` (reação a navegação/estado/
loading, não apenas estado idle). Ver `DECISIONS.md` → D-013 para o modelo completo. Esta nota é só
um ponteiro — a especificação normativa vive em `AGENT_RULES.md`/`QA_GATE.md`, não duplicada aqui.

## Áreas Congeladas

Nenhuma alteração nos arquivos abaixo sem decisão humana explícita registrada em `DECISIONS.md`:

- `src/components/education/**` — Educação / Study Mode, congelado e validado por auditoria
  própria.
- O modelo `ShellGeometry` / `SHELL_DIMENSIONS` em `src/types/shell.ts` — mudar a forma desses
  dados quebra Header, Sidebar, ContextPanel e ShellLayout simultaneamente.
- O catálogo fechado de 10 estados do Island em `src/fixtures/islandFixtures.ts` — é um contrato,
  não uma lista aberta.

**Esclarecimento (adicionado após a auditoria real de PR #1/#2 — ver `EVIDENCE.md` → E-013)**:
"congelado" se refere à **forma dos dados**/comportamento estabelecido de `src/components/
education/**` e ao **shape** de `ShellGeometry`/`SHELL_DIMENSIONS` — não significa que nenhum
arquivo de `src/components/shell/**` pode receber uma nova seção específica de domínio (ex.:
`ContextPanel.tsx` ganhando uma síntese temporal quando `activeRoute === 'agenda'` é esperado e
correto, não uma violação). O que exige decisão prévia é: (a) qualquer mudança funcional dentro de
`education/**`, e (b) qualquer mudança na forma/contrato de dados de `ShellGeometry`/
`SHELL_DIMENSIONS`/`islandFixtures.ts`. Uma violação real encontrada nesta sessão: o commit
`e616635` mudou o comportamento de `education/**` sem essa decisão prévia — ver `DECISIONS.md` →
HDR-010.

**Nova peça de arquitetura observada (Agenda, PR #2)**: `src/context/AgendaContext.tsx` +
`src/types/agenda.ts` — um padrão de Context Provider dedicado por domínio, diferente do padrão
puramente local (`useState` dentro do Container) usado por Educação. Ambos os padrões são válidos;
domínios futuros podem escolher o que fizer mais sentido para seu próprio estado, não precisam
copiar Educação literalmente.
