import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { formatDateBR } from "../../utils/formatters";
import { getLocalToday, onlyDigits, parseDate } from "../../utils/normalizers";
import "./DatePicker.css";

interface DatePickerProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  required?: boolean;
  minYear?: number;
  maxDate?: Date;
  /** Repassado ao input: permite ao React Hook Form focar o campo inválido. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * Aplica máscara `DD/MM/AAAA` enquanto o usuário digita apenas números.
 */
function applyDateMask(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Campo de data com digitação mascarada (`DD/MM/AAAA`) e calendário popover em português
 * (`react-day-picker` + `ptBR`) com seletores de Mês e Ano.
 * Usa a Popover API (`popover="manual"`) para renderizar na top-layer acima de `<dialog>`.
 */
export function DatePicker({
  id,
  name,
  value,
  onChange,
  onBlur,
  ariaInvalid = false,
  ariaDescribedBy,
  required = false,
  minYear = 1900,
  maxDate,
  ref,
}: DatePickerProps) {
  const popoverId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const resolvedMaxDate = useMemo(
    () => maxDate ?? getLocalToday(),
    [maxDate],
  );
  const minDate = useMemo(() => new Date(minYear, 0, 1), [minYear]);

  const parsedSelectedDate = useMemo(() => {
    const trimmed = value.trim();
    if (!/^(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(trimmed)) {
      return undefined;
    }
    const parsed = parseDate(trimmed);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getTime() < minDate.getTime() ||
      parsed.getTime() > resolvedMaxDate.getTime()
    ) {
      return undefined;
    }
    return parsed;
  }, [value, minDate, resolvedMaxDate]);

  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => parsedSelectedDate ?? new Date(1990, 0, 1),
  );

  const updatePopoverPosition = useCallback(() => {
    const wrapper = wrapperRef.current;
    const popover = popoverRef.current;
    if (!wrapper || !popover) {
      return;
    }

    const anchorRect = wrapper.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const popWidth = popRect.width || 312;
    const popHeight = popRect.height || 348;
    const margin = 12;

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

  function openPopover() {
    const popover = popoverRef.current;
    if (!popover) {
      return;
    }

    setDisplayMonth(parsedSelectedDate ?? new Date(1990, 0, 1));
    if (!popover.matches(":popover-open")) {
      popover.showPopover();
    }
    setIsOpen(true);
    window.requestAnimationFrame(() => {
      updatePopoverPosition();
    });
  }

  function handleTogglePopover() {
    if (isOpen) {
      closePopover(false);
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
  }, [isOpen, closePopover, updatePopoverPosition]);

  useEffect(() => {
    const popover = popoverRef.current;
    return () => {
      if (popover?.matches(":popover-open")) {
        popover.hidePopover();
      }
    };
  }, []);

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      return;
    }
    onChange(formatDateBR(day));
    onBlur();
    closePopover(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapperRef} className="date-picker">
      <div className="date-picker__control">
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="DD/MM/AAAA"
          autoComplete="bday"
          required={required}
          className="date-picker__input tabular-nums"
          aria-invalid={ariaInvalid ? "true" : undefined}
          aria-describedby={ariaDescribedBy}
          value={value}
          onChange={(event) => onChange(applyDateMask(event.target.value))}
          onBlur={onBlur}
        />

        <button
          ref={triggerRef}
          type="button"
          className="date-picker__trigger"
          aria-label="Abrir calendário"
          aria-expanded={isOpen}
          aria-controls={popoverId}
          aria-haspopup="dialog"
          onClick={handleTogglePopover}
        >
          <Calendar size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        ref={popoverRef}
        id={popoverId}
        popover="manual"
        className="date-picker__popover"
        role="dialog"
        aria-label="Seletor de data de nascimento"
      >
        {isOpen ? (
          <DayPicker
            mode="single"
            locale={ptBR}
            captionLayout="dropdown"
            navLayout="around"
            reverseYears
            startMonth={minDate}
            endMonth={resolvedMaxDate}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={parsedSelectedDate}
            onSelect={handleDaySelect}
            disabled={{ before: minDate, after: resolvedMaxDate }}
            showOutsideDays
            autoFocus
          />
        ) : null}
      </div>
    </div>
  );
}
