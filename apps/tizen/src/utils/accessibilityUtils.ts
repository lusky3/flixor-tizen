export interface AccessibilityDetection {
  hasCC: boolean;
  hasSDH: boolean;
  hasAD: boolean;
}

/**
 * Detect CC, SDH, and AD availability from Plex media streams.
 *
 * - CC: any subtitle stream (streamType === 3) is present
 * - SDH: any subtitle stream's displayTitle or title contains "SDH", "DEAF", or "HARD OF HEARING"
 * - AD: any audio stream's displayTitle or title contains "description", "descriptive", or " ad"
 *
 * Validates: Requirements 14.1, 14.2, 14.3 · Design §14
 */
export function detectAccessibilityBadges(
  streams: Array<{ streamType?: number; displayTitle?: string; title?: string; codec?: string }>,
): AccessibilityDetection {
  if (!streams || streams.length === 0) {
    return { hasCC: false, hasSDH: false, hasAD: false };
  }

  const subtitleStreams = streams.filter((s) => s.streamType === 3);
  const audioStreams = streams.filter((s) => s.streamType === 2);

  const hasCC = subtitleStreams.length > 0;

  const hasSDH = subtitleStreams.some((s) => {
    const text = `${s.displayTitle ?? ""} ${s.title ?? ""}`.toLowerCase();
    return text.includes("sdh") || text.includes("deaf") || text.includes("hard of hearing");
  });

  const hasAD = audioStreams.some((s) => {
    const text = `${s.displayTitle ?? ""} ${s.title ?? ""}`.toLowerCase();
    return text.includes("description") || text.includes("descriptive") || text.includes(" ad");
  });

  return { hasCC, hasSDH, hasAD };
}
