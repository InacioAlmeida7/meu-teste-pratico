import { useMemo } from "react";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type {
  DataIssue,
  DataIssueSeverity,
  DataIssueType,
} from "../../utils/dataQuality";
import "./DataQualityNotice.css";

interface DataQualityNoticeProps {
  issues: DataIssue[];
}

interface IssueGroupConfig {
  tipo: DataIssueType;
  label: string;
  severidade: DataIssueSeverity;
}

const ISSUE_GROUPS: readonly IssueGroupConfig[] = [
  { tipo: "conta-orfa", label: "Contas órfãs", severidade: "erro" },
  {
    tipo: "agencia-inexistente",
    label: "Agências inexistentes",
    severidade: "erro",
  },
  {
    tipo: "data-invalida",
    label: "Datas de nascimento inválidas",
    severidade: "erro",
  },
  {
    tipo: "estado-civil-ausente",
    label: "Estados civis ausentes",
    severidade: "erro",
  },
  {
    tipo: "documento-invalido",
    label: "Documentos com dígito verificador inválido",
    severidade: "aviso",
  },
];

/**
 * Painel discreto e expansível (`<details>`) para dar visibilidade às inconsistências
 * dos dados carregados sem poluir a listagem principal quando está fechado.
 */
export function DataQualityNotice({ issues }: DataQualityNoticeProps) {
  const location = useLocation();

  const groupedIssues = useMemo(() => {
    const byType = new Map<DataIssueType, DataIssue[]>();
    for (const issue of issues) {
      const list = byType.get(issue.tipo);
      if (list) {
        list.push(issue);
      } else {
        byType.set(issue.tipo, [issue]);
      }
    }

    return ISSUE_GROUPS.map((group) => ({
      ...group,
      items: byType.get(group.tipo) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [issues]);

  const errorCount = useMemo(
    () => issues.filter((issue) => issue.severidade === "erro").length,
    [issues],
  );
  const warningCount = issues.length - errorCount;

  if (issues.length === 0) {
    return null;
  }

  return (
    <details className="data-quality">
      <summary className="data-quality__summary">
        <ChevronRight
          size={16}
          className="data-quality__chevron"
          aria-hidden="true"
        />
        <AlertTriangle
          size={16}
          className="data-quality__icon"
          aria-hidden="true"
        />
        <span className="data-quality__title tabular-nums">
          {issues.length}{" "}
          {issues.length === 1
            ? "inconsistência encontrada"
            : "inconsistências encontradas"}
        </span>
        <span className="data-quality__breakdown tabular-nums">
          ({errorCount}{" "}
          {errorCount === 1 ? "inconsistência de base" : "inconsistências de base"}
          {warningCount > 0
            ? ` · ${warningCount} ${warningCount === 1 ? "aviso" : "avisos"}`
            : ""}
          )
        </span>
      </summary>

      <div className="data-quality__body">
        {groupedIssues.map((group) => {
          const isWarning = group.severidade === "aviso";

          return (
            <details
              key={group.tipo}
              className="data-quality__group"
              open={!isWarning}
            >
              <summary className="data-quality__group-summary">
                <ChevronRight
                  size={15}
                  className="data-quality__chevron"
                  aria-hidden="true"
                />
                <span className="data-quality__group-label">{group.label}</span>
                {isWarning ? (
                  <span className="data-quality__severity-badge">
                    <Info size={12} aria-hidden="true" />
                    <span>Aviso</span>
                  </span>
                ) : null}
                <span className="data-quality__count tabular-nums">
                  {group.items.length}
                </span>
              </summary>

              <ul className="data-quality__list">
                {group.items.map((issue, index) => (
                  <li
                    key={`${issue.tipo}-${issue.referenciaId}-${index}`}
                    className="data-quality__item"
                  >
                    <div className="data-quality__item-info">
                      <span className="data-quality__ref tabular-nums">
                        {issue.referenciaId}
                      </span>
                      <span className="data-quality__desc">
                        {issue.descricao}
                      </span>
                    </div>
                    {issue.link ? (
                      <Link
                        to={issue.link}
                        state={{ fromSearch: location.search }}
                        className="data-quality__link"
                      >
                        <span>Ver cliente</span>
                        <ChevronRight size={14} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </details>
  );
}
