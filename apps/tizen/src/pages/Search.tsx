import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlexMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await flixor.plexServer.search(val);
      setResults(
        res.filter((item) => item.type === "movie" || item.type === "show"),
      );
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="tv-grid">
          {results.map((item) => (
            <MediaCard
              key={item.ratingKey}
              item={item}
              variant="poster"
              onClick={() => navigate(`/details/${item.ratingKey}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
