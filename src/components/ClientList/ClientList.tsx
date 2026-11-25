import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronRight,
  Mail,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SortDirection } from "../../hooks/useClientFilters";
import type { Agencia, Cliente } from "../../types/models";
import { formatCpfCnpj } from "../../utils/formatters";
import { onlyDigits } from "../../utils/normalizers";
import "./ClientList.css";

interface ClientListProps {
  clientes: Cliente[];
  agenciaMap: Map<number, Agencia>;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
}

/**
 * Listagem responsiva de clientes com tabela semântica única:
 * no desktop (>= 768px) exibe tabela tabular com destaque visual de tipo PF/PJ e hover fluido;
 * no mobile (< 768px) transforma as linhas em cards empilhados com rótulos CSS.
 * O cabeçalho "Nome" é um botão que alterna a ordem A–Z / Z–A (`aria-sort`).
 */
export function ClientList({
  clientes,
  agenciaMap,
  sortDirection,
  onSortDirectionChange,
}: ClientListProps) {
  const SortIcon = sortDirection === "asc" ? ArrowUp : ArrowDown;

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
            <th
              scope="col"
              aria-sort={sortDirection === "asc" ? "ascending" : "descending"}
            >
              <button
                type="button"
                className="client-list__sort-btn"
                onClick={() =>
                  onSortDirectionChange(
                    sortDirection === "asc" ? "desc" : "asc",
                  )
                }
              >
                <span>Nome</span>
                <SortIcon size={14} aria-hidden="true" />
              </button>
            </th>
            <th scope="col">CPF / CNPJ</th>
            <th scope="col">E-mail</th>
            <th scope="col">Agência</th>
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
