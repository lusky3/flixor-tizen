import { useEffect, useRef } from "react";
import { useUpdateCheck } from "../hooks/useUpdateCheck";

export function UpdateBanner() {
  const { hasUpdate, version, dismiss } = useUpdateCheck();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasUpdate) {
      timerRef.current = setTimeout(() => {
        dismiss();
      }, 10000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasUpdate, dismiss]);

  if (!hasUpdate) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner-text">
        Version {version} is available
      </span>
      <button
        className="update-banner-dismiss"
        onClick={dismiss}
        aria-label="Dismiss update notification"
      >
        ✕
      </button>
    </div>
  );
}
