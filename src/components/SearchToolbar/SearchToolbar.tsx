import { useMemo } from "react";
import { Building2, Search, X } from "lucide-react";
import type { Agencia } from "../../types/models";
import {
  SelectDropdown,
  type SelectOption,
} from "../SelectDropdown/SelectDropdown";
import "./SearchToolbar.css";

interface SearchToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedAgencia: string;
  onAgenciaChange: (value: string) => void;
  agencias: Agencia[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

/**
 * Barra de consulta e filtro por agência com labels explícitos e dropdown customizado.
 * O botão principal "Novo Cliente" fica centralizado no Header institucional.
 */
export function SearchToolbar({
  searchQuery,
  onSearchChange,
  selectedAgencia,
  onAgenciaChange,
  agencias,
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
