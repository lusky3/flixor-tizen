import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  rerankCandidates,
  scoreCandidate,
  type RerankerCandidate,
  type RerankerContext,
} from '../../services/recommendationReranker';

// --- Arbitraries ---

const arbGenre = fc.constantFrom(
  'Action', 'Comedy', 'Drama', 'Horror', 'Thriller',
  'Sci-Fi', 'Romance', 'Documentary', 'Animation', 'Fantasy',
);

const arbCastMember = fc.constantFrom(
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve',
  'Frank', 'Grace', 'Hank', 'Ivy', 'Jack',
);

const arbCandidate: fc.Arbitrary<RerankerCandidate> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  genres: fc.option(fc.array(arbGenre, { minLength: 0, maxLength: 5 }), { nil: undefined }),
  cast: fc.option(fc.array(arbCastMember, { minLength: 0, maxLength: 5 }), { nil: undefined }),
  popularity: fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
});

const arbCandidates = fc.array(arbCandidate, { minLength: 0, maxLength: 30 });

const arbContext: fc.Arbitrary<RerankerContext> = fc.record({
  likedGenres: fc.array(arbGenre, { minLength: 0, maxLength: 5 }),
  likedCast: fc.array(arbCastMember, { minLength: 0, maxLength: 5 }),
});

const arbEmptyContext: fc.Arbitrary<RerankerContext> = fc.constant({
  likedGenres: [],
  likedCast: [],
});

// Feature: tizen-parity-phase2, Property 10: Reranker scoring and sorting correctness
describe('Property 10: Reranker scoring and sorting correctness', () => {
  /**
   * Validates: Requirements 3.2, 3.3, 3.5
   */
  it('output is sorted descending by score = genreMatches*2 + castMatches*3 + popularity*0.1', () => {
    fc.assert(
      fc.property(arbCandidates, arbContext, (candidates, context) => {
        const result = rerankCandidates(candidates, context);

        // Verify each adjacent pair is in descending score order
        for (let i = 0; i < result.length - 1; i++) {
          const scoreA = scoreCandidate(result[i], context);
          const scoreB = scoreCandidate(result[i + 1], context);
          expect(scoreA).toBeGreaterThanOrEqual(scoreB);
        }

        // Verify scoreCandidate matches the formula
        for (const candidate of candidates) {
          const likedGenresLower = context.likedGenres.map((g) => g.toLowerCase());
          const likedCastLower = context.likedCast.map((c) => c.toLowerCase());
          const genres = candidate.genres ?? [];
          const cast = candidate.cast ?? [];
          const popularity = candidate.popularity ?? 0;

          const genreMatches = genres.filter((g) =>
            likedGenresLower.includes(g.toLowerCase()),
          ).length;
          const castMatches = cast.filter((c) =>
            likedCastLower.includes(c.toLowerCase()),
          ).length;

          const expectedScore = genreMatches * 2 + castMatches * 3 + popularity * 0.1;
          expect(scoreCandidate(candidate, context)).toBeCloseTo(expectedScore, 10);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('when context has no liked genres or cast, order matches descending popularity', () => {
    fc.assert(
      fc.property(arbCandidates, arbEmptyContext, (candidates, context) => {
        const result = rerankCandidates(candidates, context);

        // With empty context, score = popularity * 0.1, so sort order equals score order
        for (let i = 0; i < result.length - 1; i++) {
          const scoreA = scoreCandidate(result[i], context);
          const scoreB = scoreCandidate(result[i + 1], context);
          expect(scoreA).toBeGreaterThanOrEqual(scoreB);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 11: Reranker strips internal scores from output
describe('Property 11: Reranker strips internal scores from output', () => {
  /**
   * Validates: Requirements 3.4
   */
  it('no returned candidate contains a _score property or any extra property', () => {
    const allowedKeys = new Set(['id', 'title', 'genres', 'cast', 'popularity']);

    fc.assert(
      fc.property(arbCandidates, arbContext, (candidates, context) => {
        const result = rerankCandidates(candidates, context);

        for (const candidate of result) {
          // _score must not be present
          expect(candidate).not.toHaveProperty('_score');

          // All keys must be from the original RerankerCandidate interface
          for (const key of Object.keys(candidate)) {
            expect(allowedKeys.has(key)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 12: Reranker preserves candidate set (length and identity)
describe('Property 12: Reranker preserves candidate set (length and identity)', () => {
  /**
   * Validates: Requirements 3.6
   */
  it('output has same length and same set of id values as input', () => {
    fc.assert(
      fc.property(arbCandidates, arbContext, (candidates, context) => {
        const result = rerankCandidates(candidates, context);

        // Same length
        expect(result).toHaveLength(candidates.length);

        // Same set of ids
        const inputIds = new Set(candidates.map((c) => c.id));
        const outputIds = new Set(result.map((c) => c.id));
        expect(outputIds).toEqual(inputIds);
      }),
      { numRuns: 100 },
    );
  });
});
