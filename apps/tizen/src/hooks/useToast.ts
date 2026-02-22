import { createContext, useContext, useCallback, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: number) => void;
}

let nextId = 0;

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
  dismissToast: () => {},
});

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismissToast(id), 3000);
    },
    [dismissToast],
  );

  return { toasts, showToast, dismissToast };
}

export function useToast() {
  return useContext(ToastContext);
}
