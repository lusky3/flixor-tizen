import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
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
                  thumb: flixor.tmdb.getImageUrl(
                    m.poster_path as string,
                    "w500",
                  ),
                  art: flixor.tmdb.getImageUrl(
                    m.backdrop_path as string,
                    "original",
                  ),
                  year: ((m.release_date || "") as string).split("-")[0],
                  summary: m.overview as string,
                  duration: 0,
                  guid: `tmdb://${m.id}`,
                }) as any,
            );

          newRows.push({
            title: "Popular Movies",
            items: trendingItems,
            variant: "poster",
          });
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
                art: flixor.tmdb.getImageUrl(
                  m.backdrop_path as string,
                  "original",
                ),
                year: ((m.first_air_date || "") as string).split("-")[0],
                summary: m.overview as string,
                duration: 0,
                guid: `tmdb://${m.id}`,
              }) as any,
          );
          newRows.push({
            title: "Trending Shows",
            items: tvItems,
            variant: "poster",
          });
          candidates.push(...tvItems.slice(0, 5));
        }
      } catch (e) {
        console.error("TMDB Trending failed", e);
      }
      return candidates;
    };

    const loadContent = async () => {
      try {
        if (!flixor.isPlexAuthenticated) {
          return;
        }

        const newRows: RowData[] = [];
        const continueItems = await fetchContinueWatching(newRows);
        const trendingCandidates = await fetchTrending(newRows);

        const heroCandidates = [...continueItems, ...trendingCandidates];
        setHeroItems(heroCandidates);
        if (heroCandidates.length > 0) {
          updateHeroMetadata(heroCandidates[0]);
        }

        const libraries = await flixor.plexServer.getLibraries();
        const movieLib = libraries.find((l) => l.type === "movie");
        const showLib = libraries.find((l) => l.type === "show");

        if (movieLib) {
          const recentMovies = await flixor.plexServer.getRecentlyAdded(
            movieLib.key,
          );
          if (recentMovies.length > 0) {
            newRows.push({
              title: "Recently Added Movies",
              items: recentMovies.slice(0, 15),
              variant: "poster",
            });
          }
        }

        if (showLib) {
          const recentShows = await flixor.plexServer.getRecentlyAdded(
            showLib.key,
          );
          if (recentShows.length > 0) {
            newRows.push({
              title: "Recently Added Shows",
              items: recentShows.slice(0, 15),
              variant: "poster",
            });
          }
        }

        // Add Collections
        try {
          const collections = await flixor.plexServer.getAllCollections();
          if (collections.length > 0) {
            newRows.push({
              title: "Collections",
              items: collections.slice(0, 15),
              variant: "poster",
            });
          }
        } catch (e) {
          console.error("Failed to load collections", e);
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
      const tid =
        tmdbIdResult.movie_results[0]?.id || tmdbIdResult.tv_results[0]?.id;
      if (tid) {
        const imgs = tmdbIdResult.movie_results[0]
          ? await flixor.tmdb.getMovieImages(tid)
          : await flixor.tmdb.getTVImages(tid);
        const logos = imgs.logos || [];
        const logo = logos.find((l: any) => l.iso_639_1 === "en") || logos[0];
        if (logo)
          setHeroLogo(
            flixor.tmdb.getImageUrl(logo.file_path as string, "w500"),
          );
      }
    } catch {
      /* ignore */
    }
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
      <div
        className="tv-container"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <h1 className="logo">FLIXOR</h1>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const handleFocus = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;

    if (target.closest(".hero-section")) {
      const container = document.querySelector(".tv-container");
      if (container) {
        container.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  };

  return (
    <div className="tv-container" onFocus={handleFocus}>
      <div
        className="backdrop-layer"
        style={{
          backgroundImage: activeBackdrop ? `url(${activeBackdrop})` : "none",
        }}
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
              <span className="meta-badge">
                {heroItem.contentRating || "PG-13"}
              </span>
              {heroItem.duration ? (
                <span className="meta-badge">
                  {Math.round(heroItem.duration / 60000)}m
                </span>
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
                  if (heroItem) {
                    setActiveBackdrop(
                      flixor.plexServer.getImageUrl(
                        heroItem.art || heroItem.thumb,
                      ),
                    );
                  }
                }}
                onClick={() => {
                  const part = heroItem.Media?.[0]?.Part?.[0];
                  if (part) {
                    navigate(`/player/${heroItem.ratingKey}`);
                  } else {
                    alert("No playable media found.");
                  }
                }}
              >
                <span className="icon">▶</span> Play
              </button>
              <button
                className="btn-secondary"
                onFocus={() => {
                  if (heroItem) {
                    setActiveBackdrop(
                      flixor.plexServer.getImageUrl(
                        heroItem.art || heroItem.thumb,
                      ),
                    );
                  }
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
                  const bg = flixor.plexServer.getImageUrl(
                    item.art || item.thumb,
                  );
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
