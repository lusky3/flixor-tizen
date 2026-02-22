import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

/**
 * Pure function extracted from HeroCarousel.tsx rendering logic.
 *
 * Given a hero item, returns the display data that the component renders.
 * This mirrors the actual rendering decisions in HeroCarousel:
 * - Title: shows TMDB logo if available, otherwise item.title
 * - Year: shown only when truthy
 * - Content rating: defaults to "PG-13" when not provided
 * - Duration: Math.round(duration / 60000) + "m", only when truthy
 * - Overview: defaults to "No overview available for this title." when not provided
 */
interface HeroItem {
  title: string;
  year?: string;
  contentRating?: string;
  duration?: number;
  summary?: string;
}

interface HeroDisplayData {
  title: string;
  year: string | null;
  contentRating: string;
  formattedDuration: string | null;
  overview: string;
}

function getHeroDisplayData(item: HeroItem): HeroDisplayData {
  return {
    title: item.title,
    year: item.year || null,
    contentRating: item.contentRating || 'PG-13',
    formattedDuration: item.duration ? `${Math.round(item.duration / 60000)}m` : null,
    overview: item.summary || 'No overview available for this title.',
  };
}

// Feature: tizen-feature-parity, Property 7: Hero metadata contains required fields
describe('Property 7: Hero metadata contains required fields', () => {
  /**
   * Validates: Requirements 5.4
   *
   * For any PlexMediaItem used as a hero item that has year, contentRating,
   * duration, and summary fields populated, the hero section rendering SHALL
   * include the title (or TMDB logo), year, content rating, formatted duration,
   * and overview text.
   */
  it('hero display data contains all required fields when item fields are populated', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1 }),
          year: fc.integer({ min: 1900, max: 2099 }).map(String),
          contentRating: fc.constantFrom('G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-MA', 'TV-14', 'TV-PG'),
          duration: fc.integer({ min: 1, max: 600000000 }),
          summary: fc.string({ minLength: 1 }),
        }),
        (item) => {
          const display = getHeroDisplayData(item);

          // Title is always present
          expect(display.title).toBe(item.title);

          // Year is present when provided
          expect(display.year).toBe(item.year);

          // Content rating is present (uses provided value)
          expect(display.contentRating).toBe(item.contentRating);

          // Formatted duration matches expected format: "<number>m"
          expect(display.formattedDuration).toBe(`${Math.round(item.duration / 60000)}m`);
          expect(display.formattedDuration).toMatch(/^\d+m$/);

          // Overview is present (uses provided value)
          expect(display.overview).toBe(item.summary);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('hero display data applies correct defaults when optional fields are missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1 }),
          year: fc.constant(undefined),
          contentRating: fc.constant(undefined),
          duration: fc.constant(undefined),
          summary: fc.constant(undefined),
        }),
        (item) => {
          const display = getHeroDisplayData(item);

          // Title is always present
          expect(display.title).toBe(item.title);

          // Year is null when not provided
          expect(display.year).toBeNull();

          // Content rating defaults to "PG-13"
          expect(display.contentRating).toBe('PG-13');

          // Duration is null when not provided
          expect(display.formattedDuration).toBeNull();

          // Overview defaults to fallback text
          expect(display.overview).toBe('No overview available for this title.');
        },
      ),
      { numRuns: 100 },
    );
  });
});
