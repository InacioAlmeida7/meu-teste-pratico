import Papa from "papaparse";
import type { Agencia, BankData, Cliente, Conta, CsvRow } from "../types/models";
import {
  cleanOptionalText,
  cleanText,
  normalizeCpfCnpj,
  normalizeEstadoCivil,
  normalizeTipoConta,
  parseDate,
  parseInteger,
  parseNumber,
} from "../utils/normalizers";

export const BANK_SHEET_URLS = {
  clientes:
    "https://docs.google.com/spreadsheets/d/1LkyaeCgiyaIN1IxXnbZQPmVMIcht3PIxMDUXHsvczK0/gviz/tq?tqx=out:csv&sheet=clientes",
  contas:
    "https://docs.google.com/spreadsheets/d/1LkyaeCgiyaIN1IxXnbZQPmVMIcht3PIxMDUXHsvczK0/gviz/tq?tqx=out:csv&sheet=contas",
  agencias:
    "https://docs.google.com/spreadsheets/d/1LkyaeCgiyaIN1IxXnbZQPmVMIcht3PIxMDUXHsvczK0/gviz/tq?tqx=out:csv&sheet=agencias",
} as const;

const CLIENTES_HEADERS = [
  "id",
  "cpfCnpj",
  "rg",
  "dataNascimento",
  "nome",
  "nomeSocial",
  "email",
  "endereco",
  "rendaAnual",
  "patrimonio",
  "estadoCivil",
  "codigoAgencia",
] as const;
const CONTAS_HEADERS = [
  "id",
  "cpfCnpjCliente",
  "tipo",
  "saldo",
  "limiteCredito",
  "creditoDisponivel",
] as const;
const AGENCIAS_HEADERS = ["id", "codigo", "nome", "endereco"] as const;

/**
 * Busca um arquivo CSV em tempo de execução via Fetch API e retorna o corpo como texto.
 */
async function fetchCsvText(
  url: string,
  sourceName: string,
  signal?: AbortSignal,
): Promise<string> {
  // `no-store` garante a leitura viva da planilha, sem cópia em cache HTTP.
  const response = await fetch(url, { signal, cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar planilha de ${sourceName} (HTTP ${response.status}).`,
    );
  }

  return response.text();
}

/**
 * Faz o parsing de texto CSV via PapaParse preservando resiliência contra colunas extras vazias.
 * A planilha real de `clientes` exporta 14 colunas vazias à direita; renomeá-las em
 * `transformHeader` evita alertas falsos de cabeçalho duplicado sem descartar dados.
 *
 * Colunas extras são toleradas, mas a falta de uma coluna obrigatória (renomeação na
 * planilha ou resposta HTML de erro/login do Google) vira erro explícito na tela,
 * em vez de descartar todas as linhas e exibir uma listagem vazia enganosa.
 */
function parseCsvRows(
  csvText: string,
  sourceName: string,
  requiredHeaders: readonly string[],
): CsvRow[] {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string, index: number) => {
      const trimmed = header.trim();
      return trimmed.length > 0 ? trimmed : `__empty_${index}`;
    },
  });

  const headers = new Set(parsed.meta.fields ?? []);
  const missingHeaders = requiredHeaders.filter((header) => !headers.has(header));
  if (missingHeaders.length > 0) {
    throw new Error(
      `A planilha de ${sourceName} não possui as colunas obrigatórias: ${missingHeaders.join(", ")}.`,
    );
  }

  if (parsed.errors.length > 0) {
    console.warn(
      `[bankApi] Avisos de parsing no CSV de ${sourceName}:`,
      parsed.errors,
    );
  }

  return parsed.data;
}

/**
 * Lê um valor monetário da planilha. Célula preenchida com texto não numérico é
 * exibida como 0 (o contrato exige `number`), mas fica registrada no console.
 */
function readAmount(value: unknown, context: string): number {
  const parsed = parseNumber(value);
  if (parsed === null && cleanText(value)) {
    console.warn(
      `[bankApi] ${context} possui valor numérico inválido ("${cleanText(value)}"); exibido como 0.`,
    );
  }
  return parsed ?? 0;
}

/**
 * Mantém apenas a primeira ocorrência de cada `id`: ids repetidos gerariam
 * `key` duplicada no React e rotas `/clientes/:id` ambíguas.
 */
function dedupeById<T extends { id: string }>(items: T[], sourceName: string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      console.warn(`[bankApi] ${sourceName}: id duplicado "${item.id}" ignorado.`);
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function mapRowToCliente(row: CsvRow, index: number): Cliente | null {
  const nome = cleanText(row.nome);
  const cpfCnpj = normalizeCpfCnpj(row.cpfCnpj);

  if (!nome || !cpfCnpj) {
    console.warn(
      `[bankApi] Linha ${index + 2} de clientes ignorada: nome ou cpfCnpj ausente.`,
    );
    return null;
  }

  const id = cleanText(row.id) || `cli-row-${index + 2}`;
  const dataNascimento = parseDate(row.dataNascimento);

  if (Number.isNaN(dataNascimento.getTime())) {
    console.warn(
      `[bankApi] Cliente ${id} (${nome}) possui dataNascimento inválida: "${cleanText(row.dataNascimento)}".`,
    );
  }

  const estadoCivil = normalizeEstadoCivil(row.estadoCivil);
  if (!estadoCivil) {
    console.warn(
      `[bankApi] Cliente ${id} (${nome}) possui estadoCivil não reconhecido ("${cleanText(row.estadoCivil)}"); aplicado fallback "Solteiro".`,
    );
  }

  const codigoAgencia = parseInteger(row.codigoAgencia);
  if (codigoAgencia === null) {
    console.warn(
      `[bankApi] Cliente ${id} (${nome}) possui codigoAgencia inválido ("${cleanText(row.codigoAgencia)}"); aplicado fallback 0.`,
    );
  }

  return {
    id,
    cpfCnpj,
    rg: cleanOptionalText(row.rg),
    dataNascimento,
    nome,
    nomeSocial: cleanOptionalText(row.nomeSocial),
    email: cleanText(row.email),
    endereco: cleanText(row.endereco),
    rendaAnual: readAmount(row.rendaAnual, `Cliente ${id} (rendaAnual)`),
    patrimonio: readAmount(row.patrimonio, `Cliente ${id} (patrimonio)`),
    estadoCivil: estadoCivil ?? "Solteiro",
    codigoAgencia: codigoAgencia ?? 0,
  };
}

function mapRowToConta(row: CsvRow, index: number): Conta | null {
  const cpfCnpjCliente = normalizeCpfCnpj(row.cpfCnpjCliente);
  const tipo = normalizeTipoConta(row.tipo);

  if (!cpfCnpjCliente || !tipo) {
    console.warn(
      `[bankApi] Linha ${index + 2} de contas ignorada: cpfCnpjCliente ou tipo inválido.`,
    );
    return null;
  }

  const id = cleanText(row.id) || `cnt-row-${index + 2}`;

  if (cpfCnpjCliente.length !== 11 && cpfCnpjCliente.length !== 14) {
    console.warn(
      `[bankApi] Conta ${id} possui cpfCnpjCliente fora do padrão (${cpfCnpjCliente}); mantida para rastreabilidade sem vincular a clientes.`,
    );
  }

  return {
    id,
    cpfCnpjCliente,
    tipo,
    saldo: readAmount(row.saldo, `Conta ${id} (saldo)`),
    limiteCredito: readAmount(row.limiteCredito, `Conta ${id} (limiteCredito)`),
    creditoDisponivel: readAmount(
      row.creditoDisponivel,
      `Conta ${id} (creditoDisponivel)`,
    ),
  };
}

function mapRowToAgencia(row: CsvRow, index: number): Agencia | null {
  const codigo = parseInteger(row.codigo);
  const nome = cleanText(row.nome);

  if (codigo === null || !nome) {
    console.warn(
      `[bankApi] Linha ${index + 2} de agencias ignorada: codigo ou nome inválido.`,
    );
    return null;
  }

  const id = cleanText(row.id) || `ag-row-${index + 2}`;

  return {
    id,
    codigo,
    nome,
    endereco: cleanText(row.endereco),
  };
}

/**
 * Carrega simultaneamente clientes, contas e agências das planilhas vivas do Google Sheets.
 * Suporta cancelamento de requisição via `AbortSignal`.
 */
export async function fetchBankData(signal?: AbortSignal): Promise<BankData> {
  const [clientesCsv, contasCsv, agenciasCsv] = await Promise.all([
    fetchCsvText(BANK_SHEET_URLS.clientes, "clientes", signal),
    fetchCsvText(BANK_SHEET_URLS.contas, "contas", signal),
    fetchCsvText(BANK_SHEET_URLS.agencias, "agencias", signal),
  ]);

  const clientes = parseCsvRows(clientesCsv, "clientes", CLIENTES_HEADERS)
    .map(mapRowToCliente)
    .filter((cliente): cliente is Cliente => cliente !== null);

  const contas = parseCsvRows(contasCsv, "contas", CONTAS_HEADERS)
    .map(mapRowToConta)
    .filter((conta): conta is Conta => conta !== null);

  const agencias = parseCsvRows(agenciasCsv, "agencias", AGENCIAS_HEADERS)
    .map(mapRowToAgencia)
    .filter((agencia): agencia is Agencia => agencia !== null);

  return {
    clientes: dedupeById(clientes, "clientes"),
    contas: dedupeById(contas, "contas"),
    agencias: dedupeById(agencias, "agencias"),
  };
}
