import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import { flixor } from "../services/flixor";
import * as tmdbService from "../services/tmdb";
import * as traktService from "../services/trakt";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";
import { FilterBar } from "../components/FilterBar";
import type { FilterOption } from "../components/FilterBar";
import type {
  PlexMediaItem,
  TMDBMedia,
  TraktTrendingMovie,
  TraktTrendingShow,
  TraktMovie,
  TraktShow,
} from "@flixor/core";
import type { RowData } from "../types";

type TabType = "trending" | "top10" | "coming-soon" | "worth-wait";
type ContentFilter = "all" | "movies" | "shows";
type PeriodFilter = "daily" | "weekly" | "monthly";

const contentOptions: FilterOption[] = [
  { id: "all", label: "All" },
  { id: "movies", label: "Movies" },
  { id: "shows", label: "TV Shows" },
];

const periodOptions: FilterOption[] = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
];

export function NewPopularPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("weekly");
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    ref: pageRef,
    focusKey: pageFocusKey,
    focusSelf,
  } = useFocusable({
    focusKey: "newpopular-page",
    trackChildren: true,
  });

  // Focus the page once content loads so D-PAD navigation works
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => focusSelf(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, focusSelf]);

  const periodLabel = useCallback((): string => {
    if (period === "daily") return "Today";
    if (period === "monthly") return "This Month";
    return "This Week";
  }, [period]);

  const loadTrending = useCallback(async () => {
    const newRows: RowData[] = [];
    const timeWindow: tmdbService.TimeWindow =
      period === "daily" ? "day" : "week";

    if (contentFilter !== "shows") {
      const movies = await tmdbService.getTrending("movie", timeWindow);
      if (movies.results.length > 0) {
        newRows.push({
          title: "Trending Movies",
          items: mapTmdbResults(movies.results.slice(0, 20), "movie"),
          variant: "poster",
        });
      }
    }

    if (contentFilter !== "movies") {
      const shows = await tmdbService.getTrending("tv", timeWindow);
      if (shows.results.length > 0) {
        newRows.push({
          title: "Trending TV Shows",
          items: mapTmdbResults(shows.results.slice(0, 20), "tv"),
          variant: "poster",
        });
      }
    }

    // Recently added from Plex
    try {
      const libs = await flixor.plexServer.getLibraries();
      const movieLib = libs.find((l) => l.type === "movie");
      if (movieLib) {
        const recent = await flixor.plexServer.getRecentlyAdded(movieLib.key);
        if (recent.length > 0) {
          newRows.push({
            title: "New on Plex",
            items: recent.slice(0, 15),
            variant: "poster",
          });
        }
      }
    } catch {
      /* ignore */
    }

    setRows(newRows);
  }, [period, contentFilter]);

  const loadComingSoon = useCallback(async () => {
    const newRows: RowData[] = [];
    try {
      if (contentFilter !== "shows") {
        const upcoming = await tmdbService.getUpcoming();
        newRows.push({
          title: "Coming to Theaters",
          items: mapTmdbResults(upcoming.results.slice(0, 20), "movie"),
          variant: "poster",
        });
      }
      if (contentFilter !== "movies") {
        const onAir = await tmdbService.getOnTheAir();
        newRows.push({
          title: "New Episodes This Week",
          items: mapTmdbResults(onAir.results.slice(0, 20), "tv"),
          variant: "poster",
        });
      }
    } catch {
      /* ignore */
    }
    setRows(newRows);
  }, [contentFilter]);

  const loadTop10 = useCallback(async () => {
    const newRows: RowData[] = [];
    try {
      if (traktService.isAuthenticated()) {
        if (contentFilter !== "shows") {
          const traktMovies = (await traktService.getTrending(
            "movies",
          )) as TraktTrendingMovie[];
          const movieItems = mapTraktTrendingToItems(
            traktMovies.slice(0, 10),
            "movie",
          );
          await enrichTraktItems(movieItems);
          if (movieItems.length > 0) {
            newRows.push({
              title: `Top 10 Movies · ${periodLabel()}`,
              items: movieItems,
              variant: "poster",
            });
          }
        }
        if (contentFilter !== "movies") {
          const traktShows = (await traktService.getTrending(
            "shows",
          )) as TraktTrendingShow[];
          const showItems = mapTraktTrendingToItems(
            traktShows.slice(0, 10),
            "show",
          );
          await enrichTraktItems(showItems);
          if (showItems.length > 0) {
            newRows.push({
              title: `Top 10 Shows · ${periodLabel()}`,
              items: showItems,
              variant: "poster",
            });
          }
        }
      }
    } catch {
      /* fallback below */
    }

    if (newRows.length === 0) {
      const trending = await tmdbService.getTrending(
        "all",
        period === "daily" ? "day" : "week",
      );
      newRows.push({
        title: `Top 10 · ${periodLabel()}`,
        items: mapTmdbResults(trending.results.slice(0, 10), "mixed"),
        variant: "poster",
      });
    }

    setRows(newRows);
  }, [contentFilter, period, periodLabel]);

  const loadWorthWait = useCallback(async () => {
    const newRows: RowData[] = [];

    if (traktService.isAuthenticated()) {
      try {
        if (contentFilter !== "shows") {
          const anticipated = await traktService.getAnticipated("movies");
          const items = mapTraktToItems(anticipated.slice(0, 20), "movie");
          await enrichTraktItems(items);
          if (items.length > 0) {
            newRows.push({
              title: "Most Anticipated Movies",
              items,
              variant: "poster",
            });
          }
        }
      } catch {
        /* ignore */
      }

      try {
        if (contentFilter !== "movies") {
          const anticipated = await traktService.getAnticipated("shows");
          const items = mapTraktToItems(anticipated.slice(0, 20), "show");
          await enrichTraktItems(items);
          if (items.length > 0) {
            newRows.push({
              title: "Most Anticipated Shows",
              items,
              variant: "poster",
            });
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Fallback to TMDB upcoming
    if (newRows.length === 0) {
      await loadComingSoon();
      return;
    }

    setRows(newRows);
  }, [contentFilter, loadComingSoon]);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "trending") await loadTrending();
      else if (activeTab === "top10") await loadTop10();
      else if (activeTab === "coming-soon") await loadComingSoon();
      else if (activeTab === "worth-wait") await loadWorthWait();
    } catch (err) {
      console.error("Error loading content:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadTrending, loadTop10, loadComingSoon, loadWorthWait]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const tabs: { id: TabType; label: string }[] = [
    { id: "trending", label: "Trending Now" },
    { id: "top10", label: "Top 10" },
    { id: "coming-soon", label: "Coming Soon" },
    { id: "worth-wait", label: "Worth the Wait" },
  ];

  const showPeriodFilter = activeTab === "trending" || activeTab === "top10";

  return (
    <FocusContext.Provider value={pageFocusKey}>
      <div ref={pageRef} className="tv-container pt-nav">
        <TopNav />

        <div className="newpopular-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content type filter */}
        <div className="newpopular-filters">
          <FilterBar
            options={contentOptions}
            activeId={contentFilter}
            onSelect={(id) => setContentFilter((id as ContentFilter) || "all")}
            allowDeselect={false}
          />
          {showPeriodFilter && (
            <FilterBar
              options={periodOptions}
              activeId={period}
              onSelect={(id) => setPeriod((id as PeriodFilter) || "weekly")}
              allowDeselect={false}
            />
          )}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          rows.map((row) => (
            <section key={row.title} className="tv-row-section">
              <h2 className="row-title">{row.title}</h2>
              <div className="tv-row">
                {row.items.map((item) => (
                  <MediaCard
                    key={item.ratingKey}
                    item={item}
                    variant={row.variant}
                    onClick={() => navigate(`/details/${item.ratingKey}`)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </FocusContext.Provider>
  );
}

function mapTmdbResults(
  results: TMDBMedia[],
  type: "movie" | "tv" | "mixed",
): PlexMediaItem[] {
  return results.map(
    (m) =>
      ({
        ratingKey: `tmdb-${type === "mixed" ? m.media_type || "movie" : type}-${m.id}`,
        key: `tmdb-${type === "mixed" ? m.media_type || "movie" : type}-${m.id}`,
        type:
          type === "mixed"
            ? (m.media_type as "movie" | "show") || "movie"
            : type === "tv"
              ? "show"
              : type,
        title: (m.title || m.name) as string,
        thumb: tmdbService.buildImageUrl(m.poster_path, "poster"),
        art: tmdbService.buildImageUrl(m.backdrop_path, "backdrop"),
        year: Number(
          ((m.release_date || m.first_air_date || "") as string).split("-")[0],
        ),
        summary: (m.overview as string) || "",
        duration: 0,
        guid: `tmdb://${m.id}`,
      }) as PlexMediaItem,
  );
}

/** Map Trakt trending items (which have a nested movie/show object) */
function mapTraktTrendingToItems(
  items: Array<TraktTrendingMovie | TraktTrendingShow>,
  type: "movie" | "show",
): PlexMediaItem[] {
  return items.map((t) => {
    const inner =
      type === "movie"
        ? (t as TraktTrendingMovie).movie
        : (t as TraktTrendingShow).show;
    const tmdbId = inner.ids?.tmdb;
    return {
      ratingKey: `trakt-top-${tmdbId || inner.ids?.trakt}`,
      key: `trakt-top-${tmdbId || inner.ids?.trakt}`,
      type: type === "movie" ? "movie" : "show",
      title: inner.title || "Unknown",
      thumb: "",
      year: inner.year,
      summary: "",
      duration: 0,
      guid: tmdbId ? `tmdb://${tmdbId}` : "",
    } as PlexMediaItem;
  });
}

/** Map flat Trakt items (popular/anticipated) */
function mapTraktToItems(
  items: Array<TraktMovie | TraktShow>,
  type: "movie" | "show",
): PlexMediaItem[] {
  return items.map((m) => {
    const tmdbId = m.ids?.tmdb;
    return {
      ratingKey: `trakt-${type}-${tmdbId || m.ids?.trakt}`,
      key: `trakt-${type}-${tmdbId || m.ids?.trakt}`,
      type: type === "movie" ? "movie" : "show",
      title: m.title || "Unknown",
      thumb: "",
      year: m.year,
      summary: "",
      duration: 0,
      guid: tmdbId ? `tmdb://${tmdbId}` : "",
    } as PlexMediaItem;
  });
}

/** Enrich Trakt items with TMDB poster/backdrop data */
async function enrichTraktItems(items: PlexMediaItem[]) {
  await Promise.all(
    items.map(async (item) => {
      const guid = item.guid || "";
      const tmdbId = guid.replace("tmdb://", "");
      if (!tmdbId) return;
      try {
        const details = await tmdbService
          .getDetails(Number(tmdbId), "movie")
          .then((d) => d || tmdbService.getDetails(Number(tmdbId), "tv"));
        if (details) {
          item.thumb = tmdbService.buildImageUrl(details.poster_path, "poster");
          item.art = tmdbService.buildImageUrl(
            details.backdrop_path,
            "backdrop",
          );
          item.summary = details.overview || "";
        }
      } catch {
        /* skip */
      }
    }),
  );
}
