import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { ClientList } from "../../components/ClientList/ClientList";
import { Pagination } from "../../components/Pagination/Pagination";
import { SearchToolbar } from "../../components/SearchToolbar/SearchToolbar";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { useBankData } from "../../context/useBankData";
import { useClientFilters } from "../../hooks/useClientFilters";
import type { Agencia } from "../../types/models";
import "./ClientListPage.css";

/**
 * Página inicial (`/`) de consulta e gerenciamento da carteira de clientes.
 * Reúne resumo numérico, busca/filtro por agência, listagem responsiva e paginação.
 */
export function ClientListPage() {
  const { clientes, contas, agencias, isLoading, error, reload } =
    useBankData();
  const [newClientNotice, setNewClientNotice] = useState(false);

  const {
    searchQuery,
    selectedAgencia,
    currentPage,
    totalPages,
    totalItems,
    startItem,
    endItem,
    hasActiveFilters,
    paginatedClientes,
    setSearchQuery,
    setSelectedAgencia,
    setCurrentPage,
    clearFilters,
  } = useClientFilters(clientes);

  useEffect(() => {
    document.title = "Clientes | Gestão de Clientes Bancários";
  }, []);

  const agenciaMap = useMemo(() => {
    const map = new Map<number, Agencia>();
    for (const agencia of agencias) {
      map.set(agencia.codigo, agencia);
    }
    return map;
  }, [agencias]);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="container client-list-page">
      <div className="client-list-page__hero">
        <div className="client-list-page__heading-group">
          <h1 id="main-content-heading" className="client-list-page__title">
            Carteira de Clientes
          </h1>
          <p className="client-list-page__subtitle">
            Consulta unificada de clientes, agências vinculadas e contas
            bancárias.
          </p>
        </div>

        <dl
          className="client-list-page__metrics"
          aria-label="Resumo quantitativo da base"
        >
          <div className="client-list-page__metric">
            <dt className="client-list-page__metric-label">Clientes</dt>
            <dd className="client-list-page__metric-value tabular-nums">
              {isLoading ? "—" : clientes.length}
            </dd>
          </div>
          <div className="client-list-page__metric">
            <dt className="client-list-page__metric-label">Agências</dt>
            <dd className="client-list-page__metric-value tabular-nums">
              {isLoading ? "—" : agencias.length}
            </dd>
          </div>
          <div className="client-list-page__metric">
            <dt className="client-list-page__metric-label">Contas</dt>
            <dd className="client-list-page__metric-value tabular-nums">
              {isLoading ? "—" : contas.length}
            </dd>
          </div>
        </dl>
      </div>

      {newClientNotice ? (
        <div className="client-list-page__notice" role="status">
          <p>
            O cadastro de novo cliente será conectado ao botão{" "}
            <strong>Novo Cliente</strong> na próxima etapa (Fase 1C).
          </p>
          <button
            type="button"
            className="client-list-page__notice-close"
            aria-label="Fechar aviso"
            onClick={() => setNewClientNotice(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <StatusMessage variant="loading" />
      ) : error ? (
        <StatusMessage
          variant="error"
          title="Não foi possível carregar os dados"
          description={error}
          actionLabel="Tentar novamente"
          onAction={reload}
        />
      ) : (
        <div className="client-list-page__content">
          <SearchToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedAgencia={selectedAgencia}
            onAgenciaChange={setSelectedAgencia}
            agencias={agencias}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onNewClient={() => setNewClientNotice(true)}
          />

          {totalItems === 0 ? (
            <StatusMessage
              variant="empty"
              title="Nenhum cliente encontrado"
              description={
                hasActiveFilters
                  ? "Nenhum registro corresponde à busca ou agência selecionada."
                  : "A planilha de clientes não retornou registros válidos."
              }
              actionLabel={hasActiveFilters ? "Limpar filtros" : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
            />
          ) : (
            <>
              <ClientList
                clientes={paginatedClientes}
                agenciaMap={agenciaMap}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                startItem={startItem}
                endItem={endItem}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
