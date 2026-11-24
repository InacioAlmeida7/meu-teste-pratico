import { AlertTriangle, Building2, Hash, MapPin } from "lucide-react";
import type { Agencia } from "../../types/models";
import "./AgencyCard.css";

interface AgencyCardProps {
  codigoAgencia: number;
  agencia: Agencia | undefined;
}

/**
 * Exibe os dados da agência vinculada ao cliente com ícones institucionais em verde
 * ou um aviso resiliente caso o código não exista na planilha de agências.
 */
export function AgencyCard({ codigoAgencia, agencia }: AgencyCardProps) {
  if (!agencia) {
    return (
      <div className="agency-card agency-card--missing" role="status">
        <div className="agency-card__missing-header">
          <AlertTriangle
            size={20}
            className="agency-card__missing-icon"
            aria-hidden="true"
          />
          <h3 className="agency-card__missing-title">
            Agência não localizada para o código{" "}
            <span className="tabular-nums">{codigoAgencia}</span>
          </h3>
        </div>
        <p className="agency-card__missing-text">
          O cadastro do cliente aponta para um código de agência que não consta
          na base atual de agências.
        </p>
      </div>
    );
  }

  return (
    <article className="agency-card">
      <header className="agency-card__header">
        <div className="agency-card__title-group">
          <Building2
            size={20}
            className="agency-card__icon"
            aria-hidden="true"
          />
          <h3 className="agency-card__name">{agencia.nome}</h3>
        </div>
        <span className="agency-card__code tabular-nums">
          Cód. {agencia.codigo}
        </span>
      </header>

      <dl className="agency-card__details">
        <div className="agency-card__item">
          <dt className="agency-card__term">
            <Hash size={13} className="agency-card__term-icon" aria-hidden="true" />
            <span>Código</span>
          </dt>
          <dd className="agency-card__desc tabular-nums">{agencia.codigo}</dd>
        </div>
        <div className="agency-card__item">
          <dt className="agency-card__term">
            <Hash size={13} className="agency-card__term-icon" aria-hidden="true" />
            <span>ID da Agência</span>
          </dt>
          <dd className="agency-card__desc tabular-nums">{agencia.id}</dd>
        </div>
        <div className="agency-card__item agency-card__item--full">
          <dt className="agency-card__term">
            <MapPin size={13} className="agency-card__term-icon" aria-hidden="true" />
            <span>Endereço</span>
          </dt>
          <dd className="agency-card__desc">{agencia.endereco}</dd>
        </div>
      </dl>
    </article>
  );
}
