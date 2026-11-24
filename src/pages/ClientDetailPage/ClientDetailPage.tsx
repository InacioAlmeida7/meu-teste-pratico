import { useEffect, useMemo } from "react";
import { ArrowLeft, Landmark, UserX } from "lucide-react";
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

/**
 * Página de detalhes do cliente (`/clientes/:id`).
 * Exibe dados cadastrais completos, agência vinculada e contas bancárias cruzadas
 * via CPF/CNPJ normalizado (`onlyDigits`), tratando cliente, agência ou contas ausentes.
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
      <div className="container client-detail">
        <Link to="/" className="client-detail__back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar para a lista</span>
        </Link>
        <StatusMessage variant="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container client-detail">
        <Link to="/" className="client-detail__back-link">
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
      <div className="container client-detail">
        <Link to="/" className="client-detail__back-link">
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

  return (
    <div className="container client-detail">
      <nav aria-label="Navegação secundária">
        <Link to="/" className="client-detail__back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar para a lista</span>
        </Link>
      </nav>

      <header className="client-detail__hero">
        <div className="client-detail__hero-main">
          <h1 className="client-detail__title">{cliente.nome}</h1>
          {cliente.nomeSocial ? (
            <p className="client-detail__social-name">
              Nome social: <span>{cliente.nomeSocial}</span>
            </p>
          ) : null}
        </div>
        <div className="client-detail__hero-meta tabular-nums">
          <span>ID {cliente.id}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCpfCnpj(cliente.cpfCnpj)}</span>
        </div>
      </header>

      <section
        className="client-detail__section"
        aria-labelledby="personal-data-heading"
      >
        <h2 id="personal-data-heading" className="client-detail__section-title">
          Dados Cadastrais
        </h2>
        <div className="client-detail__card">
          <dl className="client-detail__grid">
            <div className="client-detail__field">
              <dt className="client-detail__term">Nome completo</dt>
              <dd className="client-detail__desc">{cliente.nome}</dd>
            </div>

            {cliente.nomeSocial ? (
              <div className="client-detail__field">
                <dt className="client-detail__term">Nome social</dt>
                <dd className="client-detail__desc">{cliente.nomeSocial}</dd>
              </div>
            ) : null}

            <div className="client-detail__field">
              <dt className="client-detail__term">CPF / CNPJ</dt>
              <dd className="client-detail__desc tabular-nums">
                {formatCpfCnpj(cliente.cpfCnpj)}
              </dd>
            </div>

            <div className="client-detail__field">
              <dt className="client-detail__term">RG</dt>
              <dd className="client-detail__desc tabular-nums">
                {cliente.rg ?? "Não informado"}
              </dd>
            </div>

            <div className="client-detail__field">
              <dt className="client-detail__term">Data de nascimento</dt>
              <dd className="client-detail__desc tabular-nums">
                {formatDateBR(cliente.dataNascimento)}
              </dd>
            </div>

            <div className="client-detail__field">
              <dt className="client-detail__term">Estado civil</dt>
              <dd className="client-detail__desc">{cliente.estadoCivil}</dd>
            </div>

            <div className="client-detail__field">
              <dt className="client-detail__term">E-mail</dt>
              <dd className="client-detail__desc client-detail__desc--break">
                {cliente.email}
              </dd>
            </div>

            <div className="client-detail__field client-detail__field--wide">
              <dt className="client-detail__term">Endereço</dt>
              <dd className="client-detail__desc">{cliente.endereco}</dd>
            </div>

            <div className="client-detail__field">
              <dt className="client-detail__term">Renda anual</dt>
              <dd className="client-detail__desc client-detail__desc--financial tabular-nums">
                {formatCurrencyBRL(cliente.rendaAnual)}
              </dd>
            </div>

            <div className="client-detail__field">
              <dt className="client-detail__term">Patrimônio</dt>
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
          Agência Vinculada
        </h2>
        <AgencyCard codigoAgencia={cliente.codigoAgencia} agencia={agencia} />
      </section>

      <section
        className="client-detail__section"
        aria-labelledby="accounts-heading"
      >
        <div className="client-detail__section-header">
          <h2 id="accounts-heading" className="client-detail__section-title">
            Contas Bancárias
          </h2>
          <span className="client-detail__count tabular-nums">
            {clienteContas.length}{" "}
            {clienteContas.length === 1 ? "conta" : "contas"}
          </span>
        </div>

        {clienteContas.length === 0 ? (
          <div className="client-detail__empty-accounts">
            <Landmark
              size={22}
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
  );
}
