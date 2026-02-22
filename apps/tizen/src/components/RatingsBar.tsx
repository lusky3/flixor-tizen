import type { RatingEntry } from '../services/ratings';

interface RatingsBarProps {
  ratings: RatingEntry[];
}

/** Source → CSS border-color class suffix */
const SOURCE_CLASS: Record<string, string> = {
  imdb: 'imdb',
  tomatoes: 'rt',
  audience: 'rt',
};

export function RatingsBar({ ratings }: RatingsBarProps) {
  if (ratings.length === 0) return null;

  return (
    <div className="mdblist-ratings" role="list" aria-label="Ratings">
      {ratings.map((r) => {
        const specific = SOURCE_CLASS[r.source];
        const cls = specific ? `rating-pill ${specific}` : 'rating-pill mdb';
        return (
          <div key={r.source} className={cls} role="listitem">
            <span className="rating-icon">{r.label}</span>
            <span>{r.displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}
