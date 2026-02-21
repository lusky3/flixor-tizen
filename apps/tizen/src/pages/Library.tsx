import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { MediaCard } from "../components/MediaCard";

export function LibraryPage() {
  const { type } = useParams<{ type: string }>();
  const [items, setItems] = useState<PlexMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      try {
        const libs = await flixor.plexServer.getLibraries();
        const targetLib = libs.find((l) => l.type === type);
        if (targetLib) {
          const content = await flixor.plexServer.getLibraryItems(
            targetLib.key,
          );
          setItems(content);
        }
      } catch (err) {
        console.error("Failed to load library:", err);
      } finally {
        setLoading(false);
      }
    };
    loadLibrary();
  }, [type]);

  return (
    <div className="tv-container pt-nav">
      <TopNav />
      <h1 className="library-title" style={{ margin: "20px 0" }}>
        {type === "movie" ? "Movies" : "TV Shows"}
      </h1>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
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
