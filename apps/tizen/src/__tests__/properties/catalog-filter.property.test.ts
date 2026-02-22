import fc from "fast-check";
import { describe, it, expect } from "vitest";

// Pure filtering function mirroring the logic used by CatalogSettings and Browse/Library pages
function filterLibraries(
  libraries: { key: string; title: string }[],
  disabledKeys: string[],
): { key: string; title: string }[] {
  const disabled = new Set(disabledKeys);
  return libraries.filter((lib) => !disabled.has(lib.key));
}

// --- Arbitraries ---

const arbLibrary = fc.record({
  key: fc.string({ minLength: 1, maxLength: 10 }),
  title: fc.string({ minLength: 1, maxLength: 30 }),
});

const arbLibraries = fc.array(arbLibrary, { minLength: 0, maxLength: 20 });

// Feature: tizen-parity-phase2, Property 16: Disabled libraries are excluded from visible library list
describe("Property 16: Catalog Filtering", () => {
  /**
   * Validates: Requirements 6.2
   */
  it("disabled libraries are excluded and non-disabled are included", () => {
    fc.assert(
      fc.property(arbLibraries, (libraries) => {
        // Pick a random subset of keys to disable
        const allKeys = libraries.map((l) => l.key);
        return fc.assert(
          fc.property(fc.subarray(allKeys), (disabledKeys) => {
            const result = filterLibraries(libraries, disabledKeys);
            const disabledSet = new Set(disabledKeys);

            // Every result item should NOT be in the disabled set
            for (const lib of result) {
              expect(disabledSet.has(lib.key)).toBe(false);
            }

            // Every non-disabled library from input should be in the result
            const resultKeys = new Set(result.map((l) => l.key));
            for (const lib of libraries) {
              if (!disabledSet.has(lib.key)) {
                expect(resultKeys.has(lib.key)).toBe(true);
              }
            }
          }),
        );
      }),
      { numRuns: 100 },
    );
  });

  it("output is a subset of the input", () => {
    fc.assert(
      fc.property(
        arbLibraries,
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 10 }),
        (libraries, disabledKeys) => {
          const result = filterLibraries(libraries, disabledKeys);

          // Every item in result must exist in the original input
          for (const lib of result) {
            expect(libraries.some((l) => l.key === lib.key && l.title === lib.title)).toBe(true);
          }

          // Result length <= input length
          expect(result.length).toBeLessThanOrEqual(libraries.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("empty disabled set means all libraries are visible", () => {
    fc.assert(
      fc.property(arbLibraries, (libraries) => {
        const result = filterLibraries(libraries, []);
        expect(result).toEqual(libraries);
      }),
      { numRuns: 100 },
    );
  });

  it("all keys disabled means no libraries are visible", () => {
    fc.assert(
      fc.property(arbLibraries, (libraries) => {
        const allKeys = libraries.map((l) => l.key);
        const result = filterLibraries(libraries, allKeys);
        expect(result).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });
});
