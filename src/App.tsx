import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Header } from "./components/Header/Header";
import { BankDataProvider } from "./context/BankDataContext";
import { ClientListPage } from "./pages/ClientListPage/ClientListPage";

function ClientDetailPlaceholder() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    document.title = "Detalhes do Cliente | Gestão de Clientes Bancários";
  }, []);

  return (
    <div className="container">
      <div className="detail-placeholder">
        <h1 id="detail-placeholder-heading" className="detail-placeholder__title">
          Detalhes do Cliente
        </h1>
        <p className="detail-placeholder__text">
          Visualização completa do cliente ainda não está disponíve, será implementado futuramente.
        </p>
        <Link to="/" className="btn btn-secondary">
          ← Voltar para a lista
        </Link>
      </div>
    </div>
  );
}

/**
 * Componente raiz com provedor de dados em memória, cabeçalho persistente
 * e roteamento principal da aplicação.
 */
export function App() {
  return (
    <BankDataProvider>
      <div className="app-shell">
        <Header />
        <main id="main-content" className="app-main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<ClientListPage />} />
            <Route path="/clientes/:id" element={<ClientDetailPlaceholder />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BankDataProvider>
  );
}

export default App;
