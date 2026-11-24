import { AlertCircle, SearchX } from "lucide-react";
import "./StatusMessage.css";

interface StatusMessageProps {
  variant: "loading" | "error" | "empty";
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SKELETON_ROWS = [1, 2, 3, 4, 5, 6];

/**
 * Componente unificado para estados assíncronos e vazios:
 * - `loading`: esqueleto tabular fiel à densidade da listagem
 * - `error`: alerta acessível (`role="alert"`) com ação de recuperação
 * - `empty`: aviso com `aria-live="polite"` quando nenhum cliente é encontrado
 */
export function StatusMessage({
  variant,
  title,
  description,
  actionLabel,
  onAction,
}: StatusMessageProps) {
  if (variant === "loading") {
    return (
      <div
        className="status-skeleton"
        role="status"
        aria-busy="true"
        aria-label="Carregando dados bancários"
      >
        <span className="sr-only">
          Carregando clientes, contas e agências...
        </span>
        <div className="status-skeleton__toolbar" aria-hidden="true">
          <div className="status-skeleton__bar status-skeleton__bar--wide" />
          <div className="status-skeleton__bar status-skeleton__bar--medium" />
        </div>
        <div className="status-skeleton__table" aria-hidden="true">
          <div className="status-skeleton__head" />
          {SKELETON_ROWS.map((row) => (
            <div key={row} className="status-skeleton__row">
              <span className="status-skeleton__cell status-skeleton__cell--name" />
              <span className="status-skeleton__cell status-skeleton__cell--doc" />
              <span className="status-skeleton__cell status-skeleton__cell--email" />
              <span className="status-skeleton__cell status-skeleton__cell--agency" />
              <span className="status-skeleton__cell status-skeleton__cell--action" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isError = variant === "error";
  const heading =
    title ??
    (isError
      ? "Não foi possível carregar os dados"
      : "Nenhum cliente encontrado");
  const details =
    description ??
    (isError
      ? "Ocorreu uma falha de comunicação ao consultar as planilhas."
      : "Tente ajustar os termos da busca ou limpar os filtros aplicados.");

  return (
    <div
      className={
        isError
          ? "status-panel status-panel--error"
          : "status-panel status-panel--empty"
      }
      role={isError ? "alert" : undefined}
      aria-live={isError ? undefined : "polite"}
    >
      <div className="status-panel__icon" aria-hidden="true">
        {isError ? <AlertCircle size={24} /> : <SearchX size={24} />}
      </div>
      <div className="status-panel__body">
        <h2 className="status-panel__title">{heading}</h2>
        <p className="status-panel__description">{details}</p>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          className={isError ? "btn btn-primary" : "btn btn-secondary"}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
