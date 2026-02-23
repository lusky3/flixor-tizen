import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { deriveMoods, GENRE_MOOD_MAP } from "../../utils/moodTagsUtils";

// Feature: tizen-parity-phase2, Property 18: Mood tag derivation from genres

/** All valid mood values from the map */
const ALL_MOODS = new Set(Object.values(GENRE_MOOD_MAP));

/** Known genre keys (original casing from GENRE_MOOD_MAP) */
const KNOWN_GENRES = Object.keys(GENRE_MOOD_MAP);

/** Arbitrary for known genre strings */
const knownGenreArb = fc.constantFrom(...KNOWN_GENRES);

/** Arbitrary for random strings unlikely to match any genre key */
const randomStringArb = fc.string({ minLength: 1 }).filter(
  (s) => !Object.keys(GENRE_MOOD_MAP).some((k) => k.toLowerCase() === s.toLowerCase()),
);

/** Mixed genre array: some known, some random */
const mixedGenreArrayArb = fc.array(fc.oneof(knownGenreArb, randomStringArb), { maxLength: 30 });

describe("Property 18: Mood tag derivation from genres", () => {
  /**
   * **Validates: Requirements 8.1, 8.2**
   *
   * For any list of genre strings, the derived mood tags are the unique set
   * of mapped moods (using the deterministic GENRE_MOOD_MAP), limited to a
   * maximum of 4 tags. When no genres match any mapping key, the result is
   * an empty array.
   */

  it("should return at most 4 moods for any input", () => {
    fc.assert(
      fc.property(mixedGenreArrayArb, (genres) => {
        const moods = deriveMoods(genres);
        expect(moods.length).toBeLessThanOrEqual(4);
      }),
      { numRuns: 100 },
    );
  });

  it("should return only unique moods (no duplicates)", () => {
    fc.assert(
      fc.property(mixedGenreArrayArb, (genres) => {
        const moods = deriveMoods(genres);
        expect(new Set(moods).size).toBe(moods.length);
      }),
      { numRuns: 100 },
    );
  });

  it("should return empty array when no genres match the map", () => {
    fc.assert(
      fc.property(fc.array(randomStringArb, { maxLength: 20 }), (genres) => {
        const moods = deriveMoods(genres);
        expect(moods).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it("each returned mood must exist as a value in GENRE_MOOD_MAP", () => {
    fc.assert(
      fc.property(mixedGenreArrayArb, (genres) => {
        const moods = deriveMoods(genres);
        for (const mood of moods) {
          expect(ALL_MOODS.has(mood)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("should be case-insensitive: different casings produce the same moods", () => {
    fc.assert(
      fc.property(fc.array(knownGenreArb, { minLength: 1, maxLength: 10 }), (genres) => {
        const lower = deriveMoods(genres.map((g) => g.toLowerCase()));
        const upper = deriveMoods(genres.map((g) => g.toUpperCase()));
        const original = deriveMoods(genres);
        expect(lower).toEqual(original);
        expect(upper).toEqual(original);
      }),
      { numRuns: 100 },
    );
  });
});
