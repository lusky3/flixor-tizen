import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

/**
 * Pure function that mirrors the next episode overlay trigger logic.
 * Returns true when the overlay should be shown.
 */
function shouldShowNextEpisodeOverlay(
  hasNextEpisode: boolean,
  duration: number,
  currentTime: number,
): boolean {
  if (!hasNextEpisode || duration <= 30) return false;
  const remaining = duration - currentTime;
  return remaining <= 30 && remaining > 0;
}

// Feature: tizen-feature-parity, Property 13: Next episode overlay trigger
describe('Property 13: Next episode overlay trigger', () => {
  /**
   * Validates: Requirements 8.9
   *
   * For any episode with a known next episode and a video duration > 30 seconds,
   * when the remaining playback time (duration - currentTime) is <= 30 seconds
   * and > 0, the next episode overlay SHALL be triggered.
   */
  it('returns true when hasNextEpisode is true, duration > 30, and 0 < remaining <= 30', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 31, max: 36000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (duration, fraction) => {
          // Generate currentTime such that 0 < remaining <= 30
          // remaining = duration - currentTime, so currentTime = duration - remaining
          // remaining in (0, 30], so remaining = fraction * 29 + 1e-9 capped at 30
          const remaining = fraction * (30 - 1e-9) + 1e-9; // (0, 30]
          const currentTime = duration - remaining;

          if (currentTime < 0) return; // skip invalid combos

          const result = shouldShowNextEpisodeOverlay(true, duration, currentTime);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when remaining > 30 or remaining <= 0 or !hasNextEpisode or duration <= 30', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.double({ min: 0, max: 36000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 36000, noNaN: true, noDefaultInfinity: true }),
        (hasNextEpisode, duration, currentTime) => {
          const remaining = duration - currentTime;
          const shouldTrigger = hasNextEpisode && duration > 30 && remaining > 0 && remaining <= 30;

          const result = shouldShowNextEpisodeOverlay(hasNextEpisode, duration, currentTime);

          if (!shouldTrigger) {
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
