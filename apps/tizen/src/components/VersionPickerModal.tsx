import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import type { PlexMedia } from "@flixor/core";
import { Modal } from "./Modal";

export interface VersionPickerModalProps {
  versions: PlexMedia[];
  /** Index of the currently selected version */
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

function formatResolution(media: PlexMedia): string {
  if (media.width && media.width >= 3800) return "4K";
  if (media.width && media.width >= 1900) return "1080p";
  if (media.width && media.width >= 1200) return "720p";
  if (media.videoResolution) return media.videoResolution;
  return "SD";
}

function formatVersionDetail(media: PlexMedia): string {
  const parts: string[] = [];
  if (media.videoCodec) parts.push(media.videoCodec.toUpperCase());
  if (media.audioCodec) parts.push(media.audioCodec.toUpperCase());
  if (media.audioChannels) {
    if (media.audioChannels >= 8) parts.push("Atmos");
    else if (media.audioChannels >= 6) parts.push("5.1");
    else parts.push(`${media.audioChannels}.0`);
  }
  if (media.bitrate) parts.push(`${Math.round(media.bitrate / 1000)}Mbps`);
  if (media.container) parts.push(media.container.toUpperCase());
  return parts.join(" · ");
}

function VersionItem({
  media,
  index,
  isActive,
  onSelect,
}: {
  media: PlexMedia;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });

  const label = media.editionTitle
    ? `${media.editionTitle} — ${formatResolution(media)}`
    : `Version ${index + 1} — ${formatResolution(media)}`;

  return (
    <button
      ref={ref}
      className={`version-picker-item${isActive ? " active" : ""}${focused ? " spatial-focused" : ""}`}
      tabIndex={0}
      onClick={onSelect}
    >
      <span className="version-picker-item-label">{label}</span>
      <span className="version-picker-item-detail">
        {formatVersionDetail(media)}
      </span>
      {isActive && <span className="version-picker-item-check">✓</span>}
    </button>
  );
}

/**
 * Modal overlay listing available media versions with quality info.
 * Composes the base Modal for backdrop, Back key close, and focus management.
 */
export function VersionPickerModal({
  versions,
  selectedIndex,
  onSelect,
  onClose,
}: VersionPickerModalProps) {
  return (
    <Modal title="Select Version" onClose={onClose}>
      <div className="version-picker-list">
        {versions.map((media, i) => (
          <VersionItem
            key={media.id}
            media={media}
            index={i}
            isActive={i === selectedIndex}
            onSelect={() => onSelect(i)}
          />
        ))}
      </div>
    </Modal>
  );
}
