/**
 * AccessibilityBadges — Image-based CC, SDH, AD badges.
 *
 * Renders badge images for Closed Captions, SDH subtitles, and Audio Description
 * when detected. Returns null when none are present.
 *
 * Validates: Requirements 14.4, 14.5 · Design §14
 */

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

export interface AccessibilityBadgesProps {
  hasCC?: boolean;
  hasSDH?: boolean;
  hasAD?: boolean;
}

export function AccessibilityBadges({ hasCC, hasSDH, hasAD }: AccessibilityBadgesProps) {
  if (!hasCC && !hasSDH && !hasAD) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {hasCC && (
        <img
          src="/badges/cc.png"
          alt="CC"
          style={{ height: 20, width: "auto", objectFit: "contain" }}
          loading="lazy"
        />
      )}
      {hasSDH && (
        <img
          src="/badges/sdh.png"
          alt="SDH"
          style={{ height: 20, width: "auto", objectFit: "contain" }}
          loading="lazy"
        />
      )}
      {hasAD && (
        <img
          src="/badges/ad.png"
          alt="AD"
          style={{ height: 20, width: "auto", objectFit: "contain" }}
          loading="lazy"
        />
      )}
    </div>
  );
}
