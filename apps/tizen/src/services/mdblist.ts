import { loadSettings } from "./settings";

const BASE_URL = "https://api.mdblist.com";
const CACHE_TTL = 5 * 60 * 1000;

export interface MDBListRatings {
  trakt?: number;
  imdb?: number;
  tmdb?: number;
  letterboxd?: number;
  tomatoes?: number;
  audience?: number;
  metacritic?: number;
}

type RatingType =
  | "trakt"
  | "imdb"
  | "tmdb"
  | "letterboxd"
  | "tomatoes"
  | "audience"
  | "metacritic";

interface CacheEntry {
  ratings: MDBListRatings;
  timestamp: number;
}

const ratingsCache = new Map<string, CacheEntry>();

async function fetchRating(
  apiKey: string,
  imdbId: string,
  mediaType: "movie" | "show",
  ratingType: RatingType,
): Promise<number | undefined> {
  try {
    const formattedId = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
    const response = await fetch(
      `${BASE_URL}/rating/${mediaType}/${ratingType}?apikey=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [formattedId], provider: "imdb" }),
      },
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    const rating = data?.ratings?.[0]?.rating;
    return typeof rating === "number" ? rating : undefined;
  } catch {
    return undefined;
  }
}

export async function getMDBListRatings(
  imdbId: string,
  mediaType: "movie" | "show",
): Promise<MDBListRatings | null> {
  const settings = loadSettings();
  if (!settings.mdblistEnabled || !settings.mdblistApiKey) return null;

  const cacheKey = `${mediaType}:${imdbId}`;
  const cached = ratingsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.ratings;

  const apiKey = settings.mdblistApiKey;
  const types: RatingType[] = [
    "trakt", "imdb", "tmdb", "letterboxd", "tomatoes", "audience", "metacritic",
  ];

  const results = await Promise.all(
    types.map(async (type) => ({
      type,
      rating: await fetchRating(apiKey, imdbId, mediaType, type),
    })),
  );

  const ratings: MDBListRatings = {};
  for (const { type, rating } of results) {
    if (rating !== undefined) ratings[type] = rating;
  }

  ratingsCache.set(cacheKey, { ratings, timestamp: Date.now() });
  return ratings;
}

export function formatRating(
  rating: number | undefined,
  source: RatingType,
): string | null {
  if (rating === undefined) return null;
  if (source === "tomatoes" || source === "audience" || source === "metacritic")
    return `${Math.round(rating)}%`;
  return rating.toFixed(1);
}

export function getSourceName(source: string): string {
  const names: Record<string, string> = {
    trakt: "Trakt",
    imdb: "IMDb",
    tmdb: "TMDB",
    letterboxd: "Letterboxd",
    tomatoes: "RT Critics",
    audience: "RT Audience",
    metacritic: "Metacritic",
  };
  return names[source] || source;
}
