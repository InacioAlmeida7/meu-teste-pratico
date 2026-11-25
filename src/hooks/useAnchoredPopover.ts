import { useCallback, useEffect, useRef, useState } from "react";

interface AnchoredPopoverOptions {
  /** Faz o popover ter pelo menos a largura do campo (listas de opções). */
  matchAnchorWidth?: boolean;
  /** Chamado quando o usuário sai do popover clicando fora ou movendo o foco (Tab). */
  onDismiss?: () => void;
}

const MARGIN = 12;
const GAP = 6;

/**
 * Popover ancorado a um campo, renderizado na top-layer (`popover="manual"`)
 * para nunca ser cortado dentro de `<dialog>`. Compartilhado por `SelectDropdown`
 * e `DatePicker`: posiciona abaixo (ou acima, se faltar espaço) e fecha com
 * `Esc` (devolvendo o foco ao gatilho), clique fora ou foco fora.
 */
export function useAnchoredPopover({
  matchAnchorWidth = false,
  onDismiss,
}: AnchoredPopoverOptions = {}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Ref evita reinscrever os listeners globais a cada render do componente pai.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    if (matchAnchorWidth) {
      const maxWidth = window.innerWidth - MARGIN * 2;
      popover.style.minWidth = `${Math.min(Math.max(anchorRect.width, 220), maxWidth)}px`;
      popover.style.maxWidth = `${maxWidth}px`;
    }

    const { width, height } = popover.getBoundingClientRect();
    const left = Math.min(
      Math.max(MARGIN, anchorRect.left),
      window.innerWidth - width - MARGIN,
    );
    const spaceBelow = window.innerHeight - anchorRect.bottom - MARGIN;
    const spaceAbove = anchorRect.top - MARGIN;
    const top =
      spaceBelow >= height || spaceBelow >= spaceAbove
        ? Math.min(anchorRect.bottom + GAP, window.innerHeight - height - MARGIN)
        : Math.max(MARGIN, anchorRect.top - height - GAP);

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }, [matchAnchorWidth]);

  const close = useCallback((restoreFocusToTrigger: boolean) => {
    const popover = popoverRef.current;
    if (popover?.matches(":popover-open")) {
      popover.hidePopover();
    }
    setIsOpen(false);
    if (restoreFocusToTrigger) {
      triggerRef.current?.focus();
    }
  }, []);

  const open = useCallback(() => {
    const popover = popoverRef.current;
    if (!popover) {
      return;
    }
    if (!popover.matches(":popover-open")) {
      popover.showPopover();
    }
    setIsOpen(true);
    window.requestAnimationFrame(updatePosition);
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();

    function isInside(target: EventTarget | null): boolean {
      return (
        target instanceof Node &&
        Boolean(
          anchorRef.current?.contains(target) ||
            popoverRef.current?.contains(target),
        )
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Impede que o mesmo Esc também feche o <dialog> que contém o campo.
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    }

    function handleOutsideInteraction(event: Event) {
      if (!isInside(event.target)) {
        close(false);
        onDismissRef.current?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerdown", handleOutsideInteraction, true);
    document.addEventListener("focusin", handleOutsideInteraction, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerdown", handleOutsideInteraction, true);
      document.removeEventListener("focusin", handleOutsideInteraction, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, close, updatePosition]);

  useEffect(() => {
    const popover = popoverRef.current;
    return () => {
      if (popover?.matches(":popover-open")) {
        popover.hidePopover();
      }
    };
  }, []);

  return { anchorRef, triggerRef, popoverRef, isOpen, open, close };
}
