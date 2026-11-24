import { z } from "zod";
import type { EstadoCivil } from "../types/models";
import {
  cleanOptionalText,
  onlyDigits,
  parseDate,
  parseInteger,
  parseNumber,
} from "../utils/normalizers";
import { isValidCpfCnpj } from "../utils/validators";

export const ESTADO_CIVIL_OPTIONS = [
  "Solteiro",
  "Casado",
  "Viúvo",
  "Divorciado",
] as const;

/**
 * Retorna a data local atual no formato `YYYY-MM-DD` para uso no atributo `max`
 * de `<input type="date">` e comparação sem deslocamento de fuso UTC.
 */
export function getTodayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseMoneyInput(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const sanitized = trimmed.replace(/\s+/g, "");
  if (!/^(?:R\$)?-?[\d.,]+$/i.test(sanitized) || !/\d/.test(sanitized)) {
    return null;
  }

  return parseNumber(trimmed);
}

function getLocalTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Schema Zod para validação do cadastro em memória de novos clientes,
 * respeitando integralmente o contrato `Cliente` do SPEC.md.
 */
export const clienteSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome completo com pelo menos 3 caracteres."),

  nomeSocial: z
    .string()
    .optional()
    .transform((value) => cleanOptionalText(value)),

  cpfCnpj: z
    .string()
    .trim()
    .min(1, "Informe o CPF ou CNPJ.")
    .refine((value) => {
      const digits = onlyDigits(value);
      return digits.length === 11 || digits.length === 14;
    }, "O documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).")
    .refine(
      (value) => isValidCpfCnpj(value),
      "CPF ou CNPJ inválido pelos dígitos verificadores.",
    )
    .transform((value) => onlyDigits(value)),

  rg: z
    .string()
    .optional()
    .transform((value) => cleanOptionalText(value)),

  dataNascimento: z
    .string()
    .trim()
    .min(1, "Informe a data de nascimento.")
    .refine(
      (value) => /^(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(value),
      "Informe uma data válida no formato DD/MM/AAAA.",
    )
    .refine(
      (value) => !Number.isNaN(parseDate(value).getTime()),
      "Data de nascimento inválida.",
    )
    .refine(
      (value) => parseDate(value).getFullYear() >= 1900,
      "A data de nascimento não pode ser anterior a 1900.",
    )
    .refine(
      (value) => parseDate(value).getTime() <= getLocalTodayStart().getTime(),
      "A data de nascimento não pode ser futura.",
    )
    .transform((value) => parseDate(value)),

  email: z
    .string()
    .trim()
    .min(1, "Informe o endereço de e-mail.")
    .pipe(z.email("Informe um endereço de e-mail válido.")),

  endereco: z
    .string()
    .trim()
    .min(5, "Informe o endereço completo com pelo menos 5 caracteres."),

  estadoCivil: z
    .string()
    .refine(
      (value): value is EstadoCivil =>
        (ESTADO_CIVIL_OPTIONS as readonly string[]).includes(value),
      "Selecione um estado civil válido.",
    ),

  rendaAnual: z
    .string()
    .trim()
    .min(1, "Informe a renda anual.")
    .refine(
      (value) => parseMoneyInput(value) !== null,
      "Informe um valor numérico válido para a renda anual.",
    )
    .refine((value) => {
      const parsed = parseMoneyInput(value);
      return parsed !== null && parsed >= 0;
    }, "A renda anual não pode ser negativa.")
    .transform((value) => parseMoneyInput(value) ?? 0),

  patrimonio: z
    .string()
    .trim()
    .min(1, "Informe o patrimônio.")
    .refine(
      (value) => parseMoneyInput(value) !== null,
      "Informe um valor numérico válido para o patrimônio.",
    )
    .refine((value) => {
      const parsed = parseMoneyInput(value);
      return parsed !== null && parsed >= 0;
    }, "O patrimônio não pode ser negativo.")
    .transform((value) => parseMoneyInput(value) ?? 0),

  codigoAgencia: z
    .string()
    .trim()
    .min(1, "Selecione a agência vinculada.")
    .refine((value) => {
      const parsed = parseInteger(value);
      return parsed !== null && parsed > 0;
    }, "Selecione uma agência válida.")
    .transform((value) => parseInteger(value) ?? 0),
});

export type ClienteFormInput = z.input<typeof clienteSchema>;
export type ClienteFormOutput = z.output<typeof clienteSchema>;
