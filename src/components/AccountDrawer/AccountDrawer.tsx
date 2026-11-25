import { useEffect, useRef } from "react";
import {
  Building2,
  CreditCard,
  Hash,
  IdCard,
  PiggyBank,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useBackdropClose } from "../../hooks/useBackdropClose";
import type { Conta } from "../../types/models";
import { formatCpfCnpj, formatCurrencyBRL } from "../../utils/formatters";
import "./AccountDrawer.css";

interface AccountDrawerProps {
  isOpen: boolean;
  contas: Conta[];
  activeAccountId: string | null;
  clientName: string;
  agenciaLabel: string;
  onSelectAccount: (accountId: string) => void;
  onClose: () => void;
}

/**
 * Painel lateral deslizante (Drawer) construído com `<dialog>` nativo (`showModal`/`close`),
 * exibindo detalhamento financeiro completo da conta selecionada e um seletor
 * para alternar entre as contas vinculadas ao mesmo cliente.
 */
export function AccountDrawer({
  isOpen,
  contas,
  activeAccountId,
  clientName,
  agenciaLabel,
  onSelectAccount,
  onClose,
}: AccountDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropHandlers = useBackdropClose(dialogRef, handleRequestClose);

  const activeConta =
    contas.find((item) => item.id === activeAccountId) ?? contas[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && activeConta && !dialog.open) {
      const closeButton = dialog.querySelector<HTMLButtonElement>(
        "#account-drawer-close",
      );
      closeButton?.setAttribute("autofocus", "");
      dialog.showModal();
      closeButton?.focus();
    } else if ((!isOpen || !activeConta) && dialog.open) {
      dialog.close();
    }
  }, [isOpen, activeConta]);

  function handleRequestClose() {
    dialogRef.current?.close();
  }

  const isCorrente = activeConta?.tipo === "corrente";
  const hasLimit = Boolean(activeConta && activeConta.limiteCredito > 0);
  const usedCredit =
    activeConta && hasLimit
      ? Math.max(0, activeConta.limiteCredito - activeConta.creditoDisponivel)
      : 0;
  const availablePercent =
    activeConta && hasLimit
      ? Math.min(
          100,
          Math.max(
            0,
            (activeConta.creditoDisponivel / activeConta.limiteCredito) * 100,
          ),
        )
      : 0;
  const usedPercent = hasLimit ? Math.max(0, 100 - availablePercent) : 0;
  const roundedAvailablePercent = Math.round(availablePercent);
  const roundedUsedPercent = hasLimit ? 100 - roundedAvailablePercent : 0;

  const hasMultipleAccounts = contas.length > 1;

  const balanceClass =
    !activeConta || activeConta.saldo === 0
      ? "account-drawer__balance-value tabular-nums"
      : activeConta.saldo > 0
        ? "account-drawer__balance-value account-drawer__balance-value--positive tabular-nums"
        : "account-drawer__balance-value account-drawer__balance-value--negative tabular-nums";

  return (
    <dialog
      ref={dialogRef}
      className="account-drawer"
      aria-labelledby="account-drawer-title"
      onClose={onClose}
      {...backdropHandlers}
    >
      {activeConta ? (
        <div className="account-drawer__shell">
          <header className="account-drawer__header">
            <div className="account-drawer__header-main">
              <div className="account-drawer__header-badges">
                <span
                  className={
                    isCorrente
                      ? "account-drawer__type account-drawer__type--corrente"
                      : "account-drawer__type account-drawer__type--poupanca"
                  }
                >
                  {isCorrente ? (
                    <CreditCard size={14} aria-hidden="true" />
                  ) : (
                    <PiggyBank size={14} aria-hidden="true" />
                  )}
                  <span>{isCorrente ? "Conta Corrente" : "Conta Poupança"}</span>
                </span>
                <span className="account-drawer__id tabular-nums">
                  {activeConta.id}
                </span>
              </div>

              <h2 id="account-drawer-title" className="account-drawer__title">
                Detalhamento da Conta
              </h2>
              <p className="account-drawer__subtitle">{clientName}</p>
            </div>

            <button
              id="account-drawer-close"
              type="button"
              className="account-drawer__close"
              aria-label="Fechar detalhamento da conta"
              onClick={handleRequestClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {hasMultipleAccounts ? (
            <div
              className="account-drawer__switcher"
              role="group"
              aria-label="Alternar entre contas do cliente"
            >
              {contas.map((conta) => {
                const isSelected = conta.id === activeConta.id;
                return (
                  <button
                    key={conta.id}
                    type="button"
                    className={
                      isSelected
                        ? "account-drawer__switch-btn account-drawer__switch-btn--active"
                        : "account-drawer__switch-btn"
                    }
                    aria-pressed={isSelected}
                    onClick={() => onSelectAccount(conta.id)}
                  >
                    <span className="tabular-nums">{conta.id}</span>
                    <span className="account-drawer__switch-kind">
                      {conta.tipo === "corrente" ? "Corrente" : "Poupança"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div key={activeConta.id} className="account-drawer__body">
            <section
              className="account-drawer__balance-card"
              aria-label="Saldo da conta"
            >
              <span className="account-drawer__balance-label">
                <Wallet size={15} aria-hidden="true" />
                <span>Saldo atual</span>
              </span>
              <strong className={balanceClass}>
                {formatCurrencyBRL(activeConta.saldo)}
              </strong>
              <p className="account-drawer__balance-hint">
                {activeConta.saldo > 0
                  ? "Saldo disponível positivo"
                  : activeConta.saldo < 0
                    ? "Saldo negativo em conta"
                    : "Saldo zerado"}
              </p>
            </section>

            <section
              className="account-drawer__panel"
              aria-labelledby="drawer-credit-heading"
            >
              <h3
                id="drawer-credit-heading"
                className="account-drawer__panel-title"
              >
                <ShieldCheck
                  size={17}
                  className="account-drawer__panel-icon"
                  aria-hidden="true"
                />
                <span>Resumo de Limite e Crédito</span>
              </h3>

              <dl className="account-drawer__credit-grid">
                <div className="account-drawer__credit-item">
                  <dt className="account-drawer__term">Limite de Crédito</dt>
                  <dd className="account-drawer__value tabular-nums">
                    {formatCurrencyBRL(activeConta.limiteCredito)}
                  </dd>
                </div>

                <div className="account-drawer__credit-item">
                  <dt className="account-drawer__term">Crédito Disponível</dt>
                  <dd className="account-drawer__value account-drawer__value--available tabular-nums">
                    {formatCurrencyBRL(activeConta.creditoDisponivel)}
                  </dd>
                </div>

                <div className="account-drawer__credit-item">
                  <dt className="account-drawer__term">Crédito Utilizado</dt>
                  <dd className="account-drawer__value tabular-nums">
                    {formatCurrencyBRL(usedCredit)}
                  </dd>
                </div>

                <div className="account-drawer__credit-item">
                  <dt className="account-drawer__term">Percentual de Uso</dt>
                  <dd className="account-drawer__value tabular-nums">
                    {hasLimit ? `${roundedUsedPercent}%` : "Sem limite"}
                  </dd>
                </div>
              </dl>

              {hasLimit ? (
                <div className="account-drawer__bar-section">
                  <div className="account-drawer__bar-labels">
                    <span className="account-drawer__bar-legend">
                      <span
                        className="account-drawer__dot account-drawer__dot--used"
                        aria-hidden="true"
                      />
                      <span>
                        Utilizado:{" "}
                        <strong className="tabular-nums">
                          {roundedUsedPercent}%
                        </strong>
                      </span>
                    </span>
                    <span className="account-drawer__bar-legend">
                      <span
                        className="account-drawer__dot account-drawer__dot--available"
                        aria-hidden="true"
                      />
                      <span>
                        Disponível:{" "}
                        <strong className="tabular-nums">
                          {roundedAvailablePercent}%
                        </strong>
                      </span>
                    </span>
                  </div>

                  <div
                    className="account-drawer__segmented-track"
                    role="progressbar"
                    aria-label="Percentual de crédito utilizado"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={roundedUsedPercent}
                  >
                    <div
                      className="account-drawer__segment account-drawer__segment--used"
                      style={{ width: `${usedPercent}%` }}
                    />
                    <div
                      className="account-drawer__segment account-drawer__segment--available"
                      style={{ width: `${availablePercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="account-drawer__no-limit">
                  Esta conta não possui limite de crédito contratado.
                </p>
              )}
            </section>

            <section
              className="account-drawer__panel"
              aria-labelledby="drawer-meta-heading"
            >
              <h3
                id="drawer-meta-heading"
                className="account-drawer__panel-title"
              >
                <Hash
                  size={17}
                  className="account-drawer__panel-icon"
                  aria-hidden="true"
                />
                <span>Identificação da Conta</span>
              </h3>

              <dl className="account-drawer__meta-list">
                <div className="account-drawer__meta-row">
                  <dt className="account-drawer__term">
                    <Hash size={13} aria-hidden="true" />
                    <span>Identificador</span>
                  </dt>
                  <dd className="account-drawer__meta-value tabular-nums">
                    {activeConta.id}
                  </dd>
                </div>

                <div className="account-drawer__meta-row">
                  <dt className="account-drawer__term">
                    <CreditCard size={13} aria-hidden="true" />
                    <span>Modalidade</span>
                  </dt>
                  <dd className="account-drawer__meta-value">
                    {isCorrente ? "Conta Corrente" : "Conta Poupança"}
                  </dd>
                </div>

                <div className="account-drawer__meta-row">
                  <dt className="account-drawer__term">
                    <IdCard size={13} aria-hidden="true" />
                    <span>CPF / CNPJ do titular</span>
                  </dt>
                  <dd className="account-drawer__meta-value tabular-nums">
                    {formatCpfCnpj(activeConta.cpfCnpjCliente)}
                  </dd>
                </div>

                <div className="account-drawer__meta-row">
                  <dt className="account-drawer__term">
                    <Building2 size={13} aria-hidden="true" />
                    <span>Agência vinculada</span>
                  </dt>
                  <dd className="account-drawer__meta-value tabular-nums">
                    {agenciaLabel}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <footer className="account-drawer__footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleRequestClose}
            >
              Fechar
            </button>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}
