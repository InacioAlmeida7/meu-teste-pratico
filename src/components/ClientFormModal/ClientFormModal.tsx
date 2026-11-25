import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, X } from "lucide-react";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { useBackdropClose } from "../../hooks/useBackdropClose";
import {
  ESTADO_CIVIL_OPTIONS,
  clienteSchema,
  type ClienteFormInput,
  type ClienteFormOutput,
} from "../../schemas/clienteSchema";
import type { Agencia, Cliente } from "../../types/models";
import { onlyDigits } from "../../utils/normalizers";
import { DatePicker } from "../DatePicker/DatePicker";
import {
  SelectDropdown,
  type SelectOption,
} from "../SelectDropdown/SelectDropdown";
import "./ClientFormModal.css";

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencias: Agencia[];
  /** CPFs/CNPJs (somente dígitos) já presentes na base, para bloquear duplicidade. */
  existingDocuments: ReadonlySet<string>;
  onCreateClient: (novoCliente: Cliente) => void;
}

// A ordem das chaves segue a ordem visual dos campos (usada no foco do primeiro erro).
const DEFAULT_VALUES: ClienteFormInput = {
  nome: "",
  nomeSocial: "",
  cpfCnpj: "",
  rg: "",
  dataNascimento: "",
  estadoCivil: "",
  email: "",
  endereco: "",
  rendaAnual: "",
  patrimonio: "",
  codigoAgencia: "",
};

const FIELD_ORDER = Object.keys(DEFAULT_VALUES) as (keyof ClienteFormInput)[];

const DUPLICATE_DOCUMENT_MESSAGE =
  "Já existe um cliente com este CPF/CNPJ na base atual.";

/** `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost). */
function createClientId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `cli-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Liga um `<input>` nativo à mensagem de erro renderizada por `FormField`. */
function errorAriaProps(id: string, error: string | undefined) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  error?: string;
  children: ReactNode;
}

/**
 * Rótulo + controle + mensagem de erro. O erro não usa `role="alert"`: ele é lido via
 * `aria-describedby` quando o foco vai para o campo inválido, em vez de o leitor de tela
 * anunciar todos os erros de uma vez ao enviar.
 */
function FormField({
  id,
  label,
  required = false,
  fullWidth = false,
  error,
  children,
}: FormFieldProps) {
  return (
    <div
      className={
        fullWidth
          ? "client-modal__field client-modal__field--full"
          : "client-modal__field"
      }
    >
      <label htmlFor={id} className="client-modal__label">
        {label}
        {required ? (
          <>
            {" "}
            <span className="client-modal__required" aria-hidden="true">
              *
            </span>
          </>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="client-modal__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Modal de cadastro de novo cliente construído com `<dialog>` nativo (`showModal`/`close`),
 * React Hook Form, Zod e `DatePicker` customizado em português.
 * O navegador gerencia top-layer, inert do fundo, `Esc` e retorno de foco ao acionador.
 */
export function ClientFormModal({
  isOpen,
  onClose,
  agencias,
  existingDocuments,
  onCreateClient,
}: ClientFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropHandlers = useBackdropClose(dialogRef, closeDialog);

  const agencyOptions = useMemo<SelectOption[]>(() => {
    const sorted = [...agencias].sort((a, b) => a.codigo - b.codigo);
    return sorted.map((agencia) => ({
      value: String(agencia.codigo),
      code: String(agencia.codigo),
      label: agencia.nome,
    }));
  }, [agencias]);

  const estadoCivilOptions = useMemo<SelectOption[]>(
    () =>
      ESTADO_CIVIL_OPTIONS.map((option) => ({
        value: option,
        label: option,
      })),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, dirtyFields, isSubmitted, isSubmitting },
  } = useForm<ClienteFormInput, unknown, ClienteFormOutput>({
    resolver: zodResolver(clienteSchema),
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
    // O RHF registra os `Controller`s depois dos `register`, então o foco
    // automático pularia DatePicker/SelectDropdown; focamos na ordem visual.
    shouldFocusError: false,
  });

  // Erros aparecem só após o envio ou depois de o campo ser editado:
  // percorrer campos vazios com Tab não deve pintar o formulário de vermelho.
  function errorFor(name: keyof ClienteFormInput): string | undefined {
    return isSubmitted || dirtyFields[name] ? errors[name]?.message : undefined;
  }

  // Duplicidade depende da base carregada (fora do schema): é exibida enquanto o
  // usuário digita e também bloqueia o envio em `handleValidSubmit`.
  const cpfCnpjDigits = onlyDigits(useWatch({ control, name: "cpfCnpj" }) ?? "");
  const isDuplicateDocument =
    (cpfCnpjDigits.length === 11 || cpfCnpjDigits.length === 14) &&
    existingDocuments.has(cpfCnpjDigits);

  const nomeError = errorFor("nome");
  const cpfCnpjError =
    errorFor("cpfCnpj") ??
    (isDuplicateDocument ? DUPLICATE_DOCUMENT_MESSAGE : undefined);
  const dataNascimentoError = errorFor("dataNascimento");
  const estadoCivilError = errorFor("estadoCivil");
  const emailError = errorFor("email");
  const enderecoError = errorFor("endereco");
  const rendaAnualError = errorFor("rendaAnual");
  const patrimonioError = errorFor("patrimonio");
  const codigoAgenciaError = errorFor("codigoAgencia");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      const nomeInput = dialog.querySelector<HTMLInputElement>("#field-nome");
      nomeInput?.setAttribute("autofocus", "");
      dialog.showModal();
      nomeInput?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function closeDialog() {
    dialogRef.current?.close();
  }

  // Único ponto de saída: Esc, backdrop, botões e envio disparam o evento nativo `close`.
  function handleNativeClose() {
    reset(DEFAULT_VALUES);
    onClose();
  }

  function focusFirstInvalid(formErrors: FieldErrors<ClienteFormInput>) {
    const firstInvalid = FIELD_ORDER.find((name) => formErrors[name]);
    if (firstInvalid) {
      setFocus(firstInvalid);
    }
  }

  function handleValidSubmit(data: ClienteFormOutput) {
    if (existingDocuments.has(data.cpfCnpj)) {
      setFocus("cpfCnpj");
      return;
    }

    const novoCliente: Cliente = { id: createClientId(), ...data };
    onCreateClient(novoCliente);
    closeDialog();
  }

  return (
    <dialog
      ref={dialogRef}
      className="client-modal"
      aria-labelledby="client-form-title"
      onCancel={(event) => {
        // Se o popover do DatePicker estiver aberto, o Esc fecha apenas o calendário.
        if (event.currentTarget.querySelector(":popover-open")) {
          event.preventDefault();
        }
      }}
      onClose={handleNativeClose}
      {...backdropHandlers}
    >
      <form
        className="client-modal__form"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(handleValidSubmit, focusFirstInvalid)(event);
        }}
      >
        <header className="client-modal__header">
          <div className="client-modal__header-text">
            <h2 id="client-form-title" className="client-modal__title">
              Cadastrar Novo Cliente
            </h2>
            <p className="client-modal__subtitle">
              Os campos com{" "}
              <span className="client-modal__required" aria-hidden="true">
                *
              </span>{" "}
              são obrigatórios. O registro fica disponível em memória nesta
              sessão.
            </p>
          </div>
          <button
            type="button"
            className="client-modal__close"
            aria-label="Fechar modal"
            onClick={closeDialog}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="client-modal__body">
          <div className="client-modal__grid">
            <FormField
              id="field-nome"
              label="Nome completo"
              required
              fullWidth
              error={nomeError}
            >
              <input
                id="field-nome"
                type="text"
                className="client-modal__input"
                autoComplete="name"
                required
                {...errorAriaProps("field-nome", nomeError)}
                {...register("nome")}
              />
            </FormField>

            <FormField id="field-nomeSocial" label="Nome social" fullWidth>
              <input
                id="field-nomeSocial"
                type="text"
                className="client-modal__input"
                placeholder="Opcional"
                {...register("nomeSocial")}
              />
            </FormField>

            <FormField
              id="field-cpfCnpj"
              label="CPF ou CNPJ"
              required
              error={cpfCnpjError}
            >
              <input
                id="field-cpfCnpj"
                type="text"
                inputMode="numeric"
                className="client-modal__input tabular-nums"
                placeholder="Somente dígitos ou com máscara"
                autoCorrect="off"
                spellCheck={false}
                required
                {...errorAriaProps("field-cpfCnpj", cpfCnpjError)}
                {...register("cpfCnpj")}
              />
            </FormField>

            <FormField id="field-rg" label="RG">
              <input
                id="field-rg"
                type="text"
                className="client-modal__input tabular-nums"
                placeholder="Opcional (ex.: ES1234567 ou ISENTO)"
                autoCorrect="off"
                spellCheck={false}
                {...register("rg")}
              />
            </FormField>

            <FormField
              id="field-dataNascimento"
              label="Data de nascimento"
              required
              error={dataNascimentoError}
            >
              <Controller
                name="dataNascimento"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    ref={field.ref}
                    id="field-dataNascimento"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    required
                    ariaInvalid={Boolean(dataNascimentoError)}
                    ariaDescribedBy={
                      dataNascimentoError
                        ? "field-dataNascimento-error"
                        : undefined
                    }
                  />
                )}
              />
            </FormField>

            <FormField
              id="field-estadoCivil"
              label="Estado civil"
              required
              error={estadoCivilError}
            >
              <Controller
                name="estadoCivil"
                control={control}
                render={({ field }) => (
                  <SelectDropdown
                    ref={field.ref}
                    id="field-estadoCivil"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={estadoCivilOptions}
                    placeholder="Selecione..."
                    required
                    ariaInvalid={Boolean(estadoCivilError)}
                    ariaDescribedBy={
                      estadoCivilError ? "field-estadoCivil-error" : undefined
                    }
                    listboxLabel="Opções de estado civil"
                  />
                )}
              />
            </FormField>

            <FormField
              id="field-email"
              label="E-mail"
              required
              fullWidth
              error={emailError}
            >
              <input
                id="field-email"
                type="email"
                className="client-modal__input"
                placeholder="cliente@exemplo.com"
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                {...errorAriaProps("field-email", emailError)}
                {...register("email")}
              />
            </FormField>

            <FormField
              id="field-endereco"
              label="Endereço"
              required
              fullWidth
              error={enderecoError}
            >
              <input
                id="field-endereco"
                type="text"
                className="client-modal__input"
                placeholder="Rua, número - Cidade UF"
                autoComplete="street-address"
                required
                {...errorAriaProps("field-endereco", enderecoError)}
                {...register("endereco")}
              />
            </FormField>

            <FormField
              id="field-rendaAnual"
              label="Renda anual (R$)"
              required
              error={rendaAnualError}
            >
              <input
                id="field-rendaAnual"
                type="text"
                inputMode="decimal"
                className="client-modal__input tabular-nums"
                placeholder="Ex.: 85000,00"
                required
                {...errorAriaProps("field-rendaAnual", rendaAnualError)}
                {...register("rendaAnual")}
              />
            </FormField>

            <FormField
              id="field-patrimonio"
              label="Patrimônio (R$)"
              required
              error={patrimonioError}
            >
              <input
                id="field-patrimonio"
                type="text"
                inputMode="decimal"
                className="client-modal__input tabular-nums"
                placeholder="Ex.: 250000,00"
                required
                {...errorAriaProps("field-patrimonio", patrimonioError)}
                {...register("patrimonio")}
              />
            </FormField>

            <FormField
              id="field-codigoAgencia"
              label="Agência vinculada"
              required
              fullWidth
              error={codigoAgenciaError}
            >
              <Controller
                name="codigoAgencia"
                control={control}
                render={({ field }) => (
                  <SelectDropdown
                    ref={field.ref}
                    id="field-codigoAgencia"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={agencyOptions}
                    placeholder="Selecione uma agência..."
                    leadingIcon={<Building2 size={17} />}
                    required
                    ariaInvalid={Boolean(codigoAgenciaError)}
                    ariaDescribedBy={
                      codigoAgenciaError
                        ? "field-codigoAgencia-error"
                        : undefined
                    }
                    listboxLabel="Agências disponíveis"
                  />
                )}
              />
            </FormField>
          </div>
        </div>

        <footer className="client-modal__footer">
          <button type="button" className="btn btn-ghost" onClick={closeDialog}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-brand-green"
            disabled={isSubmitting}
          >
            Cadastrar cliente
          </button>
        </footer>
      </form>
    </dialog>
  );
}
