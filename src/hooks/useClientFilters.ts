import { useCallback, useMemo, useState } from "react";
import type { Cliente } from "../types/models";
import { onlyDigits, stripAccents } from "../utils/normalizers";

export const PAGE_SIZE = 10;

export type DocumentTypeFilter = "all" | "cpf" | "cnpj";

export type SortKey = "nome" | "cpfCnpj" | "email" | "agencia";

export interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

/** A listagem sempre começa em ordem alfabética de nome. */
export const DEFAULT_SORT: SortState = { key: "nome", direction: "asc" };

const SORT_LABELS: Record<SortKey, string> = {
  nome: "Nome",
  cpfCnpj: "CPF/CNPJ",
  email: "E-mail",
  agencia: "Agência",
};

/** Texto legível da ordenação, ex.: "Nome (A–Z)" ou "Agência (decrescente)". */
export function describeSort({ key, direction }: SortState): string {
  const isText = key === "nome" || key === "email";
  const order = isText
    ? direction === "asc"
      ? "A–Z"
      : "Z–A"
    : direction === "asc"
      ? "crescente"
      : "decrescente";
  return `${SORT_LABELS[key]} (${order})`;
}

// Ordem alfabética pt-BR ignorando acentos e caixa ("Álvaro" junto de "Alvaro");
// `numeric` compara sequências de dígitos (CPF/CNPJ) pelo valor.
const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

function compareClientes(a: Cliente, b: Cliente, key: SortKey): number {
  switch (key) {
    case "cpfCnpj":
      return collator.compare(onlyDigits(a.cpfCnpj), onlyDigits(b.cpfCnpj));
    case "email":
      return collator.compare(a.email, b.email);
    case "agencia":
      return a.codigoAgencia - b.codigoAgencia;
    case "nome":
      return collator.compare(a.nome, b.nome);
  }
}

export interface ClientFiltersResult {
  searchQuery: string;
  selectedAgencia: string;
  documentType: DocumentTypeFilter;
  sort: SortState;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  hasActiveFilters: boolean;
  paginatedClientes: Cliente[];
  setSearchQuery: (value: string) => void;
  setSelectedAgencia: (value: string) => void;
  setDocumentType: (value: DocumentTypeFilter) => void;
  setSort: (value: SortState) => void;
  setCurrentPage: (page: number) => void;
  clearFilters: () => void;
}

/**
 * Compara um cliente com a busca textual (nome e nome social sem acentos/caixa)
 * e numérica (CPF/CNPJ com ou sem máscara).
 */
function matchesSearchQuery(
  cliente: Cliente,
  normalizedTextQuery: string,
  digitQuery: string,
): boolean {
  if (normalizedTextQuery.length === 0 && digitQuery.length === 0) {
    return true;
  }

  const nomeNormalized = stripAccents(cliente.nome).toLowerCase();
  if (nomeNormalized.includes(normalizedTextQuery)) {
    return true;
  }

  if (cliente.nomeSocial) {
    const nomeSocialNormalized = stripAccents(cliente.nomeSocial).toLowerCase();
    if (nomeSocialNormalized.includes(normalizedTextQuery)) {
      return true;
    }
  }

  if (digitQuery.length > 0) {
    return onlyDigits(cliente.cpfCnpj).includes(digitQuery);
  }

  return false;
}

/**
 * Gerencia busca textual/documento, filtro de tipo de documento (CPF/CNPJ),
 * filtro de agência, ordenação por coluna e paginação de até 10 itens por página.
 * Qualquer mudança nos critérios de busca, filtro ou ordenação reinicia a página para 1,
 * evitando páginas vazias após refinar a consulta. Quando a base cresce (novo cadastro),
 * os filtros também são limpos para o cliente recém-criado não ficar oculto.
 */
export function useClientFilters(clientes: Cliente[]): ClientFiltersResult {
  const [searchQuery, setSearchQueryState] = useState<string>("");
  const [selectedAgencia, setSelectedAgenciaState] = useState<string>("");
  const [documentType, setDocumentTypeState] =
    useState<DocumentTypeFilter>("all");
  const [sort, setSortState] = useState<SortState>(DEFAULT_SORT);
  const [currentPage, setCurrentPageState] = useState<number>(1);
  const [knownCount, setKnownCount] = useState<number>(clientes.length);

  // Ajuste de estado durante o render (padrão recomendado pelo React em vez de useEffect).
  if (clientes.length !== knownCount) {
    setKnownCount(clientes.length);
    if (clientes.length > knownCount) {
      setSearchQueryState("");
      setSelectedAgenciaState("");
      setDocumentTypeState("all");
      setCurrentPageState(1);
    }
  }

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value);
    setCurrentPageState(1);
  }, []);

  const setSelectedAgencia = useCallback((value: string) => {
    setSelectedAgenciaState(value);
    setCurrentPageState(1);
  }, []);

  const setDocumentType = useCallback((value: DocumentTypeFilter) => {
    setDocumentTypeState(value);
    setCurrentPageState(1);
  }, []);

  const setSort = useCallback((value: SortState) => {
    setSortState(value);
    setCurrentPageState(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQueryState("");
    setSelectedAgenciaState("");
    setDocumentTypeState("all");
    setCurrentPageState(1);
  }, []);

  const filteredClientes = useMemo(() => {
    const trimmed = searchQuery.trim();
    const normalizedTextQuery = stripAccents(trimmed).toLowerCase();
    const digitQuery = onlyDigits(trimmed);
    const agencyCode =
      selectedAgencia.trim().length > 0
        ? Number.parseInt(selectedAgencia, 10)
        : null;

    return clientes.filter((cliente) => {
      if (agencyCode !== null && cliente.codigoAgencia !== agencyCode) {
        return false;
      }
      if (documentType !== "all") {
        const docDigitsLength = onlyDigits(cliente.cpfCnpj).length;
        if (documentType === "cpf" && docDigitsLength !== 11) {
          return false;
        }
        if (documentType === "cnpj" && docDigitsLength !== 14) {
          return false;
        }
      }
      return matchesSearchQuery(cliente, normalizedTextQuery, digitQuery);
    });
  }, [clientes, searchQuery, selectedAgencia, documentType]);

  const sortedClientes = useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    // Empates (ex.: mesma agência) seguem em ordem alfabética de nome.
    return [...filteredClientes].sort(
      (a, b) =>
        factor * compareClientes(a, b, sort.key) ||
        compareClientes(a, b, "nome"),
    );
  }, [filteredClientes, sort]);

  const totalItems = filteredClientes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const setCurrentPage = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(1, page), totalPages);
      setCurrentPageState(clamped);
    },
    [totalPages],
  );

  const paginatedClientes = useMemo(() => {
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return sortedClientes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedClientes, safePage]);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem =
    totalItems === 0 ? 0 : Math.min(safePage * PAGE_SIZE, totalItems);
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedAgencia.trim().length > 0 ||
    documentType !== "all";

  return {
    searchQuery,
    selectedAgencia,
    documentType,
    sort,
    currentPage: safePage,
    totalPages,
    totalItems,
    startItem,
    endItem,
    hasActiveFilters,
    paginatedClientes,
    setSearchQuery,
    setSelectedAgencia,
    setDocumentType,
    setSort,
    setCurrentPage,
    clearFilters,
  };
}
