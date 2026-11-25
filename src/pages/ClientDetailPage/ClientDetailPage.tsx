import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  IdCard,
  Landmark,
  LayoutGrid,
  Mail,
  MapPin,
  PiggyBank,
  User,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AccountCard } from "../../components/AccountCard/AccountCard";
import { AccountDrawer } from "../../components/AccountDrawer/AccountDrawer";
import { AgencyCard } from "../../components/AgencyCard/AgencyCard";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { useBankData } from "../../context/useBankData";
import {
  formatCpfCnpj,
  formatCurrencyBRL,
  formatDateBR,
} from "../../utils/formatters";
import { onlyDigits } from "../../utils/normalizers";
import "./ClientDetailPage.css";

type DetailTabId = "overview" | "accounts" | "profile";

const DETAIL_TABS: readonly { id: DetailTabId; label: string }[] = [
  { id: "overview", label: "Resumo" },
  { id: "accounts", label: "Contas Bancárias" },
  { id: "profile", label: "Cadastro e Agência" },
];

interface DetailFieldProps {
  icon: LucideIcon;
  label: string;
  wide?: boolean;
  valueClassName?: string;
  children: ReactNode;
}

/** Par `<dt>`/`<dd>` com ícone, reutilizado no Resumo e na aba Cadastro. */
function DetailField({
  icon: Icon,
  label,
  wide = false,
  valueClassName = "client-detail__desc",
  children,
}: DetailFieldProps) {
  return (
    <div
      className={
        wide
          ? "client-detail__field client-detail__field--wide"
          : "client-detail__field"
      }
    >
      <dt className="client-detail__term">
        <Icon size={13} className="client-detail__term-icon" aria-hidden="true" />
        <span>{label}</span>
      </dt>
      <dd className={valueClassName}>{children}</dd>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "CL";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Define o arranjo da grade de contas para evitar espaços vazios no canto inferior:
 * - 2 ou múltiplos pares (4, 6...): 2 colunas no desktop.
 * - 3 ou múltiplos de 3 (3, 6...): 3 colunas alinhadas horizontalmente no desktop.
 * - 1 ou ímpares maiores (5, 7...): lista em coluna única limpa.
 */
function getAccountsGridClass(count: number): string {
  if (count <= 1) {
    return "client-detail__accounts-grid client-detail__accounts-grid--single";
  }
  if (count === 3 || (count > 3 && count % 3 === 0)) {
    return "client-detail__accounts-grid client-detail__accounts-grid--three";
  }
  if (count % 2 === 0) {
    return "client-detail__accounts-grid client-detail__accounts-grid--two";
  }
  return "client-detail__accounts-grid client-detail__accounts-grid--stack";
}

/**
 * Página de detalhes interativa do cliente (`/clientes/:id`).
 * Exibe faixa institucional Banestes com identidade + KPIs integrados,
 * folha única contínua com abas no topo (Visão Geral, Contas Bancárias,
 * Cadastro e Agência) e Drawer lateral animado para detalhamento de contas.
 */
export function ClientDetailPage() {
  // `useParams` já entrega o segmento decodificado.
  const { id: targetId = "" } = useParams<{ id: string }>();
  const { clientes, contas, agencias, isLoading, error, reload } =
    useBankData();

  const [activeTab, setActiveTab] = useState<DetailTabId>("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const tabRefs = useRef<Record<DetailTabId, HTMLButtonElement | null>>({
    overview: null,
    accounts: null,
    profile: null,
  });

  const cliente = useMemo(
    () => clientes.find((item) => item.id === targetId),
    [clientes, targetId],
  );

  const agencia = useMemo(() => {
    if (!cliente) {
      return undefined;
    }
    return agencias.find((item) => item.codigo === cliente.codigoAgencia);
  }, [agencias, cliente]);

  const clienteContas = useMemo(() => {
    if (!cliente) {
      return [];
    }
    const clientDigits = onlyDigits(cliente.cpfCnpj);
    return contas.filter(
      (conta) => onlyDigits(conta.cpfCnpjCliente) === clientDigits,
    );
  }, [contas, cliente]);

  const financialSummary = useMemo(() => {
    let totalSaldo = 0;
    let totalLimiteCredito = 0;
    let totalCreditoDisponivel = 0;

    for (const conta of clienteContas) {
      totalSaldo += conta.saldo;
      totalLimiteCredito += conta.limiteCredito;
      totalCreditoDisponivel += conta.creditoDisponivel;
    }

    const availablePercent =
      totalLimiteCredito > 0
        ? Math.min(
            100,
            Math.max(0, (totalCreditoDisponivel / totalLimiteCredito) * 100),
          )
        : 0;

    return {
      totalSaldo,
      totalLimiteCredito,
      totalCreditoDisponivel,
      availablePercent,
    };
  }, [clienteContas]);

  const activeAccountId = useMemo(() => {
    if (!selectedAccountId) {
      return null;
    }
    return clienteContas.some((item) => item.id === selectedAccountId)
      ? selectedAccountId
      : null;
  }, [clienteContas, selectedAccountId]);

  useEffect(() => {
    if (isLoading) {
      document.title = "Carregando cliente | Gestão de Clientes Bancários";
      return;
    }
    if (!cliente) {
      document.title = "Cliente não encontrado | Gestão de Clientes Bancários";
      return;
    }
    document.title = `${cliente.nome} | Gestão de Clientes Bancários`;
  }, [isLoading, cliente]);

  function activateTab(tabId: DetailTabId, shouldFocus: boolean) {
    setActiveTab(tabId);
    const button = tabRefs.current[tabId];
    if (button) {
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (shouldFocus) {
        button.focus();
      }
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % DETAIL_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + DETAIL_TABS.length) % DETAIL_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = DETAIL_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      activateTab(DETAIL_TABS[nextIndex].id, true);
    }
  }

  const backLink = (
    <Link to="/" className="client-detail__back-plain">
      <ArrowLeft size={16} aria-hidden="true" />
      <span>Voltar para a lista</span>
    </Link>
  );

  if (isLoading) {
    return (
      <div className="container client-detail__state">
        {backLink}
        <StatusMessage variant="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container client-detail__state">
        {backLink}
        <StatusMessage
          variant="error"
          title="Não foi possível carregar os dados"
          description={error}
          actionLabel="Tentar novamente"
          onAction={reload}
        />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="container client-detail__state page-enter">
        {backLink}

        <div className="client-detail__not-found">
          <UserX
            size={28}
            className="client-detail__not-found-icon"
            aria-hidden="true"
          />
          <h1 className="client-detail__not-found-title">
            Cliente não encontrado
          </h1>
          <p className="client-detail__not-found-text">
            Não localizamos um cadastro com o identificador{" "}
            <strong className="tabular-nums">
              {targetId || "desconhecido"}
            </strong>
            . Caso seja um cliente recém-cadastrado em memória, o registro é
            reiniciado ao recarregar a página.
          </p>
          <Link to="/" className="btn btn-primary">
            Voltar para a listagem
          </Link>
        </div>
      </div>
    );
  }

  const isPessoaJuridica = onlyDigits(cliente.cpfCnpj).length === 14;
  const initials = getInitials(cliente.nome);
  const agenciaLabel = agencia
    ? `${agencia.codigo} · ${agencia.nome}`
    : `Código ${cliente.codigoAgencia} (não localizada)`;

  const totalSaldoHeroClass =
    financialSummary.totalSaldo > 0
      ? "hero-kpi__value hero-kpi__value--positive tabular-nums"
      : financialSummary.totalSaldo < 0
        ? "hero-kpi__value hero-kpi__value--negative tabular-nums"
        : "hero-kpi__value tabular-nums";

  const accountsGridClass = getAccountsGridClass(clienteContas.length);

  const noAccountsMessage = (
    <div className="client-detail__empty-accounts">
      <Landmark
        size={24}
        className="client-detail__empty-icon"
        aria-hidden="true"
      />
      <p className="client-detail__empty-text">
        Nenhuma conta bancária vinculada a este cliente.
      </p>
    </div>
  );

  const overviewSection = (
    <>
      <section
        className="detail-sheet__section"
        aria-labelledby="overview-basics-heading"
      >
        <div className="detail-overview__head">
          <h2 id="overview-basics-heading" className="client-detail__section-title">
            <User
              size={19}
              className="client-detail__section-icon"
              aria-hidden="true"
            />
            <span>Dados Básicos</span>
          </h2>
          <button
            type="button"
            className="detail-overview__link-btn"
            onClick={() => activateTab("profile", true)}
          >
            <span>Ver cadastro completo</span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>

        <dl className="detail-overview__basics-grid">
          <DetailField icon={User} label="Nome completo">
            {cliente.nome}
          </DetailField>

          {cliente.nomeSocial ? (
            <DetailField icon={User} label="Nome social">
              {cliente.nomeSocial}
            </DetailField>
          ) : null}

          <DetailField
            icon={IdCard}
            label={isPessoaJuridica ? "CNPJ" : "CPF"}
            valueClassName="client-detail__desc tabular-nums"
          >
            {formatCpfCnpj(cliente.cpfCnpj)}
          </DetailField>

          <DetailField
            icon={Calendar}
            label="Data de nascimento"
            valueClassName="client-detail__desc tabular-nums"
          >
            {formatDateBR(cliente.dataNascimento)}
          </DetailField>

          <DetailField
            icon={Mail}
            label="E-mail"
            valueClassName="client-detail__desc client-detail__desc--break"
          >
            {cliente.email}
          </DetailField>

          <div className="client-detail__field">
            <dt className="client-detail__term">
              <Building2
                size={13}
                className="client-detail__term-icon"
                aria-hidden="true"
              />
              <span>Agência vinculada</span>
            </dt>
            <dd
              className={
                agencia
                  ? "client-detail__desc tabular-nums"
                  : "client-detail__desc detail-overview__agency-warning tabular-nums"
              }
            >
              {!agencia ? (
                <AlertTriangle size={14} aria-hidden="true" />
              ) : null}
              <span>{agenciaLabel}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="detail-sheet__section detail-sheet__section--tinted"
        aria-labelledby="overview-accounts-heading"
      >
        <div className="detail-overview__head">
          <div>
            <h2
              id="overview-accounts-heading"
              className="client-detail__section-title"
            >
              <Landmark
                size={19}
                className="client-detail__section-icon"
                aria-hidden="true"
              />
              <span>
                {clienteContas.length === 1
                  ? "Resumo da Conta Bancária"
                  : "Resumo das Contas Bancárias"}
              </span>
            </h2>
            <p className="client-detail__section-hint">
              {clienteContas.length === 0
                ? "Este cliente ainda não possui contas cadastradas."
                : "Selecione uma conta para abrir o detalhamento lateral ou acesse a aba Contas Bancárias."}
            </p>
          </div>

          <button
            type="button"
            className="detail-overview__link-btn"
            onClick={() => activateTab("accounts", true)}
          >
            <span>
              {clienteContas.length === 1
                ? "Ver conta detalhada"
                : "Ver todas as contas"}
            </span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>

        {clienteContas.length === 0 ? (
          noAccountsMessage
        ) : (
          <ul className="detail-overview__accounts-list">
            {clienteContas.map((conta) => {
              const isCorrente = conta.tipo === "corrente";
              const hasLimit = conta.limiteCredito > 0;
              const isSelected = activeAccountId === conta.id;
              const rowBalanceClass =
                conta.saldo > 0
                  ? "detail-overview__account-balance detail-overview__account-balance--positive tabular-nums"
                  : conta.saldo < 0
                    ? "detail-overview__account-balance detail-overview__account-balance--negative tabular-nums"
                    : "detail-overview__account-balance tabular-nums";

              return (
                <li
                  key={conta.id}
                  className={
                    isSelected
                      ? "detail-overview__account-row detail-overview__account-row--selected"
                      : "detail-overview__account-row"
                  }
                >
                  <div className="detail-overview__account-main">
                    <span
                      className={
                        isCorrente
                          ? "detail-overview__account-type detail-overview__account-type--corrente"
                          : "detail-overview__account-type detail-overview__account-type--poupanca"
                      }
                    >
                      {isCorrente ? (
                        <CreditCard size={14} aria-hidden="true" />
                      ) : (
                        <PiggyBank size={14} aria-hidden="true" />
                      )}
                      <span>
                        {isCorrente ? "Conta Corrente" : "Conta Poupança"}
                      </span>
                    </span>
                    <span className="detail-overview__account-id tabular-nums">
                      {conta.id}
                    </span>
                  </div>

                  <div className="detail-overview__account-figures">
                    <div className="detail-overview__account-metric">
                      <span className="detail-overview__account-metric-label">
                        Saldo
                      </span>
                      <strong className={rowBalanceClass}>
                        {formatCurrencyBRL(conta.saldo)}
                      </strong>
                    </div>

                    <div className="detail-overview__account-metric">
                      <span className="detail-overview__account-metric-label">
                        Crédito disponível
                      </span>
                      <span className="detail-overview__account-credit tabular-nums">
                        {hasLimit
                          ? `${formatCurrencyBRL(conta.creditoDisponivel)} / ${formatCurrencyBRL(conta.limiteCredito)}`
                          : "Sem limite contratado"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="detail-overview__account-btn"
                    aria-haspopup="dialog"
                    onClick={() => setSelectedAccountId(conta.id)}
                  >
                    <span>Detalhar</span>
                    <span className="sr-only">
                      {" "}
                      {isCorrente ? "Conta Corrente" : "Conta Poupança"}{" "}
                      {conta.id}
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );

  const accountsSection = (
    <section
      className="detail-sheet__section"
      aria-labelledby="accounts-heading"
    >
      <div className="client-detail__section-header">
        <div>
          <h2 id="accounts-heading" className="client-detail__section-title">
            <Landmark
              size={19}
              className="client-detail__section-icon"
              aria-hidden="true"
            />
            <span>Contas Bancárias</span>
          </h2>
          {clienteContas.length > 0 ? (
            <p className="client-detail__section-hint">
              Clique em uma conta para abrir o detalhamento interativo de
              limites e crédito.
            </p>
          ) : null}
        </div>
        <span className="client-detail__count tabular-nums">
          {clienteContas.length}{" "}
          {clienteContas.length === 1 ? "conta" : "contas"}
        </span>
      </div>

      {financialSummary.totalLimiteCredito > 0 ? (
        <div className="client-detail__credit-overview">
          <div className="client-detail__credit-overview-head">
            <span className="client-detail__credit-overview-label">
              Uso consolidado de limite nas contas
            </span>
            <span className="client-detail__credit-overview-ratio tabular-nums">
              {Math.round(financialSummary.availablePercent)}% disponível (
              {formatCurrencyBRL(financialSummary.totalCreditoDisponivel)} de{" "}
              {formatCurrencyBRL(financialSummary.totalLimiteCredito)})
            </span>
          </div>
          <div
            className="client-detail__credit-overview-track"
            role="progressbar"
            aria-label="Crédito disponível consolidado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(financialSummary.availablePercent)}
          >
            <div
              className="client-detail__credit-overview-fill"
              style={{ width: `${financialSummary.availablePercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {clienteContas.length === 0 ? (
        noAccountsMessage
      ) : (
        <div className={accountsGridClass}>
          {clienteContas.map((conta) => (
            <AccountCard
              key={conta.id}
              conta={conta}
              isSelected={activeAccountId === conta.id}
              onSelect={(selected) => setSelectedAccountId(selected.id)}
            />
          ))}
        </div>
      )}
    </section>
  );

  const profileAndAgencySection = (
    <div className="detail-sheet__split">
      <section
        className="detail-sheet__split-main"
        aria-labelledby="personal-data-heading"
      >
        <h2 id="personal-data-heading" className="sr-only">
          Dados Cadastrais
        </h2>

        <dl className="client-detail__grid">
          <DetailField icon={User} label="Nome completo">
            {cliente.nome}
          </DetailField>

          {cliente.nomeSocial ? (
            <DetailField icon={User} label="Nome social">
              {cliente.nomeSocial}
            </DetailField>
          ) : null}

          <DetailField
            icon={IdCard}
            label="CPF / CNPJ"
            valueClassName="client-detail__desc tabular-nums"
          >
            {formatCpfCnpj(cliente.cpfCnpj)}
          </DetailField>

          <DetailField
            icon={FileText}
            label="RG"
            valueClassName="client-detail__desc tabular-nums"
          >
            {cliente.rg ?? "Não informado"}
          </DetailField>

          <DetailField
            icon={Calendar}
            label="Data de nascimento"
            valueClassName="client-detail__desc tabular-nums"
          >
            {formatDateBR(cliente.dataNascimento)}
          </DetailField>

          <DetailField icon={Heart} label="Estado civil">
            {cliente.estadoCivil}
          </DetailField>

          <DetailField
            icon={Mail}
            label="E-mail"
            valueClassName="client-detail__desc client-detail__desc--break"
          >
            {cliente.email}
          </DetailField>

          <DetailField icon={MapPin} label="Endereço" wide>
            {cliente.endereco}
          </DetailField>

          <DetailField
            icon={Wallet}
            label="Renda anual"
            valueClassName="client-detail__desc client-detail__desc--financial tabular-nums"
          >
            {formatCurrencyBRL(cliente.rendaAnual)}
          </DetailField>

          <DetailField
            icon={Briefcase}
            label="Patrimônio"
            valueClassName="client-detail__desc client-detail__desc--financial tabular-nums"
          >
            {formatCurrencyBRL(cliente.patrimonio)}
          </DetailField>
        </dl>
      </section>

      <aside
        className="detail-sheet__split-side"
        aria-labelledby="agency-heading"
      >
        <h2 id="agency-heading" className="sr-only">
          Agência Vinculada
        </h2>
        <AgencyCard codigoAgencia={cliente.codigoAgencia} agencia={agencia} />
      </aside>
    </div>
  );

  return (
    <div className="client-detail">
      <section className="detail-hero" aria-labelledby="client-profile-heading">
        <div className="container detail-hero__inner">
          <nav aria-label="Navegação secundária">
            <Link to="/" className="detail-hero__back-link">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Voltar para a lista</span>
            </Link>
          </nav>

          <div className="detail-hero__main">
            <div className="detail-hero__profile">
              <div className="detail-hero__avatar" aria-hidden="true">
                <span className="detail-hero__initials">{initials}</span>
                <span className="detail-hero__avatar-dot" />
              </div>

              <div className="detail-hero__identity">
                <h1 id="client-profile-heading" className="detail-hero__title">
                  {cliente.nome}
                </h1>
                {cliente.nomeSocial ? (
                  <p className="detail-hero__social-name">
                    Nome social: <span>{cliente.nomeSocial}</span>
                  </p>
                ) : null}
                <div className="detail-hero__meta tabular-nums">
                  <span>
                    {isPessoaJuridica ? "Pessoa Jurídica" : "Pessoa Física"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>ID {cliente.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatCpfCnpj(cliente.cpfCnpj)}</span>
                </div>
              </div>
            </div>

            <dl
              className="hero-kpi-strip"
              aria-label="Resumo financeiro consolidado do cliente"
            >
              <div className="hero-kpi">
                <dt className="hero-kpi__label">
                  <Wallet
                    size={14}
                    className="hero-kpi__icon hero-kpi__icon--green"
                    aria-hidden="true"
                  />
                  <span>Saldo Total</span>
                </dt>
                <dd className={totalSaldoHeroClass}>
                  {formatCurrencyBRL(financialSummary.totalSaldo)}
                </dd>
                <dd className="hero-kpi__sub tabular-nums">
                  {clienteContas.length === 0
                    ? "Nenhuma conta vinculada"
                    : clienteContas.length === 1
                      ? "Soma de 1 conta"
                      : `Soma de ${clienteContas.length} contas`}
                </dd>
              </div>

              <div className="hero-kpi">
                <dt className="hero-kpi__label">
                  <CreditCard
                    size={14}
                    className="hero-kpi__icon"
                    aria-hidden="true"
                  />
                  <span>Crédito Disponível</span>
                </dt>
                <dd className="hero-kpi__value tabular-nums">
                  {formatCurrencyBRL(financialSummary.totalCreditoDisponivel)}
                </dd>
                <dd className="hero-kpi__sub tabular-nums">
                  {financialSummary.totalLimiteCredito > 0
                    ? `de ${formatCurrencyBRL(financialSummary.totalLimiteCredito)} em limites`
                    : "Sem limite contratado"}
                </dd>
              </div>

              <div className="hero-kpi">
                <dt className="hero-kpi__label">
                  <Briefcase
                    size={14}
                    className="hero-kpi__icon hero-kpi__icon--green"
                    aria-hidden="true"
                  />
                  <span>Patrimônio Declarado</span>
                </dt>
                <dd className="hero-kpi__value tabular-nums">
                  {formatCurrencyBRL(cliente.patrimonio)}
                </dd>
                <dd className="hero-kpi__sub tabular-nums">
                  Renda anual: {formatCurrencyBRL(cliente.rendaAnual)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="container client-detail__body page-enter">
        <div className="detail-sheet">
          <div
            className="detail-tabs__list"
            role="tablist"
            aria-label="Seções do perfil do cliente"
          >
            {DETAIL_TABS.map((tab, index) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[tab.id] = node;
                  }}
                  id={`detail-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={isSelected ? "detail-tabpanel" : undefined}
                  tabIndex={isSelected ? 0 : -1}
                  className="detail-tabs__tab"
                  onClick={() => activateTab(tab.id, false)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {tab.id === "overview" ? (
                    <LayoutGrid size={16} aria-hidden="true" />
                  ) : tab.id === "accounts" ? (
                    <Landmark size={16} aria-hidden="true" />
                  ) : (
                    <User size={16} aria-hidden="true" />
                  )}
                  <span>{tab.label}</span>
                  {tab.id === "accounts" ? (
                    <span className="detail-tabs__badge tabular-nums">
                      {clienteContas.length}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            key={activeTab}
            id="detail-tabpanel"
            role="tabpanel"
            aria-labelledby={`detail-tab-${activeTab}`}
            className="detail-tabs__panel"
          >
            {activeTab === "overview"
              ? overviewSection
              : activeTab === "accounts"
                ? accountsSection
                : profileAndAgencySection}
          </div>
        </div>
      </div>

      <AccountDrawer
        isOpen={activeAccountId !== null}
        contas={clienteContas}
        activeAccountId={activeAccountId}
        clientName={cliente.nome}
        agenciaLabel={agenciaLabel}
        onSelectAccount={(accountId) => setSelectedAccountId(accountId)}
        onClose={() => setSelectedAccountId(null)}
      />
    </div>
  );
}
