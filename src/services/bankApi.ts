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

/**
 * Busca um arquivo CSV em tempo de execução via Fetch API e retorna o corpo como texto.
 */
async function fetchCsvText(
  url: string,
  sourceName: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(url, { signal });

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
 */
function parseCsvRows(csvText: string, sourceName: string): CsvRow[] {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string, index: number) => {
      const trimmed = header.trim();
      return trimmed.length > 0 ? trimmed : `__empty_${index}`;
    },
  });

  if (parsed.errors.length > 0) {
    console.warn(
      `[bankApi] Avisos de parsing no CSV de ${sourceName}:`,
      parsed.errors,
    );
  }

  return parsed.data;
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

  const id = cleanText(row.id) || `cli-row-${index + 1}`;
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
    rendaAnual: parseNumber(row.rendaAnual),
    patrimonio: parseNumber(row.patrimonio),
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

  const id = cleanText(row.id) || `cnt-row-${index + 1}`;

  if (cpfCnpjCliente.length !== 11 && cpfCnpjCliente.length !== 14) {
    console.warn(
      `[bankApi] Conta ${id} possui cpfCnpjCliente fora do padrão (${cpfCnpjCliente}); mantida para rastreabilidade sem vincular a clientes.`,
    );
  }

  return {
    id,
    cpfCnpjCliente,
    tipo,
    saldo: parseNumber(row.saldo),
    limiteCredito: parseNumber(row.limiteCredito),
    creditoDisponivel: parseNumber(row.creditoDisponivel),
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

  const id = cleanText(row.id) || `ag-row-${index + 1}`;

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

  const clientes = parseCsvRows(clientesCsv, "clientes")
    .map(mapRowToCliente)
    .filter((cliente): cliente is Cliente => cliente !== null);

  const contas = parseCsvRows(contasCsv, "contas")
    .map(mapRowToConta)
    .filter((conta): conta is Conta => conta !== null);

  const agencias = parseCsvRows(agenciasCsv, "agencias")
    .map(mapRowToAgencia)
    .filter((agencia): agencia is Agencia => agencia !== null);

  return { clientes, contas, agencias };
}
