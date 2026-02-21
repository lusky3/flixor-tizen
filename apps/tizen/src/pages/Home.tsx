import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import { loadSettings } from "../services/settings";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";
import type { RowData } from "../types";

export function Home() {
  const [heroItems, setHeroItems] = useState<PlexMediaItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroLogo, setHeroLogo] = useState<string | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(null);
  const navigate = useNavigate();
  const heroPlayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchContinueWatching = async (newRows: RowData[]) => {
      const settings = loadSettings();
      if (settings.showContinueWatchingRow === false) return [];
      try {
        const result = await flixor.plexServer.getContinueWatching();
        if (result.items.length > 0) {
          newRows.push({
            title: "Continue Watching",
            items: result.items,
            variant: "poster",
          });
          return result.items.slice(0, 5);
        }
      } catch (e) {
        console.error("Plex Continue Watching failed", e);
      }
      return [];
    };

    const fetchTrending = async (newRows: RowData[]) => {
      const settings = loadSettings();
      if (settings.showTrendingRows === false) return [];
      const candidates: PlexMediaItem[] = [];
      try {
        const trendingResult = await flixor.tmdb.getTrendingMovies("week");
        if (trendingResult.results.length > 0) {
          const trendingItems: PlexMediaItem[] = trendingResult.results
            .slice(0, 15)
            .map(
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
          newRows.push({ title: "Popular Movies", items: trendingItems, variant: "poster" });
          candidates.push(...trendingItems.slice(0, 5));
        }

        const trendingTV = await flixor.tmdb.getTrendingTV("week");
        if (trendingTV.results.length > 0) {
          const tvItems: PlexMediaItem[] = trendingTV.results.slice(0, 15).map(
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
          newRows.push({ title: "Trending Shows", items: tvItems, variant: "poster" });
          candidates.push(...tvItems.slice(0, 5));
        }
      } catch (e) {
        console.error("TMDB Trending failed", e);
      }
      return candidates;
    };

    const fetchTraktRows = async (newRows: RowData[]) => {
      const settings = loadSettings();
      if (settings.showTraktRows === false || !flixor.trakt.isAuthenticated()) return;

      try {
        // Trakt Watchlist
        const watchlist = await flixor.trakt.getWatchlist();
        if (watchlist.length > 0) {
          const wlItems: PlexMediaItem[] = watchlist.slice(0, 15).map((w: any) => {
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
          // Enrich with TMDB posters
          await enrichTraktItems(wlItems);
          if (wlItems.length > 0) {
            newRows.push({ title: "Trakt Watchlist", items: wlItems, variant: "poster" });
          }
        }
      } catch (e) {
        console.error("Trakt watchlist failed", e);
      }

      try {
        // Trakt Recommendations (movies)
        const recs = await flixor.trakt.getRecommendedMovies(1, 15);
        if (recs.length > 0) {
          const recItems: PlexMediaItem[] = recs.map((m: any) => ({
            ratingKey: `trakt-rec-${m.ids?.tmdb || m.ids?.trakt}`,
            title: m.title || "Unknown",
            thumb: "",
            year: m.year ? String(m.year) : "",
            summary: "",
            duration: 0,
            guid: m.ids?.tmdb ? `tmdb://${m.ids.tmdb}` : "",
          })) as any[];
          await enrichTraktItems(recItems);
          if (recItems.length > 0) {
            newRows.push({ title: "Recommended for You", items: recItems, variant: "poster" });
          }
        }
      } catch (e) {
        console.error("Trakt recommendations failed", e);
      }

      try {
        // Trakt Trending Movies
        const traktTrending = await flixor.trakt.getTrendingMovies(1, 15);
        if (traktTrending.length > 0) {
          const items: PlexMediaItem[] = traktTrending.map((t: any) => {
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
          if (items.length > 0) {
            newRows.push({ title: "Trending on Trakt", items, variant: "poster" });
          }
        }
      } catch (e) {
        console.error("Trakt trending failed", e);
      }
    };

    const enrichTraktItems = async (items: PlexMediaItem[]) => {
      await Promise.all(
        items.map(async (item: any) => {
          const guid = item.guid || "";
          const tmdbId = guid.replace("tmdb://", "");
          if (!tmdbId) return;
          try {
            const details = await flixor.tmdb.getMovieDetails(Number(tmdbId)).catch(() =>
              flixor.tmdb.getTVDetails(Number(tmdbId)),
            );
            if (details) {
              const d = details as any;
              item.thumb = flixor.tmdb.getPosterUrl(d.poster_path, "w500");
              item.art = flixor.tmdb.getBackdropUrl(d.backdrop_path, "original");
              item.summary = d.overview || "";
            }
          } catch { /* ignore */ }
        }),
      );
    };

    const loadContent = async () => {
      try {
        if (!flixor.isPlexAuthenticated) return;

        const newRows: RowData[] = [];
        const continueItems = await fetchContinueWatching(newRows);
        const trendingCandidates = await fetchTrending(newRows);

        const heroCandidates = [...continueItems, ...trendingCandidates];
        setHeroItems(heroCandidates);
        if (heroCandidates.length > 0) updateHeroMetadata(heroCandidates[0]);

        const libraries = await flixor.plexServer.getLibraries();
        const movieLib = libraries.find((l) => l.type === "movie");
        const showLib = libraries.find((l) => l.type === "show");

        if (movieLib) {
          const recentMovies = await flixor.plexServer.getRecentlyAdded(movieLib.key);
          if (recentMovies.length > 0) {
            newRows.push({ title: "Recently Added Movies", items: recentMovies.slice(0, 15), variant: "poster" });
          }
        }

        if (showLib) {
          const recentShows = await flixor.plexServer.getRecentlyAdded(showLib.key);
          if (recentShows.length > 0) {
            newRows.push({ title: "Recently Added Shows", items: recentShows.slice(0, 15), variant: "poster" });
          }
        }

        try {
          const collections = await flixor.plexServer.getAllCollections();
          if (collections.length > 0) {
            newRows.push({ title: "Collections", items: collections.slice(0, 15), variant: "poster" });
          }
        } catch (e) {
          console.error("Failed to load collections", e);
        }

        // Trakt rows
        await fetchTraktRows(newRows);

        // Genre-based rows from Plex libraries
        const genreRowDefs: { label: string; type: "movie" | "show"; genre: string }[] = [
          { label: "TV Shows - Children", type: "show", genre: "Children" },
          { label: "Movies - Documentary", type: "movie", genre: "Documentary" },
          { label: "Movies - Drama", type: "movie", genre: "Drama" },
          { label: "TV Shows - Reality", type: "show", genre: "Reality" },
          { label: "Movies - Animation", type: "movie", genre: "Animation" },
          { label: "Movies - History", type: "movie", genre: "History" },
        ];
        try {
          for (const gr of genreRowDefs) {
            const lib = libraries.find((l) => l.type === gr.type);
            if (!lib) continue;
            try {
              const genreList = await flixor.plexServer.getGenres(lib.key);
              const genreMatch = genreList.find(
                (g) => g.title.toLowerCase() === gr.genre.toLowerCase(),
              );
              if (!genreMatch) continue;
              const genreItems = await flixor.plexServer.getItemsByGenre(lib.key, genreMatch.key, { size: 12 });
              if (genreItems.length > 0) {
                newRows.push({ title: gr.label, items: genreItems.slice(0, 12), variant: "poster" });
              }
            } catch { /* skip genre */ }
          }
        } catch { /* skip all genre rows */ }

        setRows(newRows);
      } catch (err) {
        console.error("Failed to load content", err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [navigate]);

  const updateHeroMetadata = async (item: PlexMediaItem) => {
    const focused = document.activeElement;
    const isInHero = focused?.closest(".hero-section");
    const isNothingFocused = !focused || focused === document.body;

    if (isInHero || isNothingFocused) {
      setActiveBackdrop(flixor.plexServer.getImageUrl(item.art || item.thumb));
    }
    setHeroLogo(null);
    try {
      const guid = item.guid || "";
      const tmdbIdResult = await flixor.tmdb.findByImdbId(guid);
      const tid = tmdbIdResult.movie_results[0]?.id || tmdbIdResult.tv_results[0]?.id;
      if (tid) {
        const imgs = tmdbIdResult.movie_results[0]
          ? await flixor.tmdb.getMovieImages(tid)
          : await flixor.tmdb.getTVImages(tid);
        const logos = imgs.logos || [];
        const logo = logos.find((l: any) => l.iso_639_1 === "en") || logos[0];
        if (logo) setHeroLogo(flixor.tmdb.getImageUrl(logo.file_path as string, "w500"));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (heroItems.length > 1 && !loading) {
      const timer = globalThis.setInterval(() => {
        setHeroIndex((prev) => {
          const next = (prev + 1) % heroItems.length;
          updateHeroMetadata(heroItems[next]);
          return next;
        });
      }, 15000);
      return () => globalThis.clearInterval(timer);
    }
  }, [heroItems, loading]);

  const heroItem = heroItems[heroIndex];

  useEffect(() => {
    if (!loading && heroItems.length > 0 && heroPlayRef.current) {
      if (!document.activeElement || document.activeElement === document.body) {
        heroPlayRef.current.focus();
      }
    }
  }, [loading, heroItems.length]);

  if (loading) {
    return (
      <div className="tv-container" style={{ justifyContent: "center", alignItems: "center" }}>
        <h1 className="logo">FLIXOR</h1>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const handleFocus = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".hero-section")) {
      const container = document.querySelector(".tv-container");
      if (container) container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  };

  return (
    <div className="tv-container" onFocus={handleFocus}>
      <div
        className="backdrop-layer"
        style={{ backgroundImage: activeBackdrop ? `url(${activeBackdrop})` : "none" }}
      >
        <div className="backdrop-overlay-v" />
        <div className="backdrop-overlay-h" />
      </div>

      <TopNav />

      {heroItem && (
        <section className="hero-section">
          <div className="hero-content">
            {heroLogo ? (
              <img src={heroLogo} className="hero-logo" alt={heroItem.title} />
            ) : (
              <h1 className="hero-title">{heroItem.title}</h1>
            )}

            <div className="hero-meta">
              <span className="meta-badge">{heroItem.year}</span>
              <span className="meta-badge">{heroItem.contentRating || "PG-13"}</span>
              {heroItem.duration ? (
                <span className="meta-badge">{Math.round(heroItem.duration / 60000)}m</span>
              ) : null}
            </div>

            <p className="hero-overview">
              {heroItem.summary || "No overview available for this title."}
            </p>

            <div className="hero-actions">
              <button
                ref={heroPlayRef}
                className="btn-primary"
                onFocus={() => {
                  if (heroItem) setActiveBackdrop(flixor.plexServer.getImageUrl(heroItem.art || heroItem.thumb));
                }}
                onClick={() => {
                  const part = heroItem.Media?.[0]?.Part?.[0];
                  if (part) navigate(`/player/${heroItem.ratingKey}`);
                  else alert("No playable media found.");
                }}
              >
                <span className="icon">▶</span> Play
              </button>
              <button
                className="btn-secondary"
                onFocus={() => {
                  if (heroItem) setActiveBackdrop(flixor.plexServer.getImageUrl(heroItem.art || heroItem.thumb));
                }}
                onClick={() => navigate(`/details/${heroItem.ratingKey}`)}
              >
                More Info
              </button>
            </div>
          </div>
        </section>
      )}

      {rows.map((row) => (
        <section key={row.title} className="tv-row-section">
          <h2 className="row-title">{row.title}</h2>
          <div className="tv-row">
            {row.items.map((item) => (
              <MediaCard
                key={item.ratingKey}
                item={item}
                variant={row.variant}
                onFocus={() => {
                  const bg = flixor.plexServer.getImageUrl(item.art || item.thumb);
                  if (bg) setActiveBackdrop(bg);
                }}
                onClick={() => navigate(`/details/${item.ratingKey}`)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
