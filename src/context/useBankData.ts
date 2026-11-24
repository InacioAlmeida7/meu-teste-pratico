import { createContext, useContext } from "react";
import type { Agencia, Cliente, Conta } from "../types/models";

export interface BankDataContextValue {
  clientes: Cliente[];
  contas: Conta[];
  agencias: Agencia[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  addCliente: (novoCliente: Cliente) => void;
}

export const BankDataContext = createContext<BankDataContextValue | null>(null);

/**
 * Hook de acesso ao estado em memória da aplicação bancária.
 * Garante erro explícito caso seja usado fora de `BankDataProvider`.
 */
export function useBankData(): BankDataContextValue {
  const context = useContext(BankDataContext);
  if (!context) {
    throw new Error(
      "useBankData deve ser utilizado dentro de um BankDataProvider.",
    );
  }
  return context;
}
