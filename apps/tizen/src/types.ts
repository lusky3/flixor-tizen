import type { PlexMediaItem } from "@flixor/core";

export interface RowData {
  title: string;
  items: PlexMediaItem[];
  variant?: "landscape" | "poster";
}
