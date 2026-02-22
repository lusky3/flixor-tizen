import fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlexMediaItem } from '@flixor/core';
import { TraktScrobbler, type TraktMediaIdentifiers } from '../../services/traktScrobbler';

// --- Mocks ---

vi.mock('../../services/trakt', () => ({
  isAuthenticated: vi.fn(() => true),
  scrobbleStart: vi.fn(async () => true),
  scrobbleStop: vi.fn(async () => true),
  scrobbleProgress: vi.fn(async () => true),
}));

vi.mock('../../services/settings', () => ({
  loadSettings: vi.fn(() => ({ traktScrobblingEnabled: true })),
}));

// --- Arbitraries ---

const arbMediaType = fc.constantFrom('movie' as const, 'episode' as const);

const arbImdbId = fc.stringMatching(/^tt\d{7,8}$/);

const arbTmdbId = fc.integer({ min: 1, max: 999999 });

const arbTvdbId = fc.integer({ min: 1, max: 999999 });

const arbTraktMediaIdentifiers: fc.Arbitrary<TraktMediaIdentifiers> = fc
  .record({
    type: arbMediaType,
    imdb: fc.option(arbImdbId, { nil: undefined }),
    tmdb: fc.option(arbTmdbId, { nil: undefined }),
    tvdb: fc.option(arbTvdbId, { nil: undefined }),
  })
  .map((base) => {
    if (base.type === 'episode') {
      return {
        ...base,
        show: { imdb: base.imdb, tmdb: base.tmdb },
        episode: {
          season: Math.floor(Math.random() * 20) + 1,
          number: Math.floor(Math.random() * 24) + 1,
        },
      };
    }
    return base;
  });

const arbProgress = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });

// --- Arbitraries for Property 14 ---

const arbGuidPrefix = fc.constantFrom('imdb://', 'tmdb://', 'tvdb://');

const arbImdbGuidValue = fc.stringMatching(/^tt\d{7,8}$/);
const arbNumericGuidValue = fc.integer({ min: 1, max: 999999 }).map(String);

const arbGuidEntry = arbGuidPrefix.chain((prefix) => {
  const valueArb = prefix === 'imdb://'
    ? arbImdbGuidValue
    : arbNumericGuidValue;
  return valueArb.map((val) => ({ id: `${prefix}${val}` }));
});

const arbGuidArray = fc.array(arbGuidEntry, { minLength: 1, maxLength: 5 });

const arbPlexItemType = fc.constantFrom('movie' as const, 'episode' as const);

const arbPlexMediaItem: fc.Arbitrary<PlexMediaItem> = fc.record({
  type: arbPlexItemType,
  Guid: arbGuidArray,
  ratingKey: fc.integer({ min: 1, max: 999999 }).map(String),
  key: fc.constant('/library/metadata/1'),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  parentIndex: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
  index: fc.option(fc.integer({ min: 1, max: 24 }), { nil: undefined }),
});

// Feature: tizen-parity-phase2, Property 13: Scrobbler lifecycle state transitions
describe('Property 13: Scrobbler lifecycle state transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.10**
   */
  it('(a) after start(), isCurrentlyScrobbling() returns true and getCurrentMedia() returns the started media', () => {
    fc.assert(
      fc.asyncProperty(arbTraktMediaIdentifiers, arbProgress, async (media, progress) => {
        const scrobbler = new TraktScrobbler();

        await scrobbler.start(media, progress);

        expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
        expect(scrobbler.getCurrentMedia()).toEqual(media);
      }),
      { numRuns: 100 },
    );
  });

  it('(b) after pause(), the scrobbler remains active (isCurrentlyScrobbling() still true)', () => {
    fc.assert(
      fc.asyncProperty(arbTraktMediaIdentifiers, arbProgress, arbProgress, async (media, startProgress, pauseProgress) => {
        const scrobbler = new TraktScrobbler();

        await scrobbler.start(media, startProgress);
        await scrobbler.pause(pauseProgress);

        expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('(c) after stop(), isCurrentlyScrobbling() returns false, getCurrentMedia() returns null, getCurrentProgress() returns 0', () => {
    fc.assert(
      fc.asyncProperty(arbTraktMediaIdentifiers, arbProgress, arbProgress, async (media, startProgress, stopProgress) => {
        const scrobbler = new TraktScrobbler();

        await scrobbler.start(media, startProgress);
        await scrobbler.stop(stopProgress);

        expect(scrobbler.isCurrentlyScrobbling()).toBe(false);
        expect(scrobbler.getCurrentMedia()).toBeNull();
        expect(scrobbler.getCurrentProgress()).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('(d) calling start() while already active first stops the existing scrobble (new media is set)', () => {
    fc.assert(
      fc.asyncProperty(
        arbTraktMediaIdentifiers,
        arbTraktMediaIdentifiers,
        arbProgress,
        arbProgress,
        async (media1, media2, progress1, progress2) => {
          const scrobbler = new TraktScrobbler();

          await scrobbler.start(media1, progress1);
          expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
          expect(scrobbler.getCurrentMedia()).toEqual(media1);

          await scrobbler.start(media2, progress2);
          expect(scrobbler.isCurrentlyScrobbling()).toBe(true);
          expect(scrobbler.getCurrentMedia()).toEqual(media2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 14: Plex GUID to Trakt media conversion
describe('Property 14: Plex GUID to Trakt media conversion', () => {
  /**
   * **Validates: Requirements 4.7**
   */
  it('extracts correct IMDB/TMDB/TVDB IDs from Plex Guid array', () => {
    fc.assert(
      fc.property(arbPlexMediaItem, (item) => {
        const result = TraktScrobbler.convertPlexToTraktMedia(item);

        // Must return a result since we always generate at least one valid GUID
        expect(result).not.toBeNull();
        if (!result) return;

        const guids = item.Guid!;

        // The implementation iterates GUIDs in order; the last entry of each
        // prefix type wins. Compute expected values the same way.
        let expectedImdb: string | undefined;
        let expectedTmdb: number | undefined;
        let expectedTvdb: number | undefined;

        for (const g of guids) {
          if (g.id.startsWith('imdb://')) {
            expectedImdb = g.id.slice('imdb://'.length);
          } else if (g.id.startsWith('tmdb://')) {
            const parsed = parseInt(g.id.slice('tmdb://'.length), 10);
            if (!isNaN(parsed)) expectedTmdb = parsed;
          } else if (g.id.startsWith('tvdb://')) {
            const parsed = parseInt(g.id.slice('tvdb://'.length), 10);
            if (!isNaN(parsed)) expectedTvdb = parsed;
          }
        }

        if (expectedImdb !== undefined) expect(result.imdb).toBe(expectedImdb);
        if (expectedTmdb !== undefined) expect(result.tmdb).toBe(expectedTmdb);
        if (expectedTvdb !== undefined) expect(result.tvdb).toBe(expectedTvdb);
      }),
      { numRuns: 100 },
    );
  });

  it('movie type items have type: "movie", episode type items include show and episode fields', () => {
    fc.assert(
      fc.property(arbPlexMediaItem, (item) => {
        const result = TraktScrobbler.convertPlexToTraktMedia(item);
        if (!result) return;

        if (item.type === 'movie') {
          expect(result.type).toBe('movie');
          // Movies should not have show/episode fields
          expect(result.show).toBeUndefined();
          expect(result.episode).toBeUndefined();
        } else if (item.type === 'episode') {
          expect(result.type).toBe('episode');
          // Episodes must include show and episode fields
          expect(result.show).toBeDefined();
          expect(result.episode).toBeDefined();
          expect(result.episode).toHaveProperty('season');
          expect(result.episode).toHaveProperty('number');
          expect(result.episode!.season).toBe(item.parentIndex ?? 0);
          expect(result.episode!.number).toBe(item.index ?? 0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
