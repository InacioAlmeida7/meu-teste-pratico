import { useEffect, useState } from "react";
import { Building2, Moon, Sun, UserPlus, Users } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import logoBanestesBlue from "../../assets/logo-original-blue.png";
import logoBanestesWhite from "../../assets/logo-original-white.png";
import type { Theme } from "../../hooks/useTheme";
import "./Header.css";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  onNewClient: () => void;
}

/**
 * Cabeçalho institucional sticky no padrão Banestes:
 * marca oficial à esquerda, alternância de tema claro/escuro e botão verde
 * de ação principal ("Novo Cliente") alinhados à direita.
 */
export function Header({ theme, onToggleTheme, onNewClient }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const isDark = theme === "dark";

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

  return (
    <header
      className={isScrolled ? "site-header site-header--scrolled" : "site-header"}
    >
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>

      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="Banestes — Página inicial">
          <img
            src={logoBanestesBlue}
            alt="Banestes — Juntos para o futuro"
            className="site-header__logo site-header__logo--light"
            height="38"
          />
          <img
            src={logoBanestesWhite}
            alt="Banestes — Juntos para o futuro"
            className="site-header__logo site-header__logo--dark"
            height="38"
          />
        </Link>

        <nav className="site-header__nav" aria-label="Principal">
          <ul className="site-header__nav-list">
            <li>
              <NavLink to="/" end className="site-header__nav-link">
                <Users size={15} aria-hidden="true" />
                <span>Clientes</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/agencias" className="site-header__nav-link">
                <Building2 size={15} aria-hidden="true" />
                <span>Agências</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="site-header__actions">
          <div className="site-header__portal">
            <span className="site-header__portal-title">
              PORTAL DE GESTÃO DE CLIENTES
            </span>
            <span className="site-header__portal-sub">
              CONSULTA E CADASTRO INTEGRADO
            </span>
          </div>

          <div className="site-header__controls">
            <button
              type="button"
              className="site-header__theme-toggle"
              onClick={onToggleTheme}
              aria-label="Tema escuro"
              aria-pressed={isDark}
              title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              {isDark ? (
                <Sun size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              className="btn btn-brand-green site-header__cta"
              onClick={onNewClient}
            >
              <UserPlus size={18} aria-hidden="true" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
