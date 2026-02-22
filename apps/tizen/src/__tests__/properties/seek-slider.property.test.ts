import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { formatTime, clampSeek, fillPercent } from "../../components/SeekSlider";

// Feature: tizen-parity-phase2, Property 20: Seek slider position and time formatting
// Feature: tizen-parity-phase2, Property 21: Seek increment clamping

/** Arbitrary non-negative time in seconds (up to ~28 hours) */
const timeArb = fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true });

/** Arbitrary positive duration */
const positiveDurationArb = fc.double({ min: 0.001, max: 100_000, noNaN: true, noDefaultInfinity: true });

/** Arbitrary seek delta (can be negative for seeking left) */
const deltaArb = fc.double({ min: -10_000, max: 10_000, noNaN: true, noDefaultInfinity: true });

describe("Property 20: Seek slider position and time formatting", () => {
  /**
   * **Validates: Requirements 12.1, 12.3**
   */

  it("fillPercent returns value in [0, 100] for any non-negative current and positive duration", () => {
    fc.assert(
      fc.property(timeArb, positiveDurationArb, (current, duration) => {
        const pct = fillPercent(current, duration);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 },
    );
  });

  it("fillPercent(0, d) = 0 for any d > 0", () => {
    fc.assert(
      fc.property(positiveDurationArb, (d) => {
        expect(fillPercent(0, d)).toBe(0);
      }),
      { numRuns: 200 },
    );
  });

  it("fillPercent(d, d) = 100 for any d > 0", () => {
    fc.assert(
      fc.property(positiveDurationArb, (d) => {
        expect(fillPercent(d, d)).toBe(100);
      }),
      { numRuns: 200 },
    );
  });

  it("fillPercent(current, 0) = 0", () => {
    fc.assert(
      fc.property(timeArb, (current) => {
        expect(fillPercent(current, 0)).toBe(0);
      }),
      { numRuns: 200 },
    );
  });

  it("formatTime returns MM:SS for values < 3600s", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3599 }), (t) => {
        const result = formatTime(t);
        expect(result).toMatch(/^\d{2}:\d{2}$/);
      }),
      { numRuns: 200 },
    );
  });

  it("formatTime returns H:MM:SS for values >= 3600s", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3600, max: 100_000 }), (t) => {
        const result = formatTime(t);
        expect(result).toMatch(/^\d+:\d{2}:\d{2}$/);
      }),
      { numRuns: 200 },
    );
  });

  it("formatTime(0) = '00:00'", () => {
    expect(formatTime(0)).toBe("00:00");
  });
});

describe("Property 21: Seek increment clamping", () => {
  /**
   * **Validates: Requirements 12.2**
   */

  it("clampSeek always returns value in [0, duration]", () => {
    fc.assert(
      fc.property(timeArb, deltaArb, positiveDurationArb, (current, delta, duration) => {
        const result = clampSeek(current, delta, duration);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(duration);
      }),
      { numRuns: 200 },
    );
  });

  it("clampSeek(0, -10, d) = 0 (can't go below 0)", () => {
    fc.assert(
      fc.property(positiveDurationArb, (d) => {
        expect(clampSeek(0, -10, d)).toBe(0);
      }),
      { numRuns: 200 },
    );
  });

  it("clampSeek(d, 10, d) = d (can't go above duration)", () => {
    fc.assert(
      fc.property(positiveDurationArb, (d) => {
        expect(clampSeek(d, 10, d)).toBe(d);
      }),
      { numRuns: 200 },
    );
  });
});
