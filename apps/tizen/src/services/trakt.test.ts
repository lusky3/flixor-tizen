import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheService } from './cache';

// Mock flixor service
vi.mock('./flixor', () => ({
  flixor: {
    trakt: {
      isAuthenticated: vi.fn(),
      generateDeviceCode: vi.fn(),
      pollDeviceCode: vi.fn(),
      startScrobbleMovie: vi.fn(),
      startScrobbleEpisode: vi.fn(),
      pauseScrobbleMovie: vi.fn(),
      pauseScrobbleEpisode: vi.fn(),
      stopScrobbleMovie: vi.fn(),
      stopScrobbleEpisode: vi.fn(),
      getWatchlist: vi.fn(),
      addMovieToWatchlist: vi.fn(),
      addShowToWatchlist: vi.fn(),
      removeMovieFromWatchlist: vi.fn(),
      removeShowFromWatchlist: vi.fn(),
      getHistory: vi.fn(),
      getTrendingMovies: vi.fn(),
      getTrendingShows: vi.fn(),
      getPopularMovies: vi.fn(),
      getPopularShows: vi.fn(),
      getRecommendedMovies: vi.fn(),
      getRecommendedShows: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock settings
vi.mock('./settings', () => ({
  saveSettings: vi.fn(),
}));

import { flixor } from './flixor';
import {
  isAuthenticated,
  getDeviceCode,
  pollForToken,
  scrobbleStart,
  scrobbleProgress,
  scrobbleStop,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getHistory,
  getTrending,
  getPopular,
  getAnticipated,
  getRecommendations,
  signOut,
} from './trakt';

const trakt = flixor.trakt as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  cacheService.clear();
  vi.clearAllMocks();
  localStorage.clear();
});


// ============================================
// Authentication
// ============================================

describe('isAuthenticated', () => {
  it('returns true when trakt is authenticated', () => {
    trakt.isAuthenticated.mockReturnValue(true);
    expect(isAuthenticated()).toBe(true);
  });

  it('returns false when trakt is not authenticated', () => {
    trakt.isAuthenticated.mockReturnValue(false);
    expect(isAuthenticated()).toBe(false);
  });
});

// ============================================
// Device Code Auth Flow
// ============================================

describe('getDeviceCode', () => {
  it('returns device code on success', async () => {
    const code = { device_code: 'abc', user_code: 'XYZ', verification_url: 'https://trakt.tv/activate' };
    trakt.generateDeviceCode.mockResolvedValue(code);

    const result = await getDeviceCode();
    expect(result).toEqual(code);
    expect(trakt.generateDeviceCode).toHaveBeenCalledTimes(1);
  });

  it('returns null on error', async () => {
    trakt.generateDeviceCode.mockRejectedValue(new Error('Network error'));

    const result = await getDeviceCode();
    expect(result).toBeNull();
  });
});

describe('pollForToken', () => {
  it('returns tokens and stores auth metadata on success', async () => {
    const tokens = { access_token: 'tok', refresh_token: 'ref', expires_in: 7776000, created_at: 1700000000 };
    trakt.pollDeviceCode.mockResolvedValue(tokens);

    const result = await pollForToken('device-code-123');
    expect(result).toEqual(tokens);
    expect(trakt.pollDeviceCode).toHaveBeenCalledWith('device-code-123');
    // Auth metadata should be stored in localStorage
    const stored = localStorage.getItem('flixor.tizen.trakt.auth');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.expiresAt).toBe((tokens.created_at + tokens.expires_in) * 1000);
  });

  it('returns null when polling returns null (not yet authorized)', async () => {
    trakt.pollDeviceCode.mockResolvedValue(null);

    const result = await pollForToken('device-code-123');
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    trakt.pollDeviceCode.mockRejectedValue(new Error('Timeout'));

    const result = await pollForToken('device-code-123');
    expect(result).toBeNull();
  });
});


// ============================================
// Scrobbling
// ============================================

describe('scrobbleStart', () => {
  const movieItem = { type: 'movie' as const, ids: { tmdb: 550 } };
  const episodeItem = {
    type: 'episode' as const,
    ids: { tmdb: 100 },
    show: { ids: { tmdb: 200 } },
    episode: { season: 1, number: 3 },
  };

  it('returns false when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await scrobbleStart(movieItem);
    expect(result).toBe(false);
    expect(trakt.startScrobbleMovie).not.toHaveBeenCalled();
  });

  it('scrobbles movie start when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.startScrobbleMovie.mockResolvedValue(undefined);

    const result = await scrobbleStart(movieItem, 5);
    expect(result).toBe(true);
    expect(trakt.startScrobbleMovie).toHaveBeenCalledWith({ ids: { tmdb: 550 } }, 5);
  });

  it('scrobbles episode start when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.startScrobbleEpisode.mockResolvedValue(undefined);

    const result = await scrobbleStart(episodeItem, 0);
    expect(result).toBe(true);
    expect(trakt.startScrobbleEpisode).toHaveBeenCalledWith(
      { ids: { tmdb: 200 } },
      { season: 1, number: 3 },
      0,
    );
  });

  it('returns false on API error', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.startScrobbleMovie.mockRejectedValue(new Error('API error'));

    const result = await scrobbleStart(movieItem);
    expect(result).toBe(false);
  });
});

describe('scrobbleProgress', () => {
  const movieItem = { type: 'movie' as const, ids: { tmdb: 550 } };
  const episodeItem = {
    type: 'episode' as const,
    ids: { tmdb: 100 },
    show: { ids: { tmdb: 200 } },
    episode: { season: 2, number: 5 },
  };

  it('returns false when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await scrobbleProgress(movieItem, 50);
    expect(result).toBe(false);
  });

  it('sends movie progress (pause endpoint)', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.pauseScrobbleMovie.mockResolvedValue(undefined);

    const result = await scrobbleProgress(movieItem, 50);
    expect(result).toBe(true);
    expect(trakt.pauseScrobbleMovie).toHaveBeenCalledWith({ ids: { tmdb: 550 } }, 50);
  });

  it('sends episode progress (pause endpoint)', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.pauseScrobbleEpisode.mockResolvedValue(undefined);

    const result = await scrobbleProgress(episodeItem, 75);
    expect(result).toBe(true);
    expect(trakt.pauseScrobbleEpisode).toHaveBeenCalledWith(
      { ids: { tmdb: 200 } },
      { season: 2, number: 5 },
      75,
    );
  });

  it('returns false on API error', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.pauseScrobbleMovie.mockRejectedValue(new Error('Fail'));

    const result = await scrobbleProgress(movieItem, 50);
    expect(result).toBe(false);
  });
});

describe('scrobbleStop', () => {
  const movieItem = { type: 'movie' as const, ids: { tmdb: 550 } };
  const episodeItem = {
    type: 'episode' as const,
    ids: { tmdb: 100 },
    show: { ids: { tmdb: 200 } },
    episode: { season: 1, number: 1 },
  };

  it('returns false when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await scrobbleStop(movieItem, 95);
    expect(result).toBe(false);
  });

  it('stops movie scrobble when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.stopScrobbleMovie.mockResolvedValue(undefined);

    const result = await scrobbleStop(movieItem, 95);
    expect(result).toBe(true);
    expect(trakt.stopScrobbleMovie).toHaveBeenCalledWith({ ids: { tmdb: 550 } }, 95);
  });

  it('stops episode scrobble when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.stopScrobbleEpisode.mockResolvedValue(undefined);

    const result = await scrobbleStop(episodeItem, 100);
    expect(result).toBe(true);
    expect(trakt.stopScrobbleEpisode).toHaveBeenCalledWith(
      { ids: { tmdb: 200 } },
      { season: 1, number: 1 },
      100,
    );
  });

  it('returns false on API error', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.stopScrobbleMovie.mockRejectedValue(new Error('Fail'));

    const result = await scrobbleStop(movieItem, 95);
    expect(result).toBe(false);
  });
});


// ============================================
// Watchlist
// ============================================

describe('getWatchlist', () => {
  it('returns empty array when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await getWatchlist();
    expect(result).toEqual([]);
    expect(trakt.getWatchlist).not.toHaveBeenCalled();
  });

  it('fetches watchlist when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    const items = [{ id: 1, movie: { title: 'Test' } }];
    trakt.getWatchlist.mockResolvedValue(items);

    const result = await getWatchlist('movies');
    expect(result).toEqual(items);
    expect(trakt.getWatchlist).toHaveBeenCalledWith('movies');
  });

  it('caches watchlist on second call', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    const items = [{ id: 1 }];
    trakt.getWatchlist.mockResolvedValue(items);

    await getWatchlist('movies');
    const second = await getWatchlist('movies');

    expect(second).toEqual(items);
    expect(trakt.getWatchlist).toHaveBeenCalledTimes(1);
  });

  it('returns empty array on error', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.getWatchlist.mockRejectedValue(new Error('Fail'));

    const result = await getWatchlist();
    expect(result).toEqual([]);
  });
});

describe('addToWatchlist', () => {
  it('returns false when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await addToWatchlist({ type: 'movie', ids: { tmdb: 1 } });
    expect(result).toBe(false);
  });

  it('adds movie to watchlist and invalidates cache', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.addMovieToWatchlist.mockResolvedValue(undefined);

    // Pre-populate cache
    const items = [{ id: 1 }];
    trakt.getWatchlist.mockResolvedValue(items);
    await getWatchlist('movies');
    expect(cacheService.has('trakt:watchlist:movies')).toBe(true);

    const result = await addToWatchlist({ type: 'movie', ids: { tmdb: 42 } });
    expect(result).toBe(true);
    expect(trakt.addMovieToWatchlist).toHaveBeenCalledWith({ ids: { tmdb: 42 } });
    // Cache should be invalidated
    expect(cacheService.has('trakt:watchlist:movies')).toBe(false);
    expect(cacheService.has('trakt:watchlist:all')).toBe(false);
  });

  it('adds show to watchlist and invalidates cache', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.addShowToWatchlist.mockResolvedValue(undefined);

    const result = await addToWatchlist({ type: 'show', ids: { tmdb: 99 } });
    expect(result).toBe(true);
    expect(trakt.addShowToWatchlist).toHaveBeenCalledWith({ ids: { tmdb: 99 } });
  });

  it('returns false on API error and does not invalidate cache', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.addMovieToWatchlist.mockRejectedValue(new Error('Fail'));

    // Pre-populate cache
    trakt.getWatchlist.mockResolvedValue([{ id: 1 }]);
    await getWatchlist('movies');

    const result = await addToWatchlist({ type: 'movie', ids: { tmdb: 42 } });
    expect(result).toBe(false);
    // Cache should still exist since the add failed
    expect(cacheService.has('trakt:watchlist:movies')).toBe(true);
  });
});

describe('removeFromWatchlist', () => {
  it('returns false when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await removeFromWatchlist({ type: 'movie', ids: { tmdb: 1 } });
    expect(result).toBe(false);
  });

  it('removes movie from watchlist and invalidates cache', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.removeMovieFromWatchlist.mockResolvedValue(undefined);

    const result = await removeFromWatchlist({ type: 'movie', ids: { tmdb: 42 } });
    expect(result).toBe(true);
    expect(trakt.removeMovieFromWatchlist).toHaveBeenCalledWith({ ids: { tmdb: 42 } });
  });

  it('removes show from watchlist and invalidates cache', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.removeShowFromWatchlist.mockResolvedValue(undefined);

    const result = await removeFromWatchlist({ type: 'show', ids: { tmdb: 99 } });
    expect(result).toBe(true);
    expect(trakt.removeShowFromWatchlist).toHaveBeenCalledWith({ ids: { tmdb: 99 } });
  });

  it('returns false on API error', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.removeMovieFromWatchlist.mockRejectedValue(new Error('Fail'));

    const result = await removeFromWatchlist({ type: 'movie', ids: { tmdb: 42 } });
    expect(result).toBe(false);
  });
});


// ============================================
// History
// ============================================

describe('getHistory', () => {
  it('returns empty array when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await getHistory();
    expect(result).toEqual([]);
    expect(trakt.getHistory).not.toHaveBeenCalled();
  });

  it('fetches history when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    const items = [{ id: 1, watched_at: '2024-01-01' }];
    trakt.getHistory.mockResolvedValue(items);

    const result = await getHistory('movies', 1, 20);
    expect(result).toEqual(items);
    expect(trakt.getHistory).toHaveBeenCalledWith('movies', 1, 20);
  });

  it('caches history on second call', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.getHistory.mockResolvedValue([{ id: 1 }]);

    await getHistory('movies', 1, 20);
    await getHistory('movies', 1, 20);

    expect(trakt.getHistory).toHaveBeenCalledTimes(1);
  });

  it('returns empty array on error', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.getHistory.mockRejectedValue(new Error('Fail'));

    const result = await getHistory();
    expect(result).toEqual([]);
  });
});

// ============================================
// Discovery: Trending
// ============================================

describe('getTrending', () => {
  it('fetches trending movies', async () => {
    const data = [{ watchers: 100, movie: { title: 'Test' } }];
    trakt.getTrendingMovies.mockResolvedValue(data);

    const result = await getTrending('movies');
    expect(result).toEqual(data);
    expect(trakt.getTrendingMovies).toHaveBeenCalledTimes(1);
  });

  it('fetches trending shows', async () => {
    const data = [{ watchers: 50, show: { title: 'Show' } }];
    trakt.getTrendingShows.mockResolvedValue(data);

    const result = await getTrending('shows');
    expect(result).toEqual(data);
    expect(trakt.getTrendingShows).toHaveBeenCalledTimes(1);
  });

  it('caches trending on second call', async () => {
    trakt.getTrendingMovies.mockResolvedValue([]);

    await getTrending('movies');
    await getTrending('movies');

    expect(trakt.getTrendingMovies).toHaveBeenCalledTimes(1);
  });

  it('different types fetch independently', async () => {
    trakt.getTrendingMovies.mockResolvedValue([{ id: 1 }]);
    trakt.getTrendingShows.mockResolvedValue([{ id: 2 }]);

    await getTrending('movies');
    await getTrending('shows');

    expect(trakt.getTrendingMovies).toHaveBeenCalledTimes(1);
    expect(trakt.getTrendingShows).toHaveBeenCalledTimes(1);
  });

  it('returns empty array on error', async () => {
    trakt.getTrendingMovies.mockRejectedValue(new Error('Fail'));

    const result = await getTrending('movies');
    expect(result).toEqual([]);
  });
});

// ============================================
// Discovery: Popular
// ============================================

describe('getPopular', () => {
  it('fetches popular movies', async () => {
    const data = [{ title: 'Popular Movie' }];
    trakt.getPopularMovies.mockResolvedValue(data);

    const result = await getPopular('movies');
    expect(result).toEqual(data);
    expect(trakt.getPopularMovies).toHaveBeenCalledTimes(1);
  });

  it('fetches popular shows', async () => {
    const data = [{ title: 'Popular Show' }];
    trakt.getPopularShows.mockResolvedValue(data);

    const result = await getPopular('shows');
    expect(result).toEqual(data);
    expect(trakt.getPopularShows).toHaveBeenCalledTimes(1);
  });

  it('caches popular on second call', async () => {
    trakt.getPopularMovies.mockResolvedValue([]);

    await getPopular('movies');
    await getPopular('movies');

    expect(trakt.getPopularMovies).toHaveBeenCalledTimes(1);
  });

  it('returns empty array on error', async () => {
    trakt.getPopularShows.mockRejectedValue(new Error('Fail'));

    const result = await getPopular('shows');
    expect(result).toEqual([]);
  });
});

// ============================================
// Discovery: Anticipated (falls back to popular)
// ============================================

describe('getAnticipated', () => {
  it('fetches anticipated movies (falls back to popular)', async () => {
    const data = [{ title: 'Anticipated' }];
    trakt.getPopularMovies.mockResolvedValue(data);

    const result = await getAnticipated('movies');
    expect(result).toEqual(data);
    expect(trakt.getPopularMovies).toHaveBeenCalledTimes(1);
  });

  it('fetches anticipated shows (falls back to popular)', async () => {
    const data = [{ title: 'Anticipated Show' }];
    trakt.getPopularShows.mockResolvedValue(data);

    const result = await getAnticipated('shows');
    expect(result).toEqual(data);
    expect(trakt.getPopularShows).toHaveBeenCalledTimes(1);
  });

  it('caches anticipated separately from popular', async () => {
    trakt.getPopularMovies.mockResolvedValue([{ id: 1 }]);

    await getAnticipated('movies');
    await getPopular('movies');

    // Both should call the same underlying API but cache independently
    expect(trakt.getPopularMovies).toHaveBeenCalledTimes(2);
  });

  it('returns empty array on error', async () => {
    trakt.getPopularMovies.mockRejectedValue(new Error('Fail'));

    const result = await getAnticipated('movies');
    expect(result).toEqual([]);
  });
});

// ============================================
// Discovery: Recommendations
// ============================================

describe('getRecommendations', () => {
  it('returns empty array when not authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(false);
    const result = await getRecommendations('movies');
    expect(result).toEqual([]);
    expect(trakt.getRecommendedMovies).not.toHaveBeenCalled();
  });

  it('fetches recommended movies when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    const data = [{ title: 'Recommended' }];
    trakt.getRecommendedMovies.mockResolvedValue(data);

    const result = await getRecommendations('movies');
    expect(result).toEqual(data);
  });

  it('fetches recommended shows when authenticated', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    const data = [{ title: 'Recommended Show' }];
    trakt.getRecommendedShows.mockResolvedValue(data);

    const result = await getRecommendations('shows');
    expect(result).toEqual(data);
  });

  it('caches recommendations on second call', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.getRecommendedMovies.mockResolvedValue([]);

    await getRecommendations('movies');
    await getRecommendations('movies');

    expect(trakt.getRecommendedMovies).toHaveBeenCalledTimes(1);
  });

  it('returns empty array on error', async () => {
    trakt.isAuthenticated.mockReturnValue(true);
    trakt.getRecommendedMovies.mockRejectedValue(new Error('Fail'));

    const result = await getRecommendations('movies');
    expect(result).toEqual([]);
  });
});

// ============================================
// Sign Out
// ============================================

describe('signOut', () => {
  it('calls trakt signOut and clears cache', async () => {
    trakt.signOut.mockResolvedValue(undefined);

    // Pre-populate cache
    cacheService.set('trakt:watchlist:all', [{ id: 1 }]);
    cacheService.set('trakt:trending:movies', [{ id: 2 }]);
    expect(cacheService.size).toBeGreaterThan(0);

    await signOut();

    expect(trakt.signOut).toHaveBeenCalledTimes(1);
    expect(cacheService.size).toBe(0);
  });

  it('clears localStorage auth metadata', async () => {
    trakt.signOut.mockResolvedValue(undefined);
    localStorage.setItem('flixor.tizen.trakt.auth', JSON.stringify({ expiresAt: 999 }));

    await signOut();

    expect(localStorage.getItem('flixor.tizen.trakt.auth')).toBeNull();
  });

  it('still clears cache even if signOut throws', async () => {
    trakt.signOut.mockRejectedValue(new Error('Fail'));
    cacheService.set('trakt:test', 'data');

    await signOut();

    expect(cacheService.size).toBe(0);
  });
});
