import { describe, it, expect } from 'vitest';
import {
  rerankCandidates,
  scoreCandidate,
  type RerankerCandidate,
  type RerankerContext,
} from '../../services/recommendationReranker';

describe('RecommendationReranker Unit Tests', () => {
  // --- rerankCandidates: empty input ---

  describe('rerankCandidates — empty input', () => {
    it('returns empty array for empty candidates', () => {
      const context: RerankerContext = { likedGenres: ['Action'], likedCast: ['Alice'] };
      expect(rerankCandidates([], context)).toEqual([]);
    });
  });

  // --- rerankCandidates: single candidate ---

  describe('rerankCandidates — single candidate', () => {
    it('returns the same candidate', () => {
      const candidate: RerankerCandidate = {
        id: '1',
        title: 'Solo Movie',
        genres: ['Drama'],
        cast: ['Bob'],
        popularity: 50,
      };
      const context: RerankerContext = { likedGenres: ['Drama'], likedCast: [] };
      const result = rerankCandidates([candidate], context);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Solo Movie');
      expect(result[0]).not.toHaveProperty('_score');
    });
  });

  // --- rerankCandidates: all-zero scores ---

  describe('rerankCandidates — all-zero scores', () => {
    it('preserves original order when all candidates have no matching genres/cast and 0 popularity', () => {
      const candidates: RerankerCandidate[] = [
        { id: 'a', title: 'First', genres: ['Horror'], cast: ['Zara'], popularity: 0 },
        { id: 'b', title: 'Second', genres: ['Sci-Fi'], cast: ['Yuri'], popularity: 0 },
        { id: 'c', title: 'Third', genres: ['Western'], cast: ['Xena'], popularity: 0 },
      ];
      const context: RerankerContext = { likedGenres: ['Comedy'], likedCast: ['Nobody'] };
      const result = rerankCandidates(candidates, context);

      expect(result.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    });
  });

  // --- rerankCandidates: no liked genres/cast ---

  describe('rerankCandidates — no liked genres/cast', () => {
    it('sorts by popularity alone when context has empty likedGenres and likedCast', () => {
      const candidates: RerankerCandidate[] = [
        { id: 'low', title: 'Low Pop', popularity: 10 },
        { id: 'high', title: 'High Pop', popularity: 100 },
        { id: 'mid', title: 'Mid Pop', popularity: 50 },
      ];
      const context: RerankerContext = { likedGenres: [], likedCast: [] };
      const result = rerankCandidates(candidates, context);

      expect(result.map((c) => c.id)).toEqual(['high', 'mid', 'low']);
    });
  });

  // --- rerankCandidates: stable sort ---

  describe('rerankCandidates — stable sort', () => {
    it('maintains original order for candidates with identical scores', () => {
      const candidates: RerankerCandidate[] = [
        { id: 'x', title: 'X', genres: ['Action'], popularity: 20 },
        { id: 'y', title: 'Y', genres: ['Action'], popularity: 20 },
        { id: 'z', title: 'Z', genres: ['Action'], popularity: 20 },
      ];
      const context: RerankerContext = { likedGenres: ['Action'], likedCast: [] };
      const result = rerankCandidates(candidates, context);

      // All have same score (1 genre match * 2 + 20 * 0.1 = 4), so original order preserved
      expect(result.map((c) => c.id)).toEqual(['x', 'y', 'z']);
    });
  });

  // --- scoreCandidate: specific examples with known matches ---

  describe('scoreCandidate — score calculation', () => {
    it('scores genre matches at 2 points each', () => {
      const candidate: RerankerCandidate = {
        id: '1',
        title: 'Test',
        genres: ['Action', 'Comedy', 'Drama'],
        popularity: 0,
      };
      const context: RerankerContext = { likedGenres: ['Action', 'Drama'], likedCast: [] };
      // 2 genre matches * 2 = 4
      expect(scoreCandidate(candidate, context)).toBeCloseTo(4, 10);
    });

    it('scores cast matches at 3 points each', () => {
      const candidate: RerankerCandidate = {
        id: '1',
        title: 'Test',
        cast: ['Alice', 'Bob', 'Charlie'],
        popularity: 0,
      };
      const context: RerankerContext = { likedGenres: [], likedCast: ['Alice', 'Charlie'] };
      // 2 cast matches * 3 = 6
      expect(scoreCandidate(candidate, context)).toBeCloseTo(6, 10);
    });

    it('scores popularity at 0.1 multiplier', () => {
      const candidate: RerankerCandidate = {
        id: '1',
        title: 'Test',
        popularity: 80,
      };
      const context: RerankerContext = { likedGenres: [], likedCast: [] };
      // 80 * 0.1 = 8
      expect(scoreCandidate(candidate, context)).toBeCloseTo(8, 10);
    });

    it('combines genre, cast, and popularity correctly', () => {
      const candidate: RerankerCandidate = {
        id: '1',
        title: 'Test',
        genres: ['Action', 'Comedy'],
        cast: ['Alice'],
        popularity: 50,
      };
      const context: RerankerContext = { likedGenres: ['Action'], likedCast: ['Alice'] };
      // 1 genre * 2 + 1 cast * 3 + 50 * 0.1 = 2 + 3 + 5 = 10
      expect(scoreCandidate(candidate, context)).toBeCloseTo(10, 10);
    });

    it('is case-insensitive for genre matching', () => {
      const candidate: RerankerCandidate = {
        id: '1',
        title: 'Test',
        genres: ['action', 'COMEDY'],
        popularity: 0,
      };
      const context: RerankerContext = { likedGenres: ['Action', 'Comedy'], likedCast: [] };
      // 2 genre matches * 2 = 4
      expect(scoreCandidate(candidate, context)).toBeCloseTo(4, 10);
    });

    it('is case-insensitive for cast matching', () => {
      const candidate: RerankerCandidate = {
        id: '1',
        title: 'Test',
        cast: ['alice', 'BOB'],
        popularity: 0,
      };
      const context: RerankerContext = { likedGenres: [], likedCast: ['Alice', 'Bob'] };
      // 2 cast matches * 3 = 6
      expect(scoreCandidate(candidate, context)).toBeCloseTo(6, 10);
    });

    it('defaults missing genres to empty array (0 matches)', () => {
      const candidate: RerankerCandidate = { id: '1', title: 'Test', popularity: 0 };
      const context: RerankerContext = { likedGenres: ['Action'], likedCast: [] };
      expect(scoreCandidate(candidate, context)).toBeCloseTo(0, 10);
    });

    it('defaults missing cast to empty array (0 matches)', () => {
      const candidate: RerankerCandidate = { id: '1', title: 'Test', popularity: 0 };
      const context: RerankerContext = { likedGenres: [], likedCast: ['Alice'] };
      expect(scoreCandidate(candidate, context)).toBeCloseTo(0, 10);
    });

    it('defaults missing popularity to 0', () => {
      const candidate: RerankerCandidate = { id: '1', title: 'Test' };
      const context: RerankerContext = { likedGenres: [], likedCast: [] };
      expect(scoreCandidate(candidate, context)).toBeCloseTo(0, 10);
    });
  });

  // --- rerankCandidates: score stripping ---

  describe('rerankCandidates — score stripping', () => {
    it('does not include _score in output candidates', () => {
      const candidates: RerankerCandidate[] = [
        { id: '1', title: 'A', genres: ['Action'], popularity: 50 },
        { id: '2', title: 'B', genres: ['Comedy'], popularity: 30 },
      ];
      const context: RerankerContext = { likedGenres: ['Action'], likedCast: [] };
      const result = rerankCandidates(candidates, context);

      for (const c of result) {
        expect(c).not.toHaveProperty('_score');
      }
    });

    it('preserves only original candidate fields', () => {
      const candidates: RerankerCandidate[] = [
        { id: '1', title: 'Movie', genres: ['Drama'], cast: ['Eve'], popularity: 42 },
      ];
      const context: RerankerContext = { likedGenres: [], likedCast: [] };
      const result = rerankCandidates(candidates, context);

      const keys = Object.keys(result[0]);
      const allowedKeys = new Set(['id', 'title', 'genres', 'cast', 'popularity']);
      for (const key of keys) {
        expect(allowedKeys.has(key)).toBe(true);
      }
    });
  });

  // --- rerankCandidates: sorting with mixed scores ---

  describe('rerankCandidates — sorting correctness', () => {
    it('sorts candidates by descending score', () => {
      const candidates: RerankerCandidate[] = [
        { id: 'no-match', title: 'No Match', genres: ['Western'], popularity: 5 },
        { id: 'genre-match', title: 'Genre Match', genres: ['Action'], popularity: 5 },
        { id: 'cast-match', title: 'Cast Match', cast: ['Alice'], popularity: 5 },
        { id: 'both-match', title: 'Both Match', genres: ['Action'], cast: ['Alice'], popularity: 5 },
      ];
      const context: RerankerContext = { likedGenres: ['Action'], likedCast: ['Alice'] };
      const result = rerankCandidates(candidates, context);

      // both-match: 2 + 3 + 0.5 = 5.5
      // cast-match: 0 + 3 + 0.5 = 3.5
      // genre-match: 2 + 0 + 0.5 = 2.5
      // no-match: 0 + 0 + 0.5 = 0.5
      expect(result.map((c) => c.id)).toEqual(['both-match', 'cast-match', 'genre-match', 'no-match']);
    });
  });
});
