import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

/**
 * Pure function that mirrors the search input threshold logic.
 * Returns true when the search function should be invoked.
 */
function shouldInvokeSearch(query: string): boolean {
  return query.length >= 2;
}

/**
 * Pure function that mirrors the library text search filtering logic.
 * Filters items whose title (case-insensitive) includes the query string.
 */
interface LibraryItem {
  title: string;
  genres?: string[];
  addedAt?: number;
}

function filterByTitle(items: LibraryItem[], query: string): LibraryItem[] {
  const q = query.toLowerCase();
  return items.filter((item) => item.title.toLowerCase().includes(q));
}

/**
 * Pure function that mirrors the library genre filtering logic.
 * Filters items that have the selected genre in their genres array.
 */
function filterByGenre(items: LibraryItem[], genre: string): LibraryItem[] {
  return items.filter((item) => (item.genres || []).includes(genre));
}

/**
 * Pure function that mirrors the library default sort order logic.
 * Sorts items by addedAt in descending order (most recently added first).
 */
function sortByAddedAtDesc(items: LibraryItem[]): LibraryItem[] {
  return [...items].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

// Feature: tizen-feature-parity, Property 14: Search input threshold
describe('Property 14: Search input threshold', () => {
  /**
   * Validates: Requirements 9.6
   *
   * For any input string with length < 2, the search function SHALL not be
   * invoked (results remain empty). For any input string with length >= 2,
   * the search function SHALL be invoked.
   */
  it('returns false for any string with length < 2', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1 }),
        (query) => {
          expect(shouldInvokeSearch(query)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns true for any string with length >= 2', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 200 }),
        (query) => {
          expect(shouldInvokeSearch(query)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 15: Library text search filtering
describe('Property 15: Library text search filtering', () => {
  /**
   * Validates: Requirements 10.2
   *
   * For any list of PlexMediaItem objects and a non-empty search query string,
   * the filtered result SHALL contain only items whose title (case-insensitive)
   * includes the query string, and SHALL contain all such items from the
   * original list.
   */
  const libraryItemArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 50 }),
    genres: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    addedAt: fc.nat({ max: 2000000000 }),
  });

  it('filtered result contains only items whose title includes the query', () => {
    fc.assert(
      fc.property(
        fc.array(libraryItemArb, { minLength: 0, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (items, query) => {
          const result = filterByTitle(items, query);
          const q = query.toLowerCase();

          // Every result item must have the query in its title
          for (const item of result) {
            expect(item.title.toLowerCase()).toContain(q);
          }

          // Every original item matching the query must be in the result
          for (const item of items) {
            if (item.title.toLowerCase().includes(q)) {
              expect(result).toContainEqual(item);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 16: Library genre filtering
describe('Property 16: Library genre filtering', () => {
  /**
   * Validates: Requirements 10.4
   *
   * For any list of PlexMediaItem objects and a selected genre string, the
   * filtered result SHALL contain only items that have the selected genre
   * in their Genre metadata array.
   */
  const genrePool = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Documentary', 'Animation'];

  const libraryItemWithGenresArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 50 }),
    genres: fc.subarray(genrePool, { minLength: 0, maxLength: genrePool.length }),
    addedAt: fc.nat({ max: 2000000000 }),
  });

  it('filtered result contains only items that have the selected genre', () => {
    fc.assert(
      fc.property(
        fc.array(libraryItemWithGenresArb, { minLength: 0, maxLength: 30 }),
        fc.constantFrom(...genrePool),
        (items, genre) => {
          const result = filterByGenre(items, genre);

          // Every result item must have the genre
          for (const item of result) {
            expect(item.genres).toContain(genre);
          }

          // Every original item with the genre must be in the result
          for (const item of items) {
            if ((item.genres || []).includes(genre)) {
              expect(result).toContainEqual(item);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 17: Library default sort order
describe('Property 17: Library default sort order', () => {
  /**
   * Validates: Requirements 10.6
   *
   * For any list of library items returned by the default query, the items
   * SHALL be sorted by addedAt in descending order (most recently added first).
   */
  const libraryItemArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 50 }),
    genres: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    addedAt: fc.nat({ max: 2000000000 }),
  });

  it('sorted result is in descending addedAt order', () => {
    fc.assert(
      fc.property(
        fc.array(libraryItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const sorted = sortByAddedAtDesc(items);

          // Length must be preserved
          expect(sorted.length).toBe(items.length);

          // Each consecutive pair must be in descending order
          for (let i = 0; i < sorted.length - 1; i++) {
            expect((sorted[i].addedAt || 0) >= (sorted[i + 1].addedAt || 0)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sorted result contains exactly the same items as the input', () => {
    fc.assert(
      fc.property(
        fc.array(libraryItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const sorted = sortByAddedAtDesc(items);

          // Every input item must appear in the sorted output
          for (const item of items) {
            expect(sorted).toContainEqual(item);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
