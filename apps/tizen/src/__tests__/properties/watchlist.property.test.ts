import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

/**
 * Pure deduplication function that merges Plex and Trakt watchlist items,
 * removing duplicates by TMDB ID. First occurrence wins.
 */
interface WatchlistItem {
  title: string;
  tmdbId: number;
  source: 'plex' | 'trakt';
}

function deduplicateWatchlist(plexItems: WatchlistItem[], traktItems: WatchlistItem[]): WatchlistItem[] {
  const seen = new Set<number>();
  const result: WatchlistItem[] = [];
  for (const item of [...plexItems, ...traktItems]) {
    if (!seen.has(item.tmdbId)) {
      seen.add(item.tmdbId);
      result.push(item);
    }
  }
  return result;
}

// Feature: tizen-feature-parity, Property 18: Watchlist deduplication by TMDB ID
describe('Property 18: Watchlist deduplication by TMDB ID', () => {
  /**
   * Validates: Requirements 11.2
   *
   * For any set of Plex watchlist items and Trakt watchlist items where some
   * share the same TMDB ID, the merged result SHALL contain no two items with
   * the same TMDB ID, and the total count SHALL equal the number of unique
   * TMDB IDs across both sources.
   */

  const watchlistItemArb = (source: 'plex' | 'trakt') =>
    fc.record({
      title: fc.string({ minLength: 1, maxLength: 50 }),
      tmdbId: fc.integer({ min: 1, max: 100000 }),
      source: fc.constant(source),
    });

  it('merged result contains no duplicate TMDB IDs', () => {
    fc.assert(
      fc.property(
        fc.array(watchlistItemArb('plex'), { minLength: 0, maxLength: 20 }),
        fc.array(watchlistItemArb('trakt'), { minLength: 0, maxLength: 20 }),
        (plexItems, traktItems) => {
          const result = deduplicateWatchlist(plexItems, traktItems);
          const tmdbIds = result.map((item) => item.tmdbId);
          const uniqueIds = new Set(tmdbIds);

          expect(uniqueIds.size).toBe(tmdbIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('merged result count equals the number of unique TMDB IDs across both sources', () => {
    fc.assert(
      fc.property(
        fc.array(watchlistItemArb('plex'), { minLength: 0, maxLength: 20 }),
        fc.array(watchlistItemArb('trakt'), { minLength: 0, maxLength: 20 }),
        (plexItems, traktItems) => {
          const result = deduplicateWatchlist(plexItems, traktItems);
          const allIds = new Set([
            ...plexItems.map((i) => i.tmdbId),
            ...traktItems.map((i) => i.tmdbId),
          ]);

          expect(result.length).toBe(allIds.size);
        },
      ),
      { numRuns: 100 },
    );
  });
});
