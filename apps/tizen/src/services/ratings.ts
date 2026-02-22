import { cacheService } from './cache';
import { getMDBListRatings, formatRating, getSourceName } from './mdblist';
import { loadSettings, type TizenSettings } from './settings';

// 1-hour TTL — ratings change infrequently
const RATINGS_TTL = 60 * 60 * 1000;

export type MediaType = 'movie' | 'show';

export interface RatingEntry {
  source: string;
  label: string;
  score: number;
  displayValue: string;
}

export interface RatingsResult {
  ratings: RatingEntry[];
  tmdbId: number;
  mediaType: MediaType;
}

/** Per-source visibility setting keys on TizenSettings */
const SOURCE_VISIBILITY_MAP: Record<string, keyof TizenSettings> = {
  imdb: 'showImdb',
  tomatoes: 'showRt',
  audience: 'showRt',
  letterboxd: 'showLetterboxd',
  metacritic: 'showMetacritic',
  tmdb: 'showTmdbRating',
  trakt: 'showTraktRating',
};

/** Helper to build cache keys */
function key(...parts: (string | number)[]): string {
  return `ratings:${parts.join(':')}`;
}

/**
 * Check if a specific rating source is visible based on settings.
 * If the per-source setting key doesn't exist yet, default to visible.
 */
function isSourceVisible(source: string, settings: TizenSettings): boolean {
  const settingKey = SOURCE_VISIBILITY_MAP[source];
  if (!settingKey) return true;

  const value = (settings as Record<string, unknown>)[settingKey];
  // If the setting hasn't been defined yet, default to true (visible)
  if (value === undefined) return true;
  return Boolean(value);
}

/**
 * Aggregate ratings from MDBList for a given TMDB ID.
 * Returns normalized RatingsResult with per-source scores and display labels.
 * Respects per-source visibility settings and caches results for 1 hour.
 */
export async function getRatings(
  tmdbId: number,
  mediaType: MediaType,
  imdbId?: string,
): Promise<RatingsResult> {
  const empty: RatingsResult = { ratings: [], tmdbId, mediaType };
  const settings = loadSettings();

  // MDBList must be enabled to fetch ratings
  if (!settings.mdblistEnabled || !settings.mdblistApiKey) return empty;

  // If no IMDb ID provided, we can't query MDBList
  if (!imdbId) return empty;

  const cacheKey = key(mediaType, tmdbId);
  const cached = cacheService.get<RatingsResult>(cacheKey);
  if (cached !== null) {
    // Re-filter by current visibility settings (user may have changed them)
    return {
      ...cached,
      ratings: cached.ratings.filter((r) => isSourceVisible(r.source, settings)),
    };
  }

  try {
    const mdbRatings = await getMDBListRatings(imdbId, mediaType);
    if (!mdbRatings) return empty;

    const allRatings: RatingEntry[] = [];

    const sources = [
      'imdb',
      'tomatoes',
      'audience',
      'letterboxd',
      'metacritic',
      'tmdb',
      'trakt',
    ] as const;

    for (const source of sources) {
      const score = mdbRatings[source];
      if (score === undefined) continue;

      const displayValue = formatRating(score, source);
      if (!displayValue) continue;

      allRatings.push({
        source,
        label: getSourceName(source),
        score,
        displayValue,
      });
    }

    const result: RatingsResult = { ratings: allRatings, tmdbId, mediaType };

    // Cache the full (unfiltered) result
    cacheService.set(cacheKey, result, RATINGS_TTL);

    // Return filtered by current visibility settings
    return {
      ...result,
      ratings: allRatings.filter((r) => isSourceVisible(r.source, settings)),
    };
  } catch {
    return empty;
  }
}

/**
 * Invalidate cached ratings for a specific item.
 */
export function invalidateRatings(
  tmdbId: number,
  mediaType: MediaType,
): void {
  cacheService.invalidate(key(mediaType, tmdbId));
}
