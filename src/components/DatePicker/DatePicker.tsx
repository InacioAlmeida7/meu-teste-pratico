import { useId, useMemo, useRef, useState, type Ref } from "react";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { useAnchoredPopover } from "../../hooks/useAnchoredPopover";
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

const pad2 = (part: string) => part.padStart(2, "0");

/**
 * Converte o texto digitado ou colado para `DD/MM/AAAA`.
 * Datas completas coladas em outros formatos (`AAAA-MM-DD`, `D/M/AAAA`, `DD.MM.AAAA`)
 * são reordenadas; caso contrário aplica a máscara sobre os dígitos.
 */
function toMaskedDate(rawValue: string): string {
  const trimmed = rawValue.trim();
  const yearFirst = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(trimmed);
  if (yearFirst) {
    return `${pad2(yearFirst[3])}/${pad2(yearFirst[2])}/${yearFirst[1]}`;
  }
  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(trimmed);
  if (dayFirst) {
    return `${pad2(dayFirst[1])}/${pad2(dayFirst[2])}/${dayFirst[3]}`;
  }

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
 * O calendário abre em popover na top-layer (`useAnchoredPopover`) e fecha com Esc,
 * clique fora ou quando o foco sai dele (Tab).
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { anchorRef, triggerRef, popoverRef, isOpen, open, close } =
    useAnchoredPopover({ onDismiss: onBlur });

  // "Hoje" é recalculado a cada abertura para não ficar obsoleto após a meia-noite.
  const [today, setToday] = useState(getLocalToday);
  const resolvedMaxDate = maxDate ?? today;
  const minDate = useMemo(() => new Date(minYear, 0, 1), [minYear]);

  function getSelectedDate(): Date | undefined {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return undefined;
    }
    const parsed = parseDate(value);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed < minDate ||
      parsed > resolvedMaxDate
    ) {
      return undefined;
    }
    return parsed;
  }
  const selectedDate = getSelectedDate();

  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => selectedDate ?? new Date(1990, 0, 1),
  );

  function handleTogglePopover() {
    if (isOpen) {
      close(false);
      return;
    }
    setToday(getLocalToday());
    setDisplayMonth(selectedDate ?? new Date(1990, 0, 1));
    open();
  }

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      return;
    }
    onChange(formatDateBR(day));
    onBlur();
    close(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={anchorRef} className="date-picker">
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
          onChange={(event) => onChange(toMaskedDate(event.target.value))}
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
            selected={selectedDate}
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
