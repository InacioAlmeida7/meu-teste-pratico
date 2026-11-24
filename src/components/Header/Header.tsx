import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import logoBanestesBlue from "../../assets/logo-original-blue.png";
import "./Header.css";

interface HeaderProps {
  onNewClient: () => void;
}

/**
 * Cabeçalho institucional sticky no padrão Banestes:
 * marca oficial à esquerda, identificação discreta do portal e botão verde
 * de ação principal ("Novo Cliente") alinhado à direita.
 */
export function Header({ onNewClient }: HeaderProps) {
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

  return (
    <header
      className={isScrolled ? "site-header site-header--scrolled" : "site-header"}
    >
      <a href="#main-content" className="skip-link sr-only">
        Pular para o conteúdo principal
      </a>

      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="Banestes — Página inicial">
          <img
            src={logoBanestesBlue}
            alt="Banestes — Juntos para o futuro"
            className="site-header__logo"
            height="38"
          />
        </Link>

        <div className="site-header__actions">
          <div className="site-header__portal">
            <span className="site-header__portal-title">
              PORTAL DE GESTÃO DE CLIENTES
            </span>
            <span className="site-header__portal-sub">
              CONSULTA E CADASTRO INTEGRADO
            </span>
          </div>

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
    </header>
  );
}
