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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

/**
 * Provedor de estado em memória dos dados bancários.
 * Carrega as 3 planilhas vivas na montagem com suporte a cancelamento via `AbortController`
 * e permite inserção em memória de novos clientes no topo da listagem.
 */
export function BankDataProvider({ children }: BankDataProviderProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
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

        setClientes(data.clientes);
        setContas(data.contas);
        setAgencias(data.agencias);
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) {
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
    setClientes((prev) => [novoCliente, ...prev]);
  }, []);

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
