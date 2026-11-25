import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronRight,
  Mail,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SortKey, SortState } from "../../hooks/useClientFilters";
import type { Agencia, Cliente } from "../../types/models";
import { formatCpfCnpj } from "../../utils/formatters";
import { onlyDigits } from "../../utils/normalizers";
import "./ClientList.css";

interface ClientListProps {
  clientes: Cliente[];
  agenciaMap: Map<number, Agencia>;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "nome", label: "Nome" },
  { key: "cpfCnpj", label: "CPF / CNPJ" },
  { key: "email", label: "E-mail" },
  { key: "agencia", label: "Agência" },
];

/**
 * Listagem responsiva de clientes com tabela semântica única:
 * no desktop (>= 768px) exibe tabela tabular com destaque visual de tipo PF/PJ e hover fluido;
 * no mobile (< 768px) transforma as linhas em cards empilhados com rótulos CSS.
 * Os cabeçalhos ordenáveis são botões: o primeiro clique ordena de forma crescente
 * e o seguinte inverte; `aria-sort` marca só a coluna ativa.
 */
export function ClientList({
  clientes,
  agenciaMap,
  sort,
  onSortChange,
}: ClientListProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  // A região só entra na ordem de Tab quando há rolagem horizontal a fazer pelo teclado
  // (tabela larga); nos cards do mobile seria uma parada de foco inútil.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setIsScrollable(wrapper.scrollWidth > wrapper.clientWidth);
    });
    observer.observe(wrapper);
    if (wrapper.firstElementChild) {
      observer.observe(wrapper.firstElementChild);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="client-list-wrapper"
      tabIndex={isScrollable ? 0 : undefined}
      role="region"
      aria-labelledby="client-table-caption"
    >
      <table className="client-list__table">
        <caption id="client-table-caption" className="sr-only">
          Lista de clientes bancários
        </caption>
        <thead>
          <tr>
            {SORTABLE_COLUMNS.map(({ key, label }) => {
              const isActive = sort.key === key;
              const SortIcon = !isActive
                ? ArrowUpDown
                : sort.direction === "asc"
                  ? ArrowUp
                  : ArrowDown;
              return (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    isActive
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className={
                      isActive
                        ? "client-list__sort-btn client-list__sort-btn--active"
                        : "client-list__sort-btn"
                    }
                    onClick={() =>
                      onSortChange({
                        key,
                        direction:
                          isActive && sort.direction === "asc" ? "desc" : "asc",
                      })
                    }
                  >
                    <span>{label}</span>
                    <SortIcon size={14} aria-hidden="true" />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="client-list__actions-heading">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => {
            const agencia = agenciaMap.get(cliente.codigoAgencia);
            const digits = onlyDigits(cliente.cpfCnpj);
            const isPessoaJuridica = digits.length === 14;

            return (
              <tr key={cliente.id} className="client-list__row">
                <th scope="row" className="client-list__name-cell">
                  <div className="client-list__name-wrap">
                    <span className="client-list__name">{cliente.nome}</span>
                    {cliente.nomeSocial ? (
                      <span className="client-list__social-name">
                        Nome social: {cliente.nomeSocial}
                      </span>
                    ) : null}
                  </div>
                </th>

                <td className="client-list__doc-cell tabular-nums">
                  <div className="client-list__doc-wrap">
                    <span
                      className={
                        isPessoaJuridica
                          ? "client-list__person-tag client-list__person-tag--pj"
                          : "client-list__person-tag client-list__person-tag--pf"
                      }
                    >
                      {isPessoaJuridica ? "PJ" : "PF"}
                    </span>
                    <span>{formatCpfCnpj(cliente.cpfCnpj)}</span>
                  </div>
                </td>

                <td className="client-list__email-cell">
                  <span className="client-list__inline-meta">
                    <Mail
                      size={14}
                      className="client-list__meta-icon"
                      aria-hidden="true"
                    />
                    <span>{cliente.email}</span>
                  </span>
                </td>

                <td className="client-list__agency-cell">
                  {agencia ? (
                    <span className="client-list__inline-meta">
                      <Building2
                        size={14}
                        className="client-list__meta-icon"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="tabular-nums">{agencia.codigo}</span> ·{" "}
                        {agencia.nome}
                      </span>
                    </span>
                  ) : (
                    <span>
                      <span className="tabular-nums">
                        {cliente.codigoAgencia}
                      </span>{" "}
                      ·{" "}
                      <span className="client-list__agency-missing">
                        Agência não localizada
                      </span>
                    </span>
                  )}
                </td>

                <td className="client-list__action-cell">
                  <Link
                    to={`/clientes/${encodeURIComponent(cliente.id)}`}
                    className="client-list__detail-link"
                  >
                    <span>Ver detalhes</span>
                    <span className="sr-only"> de {cliente.nome}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
