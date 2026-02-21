import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import { loadSettings } from "../services/settings";
import type { PlexMediaItem, TMDBMedia } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";

interface SearchResult {
  id: string;
  title: string;
  type: "movie" | "tv";
  image?: string;
  year?: string;
  available: boolean;
  plexItem?: PlexMediaItem;
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load trending on mount
  useEffect(() => {
    const loadTrending = async () => {
      try {
        const [movies, shows] = await Promise.all([
          flixor.tmdb.getTrendingMovies("week"),
          flixor.tmdb.getTrendingTV("week"),
        ]);
        const items: SearchResult[] = [];
        const movieList = movies.results.slice(0, 6);
        const showList = shows.results.slice(0, 6);
        for (let i = 0; i < Math.max(movieList.length, showList.length); i++) {
          if (movieList[i]) {
            const m = movieList[i] as any;
            items.push({
              id: `tmdb-movie-${m.id}`,
              title: m.title || m.name,
              type: "movie",
              image: flixor.tmdb.getBackdropUrl(m.backdrop_path, "w780"),
              year: (m.release_date || "").slice(0, 4),
              available: false,
            });
          }
          if (showList[i]) {
            const s = showList[i] as any;
            items.push({
              id: `tmdb-tv-${s.id}`,
              title: s.name || s.title,
              type: "tv",
              image: flixor.tmdb.getBackdropUrl(s.backdrop_path, "w780"),
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

      // Plex search
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

      // TMDB search (if not in discovery-disabled mode)
      const settings = loadSettings();
      if (!settings.discoveryDisabled && settings.includeTmdbInSearch !== false) {
        try {
          const tmdbRes = await flixor.tmdb.searchMulti(val);
          tmdbRes.results
            .filter(
              (r: any) => r.media_type === "movie" || r.media_type === "tv",
            )
            .slice(0, 15)
            .forEach((item: any) => {
              const title = item.title || item.name || "";
              const alreadyInPlex = searchResults.some(
                (r) => r.title.toLowerCase() === title.toLowerCase(),
              );
              if (!alreadyInPlex) {
                searchResults.push({
                  id: `tmdb-${item.media_type}-${item.id}`,
                  title,
                  type: item.media_type as "movie" | "tv",
                  image: flixor.tmdb.getPosterUrl(item.poster_path, "w500"),
                  year: (item.release_date || item.first_air_date || "").slice(0, 4),
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

  const handleResultClick = (result: SearchResult) => {
    if (result.plexItem) {
      navigate(`/details/${result.plexItem.ratingKey}`);
    } else {
      // For TMDB-only results, navigate to details with tmdb prefix
      navigate(`/details/${result.id}`);
    }
  };

  const showTrending = query.length < 2 && trending.length > 0;

  return (
    <div className="tv-container pt-nav">
      <TopNav />
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search movies and shows..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="search-results">
        {loading && <div className="loading">Searching...</div>}

        {showTrending && (
          <div className="trending-section">
            <h2 className="row-title" style={{ padding: "0 80px" }}>
              Recommended
            </h2>
            <div className="tv-grid" style={{ padding: "20px 80px" }}>
              {trending.map((item) => (
                <button
                  key={item.id}
                  className="trending-card"
                  onClick={() => handleResultClick(item)}
                >
                  {item.image && (
                    <img src={item.image} alt={item.title} className="trending-img" />
                  )}
                  <div className="trending-info">
                    <span className="trending-title">{item.title}</span>
                    <span className="trending-meta">
                      {item.year} · {item.type === "movie" ? "Movie" : "TV Show"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!showTrending && (
          <div className="tv-grid" style={{ padding: "20px 80px" }}>
            {results.map((result) => (
              <button
                key={result.id}
                className="search-result-card"
                onClick={() => handleResultClick(result)}
              >
                {result.image && (
                  <img src={result.image} alt={result.title} className="card-img" />
                )}
                <div className="search-result-info">
                  <span className="search-result-title">{result.title}</span>
                  <span className="search-result-meta">
                    {result.year}
                    {!result.available && " · TMDB"}
                  </span>
                </div>
                {result.available && (
                  <span className="availability-badge available">In Library</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
