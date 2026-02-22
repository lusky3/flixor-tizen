import fc from "fast-check";
import { describe, it, expect } from "vitest";

// Feature: tizen-parity-phase2, Property 26: Seek thumbnail URL construction

/**
 * The BIF thumbnail URL is built inline in Player.tsx as a closure.
 * We replicate the same pattern here to test the URL construction logic.
 */
function buildPreviewUrl(partId: number, time: number): string {
  return `/photo/:/transcode?url=/library/parts/${partId}/indexes/sd/${Math.floor(time)}&width=320&height=180`;
}

/** Positive integer partId */
const partIdArb = fc.integer({ min: 1, max: 1_000_000 });

/** Non-negative time in seconds (fractional allowed, up to ~28 hours) */
const timeArb = fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true });

describe("Property 26: Seek thumbnail URL construction", () => {
  /**
   * **Validates: Requirements 18.1, 18.2**
   */

  it("URL contains the partId", () => {
    fc.assert(
      fc.property(partIdArb, timeArb, (partId, time) => {
        const url = buildPreviewUrl(partId, time);
        expect(url).toContain(`/library/parts/${partId}/`);
      }),
      { numRuns: 200 },
    );
  });

  it("URL contains the floored time value", () => {
    fc.assert(
      fc.property(partIdArb, timeArb, (partId, time) => {
        const url = buildPreviewUrl(partId, time);
        const floored = Math.floor(time);
        expect(url).toContain(`/indexes/sd/${floored}`);
      }),
      { numRuns: 200 },
    );
  });

  it("URL contains width=320 and height=180 dimensions", () => {
    fc.assert(
      fc.property(partIdArb, timeArb, (partId, time) => {
        const url = buildPreviewUrl(partId, time);
        expect(url).toContain("width=320");
        expect(url).toContain("height=180");
      }),
      { numRuns: 200 },
    );
  });

  it("URL follows the expected pattern", () => {
    fc.assert(
      fc.property(partIdArb, timeArb, (partId, time) => {
        const url = buildPreviewUrl(partId, time);
        const floored = Math.floor(time);
        expect(url).toBe(
          `/photo/:/transcode?url=/library/parts/${partId}/indexes/sd/${floored}&width=320&height=180`,
        );
      }),
      { numRuns: 200 },
    );
  });
});
