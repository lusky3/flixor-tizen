import { useState, useEffect } from "react";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import { getTrending, buildImageUrl } from "../services/tmdb";
import { SmartImage } from "./SmartImage";
import type { TMDBMedia } from "@flixor/core";

export interface TrendingSearchesProps {
  onSelect: (item: { id: number; mediaType: string; title: string }) => void;
}

function TrendingCard({
  item,
  onSelect,
}: {
  item: TMDBMedia;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  const title = item.title || item.name || "";

  return (
    <button
      ref={ref}
      className={`trending-card${focused ? " focused" : ""}`}
      onClick={onSelect}
    >
      <SmartImage
        src={buildImageUrl(item.backdrop_path, "backdrop")}
        alt={title}
        className="trending-card__img"
      />
      <span className="trending-card__title">{title}</span>
    </button>
  );
}

export function TrendingSearches({ onSelect }: TrendingSearchesProps) {
  const [items, setItems] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await getTrending("all", "day");
        if (cancelled) return;

        setItems(
          res.results
            .filter((i) => i.backdrop_path)
            .slice(0, 10),
        );
      } catch {
        // Hide on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="trending-searches-section">
        <h3 className="trending-searches-title">Trending</h3>
        <div className="trending-searches-row">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="trending-card skeleton shimmer" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="trending-searches-section">
        <h3 className="trending-searches-title">Trending</h3>
        <div className="trending-searches-row">
          {items.map((item) => (
            <TrendingCard
              key={item.id}
              item={item}
              onSelect={() =>
                onSelect({
                  id: item.id,
                  mediaType: item.media_type || "movie",
                  title: item.title || item.name || "",
                })
              }
            />
          ))}
        </div>
      </section>
    </FocusContext.Provider>
  );
}
