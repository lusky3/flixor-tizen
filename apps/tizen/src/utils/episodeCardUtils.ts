/**
 * Pure helper to determine progress display mode.
 * - 0 or undefined → "none"
 * - 1–84 → "bar"
 * - ≥85 → "checkmark" (considered watched)
 *
 * Validates: Requirements 7.3, 7.4
 */
export function getProgressDisplay(
  progress: number,
): "none" | "bar" | "checkmark" {
  if (progress >= 85) return "checkmark";
  if (progress >= 1) return "bar";
  return "none";
}

export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}
