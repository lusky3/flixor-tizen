import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import { loadSettings } from "../services/settings";
import * as tmdbService from "../services/tmdb";
import * as traktService from "../services/trakt";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { HeroCarousel } from "../components/HeroCarousel";
import { ContentRow } from "../components/ContentRow";
import { SkeletonRow } from "../components/SkeletonRow";
import { SmartImage } from "../components/SmartImage";
import { Billboard } from "../components/Billboard";
import { UltraBlurBackground } from "../components/UltraBlurBackground";
import { extractUltraBlurColors, type UltraBlurColors } from "../services/colorExtractor";
import type { RowData } from "../types";

export function Home() {
  const [heroItems, setHeroItems] = useState<PlexMediaItem[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(null);
  const [ultraBlurColors, setUltraBlurColors] = useState<UltraBlurColors | null>(null);
  const navigate = useNavigate();

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
        const trendingResult = await tmdbService.getTrending("movie", "week");
        if (trendingResult.results.length > 0) {
          const trendingItems: PlexMediaItem[] = trendingResult.results
            .slice(0, 15)
            .map(
              (m: any) =>
                ({
                  ratingKey: `tmdb-movie-${m.id}`,
                  title: (m.title || m.name) as string,
                  thumb: tmdbService.buildImageUrl(m.poster_path, "poster"),
                  art: tmdbService.buildImageUrl(m.backdrop_path, "backdrop"),
                  year: ((m.release_date || "") as string).split("-")[0],
                  summary: m.overview as string,
                  duration: 0,
                  guid: `tmdb://${m.id}`,
                }) as any,
            );
          newRows.push({ title: "Popular Movies", items: trendingItems, variant: "poster" });
          candidates.push(...trendingItems.slice(0, 5));
        }

        const trendingTV = await tmdbService.getTrending("tv", "week");
        if (trendingTV.results.length > 0) {
          const tvItems: PlexMediaItem[] = trendingTV.results.slice(0, 15).map(
            (m: any) =>
              ({
                ratingKey: `tmdb-tv-${m.id}`,
                title: (m.name || m.title) as string,
                thumb: tmdbService.buildImageUrl(m.poster_path, "poster"),
                art: tmdbService.buildImageUrl(m.backdrop_path, "backdrop"),
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
      if (settings.showTraktRows === false || !traktService.isAuthenticated()) return;

      try {
        // Trakt Watchlist
        const watchlist = await traktService.getWatchlist();
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
        const recs = await traktService.getRecommendations("movies");
        if (recs.length > 0) {
          const recItems: PlexMediaItem[] = (recs as any[]).slice(0, 15).map((m: any) => ({
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
        const traktTrending = await traktService.getTrending("movies");
        if (traktTrending.length > 0) {
          const items: PlexMediaItem[] = (traktTrending as any[]).slice(0, 15).map((t: any) => {
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
            const details = await tmdbService.getDetails(Number(tmdbId), "movie")
              .then((d) => d || tmdbService.getDetails(Number(tmdbId), "tv"));
            if (details) {
              const d = details as any;
              item.thumb = tmdbService.buildImageUrl(d.poster_path, "poster");
              item.art = tmdbService.buildImageUrl(d.backdrop_path, "backdrop");
              item.summary = d.overview || "";
            }
          } catch { /* ignore */ }
        }),
      );
    };

    const loadContent = async () => {
      try {
        if (!flixor.isPlexAuthenticated) return;
        const settings = loadSettings();

        const newRows: RowData[] = [];
        const continueItems = await fetchContinueWatching(newRows);
        const trendingCandidates = await fetchTrending(newRows);

        const heroCandidates = [...continueItems, ...trendingCandidates];
        setHeroItems(heroCandidates);

        const libraries = await flixor.plexServer.getLibraries();
        const movieLib = libraries.find((l) => l.type === "movie");
        const showLib = libraries.find((l) => l.type === "show");

        if (settings.showRecentlyAddedRows !== false) {
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
        }

        if (settings.showCollectionsRow !== false) {
          try {
            const collections = await flixor.plexServer.getAllCollections();
            if (collections.length > 0) {
              newRows.push({ title: "Collections", items: collections.slice(0, 15), variant: "poster" });
            }
          } catch (e) {
            console.error("Failed to load collections", e);
          }
        }

        // Trakt rows
        await fetchTraktRows(newRows);

        // Genre-based rows from Plex libraries
        if (settings.showGenreRows !== false) {
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
        }

        setRows(newRows);
      } catch (err) {
        console.error("Failed to load content", err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [navigate]);

  const handleItemClick = useCallback(
    (item: PlexMediaItem) => navigate(`/details/${item.ratingKey}`),
    [navigate],
  );

  const handleItemFocus = useCallback(
    (item: PlexMediaItem) => {
      const bg = flixor.plexServer.getImageUrl(item.art || item.thumb);
      if (bg) {
        setActiveBackdrop(bg);
        extractUltraBlurColors(bg).then((colors) => {
          if (colors) setUltraBlurColors(colors);
        });
      }
    },
    [],
  );

  const handleFocus = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".hero-section")) {
      const container = document.querySelector(".tv-container");
      if (container) container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  };

  if (loading) {
    return (
      <div className="tv-container">
        <TopNav />
        <div className="hero-section">
          <div className="skeleton-hero shimmer" style={{ height: 400 }} />
        </div>
        <SkeletonRow count={6} variant="poster" />
        <SkeletonRow count={6} variant="poster" />
        <SkeletonRow count={6} variant="poster" />
      </div>
    );
  }

  /** Map row titles to seeAllLink paths where applicable */
  const getSeeAllLink = (title: string): string | undefined => {
    const linkMap: Record<string, string> = {
      "Popular Movies": "/browse/trending-movies",
      "Trending Shows": "/browse/trending-shows",
      "Recently Added Movies": "/browse/recently-added-movies",
      "Recently Added Shows": "/browse/recently-added-shows",
      "Collections": "/browse/collections",
      "Trakt Watchlist": "/browse/trakt-watchlist",
      "Recommended for You": "/browse/trakt-recommended",
      "Trending on Trakt": "/browse/trakt-trending",
    };
    return linkMap[title];
  };

  return (
    <div className="tv-container" onFocus={handleFocus}>
      {activeBackdrop ? (
        <SmartImage
          src={activeBackdrop}
          alt=""
          className="backdrop-layer-img"
          kind="backdrop"
        />
      ) : (
        <div className="backdrop-layer" />
      )}
      <div className="backdrop-overlay-v" />
      <div className="backdrop-overlay-h" />

      {activeBackdrop && <UltraBlurBackground src={activeBackdrop} colors={ultraBlurColors} />}

      <TopNav />

      <HeroCarousel items={heroItems} onBackdropChange={setActiveBackdrop} />

      {heroItems.length > 0 && (() => {
        const featured = heroItems[0];
        const backdropUrl = featured.art?.startsWith("http")
          ? featured.art
          : flixor.plexServer.getImageUrl(featured.art || featured.thumb);
        return (
          <Billboard
            title={featured.title}
            backdropUrl={backdropUrl || undefined}
            overview={featured.summary}
            contentRating={featured.contentRating}
            onPlay={() => navigate(`/details/${featured.ratingKey}`)}
          />
        );
      })()}

      {rows.map((row) => (
        <ContentRow
          key={row.title}
          title={row.title}
          items={row.items}
          variant={row.variant}
          seeAllLink={getSeeAllLink(row.title)}
          onItemClick={handleItemClick}
          onItemFocus={handleItemFocus}
        />
      ))}
    </div>
  );
}
