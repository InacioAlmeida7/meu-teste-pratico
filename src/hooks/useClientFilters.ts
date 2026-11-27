import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { Cliente } from "../types/models";
import { onlyDigits, stripAccents } from "../utils/normalizers";

export const PAGE_SIZE = 10;

export type DocumentTypeFilter = "all" | "cpf" | "cnpj";

/** Direção da ordenação por nome; a listagem sempre começa em A–Z. */
export type SortDirection = "asc" | "desc";

const PARAM_QUERY = "q";
const PARAM_AGENCIA = "agencia";
const PARAM_DOC = "doc";
const PARAM_SORT = "ordem";
const PARAM_PAGE = "pagina";

// Ordem alfabética pt-BR ignorando acentos e caixa ("Álvaro" junto de "Alvaro").
const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

function parseAgenciaParam(raw: string | null): string {
  if (!raw) {
    return "";
  }
  const trimmed = raw.trim();
  return /^\d+$/.test(trimmed) ? trimmed : "";
}

function parseDocumentTypeParam(raw: string | null): DocumentTypeFilter {
  if (raw === "cpf" || raw === "cnpj") {
    return raw;
  }
  return "all";
}

function parseSortDirectionParam(raw: string | null): SortDirection {
  return raw === "desc" ? "desc" : "asc";
}

function parsePageParam(raw: string | null): number {
  if (!raw) {
    return 1;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return 1;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return parsed >= 1 ? parsed : 1;
}

export interface ClientFiltersResult {
  searchQuery: string;
  selectedAgencia: string;
  documentType: DocumentTypeFilter;
  sortDirection: SortDirection;
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
  setSortDirection: (value: SortDirection) => void;
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
 * filtro de agência, ordenação por nome e paginação de até 10 itens por página,
 * sincronizados com os query params da URL (`q`, `agencia`, `doc`, `ordem`, `pagina`).
 * Qualquer mudança nos critérios de busca, filtro ou ordenação reinicia a página para 1,
 * evitando páginas vazias após refinar a consulta. Quando a base cresce após a carga inicial
 * (novo cadastro), os filtros são limpos mantendo a ordenação para o cliente recém-criado
 * não ficar oculto.
 */
export function useClientFilters(clientes: Cliente[]): ClientFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get(PARAM_QUERY) ?? "";
  const selectedAgencia = parseAgenciaParam(searchParams.get(PARAM_AGENCIA));
  const documentType = parseDocumentTypeParam(searchParams.get(PARAM_DOC));
  const sortDirection = parseSortDirectionParam(searchParams.get(PARAM_SORT));
  const currentPage = parsePageParam(searchParams.get(PARAM_PAGE));

  const updateParams = useCallback(
    (mutate: (next: URLSearchParams) => void, replace: boolean) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      if (next.toString() === searchParams.toString()) {
        return;
      }
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  // Só limpa filtros quando a contagem cresce após a carga inicial (novo cadastro em memória),
  // preservando os parâmetros da URL ao abrir um link compartilhado enquanto `clientes` ainda carrega.
  const previousCountRef = useRef<number>(clientes.length);
  useEffect(() => {
    const previousCount = previousCountRef.current;
    previousCountRef.current = clientes.length;
    if (previousCount > 0 && clientes.length > previousCount) {
      updateParams((next) => {
        next.delete(PARAM_QUERY);
        next.delete(PARAM_AGENCIA);
        next.delete(PARAM_DOC);
        next.delete(PARAM_PAGE);
      }, true);
    }
  }, [clientes.length, updateParams]);

  const setSearchQuery = useCallback(
    (value: string) => {
      updateParams((next) => {
        if (value.length === 0) {
          next.delete(PARAM_QUERY);
        } else {
          next.set(PARAM_QUERY, value);
        }
        next.delete(PARAM_PAGE);
      }, true);
    },
    [updateParams],
  );

  const setSelectedAgencia = useCallback(
    (value: string) => {
      const normalized = parseAgenciaParam(value);
      updateParams((next) => {
        if (normalized.length === 0) {
          next.delete(PARAM_AGENCIA);
        } else {
          next.set(PARAM_AGENCIA, normalized);
        }
        next.delete(PARAM_PAGE);
      }, false);
    },
    [updateParams],
  );

  const setDocumentType = useCallback(
    (value: DocumentTypeFilter) => {
      updateParams((next) => {
        if (value === "all") {
          next.delete(PARAM_DOC);
        } else {
          next.set(PARAM_DOC, value);
        }
        next.delete(PARAM_PAGE);
      }, false);
    },
    [updateParams],
  );

  const setSortDirection = useCallback(
    (value: SortDirection) => {
      updateParams((next) => {
        if (value === "asc") {
          next.delete(PARAM_SORT);
        } else {
          next.set(PARAM_SORT, value);
        }
        next.delete(PARAM_PAGE);
      }, false);
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    updateParams((next) => {
      next.delete(PARAM_QUERY);
      next.delete(PARAM_AGENCIA);
      next.delete(PARAM_DOC);
      next.delete(PARAM_PAGE);
    }, false);
  }, [updateParams]);

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
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...filteredClientes].sort(
      (a, b) => factor * collator.compare(a.nome, b.nome),
    );
  }, [filteredClientes, sortDirection]);

  const totalItems = filteredClientes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const setCurrentPage = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(1, Math.trunc(page)), totalPages);
      updateParams((next) => {
        if (clamped <= 1) {
          next.delete(PARAM_PAGE);
        } else {
          next.set(PARAM_PAGE, String(clamped));
        }
      }, false);
    },
    [totalPages, updateParams],
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
    sortDirection,
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
    setSortDirection,
    setCurrentPage,
    clearFilters,
  };
}
