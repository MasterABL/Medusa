# TASK_QUEUE.md — Fila Operacional

Formato de cada tarefa: `ID`, `DOMAIN`, `PRIORITY`, `DEPENDENCIES`, `DESCRIPTION`,
`ACCEPTANCE CRITERIA`, `QA REQUIREMENTS`, `STATUS`.

Status operacional (ciclo de vida da tarefa): `PENDING`, `READY`, `IN_PROGRESS`, `BLOCKED`,
`PROVADO`, `PARTIAL`. Ao reportar evidência de resultado, usar o vocabulário de
`AGENT_RULES.md` (`PROVADO`/`PARCIAL`/`BLOQUEADO`/`NÃO IMPLEMENTADO`).

---

## TASK-AGENDA-001

```
ID: TASK-AGENDA-001
DOMAIN: Agenda
PRIORITY: P0 (primeiro piloto do sistema de agentes)
DEPENDENCIES:
  - HDR-001 (decidir se PR #1 / Foundation Hardening é mesclado antes)
  - HDR-003 (decidir agrupamento da List View: por dia vs. Agora/Próximo/Depois/Mais tarde)
  - Leitura obrigatória de PRODUCT_CONTRACT.md, ARCHITECTURE.md e AGENT_RULES.md antes de iniciar

DESCRIPTION:
  Implementar a primeira versão real da Agenda dentro do Shell existente do Medusa (Next.js 14 /
  React 18 / Tailwind 3), seguindo o padrão de integração já usado por Educação (troca condicional
  por `activeRoute` em src/app/page.tsx, Container próprio em src/components/agenda/).

  Esta tarefa NÃO deve portar literalmente o protótipo Figma Make (stack incompatível: Vite/
  React 19/Tailwind 4). O protótipo é referência de contrato de produto e UX, não fonte de código.

  Escopo funcional obrigatório (baseado no contrato já auditado):
  - Views: Dia (timeline 06:00–23:00, proporcional), Semana (desktop: 7 colunas; mobile: seletor
    horizontal de dias + timeline de um dia), Mês (grid 7×N, indicadores compactos), Lista.
  - Modelo de dados com 4 tipos distintos: EVENT, TIME BLOCK, DEADLINE (nunca ocupa horário
    artificial na timeline — fica em faixa própria), ROUTINE (recorrente, visualmente diferenciado
    sem parecer eventos independentes).
  - Conflitos: manter ambos os itens visíveis, destacar a sobreposição, e mostrar a duração real
    do conflito no rótulo (formato "Conflito · Nmin" — a versão auditada do protótipo só mostrava
    a palavra "conflito", sem duração; corrigir aqui).
  - Tempo livre: rótulo textual discreto ("Xh Ymin livres"), nunca um card.
  - Now Indicator: linha fina + horário, recalculado com o relógio real, visualmente distinto do
    indicador de conflito.
  - Sistema de 24 cores pastel (reutilizar os mesmos 24 tons já validados na auditoria do
    protótipo — ver EVIDENCE.md).
  - Categorias: criar, escolher uma das 24 cores, **associar a um domínio** e **permitir
    renomear/editar depois** (o protótipo auditado só permitia criar+cor, sem domínio nem edição —
    corrigir aqui).
  - Domínios/filtros: Todos / Educação / Corpo / Trabalho / Pessoal / Finanças, com filtragem real
    dos itens exibidos, não apenas visual.
  - Criação/edição via drawer (não modal bloqueante), com dois passos de confirmação para exclusão.
  - Detalhe de item: painel lateral (não modal de tela cheia) preservando contexto — título,
    horário, duração, tipo, domínio, categoria, origem, descrição, localização, recorrência,
    conflito, ações Editar/Excluir.
  - Context Panel específico da Agenda: resumo apenas (contagem, próximo, ocupação, tempo livre,
    atalho "Ir para Hoje") — decidir explicitamente (registrar em DECISIONS.md) se as seções extras
    encontradas no protótipo auditado (lista completa de "Hoje" e "Prazos") entram ou não; não
    replicar por inércia.
  - Temas Claro/Sépia/Escuro herdados dos tokens já existentes em globals.css — não recriar
    valores de cor.
  - Motion herdado dos tokens já existentes (--duration-*, --ease-*) — não inventar novo sistema.
  - Reduced motion: herdar o bloco @media (prefers-reduced-motion: reduce) já existente no Shell.
  - Local State explícito: nenhuma alegação de persistência real; seguir o padrão visual já usado
    por Educação ("Local State · sessão").
  - Acessibilidade: todo botão só-ícone (navegação de período, fechar painéis) precisa de
    aria-label; foco visível herdado do CSS global; cor nunca é a única fonte de informação de
    conflito/categoria.

ACCEPTANCE CRITERIA:
  1. As 4 views trocam de fato (não são apenas 4 componentes desconectados) e mantêm o item
     selecionado/filtro ativo coerente ao trocar.
  2. Em exatamente 820px de largura, a Week View usa o layout mobile (seletor horizontal de dias),
     não o grid desktop de 7 colunas — este é um bug já confirmado no protótipo de referência
     (breakpoint `< 820` exclui o próprio valor 820); a implementação real deve testar
     especificamente esse valor.
  3. O conflito entre dois itens mostra a duração da sobreposição, não apenas a palavra "conflito".
  4. Categoria criada tem domínio associado; existe uma forma de editar/renomear uma categoria já
     criada.
  5. Filtro por domínio de fato remove itens de outros domínios da renderização (verificável
     clicando, não só lendo o código).
  6. `npx tsc --noEmit` e `npm run build` passam sem erro.
  7. Nenhum arquivo em `src/components/education/**` é alterado.
  8. Nenhum literal de largura/cor/duração novo fora dos tokens já existentes.
  9. Nenhuma das capacidades da seção "Escopo" de AGENT_RULES.md (sync externo, IA de
     agendamento, multiusuário, persistência real) é implementada nesta tarefa.

QA REQUIREMENTS:
  - Browser QA real (não leitura de código) nos 4 breakpoints: 390px, 820px (com atenção
    específica ao ponto 2 acima), 1024px, 1440px.
  - Testar interativamente: criar evento, editar evento, excluir evento (dois passos), aplicar e
    remover filtro, trocar entre os 3 temas, trocar entre as 4 views, selecionar um item em
    conflito e confirmar que ambos os itens continuam visíveis.
  - Testar `prefers-reduced-motion: reduce` e confirmar que a Agenda continua 100% utilizável.
  - Regressão: abrir Educação/Study Mode depois da mudança e confirmar visualmente que nada mudou.
  - Regressão: confirmar que Sidebar, Header, Context Panel genérico e Dynamic Island continuam
    funcionando nos outros "módulos" (ex.: tela inicial) depois da mudança.
  - Toda evidência acima registrada em EVIDENCE.md com comando/screenshot real.

STATUS: PENDING
  (torna-se READY após HDR-001 e HDR-003 serem resolvidos por decisão humana — ver DECISIONS.md)
```

---

Nenhuma outra tarefa foi criada nesta sessão de bootstrap, por instrução explícita: não implementar
Corpo, Finanças, Progresso, Guardian ou novas integrações nesta execução.
