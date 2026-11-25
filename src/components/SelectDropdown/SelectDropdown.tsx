import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { useAnchoredPopover } from "../../hooks/useAnchoredPopover";
import "./SelectDropdown.css";

export interface SelectOption {
  value: string;
  label: string;
  code?: string;
}

interface SelectDropdownProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: readonly SelectOption[];
  placeholder?: string;
  leadingIcon?: ReactNode;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  required?: boolean;
  listboxLabel: string;
  /** Repassado ao botão: permite ao React Hook Form focar o campo inválido. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Seletor dropdown customizado e acessível (`role="combobox"` + `role="listbox"`),
 * exibido em popover na top-layer (`useAnchoredPopover`), com suporte total a teclado:
 * setas, Home/End, Enter/Espaço para abrir e escolher, Esc e Tab para fechar.
 */
export function SelectDropdown({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Selecione...",
  leadingIcon,
  ariaInvalid = false,
  ariaDescribedBy,
  required = false,
  listboxLabel,
  ref,
}: SelectDropdownProps) {
  const listboxId = useId();
  const {
    anchorRef,
    triggerRef,
    popoverRef,
    isOpen,
    open,
    close,
  } = useAnchoredPopover({ matchAnchorWidth: true, onDismiss: onBlur });
  // Marca o clique sintético que o navegador pode gerar para o mesmo Enter/Espaço
  // já tratado no teclado (senão a lista abriria e fecharia no mesmo toque).
  const keyboardActivationRef = useRef(false);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function openList(initialIndex = selectedIndex >= 0 ? selectedIndex : 0) {
    if (options.length === 0) {
      return;
    }
    setHighlightedIndex(initialIndex);
    open();
    scrollHighlightedIntoView(initialIndex);
  }

  function handleSelectOption(optionValue: string) {
    onChange(optionValue);
    onBlur?.();
    close(true);
  }

  function markKeyboardActivation() {
    keyboardActivationRef.current = true;
    // O clique sintético, quando existe, é disparado na mesma tarefa do evento de tecla.
    window.setTimeout(() => {
      keyboardActivationRef.current = false;
    }, 0);
  }

  function handleTriggerClick(detail: number) {
    // `detail === 0` indica clique sem ponteiro (teclado ou tecnologia assistiva).
    if (detail === 0 && keyboardActivationRef.current) {
      return;
    }
    if (isOpen) {
      close(false);
      onBlur?.();
      return;
    }
    openList();
  }

  function scrollHighlightedIntoView(index: number) {
    window.requestAnimationFrame(() => {
      const activeOption = popoverRef.current?.querySelector<HTMLElement>(
        `#${CSS.escape(`${listboxId}-opt-${index}`)}`,
      );
      activeOption?.scrollIntoView({ block: "nearest" });
    });
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (options.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      const next = (highlightedIndex + 1) % options.length;
      setHighlightedIndex(next);
      scrollHighlightedIntoView(next);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openList(selectedIndex >= 0 ? selectedIndex : options.length - 1);
        return;
      }
      const prev =
        highlightedIndex <= 0 ? options.length - 1 : highlightedIndex - 1;
      setHighlightedIndex(prev);
      scrollHighlightedIntoView(prev);
      return;
    }

    if (isOpen && event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(0);
      scrollHighlightedIntoView(0);
      return;
    }

    if (isOpen && event.key === "End") {
      event.preventDefault();
      const last = options.length - 1;
      setHighlightedIndex(last);
      scrollHighlightedIntoView(last);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      markKeyboardActivation();
      if (!isOpen) {
        openList();
        return;
      }
      const option = options[highlightedIndex];
      if (option) {
        handleSelectOption(option.value);
      }
    }
  }

  const isPlaceholderShown = !selectedOption;

  return (
    <div ref={anchorRef} className="select-dropdown">
      <button
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0
            ? `${listboxId}-opt-${highlightedIndex}`
            : undefined
        }
        aria-required={required ? "true" : undefined}
        aria-invalid={ariaInvalid ? "true" : undefined}
        aria-describedby={ariaDescribedBy}
        className={
          isOpen
            ? "select-dropdown__trigger select-dropdown__trigger--open"
            : "select-dropdown__trigger"
        }
        onClick={(event) => handleTriggerClick(event.detail)}
        onKeyDown={handleTriggerKeyDown}
        onKeyUp={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            markKeyboardActivation();
          }
        }}
        onBlur={() => {
          if (!isOpen) {
            onBlur?.();
          }
        }}
      >
        <span className="select-dropdown__value-group">
          {leadingIcon ? (
            <span className="select-dropdown__leading-icon" aria-hidden="true">
              {leadingIcon}
            </span>
          ) : null}

          {selectedOption?.code ? (
            <span className="select-dropdown__code tabular-nums">
              {selectedOption.code}
            </span>
          ) : null}

          <span
            className={
              isPlaceholderShown
                ? "select-dropdown__text select-dropdown__text--placeholder"
                : "select-dropdown__text"
            }
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDown
          size={17}
          className={
            isOpen
              ? "select-dropdown__chevron select-dropdown__chevron--open"
              : "select-dropdown__chevron"
          }
          aria-hidden="true"
        />
      </button>

      <div
        ref={popoverRef}
        popover="manual"
        className="select-dropdown__popover"
      >
        <ul
          id={listboxId}
          role="listbox"
          aria-label={listboxLabel}
          className="select-dropdown__list"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <li
                key={option.value}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                className={[
                  "select-dropdown__option",
                  isSelected ? "select-dropdown__option--selected" : "",
                  isHighlighted ? "select-dropdown__option--highlighted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelectOption(option.value)}
              >
                <span className="select-dropdown__option-main">
                  {option.code ? (
                    <span className="select-dropdown__option-code tabular-nums">
                      {option.code}
                    </span>
                  ) : null}
                  <span className="select-dropdown__option-label">
                    {option.label}
                  </span>
                </span>
                {isSelected ? (
                  <Check
                    size={16}
                    className="select-dropdown__check"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
