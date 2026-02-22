import { loadSettings } from "./settings";
import { cacheService } from "./cache";

const BASE_URL = "https://api.mdblist.com";

// Cache TTL (ms)
const TTL = {
  RATINGS: 5 * 60 * 1000, // 5 min
} as const;

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

/** Helper to build cache keys */
function key(...parts: (string | number)[]): string {
  return `mdblist:${parts.join(":")}`;
}

/**
 * MDBList uses a direct fetch because @flixor/core does not expose
 * an MDBList API wrapper. The MDBList rating endpoint requires a
 * user-provided API key and uses a POST body with IMDb IDs, which
 * is specific to the Tizen/web integration and not part of the
 * shared core service layer.
 */
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

  const cacheKey = key("ratings", mediaType, imdbId);
  const cached = cacheService.get<MDBListRatings>(cacheKey);
  if (cached !== null) return cached;

  const apiKey = settings.mdblistApiKey;
  const types: RatingType[] = [
    "trakt", "imdb", "tmdb", "letterboxd", "tomatoes", "audience", "metacritic",
  ];

  try {
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

    cacheService.set(cacheKey, ratings, TTL.RATINGS);
    return ratings;
  } catch {
    return null;
  }
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
