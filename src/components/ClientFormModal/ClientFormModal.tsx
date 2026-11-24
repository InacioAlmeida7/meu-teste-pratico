import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import {
  ESTADO_CIVIL_OPTIONS,
  clienteSchema,
  getTodayLocalIso,
  type ClienteFormInput,
  type ClienteFormOutput,
} from "../../schemas/clienteSchema";
import type { Agencia, Cliente } from "../../types/models";
import { onlyDigits } from "../../utils/normalizers";
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
 * React Hook Form e Zod. O navegador gerencia top-layer, inert do fundo, `Esc` e
 * retorno automático de foco ao botão acionador.
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

  const sortedAgencias = useMemo(
    () => [...agencias].sort((a, b) => a.codigo - b.codigo),
    [agencias],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormInput, unknown, ClienteFormOutput>({
    resolver: zodResolver(clienteSchema),
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
  });

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
    if (!dialog) {
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

  const todayIso = getTodayLocalIso();

  return (
    <dialog
      ref={dialogRef}
      className="client-modal"
      aria-labelledby="client-form-title"
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
                aria-invalid={errors.nome ? "true" : undefined}
                aria-describedby={errors.nome ? "field-nome-error" : undefined}
                {...register("nome")}
              />
              {errors.nome ? (
                <p
                  id="field-nome-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.nome.message}
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
                aria-invalid={errors.nomeSocial ? "true" : undefined}
                aria-describedby={
                  errors.nomeSocial ? "field-nomeSocial-error" : undefined
                }
                {...register("nomeSocial")}
              />
              {errors.nomeSocial ? (
                <p
                  id="field-nomeSocial-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.nomeSocial.message}
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
                aria-invalid={errors.cpfCnpj ? "true" : undefined}
                aria-describedby={
                  [
                    errors.cpfCnpj ? "field-cpfCnpj-error" : null,
                    hasDuplicateCpf ? "field-cpfCnpj-duplicate" : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                {...register("cpfCnpj")}
              />
              {errors.cpfCnpj ? (
                <p
                  id="field-cpfCnpj-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.cpfCnpj.message}
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
                aria-invalid={errors.rg ? "true" : undefined}
                aria-describedby={errors.rg ? "field-rg-error" : undefined}
                {...register("rg")}
              />
              {errors.rg ? (
                <p
                  id="field-rg-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.rg.message}
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
              <input
                id="field-dataNascimento"
                type="date"
                className="client-modal__input tabular-nums"
                min="1900-01-01"
                max={todayIso}
                autoComplete="bday"
                required
                aria-invalid={errors.dataNascimento ? "true" : undefined}
                aria-describedby={
                  errors.dataNascimento
                    ? "field-dataNascimento-error"
                    : undefined
                }
                {...register("dataNascimento")}
              />
              {errors.dataNascimento ? (
                <p
                  id="field-dataNascimento-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.dataNascimento.message}
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
              <select
                id="field-estadoCivil"
                className="client-modal__select"
                required
                aria-invalid={errors.estadoCivil ? "true" : undefined}
                aria-describedby={
                  errors.estadoCivil ? "field-estadoCivil-error" : undefined
                }
                {...register("estadoCivil")}
              >
                <option value="">Selecione...</option>
                {ESTADO_CIVIL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.estadoCivil ? (
                <p
                  id="field-estadoCivil-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.estadoCivil.message}
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
                aria-invalid={errors.email ? "true" : undefined}
                aria-describedby={
                  errors.email ? "field-email-error" : undefined
                }
                {...register("email")}
              />
              {errors.email ? (
                <p
                  id="field-email-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.email.message}
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
                aria-invalid={errors.endereco ? "true" : undefined}
                aria-describedby={
                  errors.endereco ? "field-endereco-error" : undefined
                }
                {...register("endereco")}
              />
              {errors.endereco ? (
                <p
                  id="field-endereco-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.endereco.message}
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
                aria-invalid={errors.rendaAnual ? "true" : undefined}
                aria-describedby={
                  errors.rendaAnual ? "field-rendaAnual-error" : undefined
                }
                {...register("rendaAnual")}
              />
              {errors.rendaAnual ? (
                <p
                  id="field-rendaAnual-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.rendaAnual.message}
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
                aria-invalid={errors.patrimonio ? "true" : undefined}
                aria-describedby={
                  errors.patrimonio ? "field-patrimonio-error" : undefined
                }
                {...register("patrimonio")}
              />
              {errors.patrimonio ? (
                <p
                  id="field-patrimonio-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.patrimonio.message}
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
              <select
                id="field-codigoAgencia"
                className="client-modal__select"
                required
                aria-invalid={errors.codigoAgencia ? "true" : undefined}
                aria-describedby={
                  errors.codigoAgencia
                    ? "field-codigoAgencia-error"
                    : undefined
                }
                {...register("codigoAgencia")}
              >
                <option value="">Selecione uma agência...</option>
                {sortedAgencias.map((agencia) => (
                  <option key={agencia.id} value={String(agencia.codigo)}>
                    {agencia.codigo} — {agencia.nome}
                  </option>
                ))}
              </select>
              {errors.codigoAgencia ? (
                <p
                  id="field-codigoAgencia-error"
                  className="client-modal__error"
                  role="alert"
                >
                  {errors.codigoAgencia.message}
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
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            Cadastrar cliente
          </button>
        </footer>
      </form>
    </dialog>
  );
}
