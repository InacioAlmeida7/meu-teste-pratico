import { useEffect, useMemo } from "react";
import { Building2, Users, Wallet } from "lucide-react";
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
 * Apresenta faixa institucional Banestes com métricas integradas, busca/filtro
 * por agência, listagem responsiva e paginação.
 */
export function ClientListPage() {
  const { clientes, contas, agencias, isLoading, error, reload } =
    useBankData();

  const {
    searchQuery,
    selectedAgencia,
    documentType,
    currentPage,
    totalPages,
    totalItems,
    startItem,
    endItem,
    hasActiveFilters,
    paginatedClientes,
    setSearchQuery,
    setSelectedAgencia,
    setDocumentType,
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
    <div className="client-list-page">
      <section className="list-hero" aria-labelledby="main-content-heading">
        <div className="container list-hero__inner">
          <div className="list-hero__heading">
            <h1 id="main-content-heading" className="list-hero__title">
              Carteira de Clientes
            </h1>
            <p className="list-hero__subtitle">
              Consulta unificada de clientes, agências vinculadas e contas
              bancárias em tempo de execução.
            </p>
          </div>

          <dl
            className="list-hero__metrics"
            aria-label="Resumo quantitativo da base"
          >
            <div className="list-hero__metric">
              <div className="list-hero__metric-icon" aria-hidden="true">
                <Users size={18} />
              </div>
              <div>
                <dt className="list-hero__metric-label">Clientes</dt>
                <dd className="list-hero__metric-value tabular-nums">
                  {isLoading ? "—" : clientes.length}
                </dd>
              </div>
            </div>

            <div className="list-hero__metric">
              <div className="list-hero__metric-icon" aria-hidden="true">
                <Building2 size={18} />
              </div>
              <div>
                <dt className="list-hero__metric-label">Agências</dt>
                <dd className="list-hero__metric-value tabular-nums">
                  {isLoading ? "—" : agencias.length}
                </dd>
              </div>
            </div>

            <div className="list-hero__metric">
              <div className="list-hero__metric-icon" aria-hidden="true">
                <Wallet size={18} />
              </div>
              <div>
                <dt className="list-hero__metric-label">Contas</dt>
                <dd className="list-hero__metric-value tabular-nums">
                  {isLoading ? "—" : contas.length}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <div className="container client-list-page__main page-enter">
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
              documentType={documentType}
              onDocumentTypeChange={setDocumentType}
              selectedAgencia={selectedAgencia}
              onAgenciaChange={setSelectedAgencia}
              agencias={agencias}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
            />

            {/* Live region sempre montada: anuncia o resultado de cada busca/filtro. */}
            <p className="sr-only" role="status">
              {totalItems === 1
                ? "1 cliente encontrado."
                : `${totalItems} clientes encontrados.`}
            </p>

            {totalItems === 0 ? (
              <StatusMessage
                variant="empty"
                title="Nenhum cliente encontrado"
                description={
                  hasActiveFilters
                    ? "Nenhum registro corresponde aos filtros selecionados."
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
    </div>
  );
}
