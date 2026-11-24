import type { Conta } from "../../types/models";
import { formatCurrencyBRL } from "../../utils/formatters";
import "./AccountCard.css";

interface AccountCardProps {
  conta: Conta;
}

/**
 * Cartão financeiro da conta bancária (corrente ou poupança), com alinhamento
 * tabular nos valores monetários e barra visual de crédito disponível em CSS puro.
 */
export function AccountCard({ conta }: AccountCardProps) {
  const isCorrente = conta.tipo === "corrente";
  const hasLimit = conta.limiteCredito > 0;
  const usedCredit = hasLimit
    ? Math.max(0, conta.limiteCredito - conta.creditoDisponivel)
    : 0;
  const availablePercent = hasLimit
    ? Math.min(
        100,
        Math.max(0, (conta.creditoDisponivel / conta.limiteCredito) * 100),
      )
    : 0;
  const roundedPercent = Math.round(availablePercent);

  const balanceClass =
    conta.saldo > 0
      ? "account-card__balance-value account-card__balance-value--positive tabular-nums"
      : conta.saldo < 0
        ? "account-card__balance-value account-card__balance-value--negative tabular-nums"
        : "account-card__balance-value tabular-nums";

  return (
    <article className="account-card">
      <header className="account-card__header">
        <span
          className={
            isCorrente
              ? "account-card__type account-card__type--corrente"
              : "account-card__type account-card__type--poupanca"
          }
        >
          {isCorrente ? "Conta Corrente" : "Conta Poupança"}
        </span>
        <span className="account-card__id tabular-nums">{conta.id}</span>
      </header>

      <div className="account-card__balance">
        <span className="account-card__balance-label">Saldo atual</span>
        <strong className={balanceClass}>
          {formatCurrencyBRL(conta.saldo)}
        </strong>
      </div>

      <dl className="account-card__metrics">
        <div className="account-card__metric">
          <dt className="account-card__metric-label">Limite de Crédito</dt>
          <dd className="account-card__metric-value tabular-nums">
            {formatCurrencyBRL(conta.limiteCredito)}
          </dd>
        </div>

        <div className="account-card__metric">
          <dt className="account-card__metric-label">Crédito Disponível</dt>
          <dd className="account-card__metric-value tabular-nums">
            {formatCurrencyBRL(conta.creditoDisponivel)}
          </dd>
        </div>

        {hasLimit ? (
          <div className="account-card__metric">
            <dt className="account-card__metric-label">Crédito Utilizado</dt>
            <dd className="account-card__metric-value tabular-nums">
              {formatCurrencyBRL(usedCredit)}
            </dd>
          </div>
        ) : null}
      </dl>

      {hasLimit ? (
        <div className="account-card__credit-bar-group">
          <div className="account-card__credit-bar-header">
            <span className="account-card__credit-bar-label">
              Proporção disponível
            </span>
            <span className="account-card__credit-bar-percent tabular-nums">
              {roundedPercent}%
            </span>
          </div>
          <div
            className="account-card__progress-track"
            role="progressbar"
            aria-label="Crédito disponível"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={roundedPercent}
          >
            <div
              className={
                roundedPercent < 20
                  ? "account-card__progress-fill account-card__progress-fill--low"
                  : "account-card__progress-fill"
              }
              style={{ width: `${availablePercent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="account-card__no-limit">
          Sem limite de crédito contratado
        </p>
      )}
    </article>
  );
}
