import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchBankData } from "../services/bankApi";
import type { Agencia, Cliente, Conta } from "../types/models";
import {
  BankDataContext,
  type BankDataContextValue,
} from "./useBankData";

interface BankDataProviderProps {
  children: ReactNode;
}

/**
 * Provedor de estado em memória dos dados bancários.
 * Carrega as 3 planilhas vivas na montagem com suporte a cancelamento via `AbortController`
 * e permite inserção em memória de novos clientes no topo da listagem.
 *
 * Clientes cadastrados ficam em um estado separado e são mesclados sobre os da planilha:
 * assim um "Tentar novamente"/recarregamento não apaga o que foi cadastrado na sessão.
 */
export function BankDataProvider({ children }: BankDataProviderProps) {
  const [fetchedClientes, setFetchedClientes] = useState<Cliente[]>([]);
  const [addedClientes, setAddedClientes] = useState<Cliente[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchBankData(controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        setFetchedClientes(data.clientes);
        setContas(data.contas);
        setAgencias(data.agencias);
      } catch (err: unknown) {
        // Cancelamentos (StrictMode, novo "Tentar novamente") não são erros de tela.
        if (controller.signal.aborted) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os dados das planilhas.";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [reloadTick]);

  const reload = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  const addCliente = useCallback((novoCliente: Cliente) => {
    setAddedClientes((prev) => [novoCliente, ...prev]);
  }, []);

  const clientes = useMemo(
    () => [...addedClientes, ...fetchedClientes],
    [addedClientes, fetchedClientes],
  );

  const value = useMemo<BankDataContextValue>(
    () => ({
      clientes,
      contas,
      agencias,
      isLoading,
      error,
      reload,
      addCliente,
    }),
    [clientes, contas, agencias, isLoading, error, reload, addCliente],
  );

  return (
    <BankDataContext.Provider value={value}>
      {children}
    </BankDataContext.Provider>
  );
}
