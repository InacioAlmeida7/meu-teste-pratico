import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Heart,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  User,
  UserX,
  Wallet,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AccountCard } from "../../components/AccountCard/AccountCard";
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

function decodeParam(value: string | undefined): string {
  if (!value) {
    return "";
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
 * Página de detalhes do cliente (`/clientes/:id`).
 * Apresenta faixa institucional com avatar e identificação, grade conectada
 * de 2 colunas no desktop (Dados Cadastrais + Agência Vinculada) e contas bancárias.
 */
export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const targetId = decodeParam(id);
  const { clientes, contas, agencias, isLoading, error, reload } =
    useBankData();

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

  if (isLoading) {
    return (
      <div className="container client-detail__state">
        <Link to="/" className="client-detail__back-plain">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar para a lista</span>
        </Link>
        <StatusMessage variant="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container client-detail__state">
        <Link to="/" className="client-detail__back-plain">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar para a lista</span>
        </Link>
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
        <Link to="/" className="client-detail__back-plain">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar para a lista</span>
        </Link>

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
                <span>{isPessoaJuridica ? "Pessoa Jurídica" : "Pessoa Física"}</span>
                <span aria-hidden="true">·</span>
                <span>ID {cliente.id}</span>
                <span aria-hidden="true">·</span>
                <span>{formatCpfCnpj(cliente.cpfCnpj)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container client-detail__body page-enter">
        <div className="client-detail__top-grid">
          <section
            className="client-detail__section"
            aria-labelledby="personal-data-heading"
          >
            <h2
              id="personal-data-heading"
              className="client-detail__section-title"
            >
              <User
                size={19}
                className="client-detail__section-icon"
                aria-hidden="true"
              />
              <span>Dados Cadastrais</span>
            </h2>

            <div className="client-detail__card">
              <dl className="client-detail__grid">
                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <User
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>Nome completo</span>
                  </dt>
                  <dd className="client-detail__desc">{cliente.nome}</dd>
                </div>

                {cliente.nomeSocial ? (
                  <div className="client-detail__field">
                    <dt className="client-detail__term">
                      <User
                        size={13}
                        className="client-detail__term-icon"
                        aria-hidden="true"
                      />
                      <span>Nome social</span>
                    </dt>
                    <dd className="client-detail__desc">{cliente.nomeSocial}</dd>
                  </div>
                ) : null}

                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <IdCard
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>CPF / CNPJ</span>
                  </dt>
                  <dd className="client-detail__desc tabular-nums">
                    {formatCpfCnpj(cliente.cpfCnpj)}
                  </dd>
                </div>

                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <FileText
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>RG</span>
                  </dt>
                  <dd className="client-detail__desc tabular-nums">
                    {cliente.rg ?? "Não informado"}
                  </dd>
                </div>

                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <Calendar
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>Data de nascimento</span>
                  </dt>
                  <dd className="client-detail__desc tabular-nums">
                    {formatDateBR(cliente.dataNascimento)}
                  </dd>
                </div>

                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <Heart
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>Estado civil</span>
                  </dt>
                  <dd className="client-detail__desc">{cliente.estadoCivil}</dd>
                </div>

                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <Mail
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>E-mail</span>
                  </dt>
                  <dd className="client-detail__desc client-detail__desc--break">
                    {cliente.email}
                  </dd>
                </div>

                <div className="client-detail__field client-detail__field--wide">
                  <dt className="client-detail__term">
                    <MapPin
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>Endereço</span>
                  </dt>
                  <dd className="client-detail__desc">{cliente.endereco}</dd>
                </div>

                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <Wallet
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>Renda anual</span>
                  </dt>
                  <dd className="client-detail__desc client-detail__desc--financial tabular-nums">
                    {formatCurrencyBRL(cliente.rendaAnual)}
                  </dd>
                </div>

                <div className="client-detail__field">
                  <dt className="client-detail__term">
                    <Briefcase
                      size={13}
                      className="client-detail__term-icon"
                      aria-hidden="true"
                    />
                    <span>Patrimônio</span>
                  </dt>
                  <dd className="client-detail__desc client-detail__desc--financial tabular-nums">
                    {formatCurrencyBRL(cliente.patrimonio)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section
            className="client-detail__section"
            aria-labelledby="agency-heading"
          >
            <h2 id="agency-heading" className="client-detail__section-title">
              <Building2
                size={19}
                className="client-detail__section-icon"
                aria-hidden="true"
              />
              <span>Agência Vinculada</span>
            </h2>
            <AgencyCard
              codigoAgencia={cliente.codigoAgencia}
              agencia={agencia}
            />
          </section>
        </div>

        <section
          className="client-detail__section"
          aria-labelledby="accounts-heading"
        >
          <div className="client-detail__section-header">
            <h2 id="accounts-heading" className="client-detail__section-title">
              <Landmark
                size={19}
                className="client-detail__section-icon"
                aria-hidden="true"
              />
              <span>Contas Bancárias</span>
            </h2>
            <span className="client-detail__count tabular-nums">
              {clienteContas.length}{" "}
              {clienteContas.length === 1 ? "conta" : "contas"}
            </span>
          </div>

          {clienteContas.length === 0 ? (
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
          ) : (
            <div className="client-detail__accounts-grid">
              {clienteContas.map((conta) => (
                <AccountCard key={conta.id} conta={conta} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
