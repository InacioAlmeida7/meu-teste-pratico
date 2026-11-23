import { cleanText, onlyDigits } from "./normalizers";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formata um valor numérico em Real Brasileiro (R$ 1.234,56).
 * Protege a interface contra NaN/Infinity retornando R$ 0,00.
 */
export function formatCurrencyBRL(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return brlFormatter.format(safeValue);
}

/**
 * Formata um objeto `Date` no padrão brasileiro `DD/MM/AAAA`.
 * Retorna `"Não informada"` caso a data seja inválida, evitando exibir `"Invalid Date"`.
 */
export function formatDateBR(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Não informada";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Aplica máscara de CPF (`000.000.000-00`) para 11 dígitos ou CNPJ (`00.000.000/0000-00`)
 * para 14 dígitos. Para tamanhos fora desse padrão, retorna o texto limpo sem distorcer o dado.
 */
export function formatCpfCnpj(value: string): string {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }

  return cleanText(value);
}
