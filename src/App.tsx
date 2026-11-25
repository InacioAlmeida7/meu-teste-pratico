import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ClientFormModal } from "./components/ClientFormModal/ClientFormModal";
import { Footer } from "./components/Footer/Footer";
import { Header } from "./components/Header/Header";
import { StatusMessage } from "./components/StatusMessage/StatusMessage";
import { BankDataProvider } from "./context/BankDataContext";
import { useBankData } from "./context/useBankData";
import { ClientListPage } from "./pages/ClientListPage/ClientListPage";
import type { Cliente } from "./types/models";
import { onlyDigits } from "./utils/normalizers";

// A tela de detalhe só é baixada ao abrir um cliente, mantendo o bundle inicial menor.
const ClientDetailPage = lazy(() =>
  import("./pages/ClientDetailPage/ClientDetailPage").then((module) => ({
    default: module.ClientDetailPage,
  })),
);

function AppLayout() {
  const { clientes, agencias, addCliente } = useBankData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  // Trocar a `key` da listagem remonta a página e zera busca, filtros e paginação
  // (padrão do React para resetar estado), exibindo o novo cliente no topo da página 1.
  const [listResetTick, setListResetTick] = useState(0);

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
    setListResetTick((prev) => prev + 1);
    setSuccessToast(
      "Cliente cadastrado com sucesso (armazenado em memória até o recarregamento da página).",
    );

    if (location.pathname !== "/") {
      void navigate("/");
    }
  }

  return (
    <div className="app-shell">
      <Header onNewClient={() => setIsModalOpen(true)} />

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
          <Route path="/" element={<ClientListPage key={listResetTick} />} />
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

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agencias={agencias}
        existingDocuments={existingDocuments}
        onCreateClient={handleCreateClient}
      />
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
