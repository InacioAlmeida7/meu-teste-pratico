import { Plus, Search, X } from "lucide-react";
import type { Agencia } from "../../types/models";
import "./SearchToolbar.css";

interface SearchToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedAgencia: string;
  onAgenciaChange: (value: string) => void;
  agencias: Agencia[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNewClient: () => void;
}

/**
 * Barra de consulta e filtro por agência com labels explícitos e botão de ação principal.
 * Mantém controles compactos e acessíveis em desktop e mobile.
 */
export function SearchToolbar({
  searchQuery,
  onSearchChange,
  selectedAgencia,
  onAgenciaChange,
  agencias,
  hasActiveFilters,
  onClearFilters,
  onNewClient,
}: SearchToolbarProps) {
  const sortedAgencias = [...agencias].sort((a, b) => a.codigo - b.codigo);

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
          <select
            id="agency-filter"
            className="search-toolbar__select"
            value={selectedAgencia}
            onChange={(event) => onAgenciaChange(event.target.value)}
          >
            <option value="">Todas as agências</option>
            {sortedAgencias.map((agencia) => (
              <option key={agencia.id} value={String(agencia.codigo)}>
                {agencia.codigo} — {agencia.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="search-toolbar__actions">
        {hasActiveFilters ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClearFilters}
          >
            Limpar filtros
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNewClient}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Novo Cliente</span>
        </button>
      </div>
    </div>
  );
}
