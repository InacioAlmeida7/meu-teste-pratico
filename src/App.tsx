import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header/Header";
import { BankDataProvider } from "./context/BankDataContext";
import { ClientDetailPage } from "./pages/ClientDetailPage/ClientDetailPage";
import { ClientListPage } from "./pages/ClientListPage/ClientListPage";

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
            <Route path="/clientes/:id" element={<ClientDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BankDataProvider>
  );
}

export default App;
