import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlexMediaItem } from '@flixor/core';
import { cacheService } from './cache';

// Mock flixor before importing the module under test
vi.mock('./flixor', () => ({
  flixor: {
    plexTv: {
      getWatchlist: vi.fn(),
      addToWatchlist: vi.fn(),
      removeFromWatchlist: vi.fn(),
    },
    getHomeUsers: vi.fn(),
    switchToProfile: vi.fn(),
  },
}));

vi.mock('./cache', () => ({
  cacheService: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  },
}));

import { extractTmdbId, getWatchlist, getHomeUsers, switchUser } from './plextv';
import { flixor } from './flixor';

const mockGetWatchlist = flixor.plexTv.getWatchlist as ReturnType<typeof vi.fn>;
const mockCacheGet = cacheService.get as ReturnType<typeof vi.fn>;
const mockGetHomeUsers = flixor.getHomeUsers as ReturnType<typeof vi.fn>;
const mockSwitchToProfile = flixor.switchToProfile as ReturnType<typeof vi.fn>;

function makePlexItem(overrides: Partial<PlexMediaItem> = {}): PlexMediaItem {
  return {
    ratingKey: '1',
    key: '/library/metadata/1',
    type: 'movie',
    title: 'Test Movie',
    ...overrides,
  };
}

// ============================================
// extractTmdbId
// ============================================

describe('extractTmdbId', () => {
  it('extracts TMDB ID from tmdb:// prefix', () => {
    const item = makePlexItem({ Guid: [{ id: 'tmdb://550' }] });
    expect(extractTmdbId(item)).toBe(550);
  });

  it('extracts TMDB ID from themoviedb:// prefix', () => {
    const item = makePlexItem({ Guid: [{ id: 'themoviedb://12345' }] });
    expect(extractTmdbId(item)).toBe(12345);
  });

  it('returns first TMDB match when multiple GUIDs present', () => {
    const item = makePlexItem({
      Guid: [{ id: 'imdb://tt0137523' }, { id: 'tmdb://550' }, { id: 'tvdb://7890' }],
    });
    expect(extractTmdbId(item)).toBe(550);
  });

  it('returns undefined when no Guid array', () => {
    const item = makePlexItem({ Guid: undefined });
    expect(extractTmdbId(item)).toBeUndefined();
  });

  it('returns undefined when Guid array is empty', () => {
    const item = makePlexItem({ Guid: [] });
    expect(extractTmdbId(item)).toBeUndefined();
  });

  it('returns undefined when no TMDB GUID present', () => {
    const item = makePlexItem({ Guid: [{ id: 'imdb://tt0137523' }, { id: 'tvdb://7890' }] });
    expect(extractTmdbId(item)).toBeUndefined();
  });

  it('returns undefined for invalid TMDB ID (NaN)', () => {
    const item = makePlexItem({ Guid: [{ id: 'tmdb://abc' }] });
    expect(extractTmdbId(item)).toBeUndefined();
  });

  it('returns undefined for zero TMDB ID', () => {
    const item = makePlexItem({ Guid: [{ id: 'tmdb://0' }] });
    expect(extractTmdbId(item)).toBeUndefined();
  });
});

// ============================================
// getWatchlist
// ============================================

describe('getWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure cache miss so fetcher runs
    mockCacheGet.mockReturnValue(null);
  });

  it('returns WatchlistItems with extracted tmdbId and mediaType', async () => {
    mockGetWatchlist.mockResolvedValue([
      makePlexItem({
        ratingKey: '100',
        type: 'movie',
        title: 'Fight Club',
        Guid: [{ id: 'tmdb://550' }, { id: 'imdb://tt0137523' }],
      }),
      makePlexItem({
        ratingKey: '200',
        type: 'show',
        title: 'Breaking Bad',
        Guid: [{ id: 'tmdb://1396' }, { id: 'tvdb://81189' }],
      }),
    ]);

    const result = await getWatchlist();

    expect(result).toHaveLength(2);
    expect(result[0].tmdbId).toBe(550);
    expect(result[0].mediaType).toBe('movie');
    expect(result[0].title).toBe('Fight Club');
    expect(result[1].tmdbId).toBe(1396);
    expect(result[1].mediaType).toBe('tv');
    expect(result[1].title).toBe('Breaking Bad');
  });

  it('returns empty array when API fails', async () => {
    mockGetWatchlist.mockRejectedValue(new Error('Network error'));

    const result = await getWatchlist();
    expect(result).toEqual([]);
  });

  it('returns items with undefined tmdbId when no TMDB GUID present', async () => {
    mockGetWatchlist.mockResolvedValue([
      makePlexItem({
        ratingKey: '300',
        type: 'movie',
        title: 'No TMDB',
        Guid: [{ id: 'imdb://tt9999999' }],
      }),
    ]);

    const result = await getWatchlist();

    expect(result).toHaveLength(1);
    expect(result[0].tmdbId).toBeUndefined();
    expect(result[0].mediaType).toBe('movie');
  });

  it('returns empty array for empty watchlist', async () => {
    mockGetWatchlist.mockResolvedValue([]);

    const result = await getWatchlist();
    expect(result).toEqual([]);
  });

  it('maps show/season/episode types to tv mediaType', async () => {
    mockGetWatchlist.mockResolvedValue([
      makePlexItem({ type: 'show', title: 'Show', Guid: [{ id: 'tmdb://1' }] }),
      makePlexItem({ type: 'season', title: 'Season', Guid: [{ id: 'tmdb://2' }] }),
      makePlexItem({ type: 'episode', title: 'Episode', Guid: [{ id: 'tmdb://3' }] }),
    ]);

    const result = await getWatchlist();

    expect(result[0].mediaType).toBe('tv');
    expect(result[1].mediaType).toBe('tv');
    expect(result[2].mediaType).toBe('tv');
  });
});


// ============================================
// getHomeUsers
// ============================================

function makeHomeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'abc-123',
    title: 'TestUser',
    username: 'testuser',
    thumb: 'https://plex.tv/users/abc/avatar',
    restricted: false,
    protected: false,
    admin: true,
    guest: false,
    home: true,
    ...overrides,
  };
}

describe('getHomeUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockReturnValue(null);
  });

  it('returns list of home users from FlixorCore', async () => {
    const users = [makeHomeUser(), makeHomeUser({ id: 2, title: 'Kid', restricted: true })];
    mockGetHomeUsers.mockResolvedValue(users);

    const result = await getHomeUsers();

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('TestUser');
    expect(result[0].thumb).toBe('https://plex.tv/users/abc/avatar');
    expect(result[1].restricted).toBe(true);
  });

  it('returns empty array when API fails', async () => {
    mockGetHomeUsers.mockRejectedValue(new Error('Not authenticated'));

    const result = await getHomeUsers();
    expect(result).toEqual([]);
  });

  it('returns empty array when no home users exist', async () => {
    mockGetHomeUsers.mockResolvedValue([]);

    const result = await getHomeUsers();
    expect(result).toEqual([]);
  });
});

// ============================================
// switchUser
// ============================================

describe('switchUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockReturnValue(null);
  });

  it('switches to the matching user and invalidates caches', async () => {
    const users = [makeHomeUser({ id: 1 }), makeHomeUser({ id: 2, title: 'Other' })];
    mockGetHomeUsers.mockResolvedValue(users);
    mockSwitchToProfile.mockResolvedValue(undefined);

    const result = await switchUser(2);

    expect(result).toBe(true);
    expect(mockSwitchToProfile).toHaveBeenCalledWith(users[1], undefined);
    expect(cacheService.invalidate).toHaveBeenCalledWith('plextv:watchlist');
    expect(cacheService.invalidate).toHaveBeenCalledWith('plextv:home-users');
  });

  it('passes PIN for protected profiles', async () => {
    const users = [makeHomeUser({ id: 5, protected: true })];
    mockGetHomeUsers.mockResolvedValue(users);
    mockSwitchToProfile.mockResolvedValue(undefined);

    const result = await switchUser(5, '1234');

    expect(result).toBe(true);
    expect(mockSwitchToProfile).toHaveBeenCalledWith(users[0], '1234');
  });

  it('returns false when user ID not found', async () => {
    mockGetHomeUsers.mockResolvedValue([makeHomeUser({ id: 1 })]);

    const result = await switchUser(999);

    expect(result).toBe(false);
    expect(mockSwitchToProfile).not.toHaveBeenCalled();
  });

  it('returns false when switchToProfile throws', async () => {
    mockGetHomeUsers.mockResolvedValue([makeHomeUser({ id: 1 })]);
    mockSwitchToProfile.mockRejectedValue(new Error('PIN required'));

    const result = await switchUser(1);

    expect(result).toBe(false);
  });
});
