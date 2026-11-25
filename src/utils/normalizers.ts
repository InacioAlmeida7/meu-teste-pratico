import type { EstadoCivil, TipoConta } from "../types/models";
import { isValidCnpj, isValidCpf } from "./validators";

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
 * 3. Não rejeitamos documentos por dígito verificador na ingestão porque 99 de 100 documentos
 *    da base de dados são fictícios (ex.: `11122233344`, `12345678000199`).
 * 4. Com 11 dígitos ou menos não dá para saber pelo tamanho se era um CNPJ que perdeu zeros
 *    (ex.: `00012345000190`). Nesse caso o DV desempata: só vira CNPJ se for um CNPJ válido
 *    e não um CPF válido; documentos fictícios continuam sendo tratados como CPF.
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

  if (digits.length <= 11) {
    const asCpf = digits.padStart(11, "0");
    const asCnpj = digits.padStart(14, "0");
    return !isValidCpf(asCpf) && isValidCnpj(asCnpj) ? asCnpj : asCpf;
  }

  if (digits.length < 14) {
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
 * Retorna o início do dia atual no fuso local (00:00), usado como data máxima de nascimento.
 */
export function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Converte strings de data (`YYYY-MM-DD`, ISO com hora, `DD/MM/YYYY` ou `YYYYMMDD`)
 * em objeto `Date` local, sem deslocamento de fuso horário.
 *
 * Na planilha real, `dataNascimento` vem em `YYYY-MM-DD`; usar `new Date("YYYY-MM-DD")`
 * interpreta UTC e desloca 1 dia para trás em fusos negativos (como GMT-3 no Brasil).
 * Para ISO com hora (`1990-05-14T00:00:00Z`) também usamos só a parte da data: em uma
 * data de nascimento o que importa é o dia do calendário, não o instante.
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

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(raw);
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

  const compactDateMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (compactDateMatch) {
    const year = Number(compactDateMatch[1]);
    const month = Number(compactDateMatch[2]);
    const day = Number(compactDateMatch[3]);
    return buildLocalDate(year, month, day);
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? new Date(Number.NaN) : fallback;
}

/**
 * Converte valores monetários ou numéricos em `number`, suportando tanto o padrão
 * americano da planilha atual (`"85000.00"`, `"1,250.50"`) quanto o padrão brasileiro
 * (`"R$ 1.250,50"`, `"1250,50"`, `"85.000"`). Retorna `null` se vazio ou inválido,
 * para o chamador decidir entre avisar, rejeitar ou aplicar fallback.
 */
export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = cleanText(value);
  if (!raw) {
    return null;
  }

  const sanitized = raw.replace(/R\$/gi, "").replace(/[^0-9.,+-]/g, "");
  if (!/\d/.test(sanitized)) {
    return null;
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
  } else if (hasComma || hasDot) {
    const separator = hasComma ? "," : ".";
    // Um único tipo de separador seguido de grupos de exatamente 3 dígitos
    // (`85.000`, `1.250.000`, `1,250`) é separador de milhar, não decimal.
    // Valores monetários com casas decimais usam 2 dígitos (`4250.75`, `1250,50`).
    const isThousandsGrouping = /^[+-]?[1-9]\d{0,2}(?:[.,]\d{3})+$/.test(sanitized);
    if (isThousandsGrouping) {
      normalized = sanitized.split(separator).join("");
    } else if (hasComma) {
      normalized = sanitized.replace(",", ".");
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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
