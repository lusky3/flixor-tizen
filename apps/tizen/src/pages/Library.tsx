import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";

const PAGE_SIZE = 50;

export function LibraryPage() {
  const { type } = useParams<{ type: string }>();
  const [allItems, setAllItems] = useState<PlexMediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PlexMediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [genres, setGenres] = useState<{ key: string; title: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const libKeyRef = useRef<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      setSearchQuery("");
      setSelectedGenre(null);
      setAllItems([]);
      setFilteredItems([]);
      setHasMore(true);
      try {
        const libs = await flixor.plexServer.getLibraries();
        const targetLib = libs.find((l) => l.type === type);
        if (targetLib) {
          libKeyRef.current = targetLib.key;
          const [content, genreList] = await Promise.all([
            flixor.plexServer.getLibraryItems(targetLib.key, {
              sort: "addedAt:desc",
              offset: 0,
              limit: PAGE_SIZE,
            }),
            flixor.plexServer.getGenres(targetLib.key),
          ]);
          setAllItems(content);
          setFilteredItems(content);
          setGenres(genreList);
          setHasMore(content.length >= PAGE_SIZE);
        }
      } catch (err) {
        console.error("Failed to load library:", err);
      } finally {
        setLoading(false);
      }
    };
    loadLibrary();
  }, [type]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !libKeyRef.current) return;
    setLoadingMore(true);
    try {
      const next = await flixor.plexServer.getLibraryItems(libKeyRef.current, {
        sort: "addedAt:desc",
        offset: allItems.length,
        limit: PAGE_SIZE,
      });
      if (next.length < PAGE_SIZE) setHasMore(false);
      setAllItems((prev) => [...prev, ...next]);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, allItems.length]);

  useEffect(() => {
    let result = allItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(q));
    }
    if (selectedGenre) {
      result = result.filter((item) => {
        const meta = item as any;
        return meta.Genre?.some((g: any) => g.tag === selectedGenre);
      });
    }
    setFilteredItems(result);
  }, [searchQuery, selectedGenre, allItems]);

  return (
    <div className="tv-container pt-nav">
      <TopNav />
      <h1 className="library-title" style={{ margin: "20px 80px 0" }}>
        {type === "movie" ? "Movies" : "TV Shows"}
      </h1>

      <div className="library-filters">
        <input
          type="text"
          className="search-input library-search"
          placeholder={`Search ${type === "movie" ? "movies" : "shows"}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        <div className="genre-pills">
          <button
            className={`genre-pill ${!selectedGenre ? "active" : ""}`}
            onClick={() => setSelectedGenre(null)}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g.key}
              className={`genre-pill ${selectedGenre === g.title ? "active" : ""}`}
              onClick={() => setSelectedGenre(selectedGenre === g.title ? null : g.title)}
            >
              {g.title}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="tv-grid" style={{ padding: "0 80px 100px" }}>
          {filteredItems.map((item) => (
            <MediaCard
              key={item.ratingKey}
              item={item}
              variant="poster"
              onClick={() => navigate(`/details/${item.ratingKey}`)}
            />
          ))}
          {filteredItems.length === 0 && !loading && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)", fontSize: "24px" }}>
              No results found
            </div>
          )}
          {hasMore && !searchQuery && !selectedGenre && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "30px" }}>
              <button className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
