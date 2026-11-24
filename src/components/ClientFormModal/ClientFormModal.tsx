import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  existingCpfs: ReadonlySet<string>;
  onCreateClient: (novoCliente: Cliente) => void;
}

const DEFAULT_VALUES: ClienteFormInput = {
  nome: "",
  nomeSocial: "",
  cpfCnpj: "",
  rg: "",
  dataNascimento: "",
  email: "",
  endereco: "",
  estadoCivil: "",
  rendaAnual: "",
  patrimonio: "",
  codigoAgencia: "",
};

/**
 * Modal de cadastro de novo cliente construído com `<dialog>` nativo (`showModal`/`close`),
 * React Hook Form, Zod e `DatePicker` customizado em português.
 * O navegador gerencia top-layer, inert do fundo, `Esc` e retorno de foco ao acionador.
 */
export function ClientFormModal({
  isOpen,
  onClose,
  agencias,
  existingCpfs,
  onCreateClient,
}: ClientFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);

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
    formState: { errors, dirtyFields, isSubmitted, isSubmitting },
  } = useForm<ClienteFormInput, unknown, ClienteFormOutput>({
    resolver: zodResolver(clienteSchema),
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
  });

  const nomeError =
    isSubmitted || dirtyFields.nome ? errors.nome : undefined;
  const nomeSocialError =
    isSubmitted || dirtyFields.nomeSocial ? errors.nomeSocial : undefined;
  const cpfCnpjError =
    isSubmitted || dirtyFields.cpfCnpj ? errors.cpfCnpj : undefined;
  const rgError = isSubmitted || dirtyFields.rg ? errors.rg : undefined;
  const dataNascimentoError =
    isSubmitted || dirtyFields.dataNascimento
      ? errors.dataNascimento
      : undefined;
  const estadoCivilError =
    isSubmitted || dirtyFields.estadoCivil ? errors.estadoCivil : undefined;
  const emailError =
    isSubmitted || dirtyFields.email ? errors.email : undefined;
  const enderecoError =
    isSubmitted || dirtyFields.endereco ? errors.endereco : undefined;
  const rendaAnualError =
    isSubmitted || dirtyFields.rendaAnual ? errors.rendaAnual : undefined;
  const patrimonioError =
    isSubmitted || dirtyFields.patrimonio ? errors.patrimonio : undefined;
  const codigoAgenciaError =
    isSubmitted || dirtyFields.codigoAgencia
      ? errors.codigoAgencia
      : undefined;

  const watchedCpfCnpj = useWatch({ control, name: "cpfCnpj" }) ?? "";
  const cpfDigits = onlyDigits(watchedCpfCnpj);
  const hasDuplicateCpf =
    (cpfDigits.length === 11 || cpfDigits.length === 14) &&
    existingCpfs.has(cpfDigits);

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

  function handleRequestClose() {
    reset(DEFAULT_VALUES);
    dialogRef.current?.close();
  }

  function handleNativeClose() {
    reset(DEFAULT_VALUES);
    onClose();
  }

  function isPointerOutsideDialog(
    event: PointerEvent<HTMLDialogElement>,
  ): boolean {
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog) {
      return false;
    }
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressedOutsideRef.current = isPointerOutsideDialog(event);
  }

  function handlePointerUp(event: PointerEvent<HTMLDialogElement>) {
    const wasOutside = pressedOutsideRef.current;
    pressedOutsideRef.current = false;
    if (wasOutside && isPointerOutsideDialog(event)) {
      handleRequestClose();
    }
  }

  function handleValidSubmit(data: ClienteFormOutput) {
    const novoCliente: Cliente = {
      id: crypto.randomUUID(),
      nome: data.nome,
      nomeSocial: data.nomeSocial,
      cpfCnpj: data.cpfCnpj,
      rg: data.rg,
      dataNascimento: data.dataNascimento,
      email: data.email,
      endereco: data.endereco,
      estadoCivil: data.estadoCivil,
      rendaAnual: data.rendaAnual,
      patrimonio: data.patrimonio,
      codigoAgencia: data.codigoAgencia,
    };

    onCreateClient(novoCliente);
    reset(DEFAULT_VALUES);
    onClose();
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
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <form
        className="client-modal__form"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(handleValidSubmit)(event);
        }}
      >
        <header className="client-modal__header">
          <div className="client-modal__header-text">
            <h1 id="client-form-title" className="client-modal__title">
              Cadastrar Novo Cliente
            </h1>
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
            onClick={handleRequestClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="client-modal__body">
          <div className="client-modal__grid">
            <div className="client-modal__field client-modal__field--full">
              <label htmlFor="field-nome" className="client-modal__label">
                Nome completo{" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="field-nome"
                type="text"
                className="client-modal__input"
                autoComplete="name"
                required
                aria-invalid={nomeError ? "true" : undefined}
                aria-describedby={nomeError ? "field-nome-error" : undefined}
                {...register("nome")}
              />
              {nomeError ? (
                <p
                  id="field-nome-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {nomeError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field client-modal__field--full">
              <label htmlFor="field-nomeSocial" className="client-modal__label">
                Nome social
              </label>
              <input
                id="field-nomeSocial"
                type="text"
                className="client-modal__input"
                placeholder="Opcional"
                aria-invalid={nomeSocialError ? "true" : undefined}
                aria-describedby={
                  nomeSocialError ? "field-nomeSocial-error" : undefined
                }
                {...register("nomeSocial")}
              />
              {nomeSocialError ? (
                <p
                  id="field-nomeSocial-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {nomeSocialError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field">
              <label htmlFor="field-cpfCnpj" className="client-modal__label">
                CPF ou CNPJ{" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="field-cpfCnpj"
                type="text"
                inputMode="numeric"
                className="client-modal__input tabular-nums"
                placeholder="Somente dígitos ou com máscara"
                autoCorrect="off"
                spellCheck={false}
                required
                aria-invalid={cpfCnpjError ? "true" : undefined}
                aria-describedby={
                  [
                    cpfCnpjError ? "field-cpfCnpj-error" : null,
                    hasDuplicateCpf ? "field-cpfCnpj-duplicate" : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                {...register("cpfCnpj")}
              />
              {cpfCnpjError ? (
                <p
                  id="field-cpfCnpj-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {cpfCnpjError.message}
                </p>
              ) : null}
              {hasDuplicateCpf ? (
                <p
                  id="field-cpfCnpj-duplicate"
                  className="client-modal__warning"
                  role="status"
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>
                    Já existe um cliente com este CPF/CNPJ na base atual.
                  </span>
                </p>
              ) : null}
            </div>

            <div className="client-modal__field">
              <label htmlFor="field-rg" className="client-modal__label">
                RG
              </label>
              <input
                id="field-rg"
                type="text"
                className="client-modal__input tabular-nums"
                placeholder="Opcional (ex.: ES1234567 ou ISENTO)"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={rgError ? "true" : undefined}
                aria-describedby={rgError ? "field-rg-error" : undefined}
                {...register("rg")}
              />
              {rgError ? (
                <p
                  id="field-rg-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {rgError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field">
              <label
                htmlFor="field-dataNascimento"
                className="client-modal__label"
              >
                Data de nascimento{" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <Controller
                name="dataNascimento"
                control={control}
                render={({ field }) => (
                  <DatePicker
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
              {dataNascimentoError ? (
                <p
                  id="field-dataNascimento-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {dataNascimentoError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field">
              <label htmlFor="field-estadoCivil" className="client-modal__label">
                Estado civil{" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <Controller
                name="estadoCivil"
                control={control}
                render={({ field }) => (
                  <SelectDropdown
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
              {estadoCivilError ? (
                <p
                  id="field-estadoCivil-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {estadoCivilError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field client-modal__field--full">
              <label htmlFor="field-email" className="client-modal__label">
                E-mail{" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
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
                aria-invalid={emailError ? "true" : undefined}
                aria-describedby={
                  emailError ? "field-email-error" : undefined
                }
                {...register("email")}
              />
              {emailError ? (
                <p
                  id="field-email-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {emailError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field client-modal__field--full">
              <label htmlFor="field-endereco" className="client-modal__label">
                Endereço{" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="field-endereco"
                type="text"
                className="client-modal__input"
                placeholder="Rua, número - Cidade UF"
                autoComplete="street-address"
                required
                aria-invalid={enderecoError ? "true" : undefined}
                aria-describedby={
                  enderecoError ? "field-endereco-error" : undefined
                }
                {...register("endereco")}
              />
              {enderecoError ? (
                <p
                  id="field-endereco-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {enderecoError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field">
              <label htmlFor="field-rendaAnual" className="client-modal__label">
                Renda anual (R$){" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="field-rendaAnual"
                type="text"
                inputMode="decimal"
                className="client-modal__input tabular-nums"
                placeholder="Ex.: 85000,00"
                required
                aria-invalid={rendaAnualError ? "true" : undefined}
                aria-describedby={
                  rendaAnualError ? "field-rendaAnual-error" : undefined
                }
                {...register("rendaAnual")}
              />
              {rendaAnualError ? (
                <p
                  id="field-rendaAnual-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {rendaAnualError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field">
              <label htmlFor="field-patrimonio" className="client-modal__label">
                Patrimônio (R$){" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="field-patrimonio"
                type="text"
                inputMode="decimal"
                className="client-modal__input tabular-nums"
                placeholder="Ex.: 250000,00"
                required
                aria-invalid={patrimonioError ? "true" : undefined}
                aria-describedby={
                  patrimonioError ? "field-patrimonio-error" : undefined
                }
                {...register("patrimonio")}
              />
              {patrimonioError ? (
                <p
                  id="field-patrimonio-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {patrimonioError.message}
                </p>
              ) : null}
            </div>

            <div className="client-modal__field client-modal__field--full">
              <label
                htmlFor="field-codigoAgencia"
                className="client-modal__label"
              >
                Agência vinculada{" "}
                <span className="client-modal__required" aria-hidden="true">
                  *
                </span>
              </label>
              <Controller
                name="codigoAgencia"
                control={control}
                render={({ field }) => (
                  <SelectDropdown
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
              {codigoAgenciaError ? (
                <p
                  id="field-codigoAgencia-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {codigoAgenciaError.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="client-modal__footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleRequestClose}
          >
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
