import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlexMediaItem } from '@flixor/core';

/**
 * Integration-level unit tests for Plex.tv watchlist feature.
 *
 * Tests the interaction between getWatchlist(), Home page row building,
 * Browse page source fetching, and the showWatchlistRow setting toggle.
 */

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('../../services/flixor', () => ({
  flixor: {
    plexTv: {
      getWatchlist: vi.fn(),
      addToWatchlist: vi.fn(),
      removeFromWatchlist: vi.fn(),
    },
  },
}));

vi.mock('../../services/cache', () => ({
  cacheService: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/settings', () => ({
  loadSettings: vi.fn(),
  DEFAULT_SETTINGS: {
    showWatchlistRow: true,
  },
}));

import { getWatchlist } from '../../services/plextv';
import { flixor } from '../../services/flixor';
import { loadSettings } from '../../services/settings';
import { cacheService } from '../../services/cache';

const mockGetWatchlist = flixor.plexTv.getWatchlist as ReturnType<typeof vi.fn>;
const mockLoadSettings = loadSettings as ReturnType<typeof vi.fn>;
const mockCacheGet = cacheService.get as ReturnType<typeof vi.fn>;

interface RowData {
  title: string;
  items: PlexMediaItem[];
  variant?: 'landscape' | 'poster';
}

function makePlexItem(overrides: Partial<PlexMediaItem> = {}): PlexMediaItem {
  return {
    ratingKey: '1',
    key: '/library/metadata/1',
    type: 'movie',
    title: 'Test Movie',
    ...overrides,
  };
}

/**
 * Replicates the fetchWatchlist logic from Home.tsx:
 * - Checks showWatchlistRow setting
 * - Calls getWatchlist()
 * - Pushes a "Watchlist" row only if items exist
 */
async function fetchWatchlistForHome(rows: RowData[]): Promise<void> {
  const settings = loadSettings();
  if (settings.showWatchlistRow === false) return;
  try {
    const watchlistItems = await getWatchlist();
    if (watchlistItems.length > 0) {
      rows.push({
        title: 'Watchlist',
        items: watchlistItems.slice(0, 15),
        variant: 'poster',
      });
    }
  } catch {
    // Graceful fallback — no crash, no row added
  }
}

/**
 * Replicates the watchlist case from Browse.tsx fetchSourceItems:
 * - Calls getWatchlist()
 * - Paginates results
 */
async function fetchWatchlistForBrowse(
  page: number,
  pageSize = 20,
): Promise<{ items: PlexMediaItem[]; hasMore: boolean }> {
  const watchlist = await getWatchlist();
  const offset = (page - 1) * pageSize;
  const paged = watchlist.slice(offset, offset + pageSize);
  const items: PlexMediaItem[] = paged.map((w: PlexMediaItem & { tmdbId?: number }) => ({
    ...w,
    ratingKey: w.ratingKey || `plex-wl-${w.tmdbId || w.title}`,
    guid: w.tmdbId ? `tmdb://${w.tmdbId}` : w.guid || '',
  }));
  return { items, hasMore: offset + paged.length < watchlist.length };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('Watchlist Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockReturnValue(null);
    mockLoadSettings.mockReturnValue({ showWatchlistRow: true });
  });

  // ── 1. Empty watchlist ───────────────────────────────────────────────

  describe('empty watchlist', () => {
    it('Home: no Watchlist row added when API returns empty array', async () => {
      mockGetWatchlist.mockResolvedValue([]);
      const rows: RowData[] = [];

      await fetchWatchlistForHome(rows);

      expect(rows).toHaveLength(0);
      expect(rows.find((r) => r.title === 'Watchlist')).toBeUndefined();
    });

    it('Browse: returns empty items with hasMore=false for empty watchlist', async () => {
      mockGetWatchlist.mockResolvedValue([]);

      const result = await fetchWatchlistForBrowse(1);

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  // ── 2. API failure graceful fallback ─────────────────────────────────

  describe('API failure fallback', () => {
    it('Home: no crash and no row added when getWatchlist rejects', async () => {
      mockGetWatchlist.mockRejectedValue(new Error('Network error'));
      const rows: RowData[] = [];

      // Should not throw
      await expect(fetchWatchlistForHome(rows)).resolves.not.toThrow();
      expect(rows).toHaveLength(0);
    });

    it('getWatchlist returns empty array on API failure (cached fallback)', async () => {
      mockGetWatchlist.mockRejectedValue(new Error('500 Internal Server Error'));

      const result = await getWatchlist();

      expect(result).toEqual([]);
    });

    it('Browse: returns empty result when getWatchlist fails', async () => {
      // getWatchlist's cached() wrapper returns [] on failure,
      // so Browse gets an empty array rather than an exception
      mockGetWatchlist.mockRejectedValue(new Error('Timeout'));

      const result = await fetchWatchlistForBrowse(1);

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  // ── 3. showWatchlistRow setting toggle ───────────────────────────────

  describe('showWatchlistRow setting toggle', () => {
    it('Home: skips watchlist fetch entirely when showWatchlistRow=false', async () => {
      mockLoadSettings.mockReturnValue({ showWatchlistRow: false });
      mockGetWatchlist.mockResolvedValue([
        makePlexItem({ ratingKey: '100', title: 'Should Not Appear' }),
      ]);
      const rows: RowData[] = [];

      await fetchWatchlistForHome(rows);

      expect(rows).toHaveLength(0);
      // getWatchlist should never be called when setting is off
      expect(mockGetWatchlist).not.toHaveBeenCalled();
    });

    it('Home: fetches and renders watchlist row when showWatchlistRow=true', async () => {
      mockLoadSettings.mockReturnValue({ showWatchlistRow: true });
      mockGetWatchlist.mockResolvedValue([
        makePlexItem({
          ratingKey: '100',
          title: 'Fight Club',
          type: 'movie',
          Guid: [{ id: 'tmdb://550' }],
        }),
      ]);
      const rows: RowData[] = [];

      await fetchWatchlistForHome(rows);

      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Watchlist');
      expect(rows[0].variant).toBe('poster');
      expect(rows[0].items).toHaveLength(1);
    });

    it('Home: fetches watchlist when showWatchlistRow is undefined (defaults to true)', async () => {
      mockLoadSettings.mockReturnValue({});
      mockGetWatchlist.mockResolvedValue([
        makePlexItem({ ratingKey: '200', title: 'Inception' }),
      ]);
      const rows: RowData[] = [];

      await fetchWatchlistForHome(rows);

      // undefined !== false, so watchlist should be fetched
      expect(mockGetWatchlist).toHaveBeenCalled();
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Watchlist');
    });

    it('Home: limits watchlist row to 15 items', async () => {
      mockLoadSettings.mockReturnValue({ showWatchlistRow: true });
      const manyItems = Array.from({ length: 25 }, (_, i) =>
        makePlexItem({ ratingKey: `${i}`, title: `Movie ${i}` }),
      );
      mockGetWatchlist.mockResolvedValue(manyItems);
      const rows: RowData[] = [];

      await fetchWatchlistForHome(rows);

      expect(rows[0].items).toHaveLength(15);
    });
  });
});
