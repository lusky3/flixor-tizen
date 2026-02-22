import { flixor } from './flixor';
import { cacheService } from './cache';
import type { PlexMediaItem } from '@flixor/core';

// Cache TTLs (ms)
const TTL = {
  WATCHLIST: 5 * 60 * 1000, // 5 min
} as const;

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

export async function getWatchlist(): Promise<PlexMediaItem[]> {
  const k = key('watchlist');
  return cached(k, () => flixor.plexTv.getWatchlist(), TTL.WATCHLIST, []);
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
