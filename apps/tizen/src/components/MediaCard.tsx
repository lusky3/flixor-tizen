import type { PlexMediaItem } from "@flixor/core";
import { flixor } from "../services/flixor";

export function MediaCard({
  item,
  variant = "landscape",
  onClick,
  onFocus,
}: {
  item: PlexMediaItem;
  variant?: "landscape" | "poster";
  onClick: () => void;
  onFocus?: () => void;
}) {
  const getMediaImage = (
    item: PlexMediaItem,
    variant: "landscape" | "poster" = "poster",
  ) => {
    if (variant === "poster") {
      return item.grandparentThumb || item.parentThumb || item.thumb;
    }
    return item.thumb || item.art;
  };

  return (
    <div className={`tv-card-container ${variant}`}>
      <button
        className={`tv-card ${variant}`}
        tabIndex={0}
        onFocus={onFocus}
        onClick={onClick}
      >
        <img
          src={flixor.plexServer.getImageUrl(getMediaImage(item, variant), 400)}
          alt={item.title}
          className="card-img"
        />
        {item.viewOffset && item.duration && (
          <div className="card-progress">
            <div
              className="progress-bar"
              style={{
                width: `${Math.min(100, Math.round((item.viewOffset / item.duration) * 100))}%`,
              }}
            />
          </div>
        )}
      </button>
      <div className="tv-card-label">{item.title}</div>
    </div>
  );
}
