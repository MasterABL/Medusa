# Medusa — Living Experience Architecture V2

> **Ambiente Operacional e Cognitivo Integrado**  
> Repositório oficial: [https://github.com/MasterABL/Medusa](https://github.com/MasterABL/Medusa)  
> Branch principal desta fase: [`feat/design-refinement-living-experience`](https://github.com/MasterABL/Medusa/tree/feat/design-refinement-living-experience)

---

## 🚀 Como acessar e rodar em qualquer computador

Se você estiver em outra máquina ou em outro ambiente do Antigravity IDE, siga este passo a passo:

### 1. Clonar o repositório
```bash
git clone https://github.com/MasterABL/Medusa.git
cd Medusa
```

### 2. Acessar a branch de desenvolvimento
```bash
git checkout feat/design-refinement-living-experience
git pull origin feat/design-refinement-living-experience
```

### 3. Instalar dependências
```bash
npm install
```

### 4. Executar em desenvolvimento
```bash
npm run dev
```

O Medusa estará disponível em:
- **Localhost:** [http://localhost:3000](http://localhost:3000)
- **Preview no Antigravity IDE:** Pressione `Ctrl+Shift+P` (ou `F1`), selecione **`Simple Browser: Show`** e insira `http://localhost:3000`.

---

## 🧪 Comandos de Testes e Validação Estrita

| Comando | O que valida | Cobertura |
|---------|--------------|-----------|
| `npm run typecheck` | Checagem estrita de tipos TypeScript | Zero erros |
| `npm run test:all` | Suíte de contratos de fundação + Reminders Engine | 676/676 + 17/17 PASS |
| `npm run test:domains` | Contratos dos 5 domínios completos | 51/51 PASS |
| `node scripts/qa-domains-browser.js` | Browser QA Headless ponta a ponta (Edge/Chrome) | 50/50 checks (100% PASS) |
| `npm run build` | Build de produção Next.js | Zero erros |

---

## 📚 Documentação do Repositório

- **[docs/MEDUSA_DOMAIN_COMPLETENESS_LIVING_EXPERIENCE.md](docs/MEDUSA_DOMAIN_COMPLETENESS_LIVING_EXPERIENCE.md)**  
  Relatório completo de evidências, auditoria de cada subexperiência, matriz de estados, motion e contratos dos 5 domínios.
- **[docs/MEDUSA_FOUNDATION_CONTRACTS.md](docs/MEDUSA_FOUNDATION_CONTRACTS.md)**  
  Especificação formal dos contratos de fundação (agenda, finanças, corpo, espiritual, guardian).
- **[DESIGN.md](DESIGN.md)**  
  Diretrizes de design orgânico, paleta pastel, tipografia, micro-interações e Living Experience.

---

## 🏛️ Os 5 Domínios Completos

### 1. Hoje (`/hoje` ou rota inicial)
- **Matriz de Atenção (Agora):** Foco protagonista, tempo decorrido, extensão (+15m) e conclusão.
- **Promoção Espacial:** Ao concluir Bloco A, Bloco A permanece registrado no resumo anterior com badge `Concluído` e Bloco B assume protagonismo no Agora.
- **Transição para Estado Calmo:** Ao concluir todos os blocos agendados, o último bloco concluído permanece representado e o card de `Janela do Dia Concluída · Transição Concluída · Estado Calmo` surge com opções de descanso e revisão.
- **Contexto & Tarefas:** Tarefas integradas com vínculo a Projetos da Faculdade.
- **Histórico:** Registro cronológico de blocos cumpridos no dia.

### 2. Guardian (`/guardian`)
- **Cadeia Causal (5 Nós):** Evento → Contexto → Decisão → Ação → Resultado com animação de percurso e inspeção de evidências.
- **Radar de Riscos:** Monitoramento transversal em tempo real (anomalias financeiras, débitos de sono, limites operacionais).
- **Action Center:** Fila de aprovações L2 com confirmação e undo temporal de 3 segundos.
- **Matriz de Confiança:** Níveis de autonomia (L1 informativo, L2 supervisionado, L3 autônomo com bloqueio de soberania espiritual).
- **Auditoria Imutável:** Trilha com `correlationId` e hashes de governança.

### 3. Corpo (`/corpo`)
- **Evolução & Força:** 4 Movimentos fundamentais com 1RM, tonelagem e progressão histórica de carga.
- **Modo Treino (Bancada Cinética):** Registro de séries, ajuste de carga (+/-2kg, +/-5kg), status dinâmico e timer regressivo de descanso.
- **Prontidão Biológica & Sono:** Score biológico 0–100, sono profundo, REM e recuperação muscular.
- **Fichas & Medidas:** Rotinas A/B/C e evolução de medidas corporais.

### 4. Finanças (`/financas`)
- **Fluxo, Equilíbrio & Decisão:** Saldo global, runway de segurança, proporção animada Comprometido vs. Livre.
- **Simulador de Despesas:** Impacto em tempo real na runway (+R$ 350, +R$ 850, +R$ 1.500, +R$ 3.000).
- **Contas & Cartões:** Saldos bancários e limites disponíveis em tempo real.
- **Detector de Anomalias:** Identificação de cobranças duplicadas com botão de contestação integrado via Guardian.
- **Metas & Extrato:** Metas de longo prazo e transações categorizadas.

### 5. Espiritual (`/espiritual`)
- **Escritura Viva:** Leitor bíblico com versículos numerados, seleção de livros/capítulos e anotações contextuais.
- **Memória Bíblica (SRS SM-2):** Ocultação progressiva de palavras (25%, 50%, 75%, 100%) e cálculo de retenção.
- **Oração Contemplativa:** Atmosfera visual noturna com círculo de respiração guiada (4s Inspira / 4s Retém / 4s Expira / 4s Retém).
- **Planos & Gratidão:** Trilhas estruturadas de leitura e diário diário de agradecimento.

---

## 🔗 Links Úteis no GitHub

- **Repositório:** [MasterABL/Medusa](https://github.com/MasterABL/Medusa)
- **Branch de Trabalho:** [feat/design-refinement-living-experience](https://github.com/MasterABL/Medusa/tree/feat/design-refinement-living-experience)
- **Histórico de Commits:** [Commits da Branch](https://github.com/MasterABL/Medusa/commits/feat/design-refinement-living-experience)
- **Criar Pull Request:** [Comparar e abrir PR](https://github.com/MasterABL/Medusa/compare/main...feat/design-refinement-living-experience)
