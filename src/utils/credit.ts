import type { Conta } from "../types/models";
import { onlyDigits } from "./normalizers";

export type CreditUsageLevel = "sem-credito" | "baixo" | "moderado" | "alto";

export interface CreditUsage {
  limiteTotal: number;
  disponivelTotal: number;
  usado: number;
  percentualUsado: number;
  nivel: CreditUsageLevel;
}

/**
 * Consolida limite, crédito disponível, valor utilizado e nível de risco
 * a partir das contas do cliente. Trata limite total <= 0 sem divisão por zero
 * e limita `usado` e `percentualUsado` para absorver dados inconsistentes da planilha
 * (ex.: crédito disponível maior que o limite contratado).
 */
export function getCreditUsage(contas: Conta[]): CreditUsage {
  let rawLimiteTotal = 0;
  let disponivelTotal = 0;

  for (const conta of contas) {
    if (Number.isFinite(conta.limiteCredito)) {
      rawLimiteTotal += conta.limiteCredito;
    }
    if (Number.isFinite(conta.creditoDisponivel)) {
      disponivelTotal += conta.creditoDisponivel;
    }
  }

  const limiteTotal = Math.max(0, rawLimiteTotal);

  if (limiteTotal <= 0) {
    return {
      limiteTotal: 0,
      disponivelTotal,
      usado: 0,
      percentualUsado: 0,
      nivel: "sem-credito",
    };
  }

  const usado = Math.max(0, limiteTotal - disponivelTotal);
  const percentualUsado = Math.min(
    100,
    Math.max(0, (usado / limiteTotal) * 100),
  );

  let nivel: CreditUsageLevel = "baixo";
  if (percentualUsado >= 80) {
    nivel = "alto";
  } else if (percentualUsado >= 50) {
    nivel = "moderado";
  }

  return {
    limiteTotal,
    disponivelTotal,
    usado,
    percentualUsado,
    nivel,
  };
}

/**
 * Agrupa as contas uma única vez por documento (somente dígitos) e calcula
 * o nível de uso de crédito de cada cliente para consulta O(1) na listagem.
 */
export function buildCreditUsageLevelMap(
  contas: Conta[],
): Map<string, CreditUsageLevel> {
  const contasByDoc = new Map<string, Conta[]>();

  for (const conta of contas) {
    const docDigits = onlyDigits(conta.cpfCnpjCliente);
    if (docDigits.length === 0) {
      continue;
    }
    const existing = contasByDoc.get(docDigits);
    if (existing) {
      existing.push(conta);
    } else {
      contasByDoc.set(docDigits, [conta]);
    }
  }

  const levelMap = new Map<string, CreditUsageLevel>();
  for (const [docDigits, clientContas] of contasByDoc) {
    levelMap.set(docDigits, getCreditUsage(clientContas).nivel);
  }
  return levelMap;
}
