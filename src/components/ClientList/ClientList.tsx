import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Agencia, Cliente } from "../../types/models";
import { formatCpfCnpj } from "../../utils/formatters";
import "./ClientList.css";

interface ClientListProps {
  clientes: Cliente[];
  agenciaMap: Map<number, Agencia>;
}

/**
 * Listagem responsiva de clientes com tabela semântica única:
 * no desktop (>= 768px) exibe tabela tabular; no mobile (< 768px) transforma
 * as linhas em cards empilhados com rótulos injetados via variáveis CSS.
 */
export function ClientList({ clientes, agenciaMap }: ClientListProps) {
  return (
    <div
      className="client-list-wrapper"
      tabIndex={0}
      role="region"
      aria-labelledby="client-table-caption"
    >
      <table className="client-list__table">
        <caption id="client-table-caption" className="sr-only">
          Lista de clientes bancários
        </caption>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
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

            return (
              <tr key={cliente.id} className="client-list__row">
                <th scope="row" className="client-list__name-cell">
                  <span className="client-list__name">{cliente.nome}</span>
                  {cliente.nomeSocial ? (
                    <span className="client-list__social-name">
                      Nome social: {cliente.nomeSocial}
                    </span>
                  ) : null}
                </th>

                <td className="client-list__doc-cell tabular-nums">
                  {formatCpfCnpj(cliente.cpfCnpj)}
                </td>

                <td className="client-list__email-cell">{cliente.email}</td>

                <td className="client-list__agency-cell">
                  {agencia ? (
                    <span>
                      <span className="tabular-nums">{agencia.codigo}</span> ·{" "}
                      {agencia.nome}
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
