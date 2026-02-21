import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";

type MergedItem = PlexMediaItem & { _source?: string; _tmdbPoster?: string };

export function MyListPage() {
  const [items, setItems] = useState<MergedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadWatchlist = async () => {
      setLoading(true);
      try {
        const seen = new Set<string>();
        const merged: MergedItem[] = [];

        // Fetch Plex watchlist
        try {
          const plexItems = await flixor.plexTv.getWatchlist();
          for (const item of plexItems) {
            const guids = (item as any).Guid || [];
            const tmdbGuid = guids.find((g: any) => String(g.id).includes("tmdb://"));
            const tmdbId = tmdbGuid ? String(tmdbGuid.id).split("://")[1] : null;
            const key = tmdbId ? `tmdb:${tmdbId}` : `plex:${item.ratingKey}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push({ ...item, _source: "plex" });
            }
          }
        } catch { /* ignore plex error */ }

        // Fetch Trakt watchlist if authenticated
        if (flixor.trakt.isAuthenticated()) {
          try {
            const traktItems = await flixor.trakt.getWatchlist();
            for (const wlItem of traktItems) {
              const media = wlItem.movie || wlItem.show;
              if (!media) continue;
              const tmdbId = media.ids?.tmdb;
              const key = tmdbId ? `tmdb:${tmdbId}` : `trakt:${media.ids?.slug}`;
              if (seen.has(key)) continue;
              seen.add(key);

              // Build a PlexMediaItem-like object from Trakt data
              let poster = "";
              if (tmdbId) {
                try {
                  const details = wlItem.type === "movie"
                    ? await flixor.tmdb.getMovieDetails(tmdbId)
                    : await flixor.tmdb.getTVDetails(tmdbId);
                  if ((details as any)?.poster_path) {
                    poster = flixor.tmdb.getPosterUrl((details as any).poster_path, "w342");
                  }
                } catch { /* ignore */ }
              }

              merged.push({
                ratingKey: `trakt-${wlItem.type}-${media.ids?.slug || tmdbId}`,
                title: media.title || "Unknown",
                thumb: poster,
                art: "",
                type: wlItem.type === "movie" ? "movie" : "show",
                year: media.year,
                summary: (media as any).overview || "",
                duration: 0,
                _source: "trakt",
                _tmdbPoster: poster,
              } as MergedItem);
            }
          } catch { /* ignore trakt error */ }
        }

        setItems(merged);
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
        <div className="tv-grid" style={{ padding: "0 80px 100px" }}>
          {items.map((item) => (
            <MediaCard
              key={item.ratingKey}
              item={item}
              variant="poster"
              onClick={() => {
                if (item.ratingKey.startsWith("trakt-")) return;
                navigate(`/details/${item.ratingKey}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
