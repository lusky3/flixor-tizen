import { flixor } from './flixor';
import { cacheService } from './cache';
import type { PlexMediaItem, PlexHomeUser } from '@flixor/core';

// Cache TTLs (ms)
const TTL = {
  WATCHLIST: 5 * 60 * 1000, // 5 min
  HOME_USERS: 10 * 60 * 1000, // 10 min
} as const;

/** A watchlist item enriched with an extracted TMDB ID */
export interface WatchlistItem extends PlexMediaItem {
  /** TMDB numeric ID extracted from the Guid array, or undefined if not found */
  tmdbId?: number;
  /** Derived media type normalised to 'movie' | 'tv' */
  mediaType: 'movie' | 'tv';
}

/**
 * Extract a TMDB numeric ID from a PlexMediaItem's Guid array.
 * Handles both `tmdb://` and legacy `themoviedb://` prefixes.
 */
export function extractTmdbId(item: PlexMediaItem): number | undefined {
  const guids = item.Guid;
  if (!guids || guids.length === 0) return undefined;

  for (const g of guids) {
    const id = String(g.id || '');
    if (id.startsWith('tmdb://') || id.startsWith('themoviedb://')) {
      const parsed = Number(id.split('://')[1]);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

/** Helper to build cache keys */
function key(...parts: (string | number)[]): string {
  return `plextv:${parts.join(':')}`;
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
// Watchlist
// ============================================

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const k = key('watchlist');
  return cached(
    k,
    async () => {
      const items = await flixor.plexTv.getWatchlist();
      return items.map((item): WatchlistItem => ({
        ...item,
        tmdbId: extractTmdbId(item),
        mediaType: item.type === 'movie' ? 'movie' : 'tv',
      }));
    },
    TTL.WATCHLIST,
    [],
  );
}

export async function addToWatchlist(ratingKey: string): Promise<boolean> {
  const ok = await silent(() => flixor.plexTv.addToWatchlist(ratingKey));
  if (ok) {
    cacheService.invalidate(key('watchlist'));
  }
  return ok;
}

export async function removeFromWatchlist(ratingKey: string): Promise<boolean> {
  const ok = await silent(() => flixor.plexTv.removeFromWatchlist(ratingKey));
  if (ok) {
    cacheService.invalidate(key('watchlist'));
  }
  return ok;
}


// ============================================
// Home Users / Profile Switching
// ============================================

/** Re-export for convenience */
export type { PlexHomeUser };

/**
 * Fetch the list of Plex Home users (profiles) with avatar URLs.
 * Results are cached for 10 minutes.
 */
export async function getHomeUsers(): Promise<PlexHomeUser[]> {
  const k = key('home-users');
  return cached(
    k,
    () => flixor.getHomeUsers(),
    TTL.HOME_USERS,
    [],
  );
}

/**
 * Switch to a different Plex Home user profile.
 * Re-initializes the server connection with the new user's token.
 * Invalidates all Plex-related caches since library access may differ.
 *
 * @param userId - The numeric ID of the user to switch to
 * @param pin    - Optional PIN if the profile is protected
 * @returns `true` on success, `false` on failure
 */
export async function switchUser(userId: number, pin?: string): Promise<boolean> {
  try {
    const users = await getHomeUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return false;

    await flixor.switchToProfile(user, pin);

    // Invalidate all plex-related caches — library content differs per profile
    cacheService.invalidate(key('watchlist'));
    cacheService.invalidate(key('home-users'));

    return true;
  } catch {
    return false;
  }
}
