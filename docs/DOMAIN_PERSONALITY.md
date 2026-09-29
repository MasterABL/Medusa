# MEDUSA — DOMAIN PERSONALITY SYSTEM

> **Quatro domínios. Uma família. Quatro personalidades reais.**
> Documentação de referência para a camada de personalidade visual, de interação e de motion dos domínios Medusa (Finanças, Corpo, Guardian, Espiritual).

---

## 1. Princípio Central da Família Medusa

Cada domínio é uma extensão expressiva do mesmo organismo. O usuário deve reconhecer o domínio **antes mesmo de ler o título**, mantendo a coerência com a identidade global do Medusa:

* **Tipografia Global**: Epilogue (títulos e corpo) com JetBrains Mono para numerais tabulares e coordenadas técnicas.
* **Sistema Espacial**: Grade de 8px com ritmo vertical harmonioso e superfícies suaves (off-white no tema claro, ardósia profunda no tema escuro).
* **Bordas & Raios**: Raio de 8–12px para controles e botões; 16–20px para superfícies de destaque e decks.
* **Profundidade & Vidro**: Superfícies translúcidas com `backdrop-filter: blur(8px-12px)` aplicadas com sobriedade.
* **Acessibilidade & Inclusão**: Contraste auditado, suporte completo a `prefers-reduced-motion` e navegação integral por teclado.

---

## 2. As Quatro Personalidades Oficiais

```
                   ┌────────────────────────────────────────┐
                   │           MEDUSA CORE SHELL            │
                   │ (Epilogue · 8px Grid · Context Panel)  │
                   └──────────────────┬─────────────────────┘
                                      │
       ┌───────────────┬──────────────┴──────────────┬────────────────┐
       ▼               ▼                             ▼                ▼
   FINANÇAS          CORPO                        GUARDIAN        ESPIRITUAL
Clareza + Controle  Evolução + Rotina    Inteligência + Controle  Presença + Fé + Caminho
 (Geométrico)       (Orgânico / Fluido)   (Console de Telemetria) (Santuário Atmosférico)
```

---

### 💰 1. FINANÇAS — Clareza + Controle

* **Sensação**: *"Eu entendo exatamente o que está acontecendo com meu dinheiro."*
* **Composição**: **Geométrica e Estruturada**.
* **Visual Grammar**:
  * Linhas ortogonais, eixos cartesianos (`Eixo 01: Entradas`, `Eixo 02: Gastos Fixos`, `Eixo 03: Variáveis`, `Eixo 04: Margem Livre`).
  * Deck de balanço integrado (`fin-balance-deck`) com coordenadas de ledger e alinhamento tabular.
  * Diagrama de fluxo vetorial (`FinancialFlowDiagram` e `FlowBar`) estilo Sankey simplificado, ilustrando a água/energia do dinheiro percorrendo o orçamento.
  * Simulador de margem de segurança reativo que projeta o impacto direto nos eixos do fluxo.
* **Motion Identity**:
  * **Rápido, preciso, controlado** (180ms–240ms `cubic-bezier(0.16, 1, 0.3, 1)`).
  * Saldo e margem atualizam com pulsos limpos em `finSimPulse`.
  * Sem ornamentos ou animações infantis de moedas voando; transições de ledger bancário suíço.
* **Interaction Identity**:
  * Simulação interativa ao vivo: arrastar ou digitar o valor de uma despesa recalcula o fluxo imediatamente.
  * Expansão em cascata: abrir uma categoria empurra suavemente o conteúdo abaixo sem sobreposições.
* **Typography & Accents**:
  * Numerais tabulares alinhados à direita com `font-variant-numeric: tabular-nums`.
  * Acentos em esmeralda sereno (`#059669` / `--color-support`), ardósia e toques controlados de âmbar para contas a vencer.
* **Primeira Entrada**:
  * Grade blueprint estruturada onde os 4 eixos se desenham e acomodam os dados do usuário.

---

### 🏃 2. CORPO — Evolução + Rotina

* **Sensação**: *"Estou construindo uma rotina viva que funciona para mim."*
* **Composição**: **Orgânica, Fluida e Contínua** (sem cards rígidos repetitivos).
* **Visual Grammar**:
  * Formas biológicas, curvaturas suaves e o deck vital (`cor-vital-deck`) com indicadores de prontidão, recuperação e frequência.
  * **Visualizador de Movimento Vivo** (`ActivityMovementVisualizer`): Explica o exercício através da sequência de 5 fases biológicas:
    $$\text{Movimento} \longrightarrow \text{Repetição/Cadência} \longrightarrow \text{Duração} \longrightarrow \text{Descanso} \longrightarrow \text{Progressão}$$
  * Fita Ondulante de Ritmo Semanal (`WeeklyRhythmStream`): Substitui a grade de 7 caixas por uma onda contínua que celebra dias de recuperação ativa e picos de treino.
  * Guia Interativo de Cadência e Respiração: Esfera orgânica que expande e contrai ao ritmo de 4s/4s.
* **Motion Identity**:
  * **Orgânico, humano e rítmico** (320ms–450ms com curvas de respiração de 3.2s a 8s).
  * Pulsos suaves de onda (`corWavePulse`) e nós com halos atenuados.
* **Interaction Identity**:
  * Ajuste de cadência de respiração viva e expansão visual da progressão do exercício.
  * Alternância entre sessões de treino e recuperação guiada por sensação de esforço.
* **Typography & Accents**:
  * Tipografia aberta com pesos médios; numerais rítmicos.
  * Acentos em verde botânico, menta suave e tons terracota suaves para intensidade.
* **Primeira Entrada**:
  * O ambiente ganha movimento através de uma respiração acolhedora e 3 perguntas sem julgamento sobre prontidão física.

---

### 🛡️ 3. GUARDIAN — Inteligência + Controle

* **Sensação**: *"Existe uma inteligência operacional silenciosa observando o próprio Medusa."*
* **Composição**: **Console de Investigação e Telemetria Operacional**.
* **Visual Grammar**:
  * Não é cyberpunk nem terminal hacker nem militar. É engenharia limpa e confiável.
  * **Radar de Topologia em 5 Facetas** (`GuardianTopologyRadar`):
    * `Código & Integridade`
    * `Dados & Esquema`
    * `Segurança & Segredos`
    * `Privacidade Local`
    * `Políticas & Limites`
  * **Rastreador do Ciclo Operacional em 7 Estágios** (`GuardianPipelineTracker`):
    $$\text{Observar} \longrightarrow \text{Detectar} \longrightarrow \text{Investigar} \longrightarrow \text{Propor} \longrightarrow \text{Autorizar} \longrightarrow \text{Corrigir} \longrightarrow \text{Verificar}$$
  * Trilhos de evidência visual conectando onde ocorreu o achado, a discrepância e o contrato aplicável.
* **Motion Identity**:
  * **Reativo, cirúrgico e investigativo**.
  * Faróis atenuados (`gdBeaconPulse` de 2.4s) em nós com achados pendentes.
  * Expansão da cadeia de verificação com traçado de trilhos passo a passo.
* **Interaction Identity**:
  * Filtragem instantânea por faceta na topologia.
  * Decisão humana transparente: ações L2/L3 mostram exatamente a causa, o impacto e a reversibilidade antes de autorizar.
* **Typography & Accents**:
  * Rótulos em JetBrains Mono para IDs, códigos e contratos (`gd-ref`).
  * Epilogue para descrições humanas e evidências.
  * Acentos em ardósia técnica, verde sálvia operacional (`#10b981`), âmbar moderado para avisos e vermelho terracota contido para L3.
* **Primeira Entrada**:
  * A inteligência se conecta suavemente aos 4 subsistemas, acendendo os sensores sem alarme.

---

### 🕊️ 4. ESPIRITUAL — Presença + Fé + Caminho

* **Sensação**: *"Eu entrei em outro ambiente, sereno e sem pressa."*
* **Composição**: **Espacial e Atmosférica (Santuário Vivo)**.
* **Visual Grammar**:
  * Sem coleção de caixas administrativas. Layout de santuário aberto com horizonte suave.
  * **Ambiente Celestial Dinâmico** (`AtmosphericSanctuary`):
    * **Dia**: Céu suave com gradiente difuso, névoa translúcida e nuvens SVG em deslocamento lento e imperceptível.
    * **Fim de Tarde (Entardecer)**: Horizonte dourado/âmbar quente, transição de luz suave.
    * **Noite**: Céu índigo profundo estrelado com cintilação suave e assimétrica (`espTwinkle`).
  * **Modos de Santuário Reativos**:
    * `Propósito`: Altar amplo com iluminação expansiva de horizonte.
    * `Leitura`: Luminária quente focada na passagem bíblica.
    * `Estudo`: Foco e atenção clara para as 3 fases (Observar → Entender → Viver).
    * `Oração / Prática`: Halo concêntrico que respira suavemente a cada 10s.
  * O Altar do Propósito (`esp-sanctuary-altar`) apresenta a intenção do usuário em itálico com respiração de horizonte.
* **Motion Identity**:
  * **Lento, contemplativo e respirado** (transições de 900ms a 1200ms; drifts de nuvens de 68s a 95s; halo de 9s).
  * Sem partículas excessivas, sem glitter ou efeitos místicos clichês.
* **Interaction Identity**:
  * Ajuste de momento visual (Auto / Dia / Tarde / Noite) e modos de presença.
  * Leitura e estudo privados sem cobrança de sequências ou gamificação.
* **Typography & Accents**:
  * Epilogue em estilo itálico sereno para o propósito e versículos; entrelinha generosa para leitura sem pressa.
  * Tons de luz solar difusa, azul celestial translúcido, âmbar quente e púrpura suave para oração.
* **Primeira Entrada**:
  * O santuário se abre suavemente com um halo que respira e perguntas espaçadas que podem ser respondidas no seu tempo.

---

## 3. Resumo Comparativo dos 4 Ritmos

| Domínio | Ritmo de Motion | Arquitetura de Layout | Metáfora Central | Elemento Assinatura |
| :--- | :--- | :--- | :--- | :--- |
| **Finanças** | Rápido, preciso, controlado (200ms) | Decks tabulares e coordenadas | Pipeline e Balanço | Fluxo Vetorial River + Simulador Reativo |
| **Corpo** | Orgânico, fluido, biológico (400ms) | Decks vitais e faixas contínuas | Pulso e Movimento | Visualizador Cinético 5 Estágios + Onda Semanal |
| **Guardian** | Reativo, técnico, silencioso (240ms) | Console de topologia e trilhos | Sentinela e Verificação | Radar 5 Facetas + Rastreador 7 Fases |
| **Espiritual** | Lento, respirado, espacial (1000ms) | Santuário com horizonte livre | Atmosfera e Caminho | Ambiência Dinâmica Céu/Estrelas + Modos |

---

## 4. Diretrizes de Preservação

Ao evoluir o Medusa nas próximas rodadas:
1. **Nunca homogenizar os layouts**: Não aplique cards idênticos aos 4 domínios.
2. **Respeitar os ritmos**: Finanças não pode ser lenta; Espiritual não pode ser apressado.
3. **Manter acessibilidade total**: Todos os efeitos atmosféricos e de fluxo possuem fallback imediato quando `prefers-reduced-motion: reduce` estiver ativo.
4. **Sem dados fictícios disfarçados**: Demonstrações continuam claramente identificadas com chips `Demonstração`.
