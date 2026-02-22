import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { getProgressDisplay } from "../../components/EpisodeLandscapeCard";

// Feature: tizen-parity-phase2, Property 17: Episode landscape card progress indicator behavior
describe("Property 17: Episode landscape card progress indicator behavior", () => {
  /**
   * Validates: Requirements 7.3, 7.4
   *
   * For any episode with a progress value:
   * (a) when 1 <= progress < 85, a progress bar is shown ("bar")
   * (b) when progress >= 85, a checkmark is shown ("checkmark")
   * (c) when progress < 1 or progress is 0/negative, neither is shown ("none")
   */

  it('should return "none" for progress 0 or negative values', () => {
    fc.assert(
      fc.property(
        fc.double({ max: 0, noNaN: true, noDefaultInfinity: true }),
        (progress) => {
          expect(getProgressDisplay(progress)).toBe("none");
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return "none" for progress in (0, 1) exclusive range', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.0001, max: 0.9999, noNaN: true, noDefaultInfinity: true }),
        (progress) => {
          expect(getProgressDisplay(progress)).toBe("none");
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return "bar" for progress in [1, 85) range', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 84.9999, noNaN: true, noDefaultInfinity: true }),
        (progress) => {
          expect(getProgressDisplay(progress)).toBe("bar");
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return "checkmark" for progress >= 85', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 85, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (progress) => {
          expect(getProgressDisplay(progress)).toBe("checkmark");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should have exact boundary: 84 → bar, 85 → checkmark", () => {
    expect(getProgressDisplay(84)).toBe("bar");
    expect(getProgressDisplay(85)).toBe("checkmark");
    expect(getProgressDisplay(0)).toBe("none");
    expect(getProgressDisplay(1)).toBe("bar");
  });
});
