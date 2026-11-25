import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import {
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
import { ClientListPage } from "./pages/ClientListPage/ClientListPage";
import type { Cliente } from "./types/models";
import { onlyDigits } from "./utils/normalizers";

// Detalhe e formulário (React Hook Form + Zod + calendário) só são baixados quando usados,
// mantendo o bundle inicial menor.
const ClientDetailPage = lazy(() =>
  import("./pages/ClientDetailPage/ClientDetailPage").then((module) => ({
    default: module.ClientDetailPage,
  })),
);
const ClientFormModal = lazy(() =>
  import("./components/ClientFormModal/ClientFormModal").then((module) => ({
    default: module.ClientFormModal,
  })),
);

function AppLayout() {
  const { clientes, agencias, addCliente } = useBankData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Após a primeira abertura o modal permanece montado (o `<dialog>` só é exibido via `showModal`).
  const [hasOpenedModal, setHasOpenedModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!successToast) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSuccessToast(null);
    }, 7000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [successToast]);

  const existingDocuments = useMemo(() => {
    const set = new Set<string>();
    for (const cliente of clientes) {
      set.add(onlyDigits(cliente.cpfCnpj));
    }
    return set;
  }, [clientes]);

  function handleCreateClient(novoCliente: Cliente) {
    addCliente(novoCliente);
    setSuccessToast(
      "Cliente cadastrado com sucesso (armazenado em memória até o recarregamento da página).",
    );

    if (location.pathname !== "/") {
      void navigate("/");
    }
  }

  return (
    <div className="app-shell">
      <Header
        onNewClient={() => {
          setHasOpenedModal(true);
          setIsModalOpen(true);
        }}
      />

      <main id="main-content" className="app-main" tabIndex={-1}>
        {/* A região `status` fica sempre montada: leitores de tela só anunciam
            mudanças dentro de uma live region que já existia no DOM. */}
        <div role="status">
          {successToast ? (
            <div className="container app-toast-wrap">
              <div className="app-toast">
                <div className="app-toast__body">
                  <CheckCircle2
                    size={18}
                    className="app-toast__icon"
                    aria-hidden="true"
                  />
                  <p>{successToast}</p>
                </div>
                <button
                  type="button"
                  className="app-toast__close"
                  aria-label="Fechar notificação"
                  onClick={() => setSuccessToast(null)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
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
