import { describe, it, expect } from 'vitest';
import { formatRating, getSourceName } from './mdblist';

describe('formatRating', () => {
  it('returns null for undefined rating', () => {
    expect(formatRating(undefined, 'imdb')).toBeNull();
  });

  it('formats percentage-based ratings', () => {
    expect(formatRating(85.4, 'tomatoes')).toBe('85%');
    expect(formatRating(72.1, 'audience')).toBe('72%');
    expect(formatRating(68.9, 'metacritic')).toBe('69%');
  });

  it('formats decimal-based ratings', () => {
    expect(formatRating(8.5, 'imdb')).toBe('8.5');
    expect(formatRating(7.123, 'tmdb')).toBe('7.1');
    expect(formatRating(4.0, 'trakt')).toBe('4.0');
    expect(formatRating(3.75, 'letterboxd')).toBe('3.8');
  });
});

describe('getSourceName', () => {
  it('maps known sources to display names', () => {
    expect(getSourceName('trakt')).toBe('Trakt');
    expect(getSourceName('imdb')).toBe('IMDb');
    expect(getSourceName('tmdb')).toBe('TMDB');
    expect(getSourceName('letterboxd')).toBe('Letterboxd');
    expect(getSourceName('tomatoes')).toBe('RT Critics');
    expect(getSourceName('audience')).toBe('RT Audience');
    expect(getSourceName('metacritic')).toBe('Metacritic');
  });

  it('returns raw string for unknown source', () => {
    expect(getSourceName('unknown_source')).toBe('unknown_source');
  });
});
