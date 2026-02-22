import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TraktScrobbler, type TraktMediaIdentifiers } from '../../services/traktScrobbler';

// --- Mocks ---

const mockIsAuthenticated = vi.fn(() => true);
const mockScrobbleStart = vi.fn(async () => true);
const mockScrobbleStop = vi.fn(async () => true);
const mockScrobbleProgress = vi.fn(async () => true);
const mockLoadSettings = vi.fn(() => ({ traktScrobblingEnabled: true }));

vi.mock('../../services/trakt', () => ({
  isAuthenticated: (...args: unknown[]) => mockIsAuthenticated(...args),
  scrobbleStart: (...args: unknown[]) => mockScrobbleStart(...args),
  scrobbleStop: (...args: unknown[]) => mockScrobbleStop(...args),
  scrobbleProgress: (...args: unknown[]) => mockScrobbleProgress(...args),
}));

vi.mock('../../services/settings', () => ({
  loadSettings: (...args: unknown[]) => mockLoadSettings(...args),
}));

// --- Helpers ---

const movieMedia: TraktMediaIdentifiers = {
  type: 'movie',
  imdb: 'tt1234567',
  tmdb: 550,
};

const episodeMedia: TraktMediaIdentifiers = {
  type: 'episode',
  imdb: 'tt9999999',
  tmdb: 100,
  tvdb: 200,
  show: { imdb: 'tt9999999', tmdb: 100 },
  episode: { season: 2, number: 5 },
};

describe('TraktScrobbler Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockScrobbleStart.mockResolvedValue(true);
    mockScrobbleStop.mockResolvedValue(true);
    mockScrobbleProgress.mockResolvedValue(true);
    mockLoadSettings.mockReturnValue({ traktScrobblingEnabled: true });
  });

  // --- Auth guard ---

  describe('auth guard', () => {
    it('start() returns false without API calls when not authenticated', async () => {
      mockIsAuthenticated.mockReturnValue(false);
      const scrobbler = new TraktScrobbler();

      const result = await scrobbler.start(movieMedia, 0);

      expect(result).toBe(false);
      expect(mockScrobbleStart).not.toHaveBeenCalled();
      expect(scrobbler.isCurrentlyScrobbling()).toBe(false);
    });

    it('pause() returns false without API calls when not authenticated', async () => {
      // Start while authenticated, then lose auth before pause
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);

      mockIsAuthenticated.mockReturnValue(false);
      const result = await scrobbler.pause(50);

      expect(result).toBe(false);
      expect(mockScrobbleProgress).not.toHaveBeenCalled();
    });

    it('resume() returns false without API calls when not authenticated', async () => {
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);
      await scrobbler.pause(30);

      mockIsAuthenticated.mockReturnValue(false);
      const result = await scrobbler.resume(30);

      expect(result).toBe(false);
    });

    it('stop() returns false without API calls when not authenticated', async () => {
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);

      mockIsAuthenticated.mockReturnValue(false);
      const result = await scrobbler.stop(100);

      expect(result).toBe(false);
      expect(mockScrobbleStop).not.toHaveBeenCalled();
    });
  });

  // --- Disabled scrobbling ---

  describe('disabled scrobbling', () => {
    it('start() returns false when traktScrobblingEnabled is false', async () => {
      mockLoadSettings.mockReturnValue({ traktScrobblingEnabled: false });
      const scrobbler = new TraktScrobbler();

      const result = await scrobbler.start(movieMedia, 0);

      expect(result).toBe(false);
      expect(mockScrobbleStart).not.toHaveBeenCalled();
    });

    it('pause() returns false when traktScrobblingEnabled is false', async () => {
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);

      mockLoadSettings.mockReturnValue({ traktScrobblingEnabled: false });
      const result = await scrobbler.pause(50);

      expect(result).toBe(false);
      expect(mockScrobbleProgress).not.toHaveBeenCalled();
    });

    it('stop() returns false when traktScrobblingEnabled is false', async () => {
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);

      mockLoadSettings.mockReturnValue({ traktScrobblingEnabled: false });
      const result = await scrobbler.stop(100);

      expect(result).toBe(false);
      expect(mockScrobbleStop).not.toHaveBeenCalled();
    });

    it('treats undefined traktScrobblingEnabled as enabled (default true)', async () => {
      mockLoadSettings.mockReturnValue({});
      const scrobbler = new TraktScrobbler();

      const result = await scrobbler.start(movieMedia, 0);

      expect(result).toBe(true);
      expect(mockScrobbleStart).toHaveBeenCalled();
    });
  });

  // --- API failure recovery ---

  describe('API failure recovery', () => {
    it('start() returns false and logs error when scrobbleStart throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockScrobbleStart.mockRejectedValue(new Error('network error'));
      const scrobbler = new TraktScrobbler();

      const result = await scrobbler.start(movieMedia, 0);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      expect(scrobbler.isCurrentlyScrobbling()).toBe(false);
      consoleSpy.mockRestore();
    });

    it('pause() returns false and logs error when scrobbleProgress throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);

      mockScrobbleProgress.mockRejectedValue(new Error('timeout'));
      const result = await scrobbler.pause(50);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      // Scrobbler should still be active (error doesn't interrupt)
      expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
      consoleSpy.mockRestore();
    });

    it('resume() returns false and logs error when scrobbleStart throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);
      await scrobbler.pause(30);

      mockScrobbleStart.mockRejectedValue(new Error('server error'));
      const result = await scrobbler.resume(30);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('stop() returns false, logs error, and resets state when scrobbleStop throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);

      mockScrobbleStop.mockRejectedValue(new Error('500'));
      const result = await scrobbler.stop(100);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      // State should still be reset even on error
      expect(scrobbler.isCurrentlyScrobbling()).toBe(false);
      expect(scrobbler.getCurrentMedia()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  // --- Double stop no-op ---

  describe('double stop no-op', () => {
    it('second stop() returns false without API calls when already idle', async () => {
      const scrobbler = new TraktScrobbler();
      await scrobbler.start(movieMedia, 0);
      await scrobbler.stop(100);

      mockScrobbleStop.mockClear();
      const result = await scrobbler.stop(100);

      expect(result).toBe(false);
      expect(mockScrobbleStop).not.toHaveBeenCalled();
    });

    it('stop() on a fresh scrobbler returns false without API calls', async () => {
      const scrobbler = new TraktScrobbler();

      const result = await scrobbler.stop(50);

      expect(result).toBe(false);
      expect(mockScrobbleStop).not.toHaveBeenCalled();
    });
  });

  // --- convertPlexToTraktMedia edge cases ---

  describe('convertPlexToTraktMedia', () => {
    it('returns null when Guid array is empty', () => {
      const item = {
        type: 'movie' as const,
        Guid: [],
        ratingKey: '1',
        key: '/library/metadata/1',
        title: 'Test',
      };

      expect(TraktScrobbler.convertPlexToTraktMedia(item)).toBeNull();
    });

    it('returns null when Guid is undefined', () => {
      const item = {
        type: 'movie' as const,
        ratingKey: '1',
        key: '/library/metadata/1',
        title: 'Test',
      };

      expect(TraktScrobbler.convertPlexToTraktMedia(item as any)).toBeNull();
    });

    it('returns null when no recognised GUID prefixes are present', () => {
      const item = {
        type: 'movie' as const,
        Guid: [{ id: 'unknown://12345' }, { id: 'local://abc' }],
        ratingKey: '1',
        key: '/library/metadata/1',
        title: 'Test',
      };

      expect(TraktScrobbler.convertPlexToTraktMedia(item)).toBeNull();
    });

    it('extracts IMDB ID from Guid array', () => {
      const item = {
        type: 'movie' as const,
        Guid: [{ id: 'imdb://tt0137523' }],
        ratingKey: '1',
        key: '/library/metadata/1',
        title: 'Fight Club',
      };

      const result = TraktScrobbler.convertPlexToTraktMedia(item);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('movie');
      expect(result!.imdb).toBe('tt0137523');
    });

    it('extracts TMDB and TVDB numeric IDs', () => {
      const item = {
        type: 'movie' as const,
        Guid: [{ id: 'tmdb://550' }, { id: 'tvdb://7890' }],
        ratingKey: '1',
        key: '/library/metadata/1',
        title: 'Test',
      };

      const result = TraktScrobbler.convertPlexToTraktMedia(item);
      expect(result).not.toBeNull();
      expect(result!.tmdb).toBe(550);
      expect(result!.tvdb).toBe(7890);
    });

    it('maps episode type with show and episode fields', () => {
      const item = {
        type: 'episode' as const,
        Guid: [{ id: 'imdb://tt1234567' }, { id: 'tmdb://999' }],
        ratingKey: '1',
        key: '/library/metadata/1',
        title: 'Pilot',
        parentIndex: 1,
        index: 1,
      };

      const result = TraktScrobbler.convertPlexToTraktMedia(item);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('episode');
      expect(result!.show).toEqual({ imdb: 'tt1234567', tmdb: 999 });
      expect(result!.episode).toEqual({ season: 1, number: 1 });
    });

    it('defaults parentIndex and index to 0 when missing for episodes', () => {
      const item = {
        type: 'episode' as const,
        Guid: [{ id: 'tmdb://42' }],
        ratingKey: '1',
        key: '/library/metadata/1',
        title: 'Unknown Episode',
      };

      const result = TraktScrobbler.convertPlexToTraktMedia(item);
      expect(result).not.toBeNull();
      expect(result!.episode).toEqual({ season: 0, number: 0 });
    });
  });

  // --- Full lifecycle: start → pause → resume → stop ---

  describe('full lifecycle', () => {
    it('start → pause → resume → stop sequence works correctly', async () => {
      const scrobbler = new TraktScrobbler();

      // Start
      const started = await scrobbler.start(episodeMedia, 0);
      expect(started).toBe(true);
      expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
      expect(scrobbler.getCurrentMedia()).toEqual(episodeMedia);
      expect(scrobbler.getCurrentProgress()).toBe(0);
      expect(scrobbler.getStartTimestamp()).toBeTypeOf('number');
      expect(mockScrobbleStart).toHaveBeenCalledTimes(1);

      // Pause
      const paused = await scrobbler.pause(35);
      expect(paused).toBe(true);
      expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
      expect(scrobbler.isPaused()).toBe(true);
      expect(scrobbler.getCurrentProgress()).toBe(35);
      expect(mockScrobbleProgress).toHaveBeenCalledTimes(1);

      // Resume
      const resumed = await scrobbler.resume(35);
      expect(resumed).toBe(true);
      expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
      expect(scrobbler.isPaused()).toBe(false);
      expect(mockScrobbleStart).toHaveBeenCalledTimes(2);

      // Stop
      const stopped = await scrobbler.stop(90);
      expect(stopped).toBe(true);
      expect(scrobbler.isCurrentlyScrobbling()).toBe(false);
      expect(scrobbler.getCurrentMedia()).toBeNull();
      expect(scrobbler.getCurrentProgress()).toBe(0);
      expect(scrobbler.getStartTimestamp()).toBeNull();
      expect(mockScrobbleStop).toHaveBeenCalledTimes(1);
    });

    it('start() while active stops existing scrobble and calls scrobbleStop', async () => {
      const scrobbler = new TraktScrobbler();

      await scrobbler.start(movieMedia, 10);
      expect(mockScrobbleStart).toHaveBeenCalledTimes(1);

      await scrobbler.start(episodeMedia, 0);
      // Should have called stop for the first media, then start for the second
      expect(mockScrobbleStop).toHaveBeenCalledTimes(1);
      expect(mockScrobbleStart).toHaveBeenCalledTimes(2);
      expect(scrobbler.getCurrentMedia()).toEqual(episodeMedia);
    });
  });
});
