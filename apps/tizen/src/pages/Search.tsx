import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import { flixor } from "../services/flixor";
import { loadSettings } from "../services/settings";
import {
  getTrending as getTmdbTrending,
  search as tmdbSearch,
  buildImageUrl,
} from "../services/tmdb";
import * as traktService from "../services/trakt";
import type {
  TMDBMedia,
  TraktTrendingMovie,
  TraktTrendingShow,
} from "@flixor/core";
import type { SearchResult } from "../types";
import { TopNav } from "../components/TopNav";
import { SearchInput } from "../components/SearchInput";
import { SearchResults } from "../components/SearchResults";
import { PopularSearches } from "../components/PopularSearches";
import { TrendingSearches } from "../components/TrendingSearches";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [traktPopular, setTraktPopular] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    ref: pageRef,
    focusKey: pageFocusKey,
    focusSelf,
  } = useFocusable({
    focusKey: "search-page",
    trackChildren: true,
  });

  // Focus the page on mount so D-PAD navigation works
  useEffect(() => {
    const timer = setTimeout(() => focusSelf(), 100);
    return () => clearTimeout(timer);
  }, [focusSelf]);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const [movies, shows] = await Promise.all([
          getTmdbTrending("movie", "week"),
          getTmdbTrending("tv", "week"),
        ]);
        const items: SearchResult[] = [];
        const movieList = movies.results.slice(0, 6);
        const showList = shows.results.slice(0, 6);
        for (let i = 0; i < Math.max(movieList.length, showList.length); i++) {
          if (movieList[i]) {
            const m = movieList[i];
            items.push({
              id: `tmdb-movie-${m.id}`,
              title: m.title || m.name || "Unknown",
              type: "movie",
              image: buildImageUrl(m.backdrop_path, "backdrop"),
              year: (m.release_date || "").slice(0, 4),
              available: false,
            });
          }
          if (showList[i]) {
            const s = showList[i];
            items.push({
              id: `tmdb-tv-${s.id}`,
              title: s.name || s.title || "Unknown",
              type: "tv",
              image: buildImageUrl(s.backdrop_path, "backdrop"),
              year: (s.first_air_date || "").slice(0, 4),
              available: false,
            });
          }
        }
        setTrending(items.slice(0, 12));
      } catch (err) {
        console.error("Failed to load trending:", err);
      }
    };
    loadTrending();

    // Fetch Trakt popular when authenticated
    const loadTraktPopular = async () => {
      if (!traktService.isAuthenticated()) return;
      try {
        const [popularMovies, popularShows] = await Promise.all([
          traktService.getTrending("movies"),
          traktService.getTrending("shows"),
        ]);
        const items: SearchResult[] = [];
        for (const entry of (popularMovies as TraktTrendingMovie[]).slice(
          0,
          6,
        )) {
          const m = entry.movie;
          const tmdbId = m.ids?.tmdb;
          items.push({
            id: `trakt-pop-movie-${tmdbId || m.ids?.trakt}`,
            title: m.title || "Unknown",
            type: "movie",
            image: "",
            year: m.year ? String(m.year) : undefined,
            available: false,
          });
        }
        for (const entry of (popularShows as TraktTrendingShow[]).slice(0, 6)) {
          const s = entry.show;
          const tmdbId = s.ids?.tmdb;
          items.push({
            id: `trakt-pop-show-${tmdbId || s.ids?.trakt}`,
            title: s.title || "Unknown",
            type: "tv",
            image: "",
            year: s.year ? String(s.year) : undefined,
            available: false,
          });
        }
        setTraktPopular(items.slice(0, 12));
      } catch (err) {
        console.error("Failed to load Trakt popular:", err);
      }
    };
    loadTraktPopular();
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      const plexRes = await flixor.plexServer.search(val);
      plexRes
        .filter((item) => item.type === "movie" || item.type === "show")
        .slice(0, 15)
        .forEach((item) => {
          searchResults.push({
            id: item.ratingKey,
            title: item.title,
            type: item.type === "show" ? "tv" : "movie",
            image: flixor.plexServer.getImageUrl(item.thumb || item.art, 400),
            year: item.year ? String(item.year) : undefined,
            available: true,
            plexItem: item,
          });
        });

      const settings = loadSettings();
      if (
        !settings.discoveryDisabled &&
        settings.includeTmdbInSearch !== false
      ) {
        try {
          const tmdbRes = await tmdbSearch(val, "multi");
          tmdbRes.results
            .filter(
              (r: TMDBMedia) =>
                r.media_type === "movie" || r.media_type === "tv",
            )
            .slice(0, 15)
            .forEach((item: TMDBMedia) => {
              const title = item.title || item.name || "";
              const alreadyInPlex = searchResults.some(
                (r) => r.title.toLowerCase() === title.toLowerCase(),
              );
              if (!alreadyInPlex) {
                searchResults.push({
                  id: `tmdb-${item.media_type}-${item.id}`,
                  title,
                  type: item.media_type as "movie" | "tv",
                  image: buildImageUrl(item.poster_path, "poster"),
                  year: (item.release_date || item.first_air_date || "").slice(
                    0,
                    4,
                  ),
                  available: false,
                });
              }
            });
        } catch (err) {
          console.error("TMDB search failed:", err);
        }
      }

      setResults(searchResults);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    if (result.plexItem) {
      navigate(`/details/${result.plexItem.ratingKey}`);
    } else {
      navigate(`/details/${result.id}`);
    }
  };

  const showTrending = query.length < 2 && trending.length > 0;
  const showTraktPopular = query.length < 2 && traktPopular.length > 0;

  return (
    <FocusContext.Provider value={pageFocusKey}>
      <div ref={pageRef} className="tv-container pt-nav">
        <TopNav />
        <SearchInput value={query} onChange={handleSearch} />
        <div className="search-results">
          {query.length < 2 && (
            <>
              <PopularSearches onSearchTerm={(term) => handleSearch(term)} />
              <TrendingSearches
                onSelect={(item) =>
                  navigate(`/details/tmdb-${item.mediaType}-${item.id}`)
                }
              />
            </>
          )}
          {showTrending && (
            <SearchResults
              results={trending}
              onSelect={handleResultSelect}
              title="Trending"
              variant="trending"
            />
          )}
          {showTraktPopular && (
            <SearchResults
              results={traktPopular}
              onSelect={handleResultSelect}
              title="Popular on Trakt"
              variant="trending"
            />
          )}
          {query.length >= 2 && (
            <SearchResults
              results={results}
              onSelect={handleResultSelect}
              loading={loading}
            />
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
