import { useMemo } from "react";
import { ArrowUpDown, Building2, IdCard, Search, X } from "lucide-react";
import {
  describeSort,
  type DocumentTypeFilter,
  type SortKey,
  type SortState,
} from "../../hooks/useClientFilters";
import type { Agencia } from "../../types/models";
import {
  SelectDropdown,
  type SelectOption,
} from "../SelectDropdown/SelectDropdown";
import "./SearchToolbar.css";

interface SearchToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  documentType: DocumentTypeFilter;
  onDocumentTypeChange: (value: DocumentTypeFilter) => void;
  selectedAgencia: string;
  onAgenciaChange: (value: string) => void;
  agencias: Agencia[];
  sort: SortState;
  onSortChange: (value: SortState) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "all", label: "Ambos (CPF e CNPJ)" },
  { value: "cpf", label: "Somente CPF" },
  { value: "cnpj", label: "Somente CNPJ" },
];

function parseDocumentType(value: string): DocumentTypeFilter {
  if (value === "cpf" || value === "cnpj") {
    return value;
  }
  return "all";
}

const SORT_KEYS: SortKey[] = ["nome", "cpfCnpj", "email", "agencia"];

// No mobile o cabeçalho da tabela fica oculto (cards); este select oferece a mesma ordenação.
const SORT_OPTIONS: SelectOption[] = SORT_KEYS.flatMap((key) =>
  (["asc", "desc"] as const).map((direction) => ({
    value: `${key}:${direction}`,
    label: describeSort({ key, direction }),
  })),
);

function parseSort(value: string): SortState {
  const [key, direction] = value.split(":");
  const sortKey = SORT_KEYS.find((candidate) => candidate === key) ?? "nome";
  return { key: sortKey, direction: direction === "desc" ? "desc" : "asc" };
}

/**
 * Barra de consulta e filtros (tipo de documento CPF/CNPJ e agência)
 * com labels explícitos e dropdowns customizados; no mobile inclui "Ordenar por".
 * O botão principal "Novo Cliente" fica centralizado no Header institucional.
 */
export function SearchToolbar({
  searchQuery,
  onSearchChange,
  documentType,
  onDocumentTypeChange,
  selectedAgencia,
  onAgenciaChange,
  agencias,
  sort,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
}: SearchToolbarProps) {
  const agencyOptions = useMemo<SelectOption[]>(() => {
    const sorted = [...agencias].sort((a, b) => a.codigo - b.codigo);
    return [
      { value: "", label: "Todas as agências" },
      ...sorted.map((agencia) => ({
        value: String(agencia.codigo),
        code: String(agencia.codigo),
        label: agencia.nome,
      })),
    ];
  }, [agencias]);

  return (
    <div className="search-toolbar">
      <div className="search-toolbar__filters" role="search">
        <div className="search-toolbar__field search-toolbar__field--query">
          <label htmlFor="client-search" className="search-toolbar__label">
            Buscar cliente
          </label>
          <div className="search-toolbar__input-wrap">
            <Search
              size={18}
              className="search-toolbar__icon"
              aria-hidden="true"
            />
            <input
              id="client-search"
              type="search"
              className="search-toolbar__input"
              placeholder="Nome, nome social ou CPF/CNPJ"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            {searchQuery.length > 0 ? (
              <button
                type="button"
                className="search-toolbar__clear-input"
                aria-label="Limpar busca"
                onClick={() => onSearchChange("")}
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="search-toolbar__field search-toolbar__field--document">
          <label htmlFor="document-filter" className="search-toolbar__label">
            Documento
          </label>
          <SelectDropdown
            id="document-filter"
            value={documentType}
            onChange={(nextValue) =>
              onDocumentTypeChange(parseDocumentType(nextValue))
            }
            options={DOCUMENT_TYPE_OPTIONS}
            placeholder="Todos (CPF e CNPJ)"
            leadingIcon={<IdCard size={17} />}
            listboxLabel="Filtrar por tipo de documento"
          />
        </div>

        <div className="search-toolbar__field search-toolbar__field--agency">
          <label htmlFor="agency-filter" className="search-toolbar__label">
            Agência
          </label>
          <SelectDropdown
            id="agency-filter"
            value={selectedAgencia}
            onChange={onAgenciaChange}
            options={agencyOptions}
            placeholder="Todas as agências"
            leadingIcon={<Building2 size={17} />}
            listboxLabel="Filtrar por agência"
          />
        </div>

        <div className="search-toolbar__field search-toolbar__field--sort">
          <label htmlFor="sort-select" className="search-toolbar__label">
            Ordenar por
          </label>
          <SelectDropdown
            id="sort-select"
            value={`${sort.key}:${sort.direction}`}
            onChange={(nextValue) => onSortChange(parseSort(nextValue))}
            options={SORT_OPTIONS}
            placeholder="Nome (A–Z)"
            leadingIcon={<ArrowUpDown size={17} />}
            listboxLabel="Ordenar clientes"
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="search-toolbar__actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClearFilters}
          >
            Limpar filtros
          </button>
        </div>
      ) : null}
    </div>
  );
}
