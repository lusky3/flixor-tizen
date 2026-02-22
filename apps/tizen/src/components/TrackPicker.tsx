import { useEffect, useCallback } from "react";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import type { PlexStream } from "@flixor/core";

export interface TrackPickerProps {
  /** Modal title, e.g. "Audio" or "Subtitles" */
  title: string;
  tracks: PlexStream[];
  /** Currently selected track id, or null for "Off" */
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onClose: () => void;
  /** Show an "Off" option at the top (useful for subtitles) */
  showOff?: boolean;
}

function TrackItem({
  label,
  detail,
  isActive,
  onSelect,
}: {
  label: string;
  detail?: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });

  return (
    <button
      ref={ref}
      className={`track-picker-item${isActive ? " active" : ""}${focused ? " spatial-focused" : ""}`}
      tabIndex={0}
      onClick={onSelect}
    >
      <span className="track-picker-item-label">{label}</span>
      {detail && <span className="track-picker-item-detail">{detail}</span>}
      {isActive && <span className="track-picker-item-check">✓</span>}
    </button>
  );
}

function formatTrackDetail(track: PlexStream): string {
  const parts: string[] = [];
  if (track.codec) parts.push(track.codec.toUpperCase());
  if (track.displayTitle && track.displayTitle !== track.language) {
    parts.push(track.displayTitle);
  }
  return parts.join(" · ");
}

export function TrackPicker({
  title,
  tracks,
  selectedId,
  onSelect,
  onClose,
  showOff = false,
}: TrackPickerProps) {
  const { ref, focusKey, focusSelf } = useFocusable({ isFocusBoundary: true });

  // Focus the list on mount
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
    <div className="track-picker-backdrop" onClick={onClose}>
      <div
        className="track-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="track-picker-title">{title}</h3>
        <FocusContext.Provider value={focusKey}>
          <div ref={ref} className="track-picker-list">
            {showOff && (
              <TrackItem
                label="Off"
                isActive={selectedId === null}
                onSelect={() => onSelect(null)}
              />
            )}
            {tracks.map((track) => (
              <TrackItem
                key={track.id}
                label={track.language || "Unknown"}
                detail={formatTrackDetail(track)}
                isActive={selectedId === track.id}
                onSelect={() => onSelect(track.id)}
              />
            ))}
          </div>
        </FocusContext.Provider>
      </div>
    </div>
  );
}
