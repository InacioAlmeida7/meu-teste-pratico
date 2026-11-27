# 🏦 Gestão de Clientes Bancários — Banestes

Aplicação React + TypeScript para consultar, filtrar, detalhar e cadastrar (em memória) clientes, contas e agências lidos **ao vivo** de planilhas públicas do Google Sheets.

> 🌐 **Acesse online:** **[meu-teste-pratico-inacio-almeida.vercel.app](https://meu-teste-pratico-inacio-almeida.vercel.app/)**

---

## ✨ Funcionalidades

| Tela | O que faz |
| --- | --- |
| **Listagem** (`/`) | Busca por nome, nome social ou CPF/CNPJ (ignora acentos e pontuação) · filtros por tipo de documento, agência e uso de crédito alto (`credito=alto`) · destaque **"Crédito alto"** para uso $\ge 80\%$ · exportação CSV (`;` e UTF-8 BOM) de todos os resultados filtrados/ordenados · painel de inconsistências da base (`DataQualityNotice`) · ordenação por nome **A–Z** (padrão) ou **Z–A**, clicando em "Nome" (no celular, pelo campo "Ordenar por") · 10 clientes por página · filtros/ordenação/página sincronizados na URL (`q`, `agencia`, `doc`, `credito`, `ordem`, `pagina`) e preservados ao voltar do detalhe · volta à página 1 a cada busca, filtro, ordenação ou cadastro |
| **Detalhe** (`/clientes/:id`) | Abas **Resumo**, **Contas Bancárias** e **Cadastro e Agência** · totais de saldo, crédito disponível e patrimônio · medidor acessível de uso consolidado de limite de crédito e nível de risco · botão **"Imprimir ficha"** (`@media print` consolidando dados, agência e contas) · contas em cards (1–3 lado a lado, 4 em grade 2×2) ou em lista quando há 5 ou mais · painel lateral com os dados de cada conta |
| **Novo cliente** | Modal com validação (React Hook Form + Zod) · CPF/CNPJ com dígito verificador e sem duplicidade · aviso no canto inferior direito com link **"Ver cliente"**, que some sozinho em 7 s (pausa com mouse ou foco) |
| **Tema e Estados** | Tema claro por padrão com alternância para escuro no cabeçalho (`localStorage`, sem flash inicial e impressão clara) · carregamento, erro com "Tentar novamente" (sem perder os cadastros feitos) e lista vazia |

---

## 🛠️ Stack

- **React 19** + **TypeScript** (`strict`, sem `any`) + **Vite**
- **React Router** · **React Hook Form** + **Zod** · **PapaParse** · **react-day-picker** · **lucide-react**
- **CSS puro** com design tokens (`src/styles/tokens.css`), sem framework CSS
- **Oxlint** para lint

---

## 📊 Tratamento dos dados (CSV)

Os dados são lidos em tempo de execução com `fetch` + `Response.text()` (sem cache e com `AbortController`). Problemas reais das planilhas e como são tratados:

| Situação na planilha | Tratamento |
| --- | --- |
| Colunas extras vazias | Ignoradas; colunas obrigatórias ausentes geram erro claro |
| Zeros à esquerda perdidos no CPF/CNPJ | Restaurados (11 ou 14 dígitos) para ligar clientes e contas |
| Datas `AAAA-MM-DD`, `DD/MM/AAAA` ou `AAAAMMDD` | Lidas como data local, sem o deslocamento de 1 dia do fuso UTC |
| Números `1.250,50` ou `1250.50` | Aceitos nos dois formatos; valores inválidos geram aviso no console em vez de virar `0` |
| Estado civil vazio ou desconhecido | Exibido como **"Não informado"** (nada é inventado) |
| Linhas incompletas ou IDs repetidos | Descartadas com aviso no console, sem interromper a carga |
| Documentos fictícios na base | Aceitos na leitura; só o **cadastro** exige CPF/CNPJ válido |

> ⚠️ **Decisão consciente sobre o estado civil:** o enunciado define `estadoCivil` como obrigatório com 4 valores. Optei por desviar desse contrato e torná-lo opcional (`estadoCivil?`) para **não exibir um dado falso** (ex.: "Solteiro") quando a planilha trouxer um valor vazio ou inválido; nesses casos a tela mostra **"Não informado"**. O formulário de cadastro continua exigindo um dos 4 valores.

---

## ♿ Acessibilidade

- Contraste AA nos textos, botões e banners
- Uso completo por teclado: link "Pular para o conteúdo", abas, listas de seleção, calendário, modal e painel lateral
- `<dialog>` nativo: `Esc` fecha, o foco volta ao botão de origem e arrastar o mouse para fora não fecha por engano
- Mensagens de erro ligadas aos campos e anúncios para leitores de tela (`aria-live`)
- Layout testado em telas de **360 px** e **375 px**

---

## 🚀 Como executar

Requer **Node.js 20+**.

⚡ **Atalho:** `npm start` instala as dependências (só se ainda não estiverem instaladas ou estiverem desatualizadas), gera o build e abre o preview local.

| Comando | Para quê |
| --- | --- |
| `npm start` | Instalar (se preciso), buildar e rodar |
| `npm install` | Instalar dependências |
| `npm run dev` | Servidor de desenvolvimento |
| `npx tsc --noEmit -p tsconfig.app.json` | Checar tipos |
| `npm run lint` | Lint (Oxlint) |
| `npm run build` | Build de produção |
| `npm run preview` | Testar o build localmente |

O `vercel.json` redireciona todas as rotas para o `index.html`, então abrir ou recarregar `/clientes/:id` direto funciona em produção.

---

## 📁 Estrutura

```text
src/
├── App.tsx        # Layout, rotas e modal de cadastro (carregados sob demanda)
├── types/         # Interfaces Cliente, Conta e Agencia
├── services/      # Leitura e conversão das planilhas (bankApi.ts)
├── utils/         # Normalização, formatação, validação de CPF/CNPJ, crédito, CSV e qualidade de dados
├── schemas/       # Schema Zod do cadastro
├── context/       # Dados em memória (BankDataContext)
├── hooks/         # Filtros/paginação na URL, tema, popovers e fechamento de <dialog>
├── components/    # Header, lista, paginação, modal, calendário, cards...
├── pages/         # ClientListPage e ClientDetailPage
└── styles/        # Tokens e estilos globais
```

📄 Especificação completa e contratos em [`SPEC.md`](SPEC.md).
