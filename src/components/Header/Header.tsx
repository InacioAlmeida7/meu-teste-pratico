import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";

/**
 * Cabeçalho institucional sticky com fundo translúcido (referência RI Banestes),
 * skip-link acessível no início da árvore de foco e navegação principal.
 */
export function Header() {
  const { pathname } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 4);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isClientsRoute = pathname === "/" || pathname.startsWith("/clientes");

  return (
    <header
      className={isScrolled ? "site-header site-header--scrolled" : "site-header"}
    >
      <a href="#main-content" className="skip-link sr-only">
        Pular para o conteúdo principal
      </a>

      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand">
          <svg
            className="site-header__mark"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="6" fill="#0814dd" />
            <path d="M8 9h9a5 5 0 0 1 0 10H8V9Z" fill="#ffffff" />
            <path d="M8 15h10a4 4 0 0 1 0 8H8v-8Z" fill="#ffffff" />
            <path d="M4 16l6 6V16H4Z" fill="#428726" />
          </svg>
          <span className="site-header__brand-text">
            <span className="site-header__brand-title">Gestão Bancária</span>
            <span className="site-header__brand-subtitle">
              Portal de Clientes
            </span>
          </span>
        </Link>

        <nav className="site-header__nav" aria-label="Principal">
          <Link
            to="/"
            className="site-header__nav-link"
            aria-current={isClientsRoute ? "page" : undefined}
          >
            Clientes
          </Link>
        </nav>
      </div>
    </header>
  );
}
