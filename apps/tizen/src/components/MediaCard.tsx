import type { PlexMediaItem } from "@flixor/core";
import { PosterCard } from "./PosterCard";
import { LandscapeCard } from "./LandscapeCard";
import { ContinueCard } from "./ContinueCard";

export function MediaCard({
  item,
  variant = "landscape",
  onClick,
  onFocus,
}: {
  item: PlexMediaItem;
  variant?: "landscape" | "poster" | "continue";
  onClick: () => void;
  onFocus?: () => void;
}) {
  if (variant === "poster") {
    return <PosterCard item={item} onClick={onClick} onFocus={onFocus} />;
  }

  if (variant === "continue") {
    return <ContinueCard item={item} onClick={onClick} onFocus={onFocus} />;
  }

  return <LandscapeCard item={item} onClick={onClick} onFocus={onFocus} />;
}
