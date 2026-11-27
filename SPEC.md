# SPEC.md — Sistema Web de Gestão de Clientes Bancários

Este documento é a **fonte única de verdade** para o desenvolvimento e revisão do sistema. Todo agente construtor ou revisor deve seguir rigorosamente as decisões arquiteturais, contratos de dados e restrições definidas abaixo.

---

## 1. Objetivo e Filosofia de Engenharia

Construir um sistema web frontend para consulta, filtragem, detalhamento e cadastro em memória de clientes bancários, integrando dados vivos de clientes, contas e agências via Google Sheets (CSV).

### Princípios Obrigatórios (Método KISS)
1. **Simplicidade estrutural:** Zero over-engineering. Não utilizar Redux, Zustand, TanStack Query, frameworks CSS ou arquiteturas OOP/MVC com classes (`Controller`, `Repository`, `Factory`).
2. **React Funcional e Declarativo:** Componentes pequenos, funções puras para transformação de dados e fluxo unidirecional claro.
3. **Legibilidade humana:** Código organizado, previsível e bem comentado (JSDoc explicando o *porquê* de regras de negócio e normalizações, nunca comentários óbvios linha a linha).
4. **TypeScript Estrito:** `strict: true` ativo. **É proibido usar `any`**. Dados externos crus vindos do CSV devem ser tratados como `Record<string, string>` ou `unknown` e convertidos com segurança.
5. **CSS Puro:** Estilização 100% em CSS puro utilizando **CSS Custom Properties (Design Tokens)** e arquivos `.css` organizados por responsabilidade/componente, com nomes de classes semânticos e claros.

---

## 2. Fontes de Dados (Leitura em Tempo de Execução)

Os dados **NUNCA** devem ser baixados e importados estaticamente no código. Eles devem ser buscados em tempo de execução via `Fetch API` e lidos como texto via `Response.text()`, usando `Promise.all` e suporte a `AbortController`.

* **Clientes:** `https://docs.google.com/spreadsheets/d/1LkyaeCgiyaIN1IxXnbZQPmVMIcht3PIxMDUXHsvczK0/gviz/tq?tqx=out:csv&sheet=clientes`
* **Contas:** `https://docs.google.com/spreadsheets/d/1LkyaeCgiyaIN1IxXnbZQPmVMIcht3PIxMDUXHsvczK0/gviz/tq?tqx=out:csv&sheet=contas`
* **Agências:** `https://docs.google.com/spreadsheets/d/1LkyaeCgiyaIN1IxXnbZQPmVMIcht3PIxMDUXHsvczK0/gviz/tq?tqx=out:csv&sheet=agencias`

> **Regra Crítica de Pré-Implementação:** Antes de escrever os mapeadores de CSV, o agente deve inspecionar o conteúdo real das 3 URLs acima para confirmar os nomes exatos das colunas (headers), formatos de data, formatos numéricos, pontuação de CPF/CNPJ e eventuais linhas com valores ausentes ou fora do padrão.

---

## 3. Contratos de Dados (Interfaces Obrigatórias)

As interfaces abaixo devem ser declaradas exatamente conforme o enunciado em `src/types/models.ts`:

```ts
export interface Cliente {
  id: string;
  cpfCnpj: string;
  rg?: string;
  dataNascimento: Date;
  nome: string;
  nomeSocial?: string;
  email: string;
  endereco: string;
  rendaAnual: number;
  patrimonio: number;
  estadoCivil: "Solteiro" | "Casado" | "Viúvo" | "Divorciado";
  codigoAgencia: number;
}

export interface Conta {
  id: string;
  cpfCnpjCliente: string;
  tipo: "corrente" | "poupanca";
  saldo: number;
  limiteCredito: number;
  creditoDisponivel: number;
}

export interface Agencia {
  id: string;
  codigo: number;
  nome: string;
  endereco: string;
}
```

---

## 4. Regras de Parsing, Normalização e Resiliência

O parsing das strings CSV deve ser feito com **PapaParse** (`{ header: true, skipEmptyLines: true }`). Nunca usar `.split(',')`.

### Funções Puras em `src/utils/normalizers.ts`
1. **Limpeza básica (`cleanText`)**: Remove espaços extras nas pontas (`.trim()`). Campos opcionais (`rg`, `nomeSocial`) que vierem vazios devem virar `undefined`.
2. **Normalização de documento (`onlyDigits`)**: Remove tudo que não for dígito (`/\D/g`). Deve ser usada:
   * Ao cruzar `Cliente.cpfCnpj` com `Conta.cpfCnpjCliente`;
   * Ao pesquisar clientes por CPF/CNPJ (permitindo busca com ou sem máscara).
3. **Datas (`parseDate`)**: Suportar múltiplos formatos reais (`DD/MM/YYYY`, `YYYY-MM-DD`, timestamps ou strings ISO), construindo o `Date` sem deslocamento de fuso horário (ex.: usar construtor local `new Date(year, month - 1, day)` para datas sem hora). Se a data for inválida, tratar de forma segura sem quebrar a renderização.
4. **Números e Moeda (`parseNumber`)**: Suportar strings com formato brasileiro (`"1.250,50"`), formato americano (`"1250.50"`), prefixos como `"R$"` ou espaços. Se vier vazio ou inválido, retornar `0` (ou descartar/alertar conforme a criticidade do campo).
5. **Estado Civil (`normalizeEstadoCivil`)**: Normalizar caixa (maiúsculas/minúsculas), espaços e acentos para mapear estritamente para `"Solteiro" | "Casado" | "Viúvo" | "Divorciado"` (inclusive tratando variações femininas como `"Solteira"` → `"Solteiro"`, caso apareçam na planilha). Valores vazios ou não reconhecidos não recebem um estado civil inventado: o campo fica ausente (`estadoCivil?` em `models.ts`) e a tela exibe `"Não informado"`.
6. **Tipo de Conta (`normalizeTipoConta`)**: Normalizar caixa/acentos (ex.: `"Poupança"`, `"POUPANCA"`, `"Corrente"`) para `"corrente" | "poupanca"`.
7. **Tratamento de anomalias:**
   * Se uma linha do CSV vier sem campos essenciais (ex.: `nome` ou `cpfCnpj` vazio), ignorar a linha com segurança e registrar um `console.warn` descritivo (sem derrubar a aplicação).
   * Se `id` estiver vazio no CSV, gerar um fallback determinístico ou UUID.
   * Se um cliente referenciar um `codigoAgencia` inexistente na lista de agências, a tela de detalhes deve exibir uma mensagem amigável ("Agência não localizada para o código X") em vez de lançar erro.
   * Se um cliente não possuir contas bancárias, exibir um estado vazio claro ("Nenhuma conta bancária vinculada a este cliente").

### Funções Puras em `src/utils/formatters.ts`
* `formatCurrencyBRL(value: number)`: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
* `formatDateBR(date: Date)`: valida `!Number.isNaN(date.getTime())` e formata em `DD/MM/AAAA` (fallback: `"Não informada"`).
* `formatCpfCnpj(value: string)`: aplica máscara `000.000.000-00` (11 dígitos) ou `00.000.000/0000-00` (14 dígitos); caso tenha outro tamanho, retorna limpo.

---

## 5. Arquitetura e Estrutura de Pastas

Máximo de 2 níveis de pastas dentro de `src/`. Fluxo unidirecional:
`types` / `utils` → `services` → `context` / `hooks` → `components` → `pages`.

```text
├── SPEC.md
├── vercel.json                       # Rewrite de rotas SPA para /index.html
└── src/
    ├── main.tsx                      # Entry point + BrowserRouter + estilos globais
    ├── App.tsx                       # Definição das rotas e BankDataProvider
    ├── styles/
    │   ├── tokens.css                # Variáveis CSS (cores, tipografia, espaçamento, sombras, raios)
    │   └── global.css                # Reset moderno, utilitários (.sr-only), foco acessível, layout base
    ├── types/
    │   └── models.ts                 # Interfaces Cliente, Conta, Agencia + tipos auxiliares
    ├── utils/
    │   ├── normalizers.ts            # Conversão segura CSV -> tipos da aplicação
    │   ├── formatters.ts             # Formatação BRL, datas, CPF/CNPJ
    │   ├── validators.ts             # Validação de CPF e CNPJ (dígitos verificadores)
    │   ├── credit.ts                 # Uso consolidado de limite e nível de risco de crédito
    │   ├── exporters.ts              # Geração e download CSV UTF-8 com delimitador `;`
    │   ├── dataQuality.ts            # Detecção de inconsistências e avisos de base
    │   └── agencyStats.ts            # Agregação O(n) de indicadores por agência
    ├── services/
    │   └── bankApi.ts                # Fetch API + Response.text() + PapaParse + mapeamento
    ├── schemas/
    │   └── clienteSchema.ts          # Schema Zod do formulário de cadastro
    ├── context/
    │   └── BankDataContext.tsx       # Estado em memória (clientes, contas, agencias, loading, error, addCliente, reload)
    ├── hooks/
    │   ├── useClientFilters.ts       # Busca, filtros, ordenação e paginação (10/página) sincronizados com URL
    │   └── useTheme.ts               # Tema claro padrão com alternância e persistência em localStorage
    ├── components/
    │   ├── Header/                   # Header.tsx + Header.css
    │   ├── SearchToolbar/            # SearchToolbar.tsx + SearchToolbar.css (busca + filtro de agência + botão Novo Cliente)
    │   ├── ClientList/               # ClientList.tsx + ClientList.css (tabela desktop + cards mobile)
    │   ├── Pagination/               # Pagination.tsx + Pagination.css
    │   ├── ClientFormModal/          # ClientFormModal.tsx + ClientFormModal.css (modal <dialog> com React Hook Form + Zod)
    │   ├── AccountCard/              # AccountCard.tsx + AccountCard.css
    │   ├── AgencyCard/               # AgencyCard.tsx + AgencyCard.css
    │   └── StatusMessage/            # StatusMessage.tsx + StatusMessage.css (loading skeleton, erro com retry, empty state)
    └── pages/
        ├── ClientListPage/           # ClientListPage.tsx + ClientListPage.css
        ├── ClientDetailPage/         # ClientDetailPage.tsx + ClientDetailPage.css
        └── AgenciesPage/             # AgenciesPage.tsx + AgenciesPage.css (lazy-loaded)
```

---

## 6. Especificação Funcional e de Interface (Telas)

### Rota `/` — Listagem de Clientes (`ClientListPage`)
1. **Cabeçalho e Resumo:** Título do sistema, breve resumo numérico (Total de Clientes, Total de Agências, Total de Contas carregadas) e botão de destaque **"+ Novo Cliente"**.
2. **Barra de Busca e Filtro (`SearchToolbar`):**
   * Campo de busca único com `<label>` acessível: filtra em tempo real por **Nome**, **Nome Social** ou **CPF/CNPJ** (com ou sem pontuação, ignorando acentos e maiúsculas/minúsculas).
   * Filtro complementar por **Agência** (dropdown preenchido dinamicamente a partir das agências carregadas, com opção "Todas as agências").
   * Botão "Limpar filtros" exibido quando há busca ou filtro ativo.
   * **Ordenação por nome:** o cabeçalho **Nome** é um botão que alterna A–Z / Z–A (`aria-sort`). Padrão: A–Z, ordem alfabética pt-BR sem diferenciar acentos. No mobile, onde o cabeçalho fica oculto, um campo "Ordenar por" oferece as mesmas duas opções.
   * **Regra obrigatória:** Qualquer alteração na busca, filtro ou ordenação deve resetar automaticamente a página atual para **1**.
   * **Sincronização com a URL:** Busca (`q`), agência (`agencia`), tipo de documento (`doc`: `cpf` | `cnpj`), uso de crédito alto (`credito`: `alto`), ordenação (`ordem`: `desc`) e página (`pagina`) ficam sincronizados via `useSearchParams`. Valores padrão não aparecem na URL, parâmetros inválidos caem no padrão sem erro, digitar na busca usa `replace: true` e mudanças de filtro/ordenação/página criam entrada no histórico.
   * **Exportação CSV:** Botão **"Exportar CSV"** exporta toda a listagem filtrada e ordenada (`sortedClientes`, não apenas a página atual) via `Papa.unparse` (`;` e BOM UTF-8 `\uFEFF`, arquivo `clientes-AAAA-MM-DD.csv`), desabilitado quando não há resultados.
   * **Qualidade de Dados (`DataQualityNotice`):** Painel expansível (`<details>`) exibido apenas quando há inconsistências detectadas por `findDataIssues` (contas órfãs, agências inexistentes, datas inválidas, estados civis ausentes e avisos de documento com DV inválido), agrupadas por tipo com link para o cliente.
3. **Listagem Responsiva (`ClientList`):**
   * Exibir apenas os dados principais: **Nome** (com indicador discreto de Nome Social se houver e tag compacta **"Crédito alto"** para clientes com uso $\ge 80\%$), **CPF/CNPJ formatado**, **E-mail**, **Agência** (código/nome) e botão/ação **"Ver detalhes"** (preservando os query params da listagem para o retorno).
   * **Desktop (`>= 768px`):** Tabela HTML semântica (`<table>`, `<thead>`, `<th scope="col">`, `<caption>` com `.sr-only`), linhas clicáveis ou com ação clara.
   * **Mobile (`< 768px`):** Layout em cards empilhados sem rolagem horizontal forçada.
4. **Paginação (`Pagination`):**
   * Máximo de **10 clientes por página**.
   * Exibir contador claro: *"Mostrando X–Y de Z clientes"*.
   * Botões Anterior, números de página (com `aria-current="page"`) e Próxima.
5. **Feedback visual:**
   * Skeleton/estado de carregamento durante a requisição inicial.
   * Mensagem de erro amigável com botão **"Tentar novamente"** caso falhe a comunicação com o Google Sheets.
   * Empty state quando nenhum cliente corresponder à busca; a contagem de resultados é anunciada por uma região `role="status"` persistente.

### Modal de Cadastro de Novo Cliente (`ClientFormModal`)
1. **Comportamento do Modal:**
   * Implementado com o elemento HTML nativo `<dialog>` (`showModal()` / `close()`), garantindo bloqueio de fundo (backdrop), fechamento via tecla `Esc`, clique no botão fechar ou no backdrop e retorno automático de foco ao botão acionador.
   * Rolagem interna limpa em telas menores (mobile) sem cortar os botões de ação.
2. **Campos do Formulário (respeitando `Cliente`):**
   * `nome` (obrigatório, mín. 3 caracteres)
   * `nomeSocial` (opcional)
   * `cpfCnpj` (obrigatório, 11 ou 14 dígitos, com validação de formato/dígitos verificadores e bloqueio de duplicidade com registros existentes)
   * `rg` (opcional)
   * `dataNascimento` (obrigatório, `DatePicker` customizado no formato `DD/MM/AAAA`, não pode ser data futura nem anterior a 1900)
   * `email` (obrigatório, e-mail válido)
   * `endereco` (obrigatório, mín. 5 caracteres)
   * `estadoCivil` (obrigatório, `SelectDropdown` customizado com `"Solteiro" | "Casado" | "Viúvo" | "Divorciado"`)
   * `rendaAnual` (obrigatório, número `>= 0`)
   * `patrimonio` (obrigatório, número `>= 0`)
   * `codigoAgencia` (obrigatório, `SelectDropdown` customizado populado com as agências carregadas da planilha exibindo `Código - Nome`)
3. **Submissão em Memória:**
   * Validação via **React Hook Form + Zod**.
   * Gera `id` no front-end com `crypto.randomUUID()`.
   * Converte `dataNascimento` para objeto `Date` válido (sem erro de fuso horário).
   * Insere o novo cliente na lista em memória (`BankDataContext`), limpa os filtros (ele aparece na sua posição conforme a ordenação ativa), fecha o modal, reseta o formulário e exibe uma notificação acessível (`role="status"`) no canto inferior direito, com link **"Ver cliente"**. Ela some sozinha após 7 s, com o tempo pausado enquanto o mouse ou o foco estiverem sobre ela.

### Rota `/clientes/:id` — Detalhes do Cliente (`ClientDetailPage`)
1. **Navegação e Impressão:** Link/botão **"← Voltar para a lista"** no topo (restaurando os filtros e a página preservados na navegação de entrada) e botão **"Imprimir ficha"** (`window.print()`). Em `@media print`, cabeçalho, rodapé, abas, botões e drawer ficam ocultos e a ficha exibe simultaneamente dados cadastrais, agência e contas em layout claro. Se o `id` da URL não existir (ex.: cliente recém-cadastrado após F5), exibir estado "Cliente não encontrado" com botão para voltar à listagem.
2. **Seção 1 — Dados Cadastrais Completos:** Exibir todas as propriedades do cliente (`nome`, `nomeSocial` se houver, `cpfCnpj`, `rg` ou `"Não informado"`, `dataNascimento` formatada, `estadoCivil` ou `"Não informado"`, `email`, `endereco`, `rendaAnual` e `patrimonio` formatados em BRL).
3. **Seção 2 — Agência Vinculada (`AgencyCard`):** Cruzamento via `cliente.codigoAgencia === agencia.codigo`. Exibir `nome`, `codigo`, `endereco` e `id`.
4. **Seção 3 — Contas Bancárias (`AccountCard`):** Cruzamento via `onlyDigits(conta.cpfCnpjCliente) === onlyDigits(cliente.cpfCnpj)`. Exibir medidor consolidado acessível (`role="meter"`, `aria-valuenow`, texto `"X% do limite utilizado"` e badge com ícone + nível `"sem-credito" | "baixo" | "moderado" | "alto"`, via `getCreditUsage`). Arranjo: 1 a 3 contas em cards lado a lado, 4 contas em grade 2×2 e 5 ou mais em lista compacta. Para cada conta, exibir:
   * Badge diferenciando **Conta Corrente** e **Conta Poupança**;
   * **Saldo** (destaque visual sutil para saldo positivo vs. negativo);
   * **Limite de Crédito** e **Crédito Disponível** (com barra visual simples em CSS mostrando proporção utilizada/disponível quando `limiteCredito > 0`).

### Rota `/agencias` — Indicadores por Agência (`AgenciesPage`, lazy-loaded)
1. **Navegação:** Link **"Agências"** no `Header` (junto de **"Clientes"**, com `aria-current="page"`).
2. **Agregação (`computeAgencyStats` / `computeAgencyTotals`):** Cruzamento O(n) via `Map` indexado por `onlyDigits(cpfCnpj)` agrupando clientes, contas, saldo total, limite total e crédito disponível por agência (incluindo agências sem clientes zeradas e o grupo `"Agência não localizada"` quando houver códigos ausentes na planilha de agências).
3. **Visualização:** Cards de resumo financeiro, gráfico horizontal em CSS puro (saldo por agência proporcional ao maior saldo em valor absoluto) e tabela semântica ordenável por coluna (`aria-sort`), com links diretos para `/?agencia=CODIGO` e estados `StatusMessage` (`loading`, `error`, `empty`).

---

## 7. Diretrizes de Design (CSS Puro) e Acessibilidade (WCAG 2.2 AA)

### Identidade Visual Bancária (Tokens em `src/styles/tokens.css`)
* **Paleta sugerida:**
  * Primária (Institucional): Azul-marinho profundo (`#0f2942`) e hover (`#1a3f63`).
  * Destaque/Ação: Azul confiável (`#1d5fa7`).
  * Fundo da página: Cinza-azulado muito suave (`#f4f6f9`).
  * Superfície (cards/tabelas/modal): Branco puro (`#ffffff`) com borda sutil (`#dce3ec`).
  * Texto principal: `#142130` | Texto secundário: `#4d5e70` (garantindo contraste `>= 4.5:1`).
  * Semânticas: Sucesso `#157347`, Erro `#b42318`, Alerta `#b54708`.
* **Tema Escuro (`:root[data-theme="dark"]`):** Sobrescrita apenas de tokens em `@media screen` garantindo contraste WCAG AA (`>= 4.5:1`), tema claro como padrão inicial, alternância acessível no `Header` (`Sun`/`Moon`, `aria-pressed`), persistência em `localStorage`, prevenção de flash (FOUC) via script síncrono no `index.html` e preservação do tema claro em `@media print`.
* **Tipografia:** Pilha de fontes do sistema (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) + `font-variant-numeric: tabular-nums` para valores monetários e CPFs alinhados.
* **Espaçamento:** Escala consistente (`--space-1: 0.25rem` até `--space-8: 2rem`).

### Checklist de Acessibilidade Obrigatório
* Estrutura semântica: `<header>`, `<main>`, `<nav aria-label="...">`, `<section aria-labelledby="...">`, hierarquia correta de headings (`h1` → `h2` → `h3`).
* Botões nativos (`<button type="button">` / `<button type="submit">`) para ações e `<Link>`/`<a>` para navegação — nunca `<div onClick>`.
* Todos os inputs com `<label htmlFor="...">` explícito, `aria-invalid` em caso de erro e mensagem de erro vinculada via `aria-describedby` com `role="alert"`.
* Anel de foco visível (`:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 2px; }`).
* Navegação completa via teclado (`Tab`, `Shift+Tab`, `Enter`, `Esc`).
* Respeito a `@media (prefers-reduced-motion: reduce)`.

---

## 8. Plano de Commits Incrementais (Git)

Manter o histórico limpo e demonstrativo da evolução do sistema:
1. `chore: inicializa projeto Vite React TypeScript e adiciona SPEC`
2. `feat: adiciona interfaces de dominio, utilitarios de normalizacao e servico de leitura CSV`
3. `style: cria design tokens e estilos globais em CSS puro`
4. `feat: implementa contexto de dados em memoria e listagem de clientes com busca e paginacao`
5. `feat: adiciona pagina de detalhes do cliente com contas bancarias e agencia`
6. `feat: implementa modal acessivel de cadastro de cliente com React Hook Form e Zod`
7. `chore: adiciona configuracao de deploy SPA, README e ajustes de revisao`
