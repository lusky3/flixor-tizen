/**
 * MoodTags — Deterministic genre-to-mood pill badges.
 *
 * Validates: Requirements 8.1–8.4 · Design §8
 */

export const GENRE_MOOD_MAP: Record<string, string> = {
  "Action": "Adrenaline Rush",
  "Adventure": "Exciting",
  "Animation": "Whimsical",
  "Comedy": "Feel Good",
  "Crime": "Gritty",
  "Documentary": "Thought-Provoking",
  "Drama": "Emotional",
  "Family": "Heartwarming",
  "Fantasy": "Enchanting",
  "History": "Epic",
  "Horror": "Spine-Chilling",
  "Music": "Rhythmic",
  "Mystery": "Suspenseful",
  "Romance": "Romantic",
  "Science Fiction": "Mind-Bending",
  "Sci-Fi": "Mind-Bending",
  "TV Movie": "Casual",
  "Thriller": "Edge of Seat",
  "War": "Intense",
  "Western": "Rugged",
};

/** Case-insensitive lookup key for GENRE_MOOD_MAP */
const LOWER_MAP = new Map<string, string>(
  Object.entries(GENRE_MOOD_MAP).map(([k, v]) => [k.toLowerCase(), v]),
);

/**
 * Pure helper: map genres → unique moods, max 4.
 *
 * 1. Map each genre to its mood (case-insensitive lookup)
 * 2. Deduplicate
 * 3. Limit to 4
 */
export function deriveMoods(genres: string[]): string[] {
  const seen = new Set<string>();
  const moods: string[] = [];

  for (const genre of genres) {
    const mood = LOWER_MAP.get(genre.toLowerCase());
    if (mood && !seen.has(mood)) {
      seen.add(mood);
      moods.push(mood);
      if (moods.length >= 4) break;
    }
  }

  return moods;
}

export interface MoodTagsProps {
  genres: string[];
}

export function MoodTags({ genres }: MoodTagsProps) {
  const moods = deriveMoods(genres);

  if (moods.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {moods.map((mood) => (
        <span
          key={mood}
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.85)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {mood}
        </span>
      ))}
    </div>
  );
}
