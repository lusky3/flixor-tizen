import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";
import type { PlexMediaItem } from "@flixor/core";
import type { RowData } from "../types";

type TabType = "trending" | "top10" | "coming-soon" | "worth-wait";
type ContentFilter = "all" | "movies" | "shows";
type PeriodFilter = "daily" | "weekly" | "monthly";

export function NewPopularPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("weekly");
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [activeTab, contentFilter, period]);

  async function loadContent() {
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
  }

  async function loadTrending() {
    const newRows: RowData[] = [];
    const timeWindow = period === "daily" ? "day" : "week";

    if (contentFilter !== "shows") {
      const movies = await flixor.tmdb.getTrendingMovies(timeWindow as "day" | "week");
      if (movies.results.length > 0) {
        newRows.push({
          title: "Trending Movies",
          items: mapTmdbResults(movies.results.slice(0, 20), "movie"),
          variant: "poster",
        });
      }
    }

    if (contentFilter !== "movies") {
      const shows = await flixor.tmdb.getTrendingTV(timeWindow as "day" | "week");
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
          newRows.push({ title: "New on Plex", items: recent.slice(0, 15), variant: "poster" });
        }
      }
    } catch { /* ignore */ }

    setRows(newRows);
  }

  async function loadTop10() {
    const newRows: RowData[] = [];

    if (flixor.trakt.isAuthenticated()) {
      try {
        if (contentFilter !== "shows") {
          const traktMovies = await flixor.trakt.getTrendingMovies(1, 10);
          const movieItems = await enrichTraktList(traktMovies.map((t: Record<string, unknown>) => (t as Record<string, unknown>).movie || t));
          if (movieItems.length > 0) {
            newRows.push({ title: `Top 10 Movies · ${periodLabel()}`, items: movieItems, variant: "poster" });
          }
        }
        if (contentFilter !== "movies") {
          const traktShows = await flixor.trakt.getTrendingShows(1, 10);
          const showItems = await enrichTraktList(traktShows.map((t: Record<string, unknown>) => (t as Record<string, unknown>).show || t));
          if (showItems.length > 0) {
            newRows.push({ title: `Top 10 Shows · ${periodLabel()}`, items: showItems, variant: "poster" });
          }
        }
      } catch { /* fallback below */ }
    }

    if (newRows.length === 0) {
      const trending = await flixor.tmdb.getTrendingAll(period === "daily" ? "day" : "week");
      newRows.push({
        title: `Top 10 · ${periodLabel()}`,
        items: mapTmdbResults(trending.results.slice(0, 10), "mixed"),
        variant: "poster",
      });
    }

    setRows(newRows);
  }

  async function loadComingSoon() {
    const newRows: RowData[] = [];
    try {
      const upcoming = await flixor.tmdb.getUpcomingMovies();
      if (upcoming.results.length > 0) {
        newRows.push({
          title: "Coming Soon",
          items: upcoming.results.slice(0, 20).map((m: Record<string, unknown>) => ({
            ratingKey: `tmdb-movie-${m.id}`,
            title: (m.title as string) || (m.name as string),
            thumb: flixor.tmdb.getPosterUrl(m.poster_path as string, "w500"),
            art: flixor.tmdb.getBackdropUrl(m.backdrop_path as string, "original"),
            year: m.release_date ? new Date(m.release_date as string).toLocaleDateString() : "",
            summary: (m.overview as string) || "",
            duration: 0,
            guid: `tmdb://${m.id}`,
          })) as PlexMediaItem[],
          variant: "poster",
        });
      }
    } catch { /* ignore */ }
    setRows(newRows);
  }

  async function loadWorthWait() {
    const newRows: RowData[] = [];

    // Use Trakt popular as a proxy for "most anticipated" since core doesn't have getAnticipated
    if (flixor.trakt.isAuthenticated()) {
      try {
        const popular = await flixor.trakt.getPopularMovies(1, 20);
        const items = await enrichTraktList(popular);
        if (items.length > 0) {
          newRows.push({ title: "Most Anticipated Movies", items, variant: "poster" });
        }
      } catch { /* ignore */ }

      try {
        const popularShows = await flixor.trakt.getPopularShows(1, 20);
        const items = await enrichTraktList(popularShows);
        if (items.length > 0) {
          newRows.push({ title: "Most Anticipated Shows", items, variant: "poster" });
        }
      } catch { /* ignore */ }
    }

    // Fallback to TMDB upcoming
    if (newRows.length === 0) {
      await loadComingSoon();
      return;
    }

    setRows(newRows);
  }

  function periodLabel(): string {
    if (period === "daily") return "Today";
    if (period === "monthly") return "This Month";
    return "This Week";
  }

  function mapTmdbResults(results: Record<string, unknown>[], type: "movie" | "tv" | "mixed"): PlexMediaItem[] {
    return results.map((m) => ({
      ratingKey: `tmdb-${type === "mixed" ? ((m.media_type as string) || "movie") : type}-${m.id}`,
      title: (m.title as string) || (m.name as string),
      thumb: flixor.tmdb.getPosterUrl(m.poster_path as string, "w500"),
      art: flixor.tmdb.getBackdropUrl(m.backdrop_path as string, "original"),
      year: ((m.release_date as string) || (m.first_air_date as string) || "").split("-")[0],
      summary: (m.overview as string) || "",
      duration: 0,
      guid: `tmdb://${m.id}`,
    })) as PlexMediaItem[];
  }

  async function enrichTraktList(items: Record<string, unknown>[]): Promise<PlexMediaItem[]> {
    const enriched: PlexMediaItem[] = [];
    for (const m of items) {
      const ids = m.ids as Record<string, unknown> | undefined;
      const tmdbId = ids?.tmdb as number | undefined;
      if (!tmdbId) continue;
      try {
        const details = await flixor.tmdb.getMovieDetails(tmdbId).catch(() =>
          flixor.tmdb.getTVDetails(tmdbId),
        );
        const d = details as Record<string, unknown>;
        enriched.push({
          ratingKey: `trakt-top-${tmdbId}`,
          title: (m.title as string) || (d.title as string) || (d.name as string),
          thumb: flixor.tmdb.getPosterUrl(d.poster_path as string, "w500"),
          art: flixor.tmdb.getBackdropUrl(d.backdrop_path as string, "original"),
          year: m.year ? String(m.year) : "",
          summary: (d.overview as string) || "",
          duration: 0,
          guid: `tmdb://${tmdbId}`,
        } as PlexMediaItem);
      } catch { /* skip */ }
    }
    return enriched;
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "trending", label: "Trending Now" },
    { id: "top10", label: "Top 10" },
    { id: "coming-soon", label: "Coming Soon" },
    { id: "worth-wait", label: "Worth the Wait" },
  ];

  const contentOptions: { id: ContentFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "movies", label: "Movies" },
    { id: "shows", label: "TV Shows" },
  ];

  const periodOptions: { id: PeriodFilter; label: string }[] = [
    { id: "daily", label: "Today" },
    { id: "weekly", label: "This Week" },
    { id: "monthly", label: "This Month" },
  ];

  const showPeriodFilter = activeTab === "trending" || activeTab === "top10";

  return (
    <div className="tv-container pt-nav">
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

      {/* Filters row */}
      <div className="newpopular-filters">
        <div className="filter-group">
          {contentOptions.map((opt) => (
            <button
              key={opt.id}
              className={`filter-pill ${contentFilter === opt.id ? "active" : ""}`}
              onClick={() => setContentFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {showPeriodFilter && (
          <div className="filter-group">
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                className={`filter-pill ${period === opt.id ? "active" : ""}`}
                onClick={() => setPeriod(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
  );
}
