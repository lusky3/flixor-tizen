import { useEffect, useCallback, type ReactNode } from "react";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";

export interface ModalProps {
  /** Modal title displayed at the top */
  title?: string;
  /** Called when the modal should close (Back key, Escape, or backdrop click) */
  onClose: () => void;
  children: ReactNode;
}

/**
 * Reusable base modal with backdrop overlay, Back key close (Tizen 10009 / Escape),
 * and spatial navigation focus trap via isFocusBoundary.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const { ref, focusKey, focusSelf } = useFocusable({ isFocusBoundary: true });

  // Focus the modal content on mount
  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  // Close on Back key (Tizen 10009) or Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.keyCode === 10009 || e.key === "Escape" || e.key === "GoBack") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        <FocusContext.Provider value={focusKey}>
          <div ref={ref} className="modal-content">
            {children}
          </div>
        </FocusContext.Provider>
      </div>
    </div>
  );
}
