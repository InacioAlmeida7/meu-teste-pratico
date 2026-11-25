import { ChevronRight, CreditCard, PiggyBank, Wallet } from "lucide-react";
import type { Conta } from "../../types/models";
import { formatCurrencyBRL } from "../../utils/formatters";
import "./AccountCard.css";

interface AccountCardProps {
  conta: Conta;
  isSelected?: boolean;
  onSelect?: (conta: Conta) => void;
}

/**
 * Cartão financeiro interativo da conta bancária (corrente ou poupança).
 * Mantém visíveis tipo, ID, saldo, limite, crédito disponível e barra animada,
 * com gatilho nativo estendido para abrir o Drawer de detalhamento completo.
 */
export function AccountCard({
  conta,
  isSelected = false,
  onSelect,
}: AccountCardProps) {
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

  const cardClass = [
    "account-card",
    onSelect ? "account-card--interactive" : "",
    isSelected ? "account-card--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClass}>
      <header className="account-card__header">
        <div className="account-card__type-group">
          {isCorrente ? (
            <CreditCard
              size={16}
              className="account-card__type-icon"
              aria-hidden="true"
            />
          ) : (
            <PiggyBank
              size={16}
              className="account-card__type-icon"
              aria-hidden="true"
            />
          )}
          <span
            className={
              isCorrente
                ? "account-card__type account-card__type--corrente"
                : "account-card__type account-card__type--poupanca"
            }
          >
            {isCorrente ? "Conta Corrente" : "Conta Poupança"}
          </span>
        </div>
        <span className="account-card__id tabular-nums">{conta.id}</span>
      </header>

      <div className="account-card__balance">
        <span className="account-card__balance-label">
          <Wallet
            size={13}
            className="account-card__inline-icon"
            aria-hidden="true"
          />
          <span>Saldo atual</span>
        </span>
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

      {onSelect ? (
        <div className="account-card__footer">
          <button
            type="button"
            className="account-card__action-btn"
            aria-haspopup="dialog"
            onClick={() => onSelect(conta)}
          >
            <span>Ver detalhamento</span>
            <span className="sr-only">
              {" "}
              da {isCorrente ? "Conta Corrente" : "Conta Poupança"} {conta.id}
            </span>
            <ChevronRight
              size={16}
              className="account-card__action-icon"
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}
    </article>
  );
}
