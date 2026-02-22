/**
 * SeekSlider — Player seek bar with D-pad navigation, timestamps, and optional thumbnail previews.
 *
 * Validates: Requirements 12.1–12.5, 18.3, 18.4 · Design §12, §18
 */

import { useState } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

/* ------------------------------------------------------------------ */
/*  Pure helpers (exported for testing / reuse)                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export interface SeekSliderProps {
  currentTime: number; // in seconds
  duration: number; // in seconds
  onSeek: (time: number) => void;
  increment?: number; // seek step in seconds, default 10
  getPreviewUrl?: (time: number) => string | null;
}

export function SeekSlider({
  currentTime,
  duration,
  onSeek,
  increment = 10,
  getPreviewUrl,
}: SeekSliderProps) {
  const [previewError, setPreviewError] = useState(false);

  const { ref, focused } = useFocusable({
    onArrowPress: (direction) => {
      if (direction === "left") {
        onSeek(clampSeek(currentTime, -increment, duration));
        return false; // trap focus — prevent page-level navigation
      }
      if (direction === "right") {
        onSeek(clampSeek(currentTime, increment, duration));
        return false;
      }
      return true; // allow up/down navigation
    },
  });

  const pct = fillPercent(currentTime, duration);
  const previewUrl =
    focused && getPreviewUrl ? getPreviewUrl(currentTime) : null;

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        padding: "8px 0",
      }}
    >
      {/* Thumbnail preview */}
      {previewUrl && !previewError && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: `${pct}%`,
            transform: "translateX(-50%)",
            marginBottom: 8,
            pointerEvents: "none",
          }}
        >
          <img
            src={previewUrl}
            alt="Seek preview"
            width={320}
            height={180}
            onError={() => setPreviewError(true)}
            onLoad={() => setPreviewError(false)}
            style={{
              display: "block",
              borderRadius: 4,
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          />
        </div>
      )}

      {/* Slider track */}
      <div
        style={{
          position: "relative",
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.2)",
          overflow: "hidden",
        }}
      >
        {/* Fill bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${pct}%`,
            borderRadius: 3,
            background: focused ? "#ff4b2b" : "rgba(255,255,255,0.6)",
            transition: "width 0.15s linear",
          }}
        />
      </div>

      {/* Timestamps */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 13,
          color: "rgba(255,255,255,0.7)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
