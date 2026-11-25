import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Check, ChevronDown } from "lucide-react";
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
 * renderizado na top-layer via `popover="manual"` para nunca ser cortado dentro de `<dialog>`.
 * Segue o mesmo visual arredondado e animado do `DatePicker` com suporte total a teclado.
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const lastKeyboardToggleRef = useRef<number>(0);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const updatePopoverPosition = useCallback(() => {
    const wrapper = wrapperRef.current;
    const popover = popoverRef.current;
    if (!wrapper || !popover) {
      return;
    }

    const anchorRect = wrapper.getBoundingClientRect();
    const margin = 12;
    const desiredWidth = Math.min(
      Math.max(anchorRect.width, 220),
      window.innerWidth - margin * 2,
    );

    popover.style.minWidth = `${desiredWidth}px`;
    popover.style.maxWidth = `${window.innerWidth - margin * 2}px`;

    const popRect = popover.getBoundingClientRect();
    const popWidth = popRect.width || desiredWidth;
    const popHeight = popRect.height || 240;

    const left = Math.min(
      Math.max(margin, anchorRect.left),
      window.innerWidth - popWidth - margin,
    );

    const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;
    const top =
      spaceBelow >= popHeight || spaceBelow >= spaceAbove
        ? Math.min(anchorRect.bottom + 6, window.innerHeight - popHeight - margin)
        : Math.max(margin, anchorRect.top - popHeight - 6);

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }, []);

  const closePopover = useCallback(
    (restoreFocusToTrigger: boolean) => {
      const popover = popoverRef.current;
      if (popover?.matches(":popover-open")) {
        popover.hidePopover();
      }
      setIsOpen(false);
      if (restoreFocusToTrigger) {
        triggerRef.current?.focus();
      }
    },
    [],
  );

  const openPopover = useCallback(
    (initialIndex?: number) => {
      const popover = popoverRef.current;
      if (!popover || options.length === 0) {
        return;
      }

      const nextIndex =
        initialIndex !== undefined
          ? initialIndex
          : selectedIndex >= 0
            ? selectedIndex
            : 0;
      setHighlightedIndex(nextIndex);

      if (!popover.matches(":popover-open")) {
        popover.showPopover();
      }
      setIsOpen(true);

      window.requestAnimationFrame(() => {
        updatePopoverPosition();
        const activeOption = popover.querySelector<HTMLElement>(
          `#${CSS.escape(`${listboxId}-opt-${nextIndex}`)}`,
        );
        activeOption?.scrollIntoView({ block: "nearest" });
      });
    },
    [options.length, selectedIndex, listboxId, updatePopoverPosition],
  );

  function handleSelectOption(optionValue: string) {
    onChange(optionValue);
    onBlur?.();
    closePopover(true);
  }

  function handleToggle(detail: number) {
    if (
      detail === 0 &&
      performance.now() - lastKeyboardToggleRef.current < 500
    ) {
      return;
    }
    if (isOpen) {
      closePopover(false);
      onBlur?.();
      return;
    }
    openPopover();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopoverPosition();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePopover(true);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        wrapperRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      closePopover(false);
      onBlur?.();
    }

    function handleViewportChange() {
      updatePopoverPosition();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, closePopover, updatePopoverPosition, onBlur]);

  useEffect(() => {
    const popover = popoverRef.current;
    return () => {
      if (popover?.matches(":popover-open")) {
        popover.hidePopover();
      }
    };
  }, []);

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
        openPopover(selectedIndex >= 0 ? selectedIndex : 0);
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
        openPopover(selectedIndex >= 0 ? selectedIndex : options.length - 1);
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
      lastKeyboardToggleRef.current = performance.now();
      if (!isOpen) {
        openPopover();
        return;
      }
      const option = options[highlightedIndex];
      if (option) {
        handleSelectOption(option.value);
      }
      return;
    }

    if (isOpen && event.key === "Tab") {
      closePopover(false);
      onBlur?.();
    }
  }

  const isPlaceholderShown = !selectedOption;

  return (
    <div ref={wrapperRef} className="select-dropdown">
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
        onClick={(event) => handleToggle(event.detail)}
        onKeyDown={handleTriggerKeyDown}
        onKeyUp={(event) => {
          if (event.key === " ") {
            event.preventDefault();
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
