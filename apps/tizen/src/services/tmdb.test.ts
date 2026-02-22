import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildImageUrl, getTrending, getDetails, getCredits, search, getRecommendations, getVideos, getImages, getUpcoming, getPersonDetails, getPersonCredits } from './tmdb';
import { cacheService } from './cache';

// Mock the flixor service
vi.mock('./flixor', () => ({
  flixor: {
    tmdb: {
      getTrendingMovies: vi.fn(),
      getTrendingTV: vi.fn(),
      getTrendingAll: vi.fn(),
      getMovieDetails: vi.fn(),
      getTVDetails: vi.fn(),
      getMovieCredits: vi.fn(),
      getTVCredits: vi.fn(),
      searchMovies: vi.fn(),
      searchTV: vi.fn(),
      searchMulti: vi.fn(),
      getMovieRecommendations: vi.fn(),
      getTVRecommendations: vi.fn(),
      getMovieVideos: vi.fn(),
      getTVVideos: vi.fn(),
      getMovieImages: vi.fn(),
      getTVImages: vi.fn(),
      getUpcomingMovies: vi.fn(),
      getPersonDetails: vi.fn(),
      getPersonCredits: vi.fn(),
    },
  },
}));

// Import the mocked flixor after vi.mock
import { flixor } from './flixor';

const tmdb = flixor.tmdb as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  cacheService.clear();
  vi.clearAllMocks();
});

// ============================================
// buildImageUrl
// ============================================

describe('buildImageUrl', () => {
  it('returns empty string for null path', () => {
    expect(buildImageUrl(null)).toBe('');
  });

  it('returns empty string for undefined path', () => {
    expect(buildImageUrl(undefined)).toBe('');
  });

  it('returns empty string for empty string path', () => {
    expect(buildImageUrl('')).toBe('');
  });

  it('builds poster URL with w500 by default', () => {
    expect(buildImageUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('builds poster URL with w500 explicitly', () => {
    expect(buildImageUrl('/abc.jpg', 'poster')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('builds backdrop URL with w1280', () => {
    expect(buildImageUrl('/bg.jpg', 'backdrop')).toBe('https://image.tmdb.org/t/p/w1280/bg.jpg');
  });

  it('builds profile URL with w185', () => {
    expect(buildImageUrl('/face.jpg', 'profile')).toBe('https://image.tmdb.org/t/p/w185/face.jpg');
  });

  it('builds logo URL with w500', () => {
    expect(buildImageUrl('/logo.png', 'logo')).toBe('https://image.tmdb.org/t/p/w500/logo.png');
  });
});

// ============================================
// Caching behavior
// ============================================

describe('caching behavior', () => {
  it('second call returns cached result without re-fetching', async () => {
    const data = { results: [{ id: 1, title: 'Movie' }] };
    tmdb.getTrendingAll.mockResolvedValue(data);

    const first = await getTrending('all', 'week');
    const second = await getTrending('all', 'week');

    expect(first).toEqual(data);
    expect(second).toEqual(data);
    expect(tmdb.getTrendingAll).toHaveBeenCalledTimes(1);
  });

  it('different keys fetch independently', async () => {
    const movies = { results: [{ id: 1 }] };
    const tv = { results: [{ id: 2 }] };
    tmdb.getTrendingMovies.mockResolvedValue(movies);
    tmdb.getTrendingTV.mockResolvedValue(tv);

    const movieResult = await getTrending('movie', 'week');
    const tvResult = await getTrending('tv', 'week');

    expect(movieResult).toEqual(movies);
    expect(tvResult).toEqual(tv);
    expect(tmdb.getTrendingMovies).toHaveBeenCalledTimes(1);
    expect(tmdb.getTrendingTV).toHaveBeenCalledTimes(1);
  });

  it('cache is used for getDetails on second call', async () => {
    const details = { id: 42, title: 'Test Movie' };
    tmdb.getMovieDetails.mockResolvedValue(details);

    await getDetails(42, 'movie');
    const second = await getDetails(42, 'movie');

    expect(second).toEqual(details);
    expect(tmdb.getMovieDetails).toHaveBeenCalledTimes(1);
  });

  it('cache is used for search on second call', async () => {
    const results = { results: [{ id: 1, title: 'Found' }] };
    tmdb.searchMulti.mockResolvedValue(results);

    await search('test query');
    const second = await search('test query');

    expect(second).toEqual(results);
    expect(tmdb.searchMulti).toHaveBeenCalledTimes(1);
  });
});

// ============================================
// Error degradation
// ============================================

describe('error degradation', () => {
  it('getTrending returns empty results on error', async () => {
    tmdb.getTrendingAll.mockRejectedValue(new Error('Network error'));

    const result = await getTrending('all', 'week');
    expect(result).toEqual({ results: [] });
  });

  it('getDetails returns null on error', async () => {
    tmdb.getMovieDetails.mockRejectedValue(new Error('Not found'));

    const result = await getDetails(999, 'movie');
    expect(result).toBeNull();
  });

  it('getCredits returns null on error', async () => {
    tmdb.getMovieCredits.mockRejectedValue(new Error('Fail'));

    const result = await getCredits(1, 'movie');
    expect(result).toBeNull();
  });

  it('search returns empty results on error', async () => {
    tmdb.searchMulti.mockRejectedValue(new Error('Fail'));

    const result = await search('query');
    expect(result).toEqual({ results: [] });
  });

  it('getRecommendations returns empty results on error', async () => {
    tmdb.getMovieRecommendations.mockRejectedValue(new Error('Fail'));

    const result = await getRecommendations(1, 'movie');
    expect(result).toEqual({ results: [] });
  });

  it('getVideos returns empty results on error', async () => {
    tmdb.getMovieVideos.mockRejectedValue(new Error('Fail'));

    const result = await getVideos(1, 'movie');
    expect(result).toEqual({ results: [] });
  });

  it('getImages returns empty structure on error', async () => {
    tmdb.getMovieImages.mockRejectedValue(new Error('Fail'));

    const result = await getImages(1, 'movie');
    expect(result).toEqual({ backdrops: [], posters: [], logos: [] });
  });

  it('getUpcoming returns empty results on error', async () => {
    tmdb.getUpcomingMovies.mockRejectedValue(new Error('Fail'));

    const result = await getUpcoming();
    expect(result).toEqual({ results: [] });
  });

  it('getPersonDetails returns null on error', async () => {
    tmdb.getPersonDetails.mockRejectedValue(new Error('Fail'));

    const result = await getPersonDetails(1);
    expect(result).toBeNull();
  });

  it('getPersonCredits returns null on error', async () => {
    tmdb.getPersonCredits.mockRejectedValue(new Error('Fail'));

    const result = await getPersonCredits(1);
    expect(result).toBeNull();
  });
});

// ============================================
// Wrapper function routing
// ============================================

describe('wrapper function routing', () => {
  it('getTrending routes movie type to getTrendingMovies', async () => {
    tmdb.getTrendingMovies.mockResolvedValue({ results: [] });
    await getTrending('movie', 'day');
    expect(tmdb.getTrendingMovies).toHaveBeenCalledWith('day');
  });

  it('getTrending routes tv type to getTrendingTV', async () => {
    tmdb.getTrendingTV.mockResolvedValue({ results: [] });
    await getTrending('tv', 'week');
    expect(tmdb.getTrendingTV).toHaveBeenCalledWith('week');
  });

  it('getTrending routes all type to getTrendingAll', async () => {
    tmdb.getTrendingAll.mockResolvedValue({ results: [] });
    await getTrending('all', 'week');
    expect(tmdb.getTrendingAll).toHaveBeenCalledWith('week');
  });

  it('getDetails routes movie type to getMovieDetails', async () => {
    tmdb.getMovieDetails.mockResolvedValue({ id: 1 });
    await getDetails(1, 'movie');
    expect(tmdb.getMovieDetails).toHaveBeenCalledWith(1);
  });

  it('getDetails routes tv type to getTVDetails', async () => {
    tmdb.getTVDetails.mockResolvedValue({ id: 1 });
    await getDetails(1, 'tv');
    expect(tmdb.getTVDetails).toHaveBeenCalledWith(1);
  });

  it('getCredits routes movie type to getMovieCredits', async () => {
    tmdb.getMovieCredits.mockResolvedValue({ cast: [] });
    await getCredits(1, 'movie');
    expect(tmdb.getMovieCredits).toHaveBeenCalledWith(1);
  });

  it('getCredits routes tv type to getTVCredits', async () => {
    tmdb.getTVCredits.mockResolvedValue({ cast: [] });
    await getCredits(1, 'tv');
    expect(tmdb.getTVCredits).toHaveBeenCalledWith(1);
  });

  it('search with empty query returns empty without calling API', async () => {
    const result = await search('   ');
    expect(result).toEqual({ results: [] });
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
  });

  it('search routes movie type to searchMovies', async () => {
    tmdb.searchMovies.mockResolvedValue({ results: [] });
    await search('test', 'movie');
    expect(tmdb.searchMovies).toHaveBeenCalledWith('test');
  });

  it('search routes tv type to searchTV', async () => {
    tmdb.searchTV.mockResolvedValue({ results: [] });
    await search('test', 'tv');
    expect(tmdb.searchTV).toHaveBeenCalledWith('test');
  });

  it('search routes multi type to searchMulti', async () => {
    tmdb.searchMulti.mockResolvedValue({ results: [] });
    await search('test', 'multi');
    expect(tmdb.searchMulti).toHaveBeenCalledWith('test');
  });

  it('getRecommendations routes by type', async () => {
    tmdb.getTVRecommendations.mockResolvedValue({ results: [] });
    await getRecommendations(5, 'tv');
    expect(tmdb.getTVRecommendations).toHaveBeenCalledWith(5);
  });

  it('getVideos routes by type', async () => {
    tmdb.getTVVideos.mockResolvedValue({ results: [] });
    await getVideos(5, 'tv');
    expect(tmdb.getTVVideos).toHaveBeenCalledWith(5);
  });

  it('getImages routes by type', async () => {
    tmdb.getTVImages.mockResolvedValue({ backdrops: [], posters: [], logos: [] });
    await getImages(5, 'tv');
    expect(tmdb.getTVImages).toHaveBeenCalledWith(5);
  });

  it('getUpcoming calls getUpcomingMovies', async () => {
    tmdb.getUpcomingMovies.mockResolvedValue({ results: [] });
    await getUpcoming();
    expect(tmdb.getUpcomingMovies).toHaveBeenCalled();
  });

  it('getPersonDetails calls tmdb.getPersonDetails', async () => {
    tmdb.getPersonDetails.mockResolvedValue({ id: 10, name: 'Actor' });
    const result = await getPersonDetails(10);
    expect(result).toEqual({ id: 10, name: 'Actor' });
    expect(tmdb.getPersonDetails).toHaveBeenCalledWith(10);
  });

  it('getPersonCredits calls tmdb.getPersonCredits', async () => {
    tmdb.getPersonCredits.mockResolvedValue({ cast: [], crew: [] });
    const result = await getPersonCredits(10);
    expect(result).toEqual({ cast: [], crew: [] });
    expect(tmdb.getPersonCredits).toHaveBeenCalledWith(10);
  });
});
