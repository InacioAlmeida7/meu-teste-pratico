import Papa from "papaparse";
import type { Agencia, Cliente } from "../types/models";
import { formatCpfCnpj, formatCurrencyBRL } from "./formatters";

const CSV_HEADERS = [
  "Nome",
  "Nome social",
  "CPF/CNPJ",
  "E-mail",
  "Agência",
  "Renda anual",
  "Patrimônio",
  "Estado civil",
] as const;

/**
 * `Intl.NumberFormat('pt-BR', { style: 'currency' })` usa espaço não-quebrável (`\u00A0`)
 * entre `R$` e o número, o que pode aparecer como caractere estranho em planilhas antigas.
 */
function normalizeBrl(value: number): string {
  return formatCurrencyBRL(value).replace(/\u00A0/g, " ");
}

/**
 * Gera conteúdo CSV compatível com Excel em pt-BR (separador `;` e BOM UTF-8 `\uFEFF`)
 * a partir da listagem já filtrada e ordenada de clientes.
 */
export function buildClientsCsv(
  clientes: readonly Cliente[],
  agenciaMap: ReadonlyMap<number, Agencia>,
): string {
  const rows = clientes.map((cliente) => {
    const agencia = agenciaMap.get(cliente.codigoAgencia);
    const agenciaLabel = agencia
      ? `${agencia.codigo} – ${agencia.nome}`
      : `${cliente.codigoAgencia} – Não localizada`;

    return [
      cliente.nome,
      cliente.nomeSocial ?? "",
      formatCpfCnpj(cliente.cpfCnpj),
      cliente.email,
      agenciaLabel,
      normalizeBrl(cliente.rendaAnual),
      normalizeBrl(cliente.patrimonio),
      cliente.estadoCivil ?? "Não informado",
    ];
  });

  const csvBody = Papa.unparse(
    {
      fields: [...CSV_HEADERS],
      data: rows,
    },
    {
      delimiter: ";",
      newline: "\r\n",
    },
  );

  return `\uFEFF${csvBody}`;
}

/**
 * Monta o nome do arquivo no padrão `clientes-AAAA-MM-DD.csv` usando a data local.
 */
export function buildClientsCsvFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `clientes-${year}-${month}-${day}.csv`;
}

/**
 * Dispara o download do CSV no navegador via `Blob` + `URL.createObjectURL`
 * e revoga a URL temporária logo após o clique.
 */
export function downloadClientsCsv(
  clientes: readonly Cliente[],
  agenciaMap: ReadonlyMap<number, Agencia>,
): void {
  const csv = buildClientsCsv(clientes, agenciaMap);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = buildClientsCsvFilename();
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Aguarda o próximo ciclo para o navegador iniciar o download antes de revogar o objeto.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
