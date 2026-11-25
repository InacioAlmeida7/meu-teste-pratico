export type EstadoCivil = "Solteiro" | "Casado" | "Viúvo" | "Divorciado";

export type TipoConta = "corrente" | "poupanca";

export interface Cliente {
  id: string;
  cpfCnpj: string;
  rg?: string;
  dataNascimento: Date;
  nome: string;
  nomeSocial?: string;
  email: string;
  endereco: string;
  rendaAnual: number;
  patrimonio: number;
  /**
   * Ausente apenas quando a planilha traz valor vazio ou fora do domínio:
   * exibido como "Não informado" em vez de inventar um estado civil.
   * O cadastro pelo formulário sempre exige um valor válido.
   */
  estadoCivil?: EstadoCivil;
  codigoAgencia: number;
}

export interface Conta {
  id: string;
  cpfCnpjCliente: string;
  tipo: TipoConta;
  saldo: number;
  limiteCredito: number;
  creditoDisponivel: number;
}

export interface Agencia {
  id: string;
  codigo: number;
  nome: string;
  endereco: string;
}

export interface BankData {
  clientes: Cliente[];
  contas: Conta[];
  agencias: Agencia[];
}

export type CsvRow = Record<string, string>;
