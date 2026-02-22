import { flixor } from './flixor';
import { cacheService } from './cache';
import type {
  TMDBMedia,
  TMDBMovieDetails,
  TMDBTVDetails,
  TMDBCredits,
  TMDBVideosResponse,
  TMDBImages,
  TMDBResultsResponse,
  TMDBPerson,
  TMDBPersonCredits,
} from '@flixor/core';

// Cache TTLs (ms)
const TTL = {
  TRENDING: 5 * 60 * 1000,   // 5 min
  DETAILS: 15 * 60 * 1000,   // 15 min
  SEARCH: 2 * 60 * 1000,     // 2 min
  PERSON: 30 * 60 * 1000,    // 30 min
  IMAGES: 60 * 60 * 1000,    // 1 hour
} as const;

// TMDB image base URL
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type MediaType = 'movie' | 'tv';
export type TimeWindow = 'day' | 'week';

/**
 * Build a TMDB image URL optimized for TV displays.
 * Posters use w500, backdrops use w1280, profiles use w185.
 */
export function buildImageUrl(
  path: string | null | undefined,
  kind: 'poster' | 'backdrop' | 'profile' | 'logo' = 'poster',
): string {
  if (!path) return '';
  const sizeMap = {
    poster: 'w500',
    backdrop: 'w1280',
    profile: 'w185',
    logo: 'w500',
  } as const;
  return `${TMDB_IMAGE_BASE}/${sizeMap[kind]}${path}`;
}

/** Helper to build cache keys */
function key(...parts: (string | number)[]): string {
  return `tmdb:${parts.join(':')}`;
}

/** Wrap an async call with caching and error handling */
async function cached<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number,
  fallback: T,
): Promise<T> {
  const hit = cacheService.get<T>(cacheKey);
  if (hit !== null) return hit;

  try {
    const data = await fetcher();
    cacheService.set(cacheKey, data, ttl);
    return data;
  } catch {
    return fallback;
  }
}

// ============================================
// Trending
// ============================================

export async function getTrending(
  type: MediaType | 'all' = 'all',
  timeWindow: TimeWindow = 'week',
): Promise<TMDBResultsResponse<TMDBMedia>> {
  const empty: TMDBResultsResponse<TMDBMedia> = { results: [] };
  const k = key('trending', type, timeWindow);

  return cached(k, () => {
    const tmdb = flixor.tmdb;
    if (type === 'movie') return tmdb.getTrendingMovies(timeWindow);
    if (type === 'tv') return tmdb.getTrendingTV(timeWindow);
    return tmdb.getTrendingAll(timeWindow);
  }, TTL.TRENDING, empty);
}

// ============================================
// Details
// ============================================

export async function getDetails(
  id: number,
  type: MediaType,
): Promise<TMDBMovieDetails | TMDBTVDetails | null> {
  const k = key('details', type, id);

  return cached(k, () => {
    const tmdb = flixor.tmdb;
    return type === 'movie' ? tmdb.getMovieDetails(id) : tmdb.getTVDetails(id);
  }, TTL.DETAILS, null);
}

// ============================================
// Credits
// ============================================

export async function getCredits(
  id: number,
  type: MediaType,
): Promise<TMDBCredits | null> {
  const k = key('credits', type, id);

  return cached(k, () => {
    const tmdb = flixor.tmdb;
    return type === 'movie' ? tmdb.getMovieCredits(id) : tmdb.getTVCredits(id);
  }, TTL.DETAILS, null);
}

// ============================================
// Search
// ============================================

export async function search(
  query: string,
  type: MediaType | 'multi' = 'multi',
): Promise<TMDBResultsResponse<TMDBMedia>> {
  const empty: TMDBResultsResponse<TMDBMedia> = { results: [] };
  if (!query.trim()) return empty;

  const k = key('search', type, query);

  return cached(k, () => {
    const tmdb = flixor.tmdb;
    if (type === 'movie') return tmdb.searchMovies(query);
    if (type === 'tv') return tmdb.searchTV(query);
    return tmdb.searchMulti(query);
  }, TTL.SEARCH, empty);
}

// ============================================
// Recommendations
// ============================================

export async function getRecommendations(
  id: number,
  type: MediaType,
): Promise<TMDBResultsResponse<TMDBMedia>> {
  const empty: TMDBResultsResponse<TMDBMedia> = { results: [] };
  const k = key('recommendations', type, id);

  return cached(k, () => {
    const tmdb = flixor.tmdb;
    return type === 'movie'
      ? tmdb.getMovieRecommendations(id)
      : tmdb.getTVRecommendations(id);
  }, TTL.TRENDING, empty);
}

// ============================================
// Videos
// ============================================

export async function getVideos(
  id: number,
  type: MediaType,
): Promise<TMDBVideosResponse> {
  const empty: TMDBVideosResponse = { results: [] };
  const k = key('videos', type, id);

  return cached(k, () => {
    const tmdb = flixor.tmdb;
    return type === 'movie' ? tmdb.getMovieVideos(id) : tmdb.getTVVideos(id);
  }, TTL.DETAILS, empty);
}

// ============================================
// Images
// ============================================

export async function getImages(
  id: number,
  type: MediaType,
): Promise<TMDBImages> {
  const empty: TMDBImages = { backdrops: [], posters: [], logos: [] };
  const k = key('images', type, id);

  return cached(k, () => {
    const tmdb = flixor.tmdb;
    return type === 'movie' ? tmdb.getMovieImages(id) : tmdb.getTVImages(id);
  }, TTL.IMAGES, empty);
}

// ============================================
// Upcoming
// ============================================

export async function getUpcoming(): Promise<TMDBResultsResponse<TMDBMedia>> {
  const empty: TMDBResultsResponse<TMDBMedia> = { results: [] };
  const k = key('upcoming');

  return cached(k, () => flixor.tmdb.getUpcomingMovies(), TTL.TRENDING, empty);
}

// ============================================
// Person
// ============================================

export async function getPersonDetails(id: number): Promise<TMDBPerson | null> {
  const k = key('person', id);
  return cached(k, () => flixor.tmdb.getPersonDetails(id), TTL.PERSON, null);
}

export async function getPersonCredits(id: number): Promise<TMDBPersonCredits | null> {
  const k = key('person-credits', id);
  return cached(k, () => flixor.tmdb.getPersonCredits(id), TTL.PERSON, null);
}
