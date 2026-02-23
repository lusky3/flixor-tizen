/** Format seconds as MM:SS (< 1 hour) or H:MM:SS (≥ 1 hour). */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Clamp a seek operation to [0, duration]. */
export function clampSeek(current: number, delta: number, duration: number): number {
  return Math.min(duration, Math.max(0, current + delta));
}

/** Calculate fill percentage [0, 100]. */
export function fillPercent(current: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.max(0, (current / duration) * 100));
}
