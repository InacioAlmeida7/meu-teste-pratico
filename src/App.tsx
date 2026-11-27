import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Footer } from "./components/Footer/Footer";
import { Header } from "./components/Header/Header";
import { StatusMessage } from "./components/StatusMessage/StatusMessage";
import { BankDataProvider } from "./context/BankDataContext";
import { useBankData } from "./context/useBankData";
import { useTheme } from "./hooks/useTheme";
import { ClientListPage } from "./pages/ClientListPage/ClientListPage";
import type { Cliente } from "./types/models";
import { loadChunkWithRecovery } from "./utils/chunkRecovery";
import { onlyDigits } from "./utils/normalizers";

// Detalhe e formulário (React Hook Form + Zod + calendário) só são baixados quando usados,
// mantendo o bundle inicial menor.
const ClientDetailPage = lazy(() =>
  loadChunkWithRecovery(() =>
    import("./pages/ClientDetailPage/ClientDetailPage").then((module) => ({
      default: module.ClientDetailPage,
    })),
  ),
);
const ClientFormModal = lazy(() =>
  loadChunkWithRecovery(() =>
    import("./components/ClientFormModal/ClientFormModal").then((module) => ({
      default: module.ClientFormModal,
    })),
  ),
);

const TOAST_DURATION_MS = 7000;

function AppLayout() {
  const { clientes, agencias, addCliente } = useBankData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Após a primeira abertura o modal permanece montado (o `<dialog>` só é exibido via `showModal`).
  const [hasOpenedModal, setHasOpenedModal] = useState(false);
  const [createdCliente, setCreatedCliente] = useState<Cliente | null>(null);
  // Enquanto o usuário está com o mouse ou o foco no aviso, o tempo para (WCAG 2.2.1).
  const [isToastPaused, setIsToastPaused] = useState(false);

  useEffect(() => {
    if (!createdCliente || isToastPaused) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCreatedCliente(null);
    }, TOAST_DURATION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [createdCliente, isToastPaused]);

  function closeToast() {
    setCreatedCliente(null);
    setIsToastPaused(false);
  }

  const existingDocuments = useMemo(() => {
    const set = new Set<string>();
    for (const cliente of clientes) {
      set.add(onlyDigits(cliente.cpfCnpj));
    }
    return set;
  }, [clientes]);

  function handleCreateClient(novoCliente: Cliente) {
    addCliente(novoCliente);
    setCreatedCliente(novoCliente);

    if (location.pathname !== "/") {
      void navigate("/");
    }
  }

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onNewClient={() => {
          setHasOpenedModal(true);
          setIsModalOpen(true);
        }}
      />

      <main id="main-content" className="app-main" tabIndex={-1}>
        {/* A região `status` fica sempre montada: leitores de tela só anunciam
            mudanças dentro de uma live region que já existia no DOM. */}
        <div role="status">
          {createdCliente ? (
            <div
              className="app-toast"
              onMouseEnter={() => setIsToastPaused(true)}
              onMouseLeave={() => setIsToastPaused(false)}
              onFocus={() => setIsToastPaused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsToastPaused(false);
                }
              }}
            >
              <CheckCircle2
                size={18}
                className="app-toast__icon"
                aria-hidden="true"
              />
              <div className="app-toast__body">
                <p className="app-toast__title">
                  Cliente cadastrado com sucesso
                </p>
                <p className="app-toast__text">
                  {createdCliente.nome} fica salvo em memória até recarregar a
                  página.
                </p>
                <Link
                  to={`/clientes/${encodeURIComponent(createdCliente.id)}`}
                  state={
                    location.pathname === "/"
                      ? { fromSearch: location.search }
                      : undefined
                  }
                  className="app-toast__link"
                  onClick={closeToast}
                >
                  Ver cliente
                </Link>
              </div>
              <button
                type="button"
                className="app-toast__close"
                aria-label="Fechar notificação"
                onClick={closeToast}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <Routes>
          <Route path="/" element={<ClientListPage />} />
          <Route
            path="/clientes/:id"
            element={
              <Suspense
                fallback={
                  <div className="container">
                    <StatusMessage variant="loading" />
                  </div>
                }
              >
                <ClientDetailPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      {hasOpenedModal ? (
        <Suspense fallback={null}>
          <ClientFormModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            agencias={agencias}
            existingDocuments={existingDocuments}
            onCreateClient={handleCreateClient}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

/**
 * Componente raiz com provedor de dados em memória, cabeçalho e rodapé
 * institucionais persistentes, roteamento e modal global de cadastro.
 */
export function App() {
  return (
    <BankDataProvider>
      <AppLayout />
    </BankDataProvider>
  );
}

export default App;
