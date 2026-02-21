import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";

export function MyListPage() {
  const [items, setItems] = useState<PlexMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadWatchlist = async () => {
      setLoading(true);
      try {
        const watchlist = await flixor.plexTv.getWatchlist();
        setItems(watchlist);
      } catch (err) {
        console.error("Failed to load watchlist:", err);
      } finally {
        setLoading(false);
      }
    };
    loadWatchlist();
  }, []);

  return (
    <div className="tv-container pt-nav">
      <TopNav />
      <div className="mylist-header">
        <h1 className="library-title">My List</h1>
        <p className="mylist-subtitle">{items.length} titles</p>
      </div>

      {loading && <div className="loading">Loading Watchlist...</div>}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📺</div>
          <h2>Your list is empty</h2>
          <p>Add movies and shows to your watchlist to see them here.</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Browse Home
          </button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="tv-grid">
          {items.map((item) => (
            <MediaCard
              key={item.ratingKey}
              item={item}
              variant="poster"
              onClick={() => navigate(`/details/${item.ratingKey}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
