import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import { flixor } from "../services/flixor";
import { loadSettings } from "../services/settings";
import { TopNav } from "../components/TopNav";
import { PosterCard } from "../components/PosterCard";
import { SkeletonRow } from "../components/SkeletonRow";
import type { PlexMediaItem } from "@flixor/core";

const PAGE_SIZE = 20;

/** Map source param to a human-readable title */
function getSourceTitle(source: string): string {
  const titles: Record<string, string> = {
    "trending-movies": "Popular Movies",
    "trending-shows": "Trending Shows",
    "recently-added-movies": "Recently Added Movies",
    "recently-added-shows": "Recently Added Shows",
    "collections": "Collections",
    "trakt-watchlist": "Trakt Watchlist",
    "trakt-recommended": "Recommended for You",
    "trakt-trending": "Trending on Trakt",
  };
  return titles[source] || source.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Enrich Trakt items with TMDB poster images */
async function enrichTraktItems(items: PlexMediaItem[]): Promise<void> {
  await Promise.all(
    items.map(async (item: any) => {
      const guid: string = item.guid || "";
      const tmdbId = guid.replace("tmdb://", "");
      if (!tmdbId) return;
      try {
        const details = await flixor.tmdb
          .getMovieDetails(Number(tmdbId))
          .catch(() => flixor.tmdb.getTVDetails(Number(tmdbId)));
        if (details) {
          const d = details as any;
          item.thumb = flixor.tmdb.getPosterUrl(d.poster_path, "w500");
          item.art = flixor.tmdb.getBackdropUrl(d.backdrop_path, "original");
          item.summary = d.overview || "";
        }
      } catch {
        /* ignore enrichment failures */
      }
    }),
  );
}

/** Fetch a page of items based on the source type */
async function fetchSourceItems(
  source: string,
  page: number,
): Promise<{ items: PlexMediaItem[]; hasMore: boolean }> {
  switch (source) {
    case "trending-movies": {
      const res = await flixor.tmdb.getTrendingMovies("week", page);
      const items: PlexMediaItem[] = (res.results || []).map(
        (m: any) =>
          ({
            ratingKey: `tmdb-movie-${m.id}`,
            title: (m.title || m.name) as string,
            thumb: flixor.tmdb.getImageUrl(m.poster_path as string, "w500"),
            art: flixor.tmdb.getImageUrl(m.backdrop_path as string, "original"),
            year: ((m.release_date || "") as string).split("-")[0],
            summary: m.overview as string,
            duration: 0,
            guid: `tmdb://${m.id}`,
          }) as any,
      );
      return { items, hasMore: (res.page || page) < (res.total_pages || 1) };
    }

    case "trending-shows": {
      const res = await flixor.tmdb.getTrendingTV("week", page);
      const items: PlexMediaItem[] = (res.results || []).map(
        (m: any) =>
          ({
            ratingKey: `tmdb-tv-${m.id}`,
            title: (m.name || m.title) as string,
            thumb: flixor.tmdb.getImageUrl(m.poster_path as string, "w500"),
            art: flixor.tmdb.getImageUrl(m.backdrop_path as string, "original"),
            year: ((m.first_air_date || "") as string).split("-")[0],
            summary: m.overview as string,
            duration: 0,
            guid: `tmdb://${m.id}`,
          }) as any,
      );
      return { items, hasMore: (res.page || page) < (res.total_pages || 1) };
    }

    case "recently-added-movies":
    case "recently-added-shows": {
      const libType = source === "recently-added-movies" ? "movie" : "show";
      const libs = await flixor.plexServer.getLibraries();
      const settings = loadSettings();
      const disabledKeys = settings.catalogDisabledLibraries || [];
      const enabledLibs = libs.filter((l) => !disabledKeys.includes(l.key));
      const lib = enabledLibs.find((l) => l.type === libType);
      if (!lib) return { items: [], hasMore: false };
      const offset = (page - 1) * PAGE_SIZE;
      const items = await flixor.plexServer.getLibraryItems(lib.key, {
        sort: "addedAt:desc",
        offset,
        limit: PAGE_SIZE,
      });
      return { items, hasMore: items.length >= PAGE_SIZE };
    }

    case "collections": {
      const all = await flixor.plexServer.getAllCollections();
      const offset = (page - 1) * PAGE_SIZE;
      const items = all.slice(offset, offset + PAGE_SIZE);
      return { items, hasMore: offset + items.length < all.length };
    }

    case "trakt-watchlist": {
      if (!flixor.trakt.isAuthenticated()) return { items: [], hasMore: false };
      const watchlist = await flixor.trakt.getWatchlist();
      const mapped: PlexMediaItem[] = watchlist.map((w: any) => {
        const media = w.movie || w.show;
        const ids = media?.ids || {};
        return {
          ratingKey: `trakt-wl-${ids.tmdb || ids.trakt}`,
          title: media?.title || "Unknown",
          thumb: "",
          year: media?.year ? String(media.year) : "",
          summary: "",
          duration: 0,
          guid: ids.tmdb ? `tmdb://${ids.tmdb}` : "",
        } as any;
      });
      await enrichTraktItems(mapped);
      const offset = (page - 1) * PAGE_SIZE;
      const items = mapped.slice(offset, offset + PAGE_SIZE);
      return { items, hasMore: offset + items.length < mapped.length };
    }

    case "trakt-recommended": {
      if (!flixor.trakt.isAuthenticated()) return { items: [], hasMore: false };
      const recs = await flixor.trakt.getRecommendedMovies(page, PAGE_SIZE);
      const items: PlexMediaItem[] = recs.map(
        (m: any) =>
          ({
            ratingKey: `trakt-rec-${m.ids?.tmdb || m.ids?.trakt}`,
            title: m.title || "Unknown",
            thumb: "",
            year: m.year ? String(m.year) : "",
            summary: "",
            duration: 0,
            guid: m.ids?.tmdb ? `tmdb://${m.ids.tmdb}` : "",
          }) as any,
      );
      await enrichTraktItems(items);
      return { items, hasMore: items.length >= PAGE_SIZE };
    }

    case "trakt-trending": {
      if (!flixor.trakt.isAuthenticated()) return { items: [], hasMore: false };
      const trending = await flixor.trakt.getTrendingMovies(page, PAGE_SIZE);
      const items: PlexMediaItem[] = trending.map((t: any) => {
        const m = t.movie || t;
        return {
          ratingKey: `trakt-trend-${m.ids?.tmdb || m.ids?.trakt}`,
          title: m.title || "Unknown",
          thumb: "",
          year: m.year ? String(m.year) : "",
          summary: "",
          duration: 0,
          guid: m.ids?.tmdb ? `tmdb://${m.ids.tmdb}` : "",
        } as any;
      });
      await enrichTraktItems(items);
      return { items, hasMore: items.length >= PAGE_SIZE };
    }

    default:
      // Genre-based or unknown source — try to parse as genre
      return { items: [], hasMore: false };
  }
}

export function BrowsePage() {
  const { source = "" } = useParams<{ source: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<PlexMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);

  // Allow overriding the title via route state
  const title =
    (location.state as any)?.title || getSourceTitle(source);

  const { ref: gridRef, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setItems([]);
      pageRef.current = 1;
      try {
        const result = await fetchSourceItems(source, 1);
        if (!cancelled) {
          setItems(result.items);
          setHasMore(result.hasMore);
        }
      } catch (err) {
        console.error("[Browse] Failed to load:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [source]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const result = await fetchSourceItems(source, nextPage);
      pageRef.current = nextPage;
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("[Browse] Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [source, loadingMore, hasMore]);

  const handleItemClick = useCallback(
    (item: PlexMediaItem) => navigate(`/details/${item.ratingKey}`),
    [navigate],
  );

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleFocus = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  };

  return (
    <div className="tv-container pt-nav" onFocus={handleFocus}>
      <TopNav />

      <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "20px 80px 0" }}>
        <button
          className="btn-secondary"
          onClick={handleBack}
          tabIndex={0}
          style={{ padding: "8px 16px", fontSize: "18px" }}
        >
          ← Back
        </button>
        <h1 className="library-title" style={{ margin: 0 }}>
          {title}
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: "0 80px" }}>
          <SkeletonRow count={6} variant="poster" />
          <SkeletonRow count={6} variant="poster" />
        </div>
      ) : (
        <FocusContext.Provider value={focusKey}>
          <div ref={gridRef} className="tv-grid" style={{ padding: "20px 80px 100px" }}>
            {items.map((item) => (
              <PosterCard
                key={item.ratingKey}
                item={item}
                onClick={() => handleItemClick(item)}
              />
            ))}

            {items.length === 0 && (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  padding: "60px",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "24px",
                }}
              >
                No items found
              </div>
            )}

            {hasMore && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "30px" }}>
                <button
                  className="btn-secondary"
                  onClick={loadMore}
                  disabled={loadingMore}
                  tabIndex={0}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        </FocusContext.Provider>
      )}
    </div>
  );
}
