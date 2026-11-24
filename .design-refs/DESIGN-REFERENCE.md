# Referência Visual — Identidade Institucional Banestes (CSS Puro)

Este guia resume a direção visual extraída de `banestes.com.br` e `ri.banestes.com.br` para construir `src/styles/tokens.css` e os componentes da aplicação.

## 1. Direção Estética
- Visual bancário institucional limpo, editorial e orientado a dados (referência principal: portal de Relações com Investidores `ri.banestes.com.br`).
- Fundo claro e calmo (`#FAFAFA`), superfícies brancas (`#FFFFFF`) separadas por bordas finas azuladas (`#D2E2F2` / `#D7DFEA`) em vez de sombras pesadas ou cards decorativos.
- **Anti-AI-Slop obrigatório:**
  - Sem gradientes chamativos em fundos ou títulos.
  - Sem ícones em círculos coloridos repetitivos ou excesso de badges/pills decorativos.
  - Sem linhas coloridas decorativas artificiais nas bordas de todos os cards.
  - Hierarquia resolvida com tipografia, alinhamento tabular (`font-variant-numeric: tabular-nums` para valores monetários, CPFs e códigos de agência), contraste e respiro.

## 2. Paleta de Tokens (Validada em WCAG 2.2 AA)
- `--color-brand-primary`: `#0814DD` (azul institucional RI — 9.75:1 em branco; marca, links, foco, ações principais)
- `--color-brand-primary-hover`: `#1E0AE8` (hover/ativo — 9.28:1)
- `--color-brand-secondary`: `#0070BA` (azul médio Banestes — 5.22:1; ações secundárias e destaques sutis)
- `--color-accent-green-text`: `#3B7A22` (ajuste AA do `#428726` — 5.26:1; textos de status positivo/sucesso/saldo)
- `--color-accent-green-graphic`: `#428726` e `#56AF31` (uso ESTRITAMENTE gráfico: barras de crédito disponível, indicadores finos, nunca texto normal em fundo branco)
- `--color-bg-page`: `#FAFAFA`
- `--color-bg-surface`: `#FFFFFF`
- `--color-bg-subtle`: `#EEF4FC` (hover de linhas da tabela e cabeçalhos sutis)
- `--color-border-subtle`: `#D2E2F2` (assinatura visual do RI Banestes)
- `--color-border-neutral`: `#DEE2E6`
- `--color-text-primary`: `#111827` (ou `#000000` em títulos fortes)
- `--color-text-secondary`: `#596270` / `#666666` (5.74:1 em branco)

## 3. Padrões de Componentes Inspirados nas Referências
- **Header:** sticky no topo, `background: rgba(255, 255, 255, 0.88)` com `backdrop-filter: blur(8px)`, borda inferior `1px solid #D2E2F2` e transição suave de sombra (`0.3s`).
- **Tabela de Clientes (Desktop):** cabeçalho discreto, linhas limpas com divisor `#D7DFEA`, hover sutil `#EEF4FC`, números alinhados com `tabular-nums`, ação clara sem poluição visual.
- **Cards (Mobile e Detalhes):** superfícies brancas com borda `1px solid #D2E2F2`, raio moderado (`8px` a `12px`), espaçamento generoso e foco na legibilidade dos números financeiros.

## 4. Restrições Absolutas
- Proibido usar Tailwind, Material UI.
- Ignorar completamente larguras fixas (`1905px`), classes `.Mui*` ou `--bs-*` caso consulte referências externas.