import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { compareSemver } from '../../services/version';

// Feature: tizen-feature-parity, Property 20: Version comparison
describe('Property 20: Version comparison', () => {
  /**
   * Validates: Requirements 17.2
   *
   * For any pair of semver version strings (currentVersion, latestVersion),
   * the `hasUpdate` flag SHALL be `true` if and only if `latestVersion` is
   * strictly greater than `currentVersion` according to semantic versioning rules.
   */

  const semverArb = fc
    .tuple(
      fc.integer({ min: 0, max: 999 }),
      fc.integer({ min: 0, max: 999 }),
      fc.integer({ min: 0, max: 999 }),
    )
    .map(([major, minor, patch]) => ({
      str: `${major}.${minor}.${patch}`,
      major,
      minor,
      patch,
    }));

  it('compareSemver(a, b) > 0 iff a is strictly greater than b', () => {
    fc.assert(
      fc.property(semverArb, semverArb, (a, b) => {
        const result = compareSemver(a.str, b.str);
        const aGreater =
          a.major > b.major ||
          (a.major === b.major && a.minor > b.minor) ||
          (a.major === b.major && a.minor === b.minor && a.patch > b.patch);

        if (aGreater) {
          expect(result).toBeGreaterThan(0);
        } else if (
          a.major === b.major &&
          a.minor === b.minor &&
          a.patch === b.patch
        ) {
          expect(result).toBe(0);
        } else {
          expect(result).toBeLessThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('compareSemver(a, a) === 0 for any version (reflexivity)', () => {
    fc.assert(
      fc.property(semverArb, (a) => {
        expect(compareSemver(a.str, a.str)).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('compareSemver(a, b) > 0 implies compareSemver(b, a) < 0 (antisymmetry)', () => {
    fc.assert(
      fc.property(semverArb, semverArb, (a, b) => {
        const ab = compareSemver(a.str, b.str);
        const ba = compareSemver(b.str, a.str);

        if (ab > 0) {
          expect(ba).toBeLessThan(0);
        } else if (ab < 0) {
          expect(ba).toBeGreaterThan(0);
        } else {
          expect(ba).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
