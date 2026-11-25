import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
}

/**
 * Calcula os números de página visíveis com reticências quando há muitas páginas,
 * mantendo a barra de navegação compacta em desktop e mobile.
 */
function getVisiblePages(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis-start" | "ellipsis-end"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];

  // Garante sempre uma janela de ao menos 3 páginas nas extremidades (1 2 3 ... N e 1 ... N-2 N-1 N)
  let windowStart = Math.max(2, currentPage - 1);
  let windowEnd = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 2) {
    windowStart = 2;
    windowEnd = Math.min(totalPages - 1, 3);
  } else if (currentPage >= totalPages - 1) {
    windowStart = Math.max(2, totalPages - 2);
    windowEnd = totalPages - 1;
  }

  if (windowStart > 2) {
    pages.push("ellipsis-start");
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    pages.push(page);
  }

  if (windowEnd < totalPages - 1) {
    pages.push("ellipsis-end");
  }

  pages.push(totalPages);
  return pages;
}

/**
 * Controle de paginação acessível com contador de faixa exibida,
 * botões Anterior/Próxima e indicação `aria-current="page"` na página ativa.
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const clientNoun = totalItems === 1 ? "cliente" : "clientes";

  return (
    <div className="pagination">
      <p className="pagination__summary tabular-nums">
        Mostrando {startItem}–{endItem} de {totalItems} {clientNoun}
      </p>

      <nav className="pagination__nav" aria-label="Paginação">
        <button
          type="button"
          className="pagination__btn pagination__btn--step"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Anterior</span>
        </button>

        <ul className="pagination__pages">
          {visiblePages.map((entry) => {
            if (typeof entry !== "number") {
              return (
                <li
                  key={entry}
                  className="pagination__ellipsis"
                  aria-hidden="true"
                >
                  …
                </li>
              );
            }

            const isActive = entry === currentPage;
            return (
              <li key={entry}>
                <button
                  type="button"
                  className={
                    isActive
                      ? "pagination__btn pagination__btn--active tabular-nums"
                      : "pagination__btn tabular-nums"
                  }
                  aria-label={`Página ${entry}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onPageChange(entry)}
                >
                  {entry}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="pagination__btn pagination__btn--step"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span>Próxima</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
