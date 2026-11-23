import type { EstadoCivil, TipoConta } from "../types/models";

/**
 * Normaliza qualquer valor vindo do CSV para texto limpo sem espaços nas pontas.
 * Evita falhas quando células vazias ou colunas ausentes chegam como undefined.
 */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

/**
 * Converte campos opcionais vazios (como `rg` e `nomeSocial`) em `undefined`,
 * mantendo o contrato das interfaces sem strings vazias artificiais.
 */
export function cleanOptionalText(value: unknown): string | undefined {
  const cleaned = cleanText(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Remove qualquer caractere não numérico.
 * Usado para padronizar cruzamentos entre Cliente e Conta e buscas por CPF/CNPJ
 * com ou sem máscara.
 */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Remove diacríticos (acentos) para comparações insensíveis a acentuação.
 */
export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza CPF/CNPJ lido do Google Sheets sem descartar documentos fictícios da base.
 *
 * Decisões baseadas na inspeção real das planilhas:
 * 1. O Google Sheets trata células numéricas sem formatação de texto como números,
 *    removendo zeros à esquerda de 8 CPFs reais da planilha (ex.: `11122233` era `00011122233`).
 *    Por isso restauramos zeros à esquerda para 11 dígitos (CPF) ou 14 dígitos (CNPJ)
 *    quando o valor contém dígitos significativos.
 * 2. Valores compostos apenas por zero (ex.: `"0"` na conta órfã `CNT-108`) são preservados
 *    como estão para não mascarar uma anomalia real em um CPF aparente.
 * 3. Não validamos dígitos verificadores na ingestão do CSV porque 99 de 100 documentos
 *    da base de dados são fictícios (ex.: `11122233344`, `12345678000199`).
 */
export function normalizeCpfCnpj(value: unknown): string {
  const digits = onlyDigits(cleanText(value));
  if (digits.length === 0) {
    return "";
  }

  const isOnlyZeros = /^0+$/.test(digits);
  if (isOnlyZeros) {
    return digits;
  }

  if (digits.length < 11) {
    return digits.padStart(11, "0");
  }

  if (digits.length > 11 && digits.length < 14) {
    return digits.padStart(14, "0");
  }

  return digits;
}

/**
 * Cria uma data local validando se o calendário não sofreu overflow
 * (ex.: rejeita `2024-02-31` em vez de converter silenciosamente para março).
 */
function buildLocalDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(Number.NaN);
  }
  return date;
}

/**
 * Converte strings de data (`YYYY-MM-DD`, `DD/MM/YYYY`, ISO completo ou timestamp)
 * em objeto `Date` sem deslocamento de fuso horário para datas sem hora.
 *
 * Na planilha real, `dataNascimento` vem em `YYYY-MM-DD`; usar `new Date("YYYY-MM-DD")`
 * interpreta UTC e desloca 1 dia para trás em fusos negativos (como GMT-3 no Brasil).
 */
export function parseDate(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }

  const raw = cleanText(value);
  if (!raw) {
    return new Date(Number.NaN);
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    return buildLocalDate(year, month, day);
  }

  const brDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (brDateMatch) {
    const day = Number(brDateMatch[1]);
    const month = Number(brDateMatch[2]);
    const year = Number(brDateMatch[3]);
    return buildLocalDate(year, month, day);
  }

  if (/^\d+$/.test(raw)) {
    const timestamp = Number(raw);
    if (Number.isFinite(timestamp)) {
      return new Date(timestamp);
    }
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? new Date(Number.NaN) : fallback;
}

/**
 * Converte valores monetários ou numéricos em `number`, suportando tanto o padrão
 * americano da planilha atual (`"85000.00"`, `"1,250.50"`) quanto o padrão brasileiro
 * (`"R$ 1.250,50"`, `"1250,50"`). Retorna `0` em caso de valor vazio ou inválido.
 */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = cleanText(value);
  if (!raw) {
    return 0;
  }

  const sanitized = raw.replace(/R\$/gi, "").replace(/[^0-9.,+-]/g, "");
  if (!sanitized) {
    return 0;
  }

  const hasComma = sanitized.includes(",");
  const hasDot = sanitized.includes(".");

  let normalized = sanitized;

  if (hasComma && hasDot) {
    const lastComma = sanitized.lastIndexOf(",");
    const lastDot = sanitized.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Formato BR: 1.250,50 -> 1250.50
      normalized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato US: 1,250.50 -> 1250.50
      normalized = sanitized.replace(/,/g, "");
    }
  } else if (hasComma) {
    const commaCount = (sanitized.match(/,/g) ?? []).length;
    normalized = commaCount > 1 ? sanitized.replace(/,/g, "") : sanitized.replace(",", ".");
  } else if (hasDot) {
    const dotCount = (sanitized.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      normalized = sanitized.replace(/\./g, "");
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Converte códigos inteiros (como `codigo` de agência e `codigoAgencia`) de forma estrita.
 * Retorna `null` se estiver ausente ou não representar um número inteiro válido.
 */
export function parseInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  const raw = cleanText(value);
  if (!/^-?\d+$/.test(raw)) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

const ESTADO_CIVIL_MAP: Record<string, EstadoCivil> = {
  solteiro: "Solteiro",
  solteira: "Solteiro",
  casado: "Casado",
  casada: "Casado",
  viuvo: "Viúvo",
  viuva: "Viúvo",
  divorciado: "Divorciado",
  divorciada: "Divorciado",
};

/**
 * Mapeia variações de caixa, acentuação e gênero para o domínio fechado de `EstadoCivil`.
 */
export function normalizeEstadoCivil(value: unknown): EstadoCivil | null {
  const key = stripAccents(cleanText(value)).toLowerCase();
  return ESTADO_CIVIL_MAP[key] ?? null;
}

const TIPO_CONTA_MAP: Record<string, TipoConta> = {
  corrente: "corrente",
  "conta corrente": "corrente",
  poupanca: "poupanca",
  "conta poupanca": "poupanca",
};

/**
 * Mapeia variações de caixa e acentuação (ex.: `"Poupança"`, `"POUPANCA"`)
 * para `"corrente" | "poupanca"`.
 */
export function normalizeTipoConta(value: unknown): TipoConta | null {
  const key = stripAccents(cleanText(value)).toLowerCase();
  return TIPO_CONTA_MAP[key] ?? null;
}
