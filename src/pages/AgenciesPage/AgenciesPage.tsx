import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Building2,
  ChevronRight,
  CreditCard,
  Landmark,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { useBankData } from "../../context/useBankData";
import {
  computeAgencyStats,
  computeAgencyTotals,
  type AgencyStat,
} from "../../utils/agencyStats";
import { formatCurrencyBRL } from "../../utils/formatters";
import "./AgenciesPage.css";

type AgencySortColumn =
  | "nome"
  | "totalClientes"
  | "totalContas"
  | "saldoTotal"
  | "limiteTotal"
  | "creditoDisponivelTotal";

type SortDirection = "ascending" | "descending";

const SORT_LABELS: Record<AgencySortColumn, string> = {
  nome: "Agência",
  totalClientes: "Clientes",
  totalContas: "Contas",
  saldoTotal: "Saldo total",
  limiteTotal: "Limite total",
  creditoDisponivelTotal: "Crédito disponível",
};

const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

function sortAgencyStats(
  stats: readonly AgencyStat[],
  column: AgencySortColumn,
  direction: SortDirection,
): AgencyStat[] {
  const factor = direction === "ascending" ? 1 : -1;

  return [...stats].sort((a, b) => {
    if (column === "nome") {
      return factor * collator.compare(a.nome, b.nome);
    }
    const diff = a[column] - b[column];
    if (diff !== 0) {
      return factor * diff;
    }
    return collator.compare(a.nome, b.nome);
  });
}

/**
 * Página gerencial (`/agencias`) com indicadores consolidados por agência:
 * cartões de resumo, gráfico horizontal em CSS puro de saldo por agência
 * e tabela semântica ordenável com navegação direta para a listagem filtrada.
 */
export function AgenciesPage() {
  const { clientes, contas, agencias, isLoading, error, reload } =
    useBankData();

  const [sortColumn, setSortColumn] = useState<AgencySortColumn>("saldoTotal");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("descending");
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [isTableScrollable, setIsTableScrollable] = useState(false);

  useEffect(() => {
    document.title = "Agências | Gestão de Clientes Bancários";
  }, []);

  const stats = useMemo(
    () => computeAgencyStats({ clientes, contas, agencias }),
    [clientes, contas, agencias],
  );

  const totals = useMemo(() => computeAgencyTotals(stats), [stats]);

  const sortedStats = useMemo(
    () => sortAgencyStats(stats, sortColumn, sortDirection),
    [stats, sortColumn, sortDirection],
  );

  const chartStats = useMemo(
    () => sortAgencyStats(stats, "saldoTotal", "descending"),
    [stats],
  );

  const maxAbsSaldo = useMemo(() => {
    let max = 0;
    for (const item of chartStats) {
      const absValue = Math.abs(item.saldoTotal);
      if (absValue > max) {
        max = absValue;
      }
    }
    return max;
  }, [chartStats]);

  // Só inclui o contêiner na ordem de Tab quando existe rolagem horizontal real.
  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) {
      return;
    }
    const updateScrollable = () => {
      setIsTableScrollable(wrapper.scrollWidth > wrapper.clientWidth);
    };
    updateScrollable();

    const observer = new ResizeObserver(updateScrollable);
    observer.observe(wrapper);
    if (wrapper.firstElementChild) {
      observer.observe(wrapper.firstElementChild);
    }
    return () => {
      observer.disconnect();
    };
  }, [sortedStats.length]);

  function handleSort(column: AgencySortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) =>
        prev === "ascending" ? "descending" : "ascending",
      );
      return;
    }
    setSortColumn(column);
    setSortDirection("ascending");
  }

  function renderSortIcon(column: AgencySortColumn) {
    if (sortColumn !== column) {
      return (
        <ArrowUpDown
          size={14}
          className="agencies-table__sort-icon agencies-table__sort-icon--idle"
          aria-hidden="true"
        />
      );
    }
    return sortDirection === "ascending" ? (
      <ArrowUp size={14} className="agencies-table__sort-icon" aria-hidden="true" />
    ) : (
      <ArrowDown size={14} className="agencies-table__sort-icon" aria-hidden="true" />
    );
  }

  return (
    <div className="agencies-page">
      <section className="agencies-hero" aria-labelledby="agencies-page-heading">
        <div className="container agencies-hero__inner">
          <div className="agencies-hero__heading">
            <h1 id="agencies-page-heading" className="agencies-hero__title">
              Indicadores por Agência
            </h1>
            <p className="agencies-hero__subtitle">
              Visão gerencial de carteira, contas vinculadas, saldo consolidado
              e limites de crédito por agência.
            </p>
          </div>

          <dl
            className="agencies-hero__metrics"
            aria-label="Totais gerais da rede"
          >
            <div className="agencies-hero__metric">
              <div className="agencies-hero__metric-icon" aria-hidden="true">
                <Building2 size={18} />
              </div>
              <div>
                <dt className="agencies-hero__metric-label">Agências</dt>
                <dd className="agencies-hero__metric-value tabular-nums">
                  {isLoading ? "—" : totals.totalAgenciasCadastradas}
                </dd>
              </div>
            </div>

            <div className="agencies-hero__metric">
              <div className="agencies-hero__metric-icon" aria-hidden="true">
                <Users size={18} />
              </div>
              <div>
                <dt className="agencies-hero__metric-label">Clientes</dt>
                <dd className="agencies-hero__metric-value tabular-nums">
                  {isLoading ? "—" : totals.totalClientes}
                </dd>
              </div>
            </div>

            <div className="agencies-hero__metric">
              <div className="agencies-hero__metric-icon" aria-hidden="true">
                <Landmark size={18} />
              </div>
              <div>
                <dt className="agencies-hero__metric-label">Contas</dt>
                <dd className="agencies-hero__metric-value tabular-nums">
                  {isLoading ? "—" : totals.totalContas}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <div className="container agencies-page__main page-enter">
        {isLoading ? (
          <StatusMessage variant="loading" />
        ) : error ? (
          <StatusMessage
            variant="error"
            title="Não foi possível carregar os indicadores"
            description={error}
            actionLabel="Tentar novamente"
            onAction={reload}
          />
        ) : stats.length === 0 ? (
          <StatusMessage
            variant="empty"
            title="Nenhuma agência encontrada"
            description="As planilhas não retornaram agências ou clientes válidos para consolidação."
          />
        ) : (
          <div className="agencies-page__content">
            <section aria-labelledby="agencies-summary-heading">
              <h2 id="agencies-summary-heading" className="sr-only">
                Resumo financeiro consolidado
              </h2>
              <dl className="agencies-kpis">
                <div className="agencies-kpi-card">
                  <dt className="agencies-kpi-card__label">
                    <Wallet
                      size={15}
                      className="agencies-kpi-card__icon"
                      aria-hidden="true"
                    />
                    <span>Saldo total</span>
                  </dt>
                  <dd
                    className={
                      totals.saldoTotal > 0
                        ? "agencies-kpi-card__value agencies-kpi-card__value--positive tabular-nums"
                        : totals.saldoTotal < 0
                          ? "agencies-kpi-card__value agencies-kpi-card__value--negative tabular-nums"
                          : "agencies-kpi-card__value tabular-nums"
                    }
                  >
                    {formatCurrencyBRL(totals.saldoTotal)}
                  </dd>
                  <dd className="agencies-kpi-card__sub tabular-nums">
                    Soma de {totals.totalContas}{" "}
                    {totals.totalContas === 1 ? "conta vinculada" : "contas vinculadas"}
                  </dd>
                </div>

                <div className="agencies-kpi-card">
                  <dt className="agencies-kpi-card__label">
                    <CreditCard
                      size={15}
                      className="agencies-kpi-card__icon"
                      aria-hidden="true"
                    />
                    <span>Limite total</span>
                  </dt>
                  <dd className="agencies-kpi-card__value tabular-nums">
                    {formatCurrencyBRL(totals.limiteTotal)}
                  </dd>
                  <dd className="agencies-kpi-card__sub">
                    Limite contratado na rede
                  </dd>
                </div>

                <div className="agencies-kpi-card">
                  <dt className="agencies-kpi-card__label">
                    <Landmark
                      size={15}
                      className="agencies-kpi-card__icon"
                      aria-hidden="true"
                    />
                    <span>Crédito disponível</span>
                  </dt>
                  <dd className="agencies-kpi-card__value tabular-nums">
                    {formatCurrencyBRL(totals.creditoDisponivelTotal)}
                  </dd>
                  <dd className="agencies-kpi-card__sub tabular-nums">
                    {totals.limiteTotal > 0
                      ? `${Math.round(
                          Math.min(
                            100,
                            Math.max(
                              0,
                              (totals.creditoDisponivelTotal /
                                totals.limiteTotal) *
                                100,
                            ),
                          ),
                        )}% do limite disponível`
                      : "Sem limite contratado"}
                  </dd>
                </div>

                <div className="agencies-kpi-card">
                  <dt className="agencies-kpi-card__label">
                    <Building2
                      size={15}
                      className="agencies-kpi-card__icon"
                      aria-hidden="true"
                    />
                    <span>Agências na base</span>
                  </dt>
                  <dd className="agencies-kpi-card__value tabular-nums">
                    {totals.totalAgenciasCadastradas}
                  </dd>
                  <dd className="agencies-kpi-card__sub">
                    {totals.hasMissingAgencyGroup
                      ? "Mais 1 grupo sem agência localizada"
                      : "Todas as referências localizadas"}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              className="agencies-panel"
              aria-labelledby="agencies-chart-heading"
            >
              <div className="agencies-panel__header">
                <div>
                  <h2
                    id="agencies-chart-heading"
                    className="agencies-panel__title"
                  >
                    <BarChart3
                      size={18}
                      className="agencies-panel__icon"
                      aria-hidden="true"
                    />
                    <span>Saldo consolidado por agência</span>
                  </h2>
                  <p className="agencies-panel__subtitle">
                    Comparativo proporcional ordenado pelo maior saldo em conta.
                  </p>
                </div>
              </div>

              <ul className="agency-chart">
                {chartStats.map((item) => {
                  const widthPercent =
                    maxAbsSaldo > 0
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            (Math.abs(item.saldoTotal) / maxAbsSaldo) * 100,
                          ),
                        )
                      : 0;

                  const barModifier =
                    item.saldoTotal < 0
                      ? "agency-chart__fill--negative"
                      : item.isMissingAgency
                        ? "agency-chart__fill--warning"
                        : "agency-chart__fill--positive";

                  const filterUrl =
                    item.filterAgenciaCode !== null
                      ? `/?agencia=${item.filterAgenciaCode}`
                      : null;

                  return (
                    <li key={item.key} className="agency-chart__row">
                      <div className="agency-chart__label">
                        {item.codigo !== null ? (
                          <span className="agency-chart__code tabular-nums">
                            {item.codigo}
                          </span>
                        ) : (
                          <AlertTriangle
                            size={14}
                            className="agency-chart__warning-icon"
                            aria-hidden="true"
                          />
                        )}
                        {filterUrl ? (
                          <Link
                            to={filterUrl}
                            className="agency-chart__name-link"
                          >
                            {item.nome}
                          </Link>
                        ) : (
                          <span className="agency-chart__name">{item.nome}</span>
                        )}
                      </div>

                      <div
                        className="agency-chart__bar-wrap"
                        aria-hidden="true"
                      >
                        <div className="agency-chart__track">
                          <div
                            className={`agency-chart__fill ${barModifier}`}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>

                      <span
                        className={
                          item.saldoTotal < 0
                            ? "agency-chart__value agency-chart__value--negative tabular-nums"
                            : "agency-chart__value tabular-nums"
                        }
                      >
                        {formatCurrencyBRL(item.saldoTotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section
              className="agencies-panel agencies-panel--table"
              aria-labelledby="agencies-table-heading"
            >
              <div className="agencies-panel__header agencies-panel__header--padded">
                <div>
                  <h2
                    id="agencies-table-heading"
                    className="agencies-panel__title"
                  >
                    <Building2
                      size={18}
                      className="agencies-panel__icon"
                      aria-hidden="true"
                    />
                    <span>Detalhamento por agência</span>
                  </h2>
                  <p className="agencies-panel__subtitle">
                    Clique nos cabeçalhos para ordenar ou acesse a listagem
                    filtrada de clientes da agência.
                  </p>
                </div>
              </div>

              <p className="sr-only" role="status">
                Tabela ordenada por {SORT_LABELS[sortColumn]}, ordem{" "}
                {sortDirection === "ascending" ? "crescente" : "decrescente"},{" "}
                {sortedStats.length}{" "}
                {sortedStats.length === 1 ? "linha" : "linhas"}.
              </p>

              <div
                ref={tableWrapperRef}
                className="agencies-table-wrapper"
                role="region"
                aria-labelledby="agencies-table-caption"
                tabIndex={isTableScrollable ? 0 : undefined}
              >
                <table className="agencies-table">
                  <caption id="agencies-table-caption" className="sr-only">
                    Indicadores consolidados por agência
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        aria-sort={
                          sortColumn === "nome" ? sortDirection : undefined
                        }
                      >
                        <button
                          type="button"
                          className="agencies-table__sort-btn"
                          onClick={() => handleSort("nome")}
                        >
                          <span>Agência</span>
                          {renderSortIcon("nome")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="agencies-table__num-col"
                        aria-sort={
                          sortColumn === "totalClientes"
                            ? sortDirection
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className="agencies-table__sort-btn agencies-table__sort-btn--end"
                          onClick={() => handleSort("totalClientes")}
                        >
                          <span>Clientes</span>
                          {renderSortIcon("totalClientes")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="agencies-table__num-col"
                        aria-sort={
                          sortColumn === "totalContas"
                            ? sortDirection
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className="agencies-table__sort-btn agencies-table__sort-btn--end"
                          onClick={() => handleSort("totalContas")}
                        >
                          <span>Contas</span>
                          {renderSortIcon("totalContas")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="agencies-table__num-col"
                        aria-sort={
                          sortColumn === "saldoTotal"
                            ? sortDirection
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className="agencies-table__sort-btn agencies-table__sort-btn--end"
                          onClick={() => handleSort("saldoTotal")}
                        >
                          <span>Saldo total</span>
                          {renderSortIcon("saldoTotal")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="agencies-table__num-col"
                        aria-sort={
                          sortColumn === "limiteTotal"
                            ? sortDirection
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className="agencies-table__sort-btn agencies-table__sort-btn--end"
                          onClick={() => handleSort("limiteTotal")}
                        >
                          <span>Limite total</span>
                          {renderSortIcon("limiteTotal")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="agencies-table__num-col"
                        aria-sort={
                          sortColumn === "creditoDisponivelTotal"
                            ? sortDirection
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className="agencies-table__sort-btn agencies-table__sort-btn--end"
                          onClick={() => handleSort("creditoDisponivelTotal")}
                        >
                          <span>Crédito disponível</span>
                          {renderSortIcon("creditoDisponivelTotal")}
                        </button>
                      </th>
                      <th scope="col" className="agencies-table__actions-col">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStats.map((item) => {
                      const filterUrl =
                        item.filterAgenciaCode !== null
                          ? `/?agencia=${item.filterAgenciaCode}`
                          : null;

                      return (
                        <tr
                          key={item.key}
                          className={
                            item.isMissingAgency
                              ? "agencies-table__row agencies-table__row--missing"
                              : "agencies-table__row"
                          }
                        >
                          <th scope="row" className="agencies-table__name-cell">
                            <div className="agencies-table__agency-wrap">
                              <div className="agencies-table__agency-title">
                                {item.codigo !== null ? (
                                  <span className="agencies-table__code tabular-nums">
                                    {item.codigo}
                                  </span>
                                ) : (
                                  <AlertTriangle
                                    size={14}
                                    className="agencies-table__missing-icon"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="agencies-table__name">
                                  {item.nome}
                                </span>
                              </div>
                              {item.endereco ? (
                                <span className="agencies-table__address">
                                  {item.endereco}
                                </span>
                              ) : null}
                            </div>
                          </th>
                          <td className="agencies-table__num-cell tabular-nums">
                            {item.totalClientes}
                          </td>
                          <td className="agencies-table__num-cell tabular-nums">
                            {item.totalContas}
                          </td>
                          <td
                            className={
                              item.saldoTotal > 0
                                ? "agencies-table__num-cell agencies-table__num-cell--positive tabular-nums"
                                : item.saldoTotal < 0
                                  ? "agencies-table__num-cell agencies-table__num-cell--negative tabular-nums"
                                  : "agencies-table__num-cell tabular-nums"
                            }
                          >
                            {formatCurrencyBRL(item.saldoTotal)}
                          </td>
                          <td className="agencies-table__num-cell tabular-nums">
                            {formatCurrencyBRL(item.limiteTotal)}
                          </td>
                          <td className="agencies-table__num-cell tabular-nums">
                            {formatCurrencyBRL(item.creditoDisponivelTotal)}
                          </td>
                          <td className="agencies-table__action-cell">
                            {filterUrl ? (
                              <Link
                                to={filterUrl}
                                className="agencies-table__link"
                              >
                                <span>Ver clientes</span>
                                <span className="sr-only"> de {item.nome}</span>
                                <ChevronRight size={15} aria-hidden="true" />
                              </Link>
                            ) : (
                              <span className="agencies-table__no-link">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
