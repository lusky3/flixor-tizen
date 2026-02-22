import { useToast } from '../hooks/useToast';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.variant}`}
          onClick={() => dismissToast(toast.id)}
        >
          <span className="toast-icon">
            {toast.variant === 'success' && '✓'}
            {toast.variant === 'error' && '✕'}
            {toast.variant === 'info' && 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
