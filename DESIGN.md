# Medusa — Design Contract

Este é o contrato visual e de motion vigente do produto. Ele é a fonte de verdade — qualquer
regra visual escrita em outro lugar (incluindo qualquer export de ferramenta externa como
Stitch) que contradiga este documento está desatualizada e deve ser ignorada.

**Nota de proveniência:** este repositório não tinha um `DESIGN.md` até esta rodada. Uma paleta
obsoleta (`primary #A8E6CE`, "Serene Operational Clarity", recomendação de evitar cards
aninhados) existe apenas dentro de documentos de planejamento de um pipeline de agente paralelo
(`.ai/CURRENT_STATE.md`, `.ai/TASK_QUEUE.md`, `.ai/BLOCKERS.md`, `.ai/MASTER_PLAN.md`,
`.ai/EVIDENCE.md`, herdados de um merge de branch em uma rodada anterior). **Nenhum desses
arquivos é lido pelo build ou pelo código-fonte** — não há import, não há consumo em
`tailwind.config.ts` ou em `globals.css`. Este `DESIGN.md` é o primeiro contrato visual que a
implementação real (`src/app/globals.css` + `tailwind.config.ts`) de fato segue.

---

## 1. Paleta Oficial

| Token CSS | Hex | Papel |
|---|---|---|
| `--color-primary` | `#71DBD2` | Primária / Ação / Foco |
| `--color-secondary` | `#EEFFDB` | Background / Base |
| `--color-surface` | `#FAFDF5` | Soft Surface / Card |
| `--color-support` | `#ADE4B5` | Progresso / Domínio (Mastery) |
| `--color-tertiary` | `#D0EAA3` | Marco / Meta atingida |
| `--color-accent` | `#FFF18C` | Revisão / Próxima Ação / atenção leve |
| `--color-alert` | `#C45B5B` | Alerta / Urgência real (dessaturado, nunca vermelho puro) |

Todos os tokens têm variante `-rgb` (ex.: `--color-primary-rgb`) para uso com opacidade via
Tailwind (`bg-medusa-primary/15` etc.) e existem nos 3 temas (`:root` claro, `.sepia`, `.dark`).

**Extensão — Identidade de disciplina no Cronograma (Round 5 §16):** 7 tokens adicionais
(`--color-subject-blue/violet/amber/moss/rose/cyan/clay`) existem SÓ para diferenciar disciplinas
no Cronograma do ENEM (chip de filtro, ponto de legenda, borda esquerda de um bloco — nunca o
fundo inteiro de um bloco). Decisão explícita do Abimael: ampliar a paleta em vez de reaproveitar
um dos 7 tokens originais, porque cada um deles já tem um papel fixo na Gramática de Cor abaixo —
usar `accent` (amarelo, "revisão") como "a cor da Física", por exemplo, quebraria esse significado
em todo o resto do app. Ver `src/components/education/disciplineColor.ts`. Essa extensão não muda
a gramática dos 7 tokens originais nem é usada fora do Cronograma.

### Regras inegociáveis

- **Nunca** `#FFFFFF` como superfície dominante. `--color-surface`/`--color-surface-elevated`
  usam `#FAFDF5` (claro) — um off-white quente, não um branco clínico.
- Nenhuma cor é decorativa. Cada uso precisa mapear para uma função da tabela abaixo.
- Não pintar a tela inteira com uma cor só, e não dar uma cor diferente para cada elemento sem
  critério — a sofisticação vem da **distribuição hierárquica**, não da quantidade de cores.

## 2. Gramática de Cor (o que cada cor comunica)

| Cor | Usar para | Não usar para |
|---|---|---|
| `#71DBD2` (primary) | CTA principal, estado ativo/selecionado, foco do Study Mode, indicador "ao vivo" (`living-pulse`) | Texto de corpo, fundo de página inteira |
| `#ADE4B5` (support) | Progresso, domínio/mastery, conteúdo concluído, barras de evolução | Alertas, ações destrutivas |
| `#D0EAA3` (tertiary) | Marcos atingidos, metas concluídas, destaques secundários | Estado padrão/neutro |
| `#FFF18C` (accent) | Revisão pendente, "próxima ação" que pede retorno do usuário, atenção leve (ex.: bloco atrasado no Cronograma) | Erro real, ação primária |
| `#C45B5B` (alert) | Urgência real e semanticamente correta: prazo crítico (<48h quando essa regra existir para a trilha), erro de sessão, aviso classificado como "urgente" | Qualquer estado que não seja genuinamente urgente — vermelho decorativo é proibido |

Regra de ouro: se ao remover a cor de um elemento a informação não muda, a cor está sendo usada
como pintura, não como gramática — remova-a ou substitua por hierarquia tipográfica/espacial.

## 3. Cardificação — Útil, não Excessiva

4 níveis, sempre nessa ordem de contraste/peso decrescente:

1. **Seção** — agrupamento com rótulo mono uppercase + divisor (`ContextPanelSection`,
   cabeçalhos `text-[10px] font-mono uppercase tracking-widest text-text-muted`). Sem superfície
   própria.
2. **Card principal** — `bg-surface rounded-2xl border border-border/70 shadow-calm`. É o nível
   que carrega a "Próxima Ação" e o conteúdo protagonista de cada painel. Só deve haver **um**
   card de Nível 2 dominante por região visível — se dois competem pelo mesmo peso, um deles
   precisa descer de nível.
3. **Item/linha** — `bg-surface/70` ou `bg-surface-secondary/60`, `rounded-xl`, borda mais fraca
   (`border-border/50-60`). Usado para listas (módulos, materiais, avisos).
4. **Ação/indicador/estado** — badges, pills, ícones de status. Nunca tem superfície própria além
   de um `rounded-full` pequeno com a cor semântica em baixa opacidade (`bg-medusa-support/15`).

**Proibido:** card Nível 2 dentro de card Nível 2 (ex.: um `bg-surface rounded-2xl border` inteiro
dentro de outro `bg-surface rounded-2xl border`). Quando o conteúdo já está dentro de um Nível 2,
o próximo agrupamento interno é Nível 3 (superfície mais fraca) ou apenas um divisor.

## 4. Ícones — Material Symbols Outlined

**Bug corrigido nesta rodada:** a folha de estilo do Google Fonts era carregada em
`layout.tsx`, mas nunca existiu uma regra CSS ligando a classe `.material-symbols-outlined` à
`font-family` do ícone. Resultado: todo ícone da aplicação renderizava como o nome literal do
glifo (`check`, `campaign`, `expand_more`, ...) em vez do símbolo — em qualquer ambiente,
independente de rede. A regra agora existe em `globals.css`. Qualquer novo ícone só precisa usar
a classe `material-symbols-outlined` normalmente.

## 5. Motion

### 5.0 Taxonomia (Round 5 §1-2)

Motion no Medusa nunca é "mais animação por animação" — cada categoria abaixo existe porque
comunica uma coisa diferente ao usuário. Esta tabela é uma auditoria do que **já existe** no
código (`src/app/globals.css`), não um catálogo aspiracional — toda classe listada está em uso
real em pelo menos um componente.

| Categoria | O que comunica | Gatilho típico | Classes/padrões reais |
|---|---|---|---|
| **MICROMOTION** | "o elemento notou sua presença" — feedback local, sem mudar nada de estrutura | hover, foco, clique num controle pequeno | `.btn-interactive` (todo botão do app); `hover:-translate-y-0.5` nos cards "Próxima Ação" dos Context Panels (`@media (hover: hover)`, nunca gruda em toque); `living-pulse` (ponto pulsante "ao vivo/sincronizado") |
| **TRANSITION** | "o estado mudou, mas você continua no mesmo lugar" — troca de conteúdo dentro do mesmo container | trocar de trilha, trocar de aba/modo de estudo, avançar de etapa da sessão | `track-exit-left/right` + `track-enter-from-right/left` (carrossel entre ENEM/Faculdade/Inglês, §5.1); `study-stage-enter`, `study-summary-enter`, `study-exercise-slide`, `study-recede` (avançar de etapa dentro do Study Mode); `summary-item-rise` (item novo aparecendo numa lista); `transition-[flex-basis,opacity,max-height]` no palco/painel do Study Mode (trocar entre Modo Aula/Aula+Resumo/Resumo/Tutor ao Vivo) |
| **CONTEXTUAL MOTION** | "uma camada nova se abriu por cima/ao lado do que já existia" — drawer, modal, painel | abrir Tutor, Cronograma, confirmar interrupção, abrir o Context Panel no mobile | `modal-backdrop-enter` + `modal-pop-enter` (modais centrados: Interromper Aula, Revisão de Aula); `drawer-slide-in` + backdrop (`TutorDrawer` em overlay — corrigido nesta rodada, ver Histórico); `study-summary-enter` reaproveitada para o Tutor tomando 100% do painel lateral de Inglês; `panel-transition` (Context Panel desktop recolhe/expande, e bottom sheet mobile) |
| **SYSTEM MOTION** | "o sistema está processando/quer sua atenção" — não foi um clique do usuário que disparou | geração de conteúdo, erro, sucesso, voz ativa | `island-processing-active`, `island-attention-active`, `island-error-shake`, `island-success-settle`, `island-voice-active` (todos no Dynamic Island) |

Regra que atravessa as 4 categorias: **nunca só `opacity`** quando existe uma direção espacial
real (algo entra de um lado, sai para o outro, cresce a partir de onde foi acionado) — combinar
com `translateX`/`translateY`/`scale` conforme o caso. `prefers-reduced-motion: reduce` desliga
`animation`/`transform` nas 4 categorias por igual (um único bloco `@media` em `globals.css`
cobre todas as classes acima) e não precisa de tratamento especial por categoria.

### 5.1 Cross-Track (Educação)

As 3 trilhas têm ordem espacial fixa: **ENEM (0) → Faculdade (1) → Inglês (2)**.

- Navegar para uma trilha de índice **maior**: conteúdo atual sai pela **esquerda**, novo
  conteúdo entra pela **direita**.
- Navegar para uma trilha de índice **menor**: movimento espelhado (sai pela direita, entra pela
  esquerda).
- Duração: **320ms**. Easing: `cubic-bezier(0.32, 0.72, 0, 1)`.
- Propriedades: `translateX` + `opacity` + leve `scale` (0.98 → 1). Nunca só `opacity`.
- Zero flash: os dois estados (saindo/entrando) nunca coexistem como "página em branco" — a
  transição é sempre uma interpolação contínua, nunca um unmount seguido de mount com gap.
- `prefers-reduced-motion: reduce`: cai para crossfade puro (`opacity` apenas, ~140ms), sem
  `translateX`/`scale` — mesma regra já usada em todo o resto do motion system (ver
  `@media (prefers-reduced-motion: reduce)` em `globals.css`).

### 5.2 Micro-motion

| Interação | Duração |
|---|---|
| Troca de disciplina (Faculdade) | 200–250ms (`study-summary-enter`, já existente — reaproveitado) |
| Abrir Cronograma / Professor / Revisão no painel | 200–250ms |
| Interromper aula (confirmação) | transição discreta, sem esconder em hover |

Regra: contexto mudou → interface responde → usuário entende o que aconteceu. Nunca um salto de
layout sem transição intermediária.

### 5.3 Mobile/Tablet

O Context Panel de desktop **não é comprimido** para mobile/tablet — fora do breakpoint desktop
(`breakpoint !== 'desktop'`), `ContextPanel.tsx` renderiza uma experiência própria: um bottom
sheet (folha inferior) com handle, abertura via botão flutuante (`#btn-open-context-sheet`),
fechamento via backdrop/botão/X, `max-h-[80vh]` com rolagem interna, e o MESMO conteúdo do
painel de desktop (`ContextPanelBody`, componente compartilhado — as duas superfícies nunca
divergem em conteúdo, só na moldura). Usa a mesma transição de painel (`panel-transition`,
`translate-y-full ↔ translate-y-0`) e o mesmo padrão de backdrop já usado pelo drawer de
navegação (`Sidebar.tsx`), sem introduzir um terceiro sistema de overlay. Gesto de arrastar para
fechar (swipe-to-dismiss) não foi implementado — fechamento é só por toque (botão/backdrop).

## 6. Glass e Microinteração de Hover (Refinamento Visual)

### 6.1 Glass

Transparência controlada, não um efeito de vidro genérico. Aplicado seletivamente aos cards
prioritários (hero "Próxima Ação" de cada trilha, "Próxima Ação" do Context Panel) — nunca em
toda a interface:

- `bg-surface/80 backdrop-blur-xl` (ou `/10` sobre a cor de identidade da trilha, ver §6.2) —
  transparência suficiente para dar profundidade, nunca a ponto de comprometer contraste de texto.
- `shadow-glass`/`shadow-glass-dark` (tokens em `tailwind.config.ts`, mesmo padrão de
  `island`/`island-dark` já existente) — sombra muito sutil em repouso.
- `shadow-glass-hover`/`shadow-glass-hover-dark` no hover — sombra mais presente, nunca abrupta.

### 6.2 Cor de Identidade por Trilha

Cada trilha da Educação tem uma cor de identidade contextual, reaproveitando os tokens já
existentes da paleta (nenhuma cor nova) e centralizada em `trackAccent.ts`:

| Trilha | Token | Papel anterior do token |
|---|---|---|
| Faculdade | `primary` (`#71DBD2`) | Já era a cor de ação/foco do produto — reforça, não introduz |
| ENEM | `accent` (`#FFF18C`) | Já usado para revisão/atenção leve |
| Inglês | `tertiary` (`#D0EAA3`) | Já era o `accentColor` da fixture da trilha, nunca lido por nenhum componente até esta rodada |

Aparece em: indicador ativo do seletor de trilha, ícone de contexto do painel, badge "Sessão
Pronta"/pill de status, borda do card de Próxima Ação, CTA principal do hero. Nunca pinta a
interface inteira — a superfície base continua sendo o off-white neutro (`#FAFDF5`).

### 6.3 Hover — "o produto respondeu à minha presença"

Recipe único, reutilizado (não uma animação por componente): `transition-all duration-220
hover:-translate-y-0.5 hover:shadow-glass hover:{cor-de-borda-da-trilha}`. Aplicado só aos cards
que já carregam a Próxima Ação (nunca indiscriminadamente). Automaticamente respeita
`prefers-reduced-motion` porque o bloco global de acessibilidade (`globals.css`) já força
`transform: none !important` e restringe `transition` a opacity/cor/borda em qualquer elemento —
o hover continua dando uma resposta visual (sombra/borda), só sem o deslocamento.

---

## Histórico

- Rodada 4: criação do contrato formal + correção de `--color-surface`
  (`#FFFFFF` → `#FAFDF5`) + correção da regra de ícone + adição do token `alert` (`#C45B5B`).
- Rodada de Refinamento Visual: glass seletivo + cor de identidade por trilha (§6); piso de
  altura do palco do Study Mode reduzido de 640px para caber em 1440×900/1280×800 sem rolagem
  (§7.2, ver `StudyModeView.tsx`); Cronograma do ENEM em contexto via overlay, acionável também
  de dentro do Study Mode (`CronogramaOverlay.tsx`); tiles reais no painel do ENEM; remoção de
  métricas decorativas sem valor de decisão ("Tempo Nominal do Ciclo", "Matriz de Referência ·
  Habilidades 01 a 04").
- **Rodada 5** (em andamento): §5.0 (esta seção) formaliza a taxonomia de motion pela primeira
  vez — MICROMOTION/TRANSITION/CONTEXTUAL MOTION/SYSTEM MOTION, mapeando classes já existentes,
  nenhuma nova categoria inventada sem uso real. Identidade de cor por trilha estendida para o
  CORPO principal (antes só aparecia no painel lateral) em `EnglishHub`/`EnemHub`/
  `TrackModuleList`/`CompletedActivityList`. Faculdade ganhou fluxo real de "Adicionar
  disciplina", CTA real de "Próxima Ação" no painel (antes decorativo) e paridade de Modos de
  Estudo com Inglês (Aula/Aula+Resumo/Resumo, 60/40 nunca 50/50). Tutor de Inglês no painel
  lateral agora ocupa 100% do painel ao abrir (antes coexistia num acordeão de altura fixa) com
  fechamento por X/Esc/clique-fora. Modo "Aula" de Inglês ganhou mais altura de palco (o piso
  fixo não reclamava o espaço liberado pelo recolhimento da faixa/painel lateral); "Dividido"
  renomeado para "Tutor ao Vivo" com painel mais largo, diferenciando-o de verdade de "Aula +
  Resumo" (eram quase idênticos em proporção). **Bug real corrigido**: o `TutorDrawer` em
  overlay referenciava duas classes de animação inexistentes (`drawer-slide-in
  animate-slideLeft`) — o painel abria sem transição nenhuma, sem backdrop, sem Esc, sem
  clique-fora; agora usa o mesmo padrão de overlay do resto do app. Tema claro e sépia
  recalibrados (claro menos "estourado"; sépia com identidade real de madeira clara/pergaminho —
  o problema de verdade era falta de diferenciação do claro, não excesso de contraste).
