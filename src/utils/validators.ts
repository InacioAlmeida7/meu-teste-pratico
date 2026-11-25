// Implementação local (e não a de `normalizers.ts`) para evitar import circular:
// `normalizeCpfCnpj` usa estes validadores para desambiguar CPF/CNPJ.
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida CPF verificando tamanho (11 dígitos), sequência repetida e os dois dígitos verificadores.
 * Deve ser usada na entrada de novos cadastros no formulário — não na leitura do CSV,
 * pois a planilha oficial contém CPFs fictícios para teste.
 */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calcCheckDigit = (sliceLength: number, initialWeight: number): number => {
    let sum = 0;
    for (let i = 0; i < sliceLength; i += 1) {
      sum += Number(digits[i]) * (initialWeight - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calcCheckDigit(9, 10);
  if (firstDigit !== Number(digits[9])) {
    return false;
  }

  const secondDigit = calcCheckDigit(10, 11);
  return secondDigit === Number(digits[10]);
}

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/**
 * Valida CNPJ verificando tamanho (14 dígitos), sequência repetida e os dois dígitos verificadores.
 * Deve ser usada na validação do formulário de cadastro — não na ingestão do CSV.
 */
export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);

  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calcCheckDigit = (weights: readonly number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i += 1) {
      sum += Number(digits[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcCheckDigit(CNPJ_FIRST_WEIGHTS);
  if (firstDigit !== Number(digits[12])) {
    return false;
  }

  const secondDigit = calcCheckDigit(CNPJ_SECOND_WEIGHTS);
  return secondDigit === Number(digits[13]);
}

/**
 * Valida documento brasileiro aceitando CPF (11 dígitos) ou CNPJ (14 dígitos).
 */
export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return isValidCpf(digits);
  }

  if (digits.length === 14) {
    return isValidCnpj(digits);
  }

  return false;
}
