import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as traktService from "../services/trakt";
import * as tmdbService from "../services/tmdb";
import type {
  PlexMediaItem,
  TraktMovie,
  TraktShow,
  TraktTrendingMovie,
  TraktTrendingShow,
  TraktWatchlistItem,
  TraktHistoryItem,
} from "@flixor/core";
import { ContentRow } from "./ContentRow";
import { SkeletonRow } from "./SkeletonRow";

export type TraktSectionType =
  | "trending"
  | "popular"
  | "watchlist"
  | "history"
  | "recommendations";

interface TraktSectionProps {
  type: TraktSectionType;
  mediaType: "movies" | "shows";
  /** Override the auto-generated section title */
  title?: string;
}

/** Map a Trakt section type + mediaType to a human-readable title */
function defaultTitle(type: TraktSectionType, mediaType: "movies" | "shows"): string {
  const label = mediaType === "movies" ? "Movies" : "TV Shows";
  switch (type) {
    case "trending":
      return `Trending ${label} on Trakt`;
    case "popular":
      return `Popular ${label} on Trakt`;
    case "watchlist":
      return "Trakt Watchlist";
    case "history":
      return "Recently Watched";
    case "recommendations":
      return "Recommended for You";
  }
}

/** Union of all possible Trakt list item shapes */
type TraktItem =
  | TraktTrendingMovie
  | TraktTrendingShow
  | TraktWatchlistItem
  | TraktHistoryItem
  | TraktMovie
  | TraktShow;

/**
 * Extract the inner media object (movie or show) from various Trakt
 * response shapes (trending wrappers, watchlist items, plain objects).
 */
function extractMedia(item: TraktItem): { media: TraktMovie | TraktShow; isMovie: boolean } | null {
  if ("movie" in item && item.movie) return { media: item.movie, isMovie: true };
  if ("show" in item && item.show) return { media: item.show, isMovie: false };
  // Popular endpoints return plain TraktMovie / TraktShow with ids directly
  if ("ids" in item && item.ids) {
    const isMovie = !("first_aired" in item);
    return { media: item as TraktMovie | TraktShow, isMovie };
  }
  return null;
}

/**
 * Enrich a list of PlexMediaItem stubs with TMDB poster + backdrop images.
 * Failures are silently ignored per-item so partial results still render.
 */
async function enrichWithTmdb(items: PlexMediaItem[]): Promise<void> {
  await Promise.all(
    items.map(async (item) => {
      const guid: string = item.guid || "";
      const match = guid.match(/^tmdb:\/\/(\d+)$/);
      if (!match) return;

      const tmdbId = Number(match[1]);
      const mediaType: tmdbService.MediaType = item.type === "show" ? "tv" : "movie";

      try {
        const details = await tmdbService.getDetails(tmdbId, mediaType);
        if (details) {
          item.thumb = tmdbService.buildImageUrl(details.poster_path, "poster");
          item.art = tmdbService.buildImageUrl(details.backdrop_path, "backdrop");
          if (details.overview) item.summary = details.overview;
        }
      } catch {
        /* enrichment is best-effort */
      }
    }),
  );
}

/**
 * Self-contained Trakt content row.
 *
 * Fetches data from the Trakt service by `type` and `mediaType`,
 * enriches items with TMDB posters, and renders via ContentRow.
 * Shows a loading skeleton while fetching; hides entirely on error or empty results.
 */
export function TraktSection({ type, mediaType, title }: TraktSectionProps) {
  const [items, setItems] = useState<PlexMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  const sectionTitle = title ?? defaultTitle(type, mediaType);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);

      // Authenticated-only types: bail silently when not logged in
      const needsAuth = type === "watchlist" || type === "history" || type === "recommendations";
      if (needsAuth && !traktService.isAuthenticated()) {
        setVisible(false);
        return;
      }

      let rawData: TraktItem[] = [];

      switch (type) {
        case "trending":
          rawData = await traktService.getTrending(mediaType);
          break;
        case "popular":
          rawData = await traktService.getPopular(mediaType);
          break;
        case "watchlist":
          rawData = await traktService.getWatchlist(mediaType);
          break;
        case "history":
          rawData = await traktService.getHistory(
            mediaType === "movies" ? "movies" : "shows",
          );
          break;
        case "recommendations":
          rawData = await traktService.getRecommendations(mediaType);
          break;
      }

      if (!rawData || rawData.length === 0) {
        setVisible(false);
        return;
      }

      // Convert Trakt items → PlexMediaItem stubs with TMDB GUIDs
      const mapped: PlexMediaItem[] = [];
      for (const raw of rawData.slice(0, 15)) {
        const extracted = extractMedia(raw);
        if (!extracted) continue;

        const { media, isMovie } = extracted;
        const ids = media.ids || {};
        const tmdbId: number | undefined = ids.tmdb;
        const itemType: PlexMediaItem["type"] = isMovie ? "movie" : "show";

        mapped.push({
          ratingKey: `trakt-${type}-${tmdbId || ids.trakt || ids.imdb || mapped.length}`,
          key: "",
          title: media.title || "Unknown",
          type: itemType,
          thumb: "",
          art: "",
          year: media.year,
          summary: media.overview || "",
          duration: 0,
          guid: tmdbId ? `tmdb://${tmdbId}` : "",
        });
      }

      if (mapped.length === 0) {
        setVisible(false);
        return;
      }

      // Enrich with TMDB posters/backdrops
      await enrichWithTmdb(mapped);

      // Filter out items that failed enrichment (no poster)
      const enriched = mapped.filter((i) => !!i.thumb);

      if (enriched.length === 0) {
        setVisible(false);
        return;
      }

      setItems(enriched);
      setVisible(true);
    } catch {
      // Hide entirely on error
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }, [type, mediaType]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Loading state → skeleton
  if (loading) {
    return <SkeletonRow count={6} variant="poster" />;
  }

  // Error or empty → render nothing
  if (!visible || items.length === 0) {
    return null;
  }

  return (
    <ContentRow
      title={sectionTitle}
      items={items}
      variant="poster"
      onItemClick={(item) => navigate(`/details/${item.ratingKey}`)}
    />
  );
}
