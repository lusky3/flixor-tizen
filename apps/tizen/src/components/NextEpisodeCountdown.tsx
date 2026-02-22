import { useState, useEffect, useRef, useCallback } from "react";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import type { PlexMediaItem } from "@flixor/core";

export interface NextEpisodeCountdownProps {
  /** The next episode to play */
  episode: PlexMediaItem;
  /** Seconds to count down from (default 15) */
  countdownSeconds?: number;
  /** Called when countdown reaches 0 or user clicks "Play Now" */
  onPlayNext: () => void;
  /** Called when user clicks "Cancel" to dismiss the overlay */
  onCancel: () => void;
}

function PlayNowButton({ onPress }: { onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      className={`btn-primary next-play-btn${focused ? " spatial-focused" : ""}`}
      tabIndex={0}
      onClick={onPress}
      aria-label="Play next episode now"
    >
      ▶ Play Now
    </button>
  );
}

function CancelButton({ onPress }: { onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      className={`btn-secondary next-cancel-btn${focused ? " spatial-focused" : ""}`}
      tabIndex={0}
      onClick={onPress}
      aria-label="Cancel auto-play"
    >
      Cancel
    </button>
  );
}

/**
 * Overlay showing next episode info with a countdown timer.
 * Auto-calls onPlayNext when countdown reaches 0.
 * "Play Now" immediately triggers onPlayNext, "Cancel" dismisses.
 */
export function NextEpisodeCountdown({
  episode,
  countdownSeconds = 15,
  onPlayNext,
  onCancel,
}: NextEpisodeCountdownProps) {
  const [remaining, setRemaining] = useState(countdownSeconds);
  const timerRef = useRef<number | null>(null);
  const { ref, focusKey, focusSelf } = useFocusable({ isFocusBoundary: true });

  // Focus the overlay on mount
  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  // Countdown timer
  useEffect(() => {
    timerRef.current = globalThis.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) globalThis.clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as unknown as number;

    return () => {
      if (timerRef.current) globalThis.clearInterval(timerRef.current);
    };
  }, []);

  // Trigger onPlayNext when countdown hits 0
  useEffect(() => {
    if (remaining === 0) {
      onPlayNext();
    }
  }, [remaining, onPlayNext]);

  // Close on Back key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.keyCode === 10009 || e.key === "Escape" || e.key === "GoBack") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  const episodeLabel = episode.index
    ? `E${episode.index}${episode.parentIndex ? ` · S${episode.parentIndex}` : ""}`
    : "";

  return (
    <div className="next-episode-overlay">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="next-episode-info">
          <span className="next-label">Next Episode</span>
          <span className="next-title">
            {episode.title}
            {episodeLabel ? ` (${episodeLabel})` : ""}
          </span>
          <span className="next-countdown">Playing in {remaining}s</span>
        </div>
        <div className="next-actions">
          <PlayNowButton onPress={onPlayNext} />
          <CancelButton onPress={onCancel} />
        </div>
      </FocusContext.Provider>
    </div>
  );
}
