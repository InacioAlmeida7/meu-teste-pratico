import type { BankData } from "../types/models";
import { onlyDigits } from "./normalizers";
import { isValidCpfCnpj } from "./validators";

export type DataIssueType =
  | "conta-orfa"
  | "agencia-inexistente"
  | "data-invalida"
  | "estado-civil-ausente"
  | "documento-invalido";

export type DataIssueSeverity = "erro" | "aviso";

export interface DataIssue {
  tipo: DataIssueType;
  severidade: DataIssueSeverity;
  descricao: string;
  referenciaId: string;
  link?: string;
}

/**
 * Analisa os dados carregados em memória para expor na interface inconsistências
 * estruturais e avisos de validação que antes ficavam restritos ao `console.warn`.
 * Documentos com DV inválido são classificados como `"aviso"` porque a planilha
 * pública usa documentos fictícios para demonstração.
 */
export function findDataIssues(data: BankData): DataIssue[] {
  const issues: DataIssue[] = [];

  const clientDocs = new Set<string>();
  for (const cliente of data.clientes) {
    const digits = onlyDigits(cliente.cpfCnpj);
    if (digits.length > 0) {
      clientDocs.add(digits);
    }
  }

  const agencyCodes = new Set<number>();
  for (const agencia of data.agencias) {
    agencyCodes.add(agencia.codigo);
  }

  for (const conta of data.contas) {
    const docDigits = onlyDigits(conta.cpfCnpjCliente);
    if (docDigits.length === 0 || !clientDocs.has(docDigits)) {
      issues.push({
        tipo: "conta-orfa",
        severidade: "erro",
        referenciaId: conta.id,
        descricao: `Conta ${conta.id} sem cliente correspondente (CPF/CNPJ "${conta.cpfCnpjCliente || "vazio"}").`,
      });
    }
  }

  for (const cliente of data.clientes) {
    const clientLink = `/clientes/${encodeURIComponent(cliente.id)}`;

    if (!agencyCodes.has(cliente.codigoAgencia)) {
      issues.push({
        tipo: "agencia-inexistente",
        severidade: "erro",
        referenciaId: cliente.id,
        link: clientLink,
        descricao: `${cliente.nome} referencia a agência ${cliente.codigoAgencia}, não localizada na base.`,
      });
    }

    if (
      !(cliente.dataNascimento instanceof Date) ||
      Number.isNaN(cliente.dataNascimento.getTime())
    ) {
      issues.push({
        tipo: "data-invalida",
        severidade: "erro",
        referenciaId: cliente.id,
        link: clientLink,
        descricao: `${cliente.nome} possui data de nascimento inválida.`,
      });
    }

    if (!cliente.estadoCivil) {
      issues.push({
        tipo: "estado-civil-ausente",
        severidade: "erro",
        referenciaId: cliente.id,
        link: clientLink,
        descricao: `${cliente.nome} está sem estado civil reconhecido.`,
      });
    }

    if (!isValidCpfCnpj(cliente.cpfCnpj)) {
      issues.push({
        tipo: "documento-invalido",
        severidade: "aviso",
        referenciaId: cliente.id,
        link: clientLink,
        descricao: `${cliente.nome} possui CPF/CNPJ "${cliente.cpfCnpj}" com dígito verificador inválido (aviso de base fictícia).`,
      });
    }
  }

  return issues;
}
