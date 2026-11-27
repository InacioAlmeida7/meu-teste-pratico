import type { BankData } from "../types/models";
import { onlyDigits } from "./normalizers";

export const MISSING_AGENCY_KEY = "nao-localizada";

export interface AgencyStat {
  key: string;
  codigo: number | null;
  nome: string;
  endereco: string;
  isMissingAgency: boolean;
  totalClientes: number;
  totalContas: number;
  saldoTotal: number;
  limiteTotal: number;
  creditoDisponivelTotal: number;
  /** Código usado para filtrar `/?agencia=CODIGO` (nulo se houver múltiplos códigos desconhecidos). */
  filterAgenciaCode: number | null;
}

export interface AgencyTotals {
  totalAgenciasCadastradas: number;
  totalClientes: number;
  totalContas: number;
  saldoTotal: number;
  limiteTotal: number;
  creditoDisponivelTotal: number;
  hasMissingAgencyGroup: boolean;
}

/**
 * Agrega indicadores gerenciais por agência em O(A + C + M), sem buscas aninhadas.
 * - Agências cadastradas sem clientes permanecem no resultado com totais zerados.
 * - Contas são associadas ao cliente via `Map` indexado por `onlyDigits(cpfCnpj)`.
 * - Clientes cujo `codigoAgencia` não existe na base de agências são reunidos no grupo
 *   "Agência não localizada".
 */
export function computeAgencyStats(data: BankData): AgencyStat[] {
  const statsByCode = new Map<number, AgencyStat>();

  for (const agencia of data.agencias) {
    if (statsByCode.has(agencia.codigo)) {
      continue;
    }
    statsByCode.set(agencia.codigo, {
      key: String(agencia.codigo),
      codigo: agencia.codigo,
      nome: agencia.nome,
      endereco: agencia.endereco,
      isMissingAgency: false,
      totalClientes: 0,
      totalContas: 0,
      saldoTotal: 0,
      limiteTotal: 0,
      creditoDisponivelTotal: 0,
      filterAgenciaCode: agencia.codigo,
    });
  }

  let missingStat: AgencyStat | null = null;
  const missingCodes = new Set<number>();
  const targetStatByClientDoc = new Map<string, AgencyStat>();

  for (const cliente of data.clientes) {
    let target = statsByCode.get(cliente.codigoAgencia);

    if (!target) {
      if (!missingStat) {
        missingStat = {
          key: MISSING_AGENCY_KEY,
          codigo: null,
          nome: "Agência não localizada",
          endereco: "Clientes vinculados a códigos ausentes na planilha de agências",
          isMissingAgency: true,
          totalClientes: 0,
          totalContas: 0,
          saldoTotal: 0,
          limiteTotal: 0,
          creditoDisponivelTotal: 0,
          filterAgenciaCode: null,
        };
      }
      missingCodes.add(cliente.codigoAgencia);
      target = missingStat;
    }

    target.totalClientes += 1;

    const docDigits = onlyDigits(cliente.cpfCnpj);
    if (docDigits.length > 0 && !targetStatByClientDoc.has(docDigits)) {
      targetStatByClientDoc.set(docDigits, target);
    }
  }

  for (const conta of data.contas) {
    const docDigits = onlyDigits(conta.cpfCnpjCliente);
    if (docDigits.length === 0) {
      continue;
    }
    const target = targetStatByClientDoc.get(docDigits);
    if (!target) {
      continue;
    }

    target.totalContas += 1;
    if (Number.isFinite(conta.saldo)) {
      target.saldoTotal += conta.saldo;
    }
    if (Number.isFinite(conta.limiteCredito)) {
      target.limiteTotal += conta.limiteCredito;
    }
    if (Number.isFinite(conta.creditoDisponivel)) {
      target.creditoDisponivelTotal += conta.creditoDisponivel;
    }
  }

  const ordered = [...statsByCode.values()].sort(
    (a, b) => (a.codigo ?? 0) - (b.codigo ?? 0),
  );

  if (missingStat) {
    if (missingCodes.size === 1) {
      const [singleCode] = missingCodes;
      missingStat.filterAgenciaCode = singleCode;
    }
    ordered.push(missingStat);
  }

  return ordered;
}

/**
 * Consolida os totais gerais da rede a partir das estatísticas já agregadas por agência.
 */
export function computeAgencyTotals(
  stats: readonly AgencyStat[],
): AgencyTotals {
  let totalAgenciasCadastradas = 0;
  let totalClientes = 0;
  let totalContas = 0;
  let saldoTotal = 0;
  let limiteTotal = 0;
  let creditoDisponivelTotal = 0;
  let hasMissingAgencyGroup = false;

  for (const item of stats) {
    if (item.isMissingAgency) {
      hasMissingAgencyGroup = true;
    } else {
      totalAgenciasCadastradas += 1;
    }
    totalClientes += item.totalClientes;
    totalContas += item.totalContas;
    saldoTotal += item.saldoTotal;
    limiteTotal += item.limiteTotal;
    creditoDisponivelTotal += item.creditoDisponivelTotal;
  }

  return {
    totalAgenciasCadastradas,
    totalClientes,
    totalContas,
    saldoTotal,
    limiteTotal,
    creditoDisponivelTotal,
    hasMissingAgencyGroup,
  };
}
