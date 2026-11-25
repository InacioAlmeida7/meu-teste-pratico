import { z } from "zod";
import {
  cleanOptionalText,
  getLocalToday,
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
 * Aceita apenas dígitos, `.`, `,`, `-` e prefixo `R$` (evita que `"12abc"` vire 12)
 * e delega a interpretação BR/US a `parseNumber`.
 */
function parseMoneyInput(rawValue: string): number | null {
  const sanitized = rawValue.replace(/\s+/g, "");
  if (!/^(?:R\$)?-?[\d.,]+$/i.test(sanitized)) {
    return null;
  }
  return parseNumber(sanitized);
}

/**
 * Campo monetário obrigatório e não negativo. Cada valor é convertido uma única vez;
 * `z.NEVER` interrompe a transformação quando há erro.
 */
function moneyField(messages: { required: string; invalid: string; negative: string }) {
  return z
    .string()
    .trim()
    .min(1, messages.required)
    .transform((value, ctx) => {
      const parsed = parseMoneyInput(value);
      if (parsed === null) {
        ctx.issues.push({
          code: "custom",
          message: messages.invalid,
          input: value,
        });
        return z.NEVER;
      }
      if (parsed < 0) {
        ctx.issues.push({
          code: "custom",
          message: messages.negative,
          input: value,
        });
        return z.NEVER;
      }
      return parsed;
    });
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
    .transform((value, ctx) => {
      const fail = (message: string) => {
        ctx.issues.push({ code: "custom", message, input: value });
        return z.NEVER;
      };

      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return fail("Informe uma data válida no formato DD/MM/AAAA.");
      }
      const date = parseDate(value);
      if (Number.isNaN(date.getTime())) {
        return fail("Data de nascimento inválida.");
      }
      if (date.getFullYear() < 1900) {
        return fail("A data de nascimento não pode ser anterior a 1900.");
      }
      if (date.getTime() > getLocalToday().getTime()) {
        return fail("A data de nascimento não pode ser futura.");
      }
      return date;
    }),

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
    .pipe(z.enum(ESTADO_CIVIL_OPTIONS, "Selecione um estado civil válido.")),

  rendaAnual: moneyField({
    required: "Informe a renda anual.",
    invalid: "Informe um valor numérico válido para a renda anual.",
    negative: "A renda anual não pode ser negativa.",
  }),

  patrimonio: moneyField({
    required: "Informe o patrimônio.",
    invalid: "Informe um valor numérico válido para o patrimônio.",
    negative: "O patrimônio não pode ser negativo.",
  }),

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
