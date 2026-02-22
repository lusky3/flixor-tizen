import type { PlexMediaItem } from "@flixor/core";

export interface RowData {
  title: string;
  items: PlexMediaItem[];
  variant?: "landscape" | "poster";
}

export interface SearchResult {
  id: string;
  title: string;
  type: "movie" | "tv";
  image?: string;
  year?: string;
  available: boolean;
  plexItem?: PlexMediaItem;
}
