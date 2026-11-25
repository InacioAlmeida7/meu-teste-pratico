import { useRef, type PointerEvent, type RefObject } from "react";

type DialogPointerEvent = PointerEvent<HTMLDialogElement>;

/**
 * Fecha um `<dialog>` modal ao clicar no backdrop.
 *
 * Cliques no `::backdrop` chegam com `target` igual ao próprio `<dialog>`, mas fora do seu
 * retângulo. Exigimos que o pressionar **e** o soltar aconteçam fora: assim, selecionar
 * texto de um campo e soltar o mouse sobre o backdrop não fecha o modal por engano.
 */
export function useBackdropClose(
  dialogRef: RefObject<HTMLDialogElement | null>,
  onRequestClose: () => void,
) {
  const pressedOutsideRef = useRef(false);

  function isOutside(event: DialogPointerEvent): boolean {
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

  return {
    onPointerDown(event: DialogPointerEvent) {
      pressedOutsideRef.current = isOutside(event);
    },
    onPointerUp(event: DialogPointerEvent) {
      const wasOutside = pressedOutsideRef.current;
      pressedOutsideRef.current = false;
      if (wasOutside && isOutside(event)) {
        onRequestClose();
      }
    },
  };
}
