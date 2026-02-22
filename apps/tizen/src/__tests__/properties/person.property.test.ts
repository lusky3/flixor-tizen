import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

/**
 * Pure sort function extracted from Person.tsx credit sorting logic.
 * Sorts credits by popularity in descending order (highest first).
 */
interface CreditItem {
  title: string;
  popularity: number;
}

function sortCreditsByPopularity(credits: CreditItem[]): CreditItem[] {
  return [...credits].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

// Feature: tizen-feature-parity, Property 19: Person credits sorted by popularity
describe('Property 19: Person credits sorted by popularity', () => {
  /**
   * Validates: Requirements 13.2
   *
   * For any list of TMDB credit objects with popularity scores,
   * the sorted result SHALL be in descending order of popularity (highest first).
   */

  const creditItemArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 50 }),
    popularity: fc.double({ min: 0, max: 10000, noNaN: true }),
  });

  it('sorted result is in descending popularity order', () => {
    fc.assert(
      fc.property(
        fc.array(creditItemArb, { minLength: 0, maxLength: 30 }),
        (credits) => {
          const sorted = sortCreditsByPopularity(credits);

          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].popularity).toBeGreaterThanOrEqual(sorted[i].popularity);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all items are preserved after sorting', () => {
    fc.assert(
      fc.property(
        fc.array(creditItemArb, { minLength: 0, maxLength: 30 }),
        (credits) => {
          const sorted = sortCreditsByPopularity(credits);

          expect(sorted.length).toBe(credits.length);

          const originalTitles = [...credits.map((c) => c.title)].sort();
          const sortedTitles = [...sorted.map((c) => c.title)].sort();
          expect(sortedTitles).toEqual(originalTitles);
        },
      ),
      { numRuns: 100 },
    );
  });
});
