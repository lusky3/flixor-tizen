import type { PlexMediaItem } from "@flixor/core";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { SmartImage } from "./SmartImage";
import { flixor } from "../services/flixor";

export function PosterCard({
  item,
  onClick,
  onFocus,
}: {
  item: PlexMediaItem;
  onClick: () => void;
  onFocus?: () => void;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => onClick(),
    onFocus: () => onFocus?.(),
  });

  const thumb = item.grandparentThumb || item.parentThumb || item.thumb;
  const imgSrc = thumb ? flixor.plexServer.getImageUrl(thumb, 400) : "";

  return (
    <div className="tv-card-container poster">
      <button
        ref={ref}
        className={`tv-card poster${focused ? " spatial-focused" : ""}`}
        tabIndex={0}
        onClick={onClick}
      >
        <SmartImage src={imgSrc} alt={item.title} className="card-img-smart" />
      </button>
      <div className={`tv-card-label${focused ? " spatial-focused" : ""}`}>
        {item.title}
        {item.year ? ` (${item.year})` : ""}
      </div>
    </div>
  );
}
