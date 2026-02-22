import { useState, useEffect } from "react";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import { getTrending, buildImageUrl } from "../services/tmdb";

export interface PopularSearchesProps {
  onSearchTerm: (term: string) => void;
}

function Pill({
  label,
  onSelect,
}: {
  label: string;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });

  return (
    <button
      ref={ref}
      className={`popular-search-pill${focused ? " focused" : ""}`}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

export function PopularSearches({ onSearchTerm }: PopularSearchesProps) {
  const [terms, setTerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await getTrending("all", "day");
        if (cancelled) return;

        const titles = res.results
          .slice(0, 12)
          .map((item) => item.title || item.name || "")
          .filter(Boolean);

        // Deduplicate
        setTerms([...new Set(titles)]);
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
      <section className="popular-searches-section">
        <h3 className="popular-searches-title">Popular Searches</h3>
        <div className="popular-searches-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="popular-search-pill skeleton shimmer" />
          ))}
        </div>
      </section>
    );
  }

  if (terms.length === 0) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="popular-searches-section">
        <h3 className="popular-searches-title">Popular Searches</h3>
        <div className="popular-searches-grid">
          {terms.map((term) => (
            <Pill
              key={term}
              label={term}
              onSelect={() => onSearchTerm(term)}
            />
          ))}
        </div>
      </section>
    </FocusContext.Provider>
  );
}
