import { Headphones, Phone, ShieldCheck, Volume2 } from "lucide-react";
import logoBanestesWhite from "../../assets/logo-original-white.png";
import "./Footer.css";

const CURRENT_YEAR = new Date().getFullYear();

const INSTITUTIONAL_CHANNELS = [
  {
    id: "central",
    label: "CENTRAL DE ATENDIMENTO",
    value: "0800 645 2030",
    icon: Phone,
  },
  {
    id: "ouvidoria",
    label: "OUVIDORIA",
    value: "0800 727 0030",
    icon: ShieldCheck,
  },
  {
    id: "sac",
    label: "SAC BANESTES",
    value: "0800 727 0474",
    icon: Headphones,
  },
  {
    id: "acessibilidade",
    label: "ACESSIBILIDADE",
    value: "0800 282 3030",
    icon: Volume2,
  },
] as const;

/**
 * Rodapé institucional em duas faixas inspirado no portal oficial do Banestes:
 * faixa superior com canais informativos de atendimento e faixa inferior em azul royal.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__channels">
        <div className="container">
          <ul className="site-footer__channel-list">
            {INSTITUTIONAL_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <li key={channel.id} className="site-footer__channel-item">
                  <div className="site-footer__channel-head">
                    <Icon
                      size={15}
                      className="site-footer__channel-icon"
                      aria-hidden="true"
                    />
                    <span className="site-footer__channel-label">
                      {channel.label}
                    </span>
                  </div>
                  <span className="site-footer__channel-value tabular-nums">
                    {channel.value}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="site-footer__brand-bar">
        <div className="container site-footer__brand-inner">
          <img
            src={logoBanestesWhite}
            alt="Banestes — Juntos para o futuro"
            className="site-footer__logo"
            height="32"
          />
          <p className="site-footer__copy">
            © {CURRENT_YEAR} Portal de Gestão de Clientes Bancários · Interface demonstrativa
          </p>
        </div>
      </div>
    </footer>
  );
}
