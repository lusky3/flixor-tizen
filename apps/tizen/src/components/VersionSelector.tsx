import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import type { PlexMedia } from "@flixor/core";
import { Modal } from "./Modal";
import {
  formatResolution,
  formatBitrate,
  formatFileSize,
  formatAudioChannels,
} from "../utils/media";

export interface VersionSelectorProps {
  versions: PlexMedia[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

function getAudioStream(media: PlexMedia) {
  const streams = media.Part?.[0]?.Stream;
  if (!streams) return undefined;
  return streams.find((s) => s.streamType === 2);
}

function VersionRow({
  media,
  index,
  isSelected,
  onSelect,
}: {
  media: PlexMedia;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: onSelect,
    focusable: true,
  });

  const audio = getAudioStream(media);
  const resolution = formatResolution(media.height);
  const codec = media.videoCodec?.toUpperCase() ?? "";
  const bitrate = formatBitrate(media.bitrate);
  const audioCodec = audio?.codec?.toUpperCase() ?? media.audioCodec?.toUpperCase() ?? "";
  const audioChannels = formatAudioChannels(media.audioChannels);
  const fileSize = formatFileSize(media.Part?.[0]?.size);

  const label = media.editionTitle
    ? `${media.editionTitle} — ${resolution}`
    : `Version ${index + 1} — ${resolution}`;

  const details = [codec, bitrate, audioCodec, audioChannels, fileSize]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      ref={ref}
      className={`version-selector-row${isSelected ? " selected" : ""}${focused ? " spatial-focused" : ""}`}
      tabIndex={0}
      onClick={onSelect}
    >
      <div className="version-selector-row-main">
        <span className="version-selector-row-label">{label}</span>
        {isSelected && <span className="version-selector-row-check">✓</span>}
      </div>
      {details && (
        <span className="version-selector-row-details">{details}</span>
      )}
    </button>
  );
}

export function VersionSelector({
  versions,
  selectedIndex,
  onSelect,
  onClose,
}: VersionSelectorProps) {
  return (
    <Modal title="Select Version" onClose={onClose}>
      <div className="version-selector-list">
        {versions.map((media, i) => (
          <VersionRow
            key={media.id}
            media={media}
            index={i}
            isSelected={i === selectedIndex}
            onSelect={() => {
              onSelect(i);
              onClose();
            }}
          />
        ))}
      </div>
    </Modal>
  );
}
