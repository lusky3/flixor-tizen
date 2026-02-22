import { flixor } from './flixor';
import { cacheService } from './cache';
import { saveSettings } from './settings';
import type {
  TraktDeviceCode,
  TraktTokens,
  TraktTrendingMovie,
  TraktTrendingShow,
  TraktMovie,
  TraktShow,
  TraktWatchlistItem,
  TraktHistoryItem,
} from '@flixor/core';

// Cache TTLs (ms)
const TTL = {
  WATCHLIST: 5 * 60 * 1000,    // 5 min
  TRENDING: 10 * 60 * 1000,    // 10 min
  POPULAR: 10 * 60 * 1000,     // 10 min
  ANTICIPATED: 10 * 60 * 1000, // 10 min
  HISTORY: 2 * 60 * 1000,      // 2 min
  RECOMMENDATIONS: 15 * 60 * 1000, // 15 min
} as const;

export type ContentType = 'movies' | 'shows';

/** Helper to build cache keys */
function key(...parts: (string | number)[]): string {
  return `trakt:${parts.join(':')}`;
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

/** Silently run an async operation, returning success/failure */
async function silent(fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Authentication helpers
// ============================================

/** Check if Trakt is currently authenticated */
export function isAuthenticated(): boolean {
  return flixor.trakt.isAuthenticated();
}

/**
 * Store Trakt token metadata in settings for persistence awareness.
 * The actual tokens are managed by @flixor/core's secure storage,
 * but we track auth state in settings for UI purposes.
 */
function markAuthenticated(tokens: TraktTokens): void {
  saveSettings({
    showTraktRows: true,
  });
  // Store token expiry info so the UI can show auth status
  try {
    localStorage.setItem(
      'flixor.tizen.trakt.auth',
      JSON.stringify({
        expiresAt: (tokens.created_at + tokens.expires_in) * 1000,
        authenticatedAt: Date.now(),
      }),
    );
  } catch {
    // Non-critical — ignore storage errors
  }
}

function markUnauthenticated(): void {
  try {
    localStorage.removeItem('flixor.tizen.trakt.auth');
  } catch {
    // Non-critical
  }
}

// ============================================
// Device Code Auth Flow
// ============================================

export async function getDeviceCode(): Promise<TraktDeviceCode | null> {
  try {
    return await flixor.trakt.generateDeviceCode();
  } catch {
    return null;
  }
}

export async function pollForToken(
  deviceCode: string,
): Promise<TraktTokens | null> {
  try {
    const tokens = await flixor.trakt.pollDeviceCode(deviceCode);
    if (tokens) {
      markAuthenticated(tokens);
    }
    return tokens;
  } catch {
    return null;
  }
}

// ============================================
// Scrobbling
// ============================================

export interface ScrobbleItem {
  type: 'movie' | 'episode';
  ids: { tmdb?: number; imdb?: string };
  /** Required for episodes */
  show?: { ids: { tmdb?: number; imdb?: string } };
  /** Required for episodes */
  episode?: { season: number; number: number };
}

export async function scrobbleStart(
  item: ScrobbleItem,
  progress: number = 0,
): Promise<boolean> {
  if (!isAuthenticated()) return false;
  return silent(async () => {
    if (item.type === 'movie') {
      await flixor.trakt.startScrobbleMovie({ ids: item.ids }, progress);
    } else if (item.show && item.episode) {
      await flixor.trakt.startScrobbleEpisode(
        { ids: item.show.ids },
        item.episode,
        progress,
      );
    }
  });
}

export async function scrobbleProgress(
  item: ScrobbleItem,
  progress: number,
): Promise<boolean> {
  if (!isAuthenticated()) return false;
  // Trakt uses "pause" endpoint for progress updates mid-playback
  return silent(async () => {
    if (item.type === 'movie') {
      await flixor.trakt.pauseScrobbleMovie({ ids: item.ids }, progress);
    } else if (item.show && item.episode) {
      await flixor.trakt.pauseScrobbleEpisode(
        { ids: item.show.ids },
        item.episode,
        progress,
      );
    }
  });
}

export async function scrobbleStop(
  item: ScrobbleItem,
  progress: number,
): Promise<boolean> {
  if (!isAuthenticated()) return false;
  return silent(async () => {
    if (item.type === 'movie') {
      await flixor.trakt.stopScrobbleMovie({ ids: item.ids }, progress);
    } else if (item.show && item.episode) {
      await flixor.trakt.stopScrobbleEpisode(
        { ids: item.show.ids },
        item.episode,
        progress,
      );
    }
  });
}

// ============================================
// Watchlist
// ============================================

export async function getWatchlist(
  type?: ContentType,
): Promise<TraktWatchlistItem[]> {
  if (!isAuthenticated()) return [];
  const k = key('watchlist', type ?? 'all');
  return cached(k, () => flixor.trakt.getWatchlist(type), TTL.WATCHLIST, []);
}

export interface WatchlistItem {
  type: 'movie' | 'show';
  ids: { tmdb?: number; imdb?: string };
}

export async function addToWatchlist(item: WatchlistItem): Promise<boolean> {
  if (!isAuthenticated()) return false;
  const ok = await silent(async () => {
    if (item.type === 'movie') {
      await flixor.trakt.addMovieToWatchlist({ ids: item.ids });
    } else {
      await flixor.trakt.addShowToWatchlist({ ids: item.ids });
    }
  });
  if (ok) {
    cacheService.invalidate(key('watchlist', 'all'));
    cacheService.invalidate(key('watchlist', item.type === 'movie' ? 'movies' : 'shows'));
  }
  return ok;
}

export async function removeFromWatchlist(item: WatchlistItem): Promise<boolean> {
  if (!isAuthenticated()) return false;
  const ok = await silent(async () => {
    if (item.type === 'movie') {
      await flixor.trakt.removeMovieFromWatchlist({ ids: item.ids });
    } else {
      await flixor.trakt.removeShowFromWatchlist({ ids: item.ids });
    }
  });
  if (ok) {
    cacheService.invalidate(key('watchlist', 'all'));
    cacheService.invalidate(key('watchlist', item.type === 'movie' ? 'movies' : 'shows'));
  }
  return ok;
}

// ============================================
// History
// ============================================

export async function getHistory(
  type?: 'movies' | 'shows' | 'episodes',
  page: number = 1,
  limit: number = 20,
): Promise<TraktHistoryItem[]> {
  if (!isAuthenticated()) return [];
  const k = key('history', type ?? 'all', page, limit);
  return cached(
    k,
    () => flixor.trakt.getHistory(type, page, limit),
    TTL.HISTORY,
    [],
  );
}

// ============================================
// Discovery: Trending
// ============================================

export async function getTrending(
  type: ContentType,
): Promise<TraktTrendingMovie[] | TraktTrendingShow[]> {
  const k = key('trending', type);
  if (type === 'movies') {
    return cached(k, () => flixor.trakt.getTrendingMovies(), TTL.TRENDING, []);
  }
  return cached(k, () => flixor.trakt.getTrendingShows(), TTL.TRENDING, []);
}

// ============================================
// Discovery: Popular
// ============================================

export async function getPopular(
  type: ContentType,
): Promise<(TraktMovie | TraktShow)[]> {
  const k = key('popular', type);
  return cached(
    k,
    () =>
      type === 'movies'
        ? flixor.trakt.getPopularMovies()
        : flixor.trakt.getPopularShows(),
    TTL.POPULAR,
    [],
  );
}

// ============================================
// Discovery: Anticipated (falls back to popular)
// ============================================

/**
 * Trakt "anticipated" is not available in @flixor/core,
 * so we fall back to popular content as the closest equivalent.
 * The design doc notes this fallback for the "Worth the Wait" tab.
 */
export async function getAnticipated(
  type: ContentType,
): Promise<(TraktMovie | TraktShow)[]> {
  const k = key('anticipated', type);
  // Fall back to popular since core doesn't expose anticipated endpoint
  return cached(
    k,
    () =>
      type === 'movies'
        ? flixor.trakt.getPopularMovies()
        : flixor.trakt.getPopularShows(),
    TTL.ANTICIPATED,
    [],
  );
}

// ============================================
// Discovery: Recommendations (requires auth)
// ============================================

export async function getRecommendations(
  type: ContentType,
): Promise<(TraktMovie | TraktShow)[]> {
  if (!isAuthenticated()) return [];
  const k = key('recommendations', type);
  return cached(
    k,
    () =>
      type === 'movies'
        ? flixor.trakt.getRecommendedMovies()
        : flixor.trakt.getRecommendedShows(),
    TTL.RECOMMENDATIONS,
    [],
  );
}

// ============================================
// Sign Out
// ============================================

export async function signOut(): Promise<void> {
  await silent(() => flixor.trakt.signOut());
  markUnauthenticated();
  // Clear all Trakt cache entries
  cacheService.clear();
}
