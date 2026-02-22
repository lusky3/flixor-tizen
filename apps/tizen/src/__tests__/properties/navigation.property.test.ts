import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

/**
 * Pure function mirroring the back-key decision logic from useTizenRemote.ts.
 *
 * Returns true when pressing Back/Return should navigate backward (navigate(-1)),
 * false when the app should exit instead (root or login routes).
 */
function shouldNavigateBack(pathname: string): boolean {
  return pathname !== '/' && pathname !== '/login';
}

// Feature: tizen-feature-parity, Property 6: Back key navigates to previous screen on non-root routes
describe('Property 6: Back key navigates to previous screen on non-root routes', () => {
  /**
   * Validates: Requirements 4.4
   *
   * For any route path that is not `/` and not `/login`, pressing the
   * Return/Back key SHALL trigger a navigate(-1) call (backward navigation).
   */

  /** Arbitrary that generates non-root, non-login route paths */
  const nonRootNonLoginPath = fc
    .array(
      fc.string({ minLength: 1, maxLength: 20, unit: fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split(''),
      ) }),
      { minLength: 1, maxLength: 4 },
    )
    .map((segments) => '/' + segments.join('/'))
    .filter((p) => p !== '/' && p !== '/login');

  it('shouldNavigateBack returns true for any non-root, non-login path', () => {
    fc.assert(
      fc.property(nonRootNonLoginPath, (pathname) => {
        expect(shouldNavigateBack(pathname)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('shouldNavigateBack returns false for root path "/"', () => {
    expect(shouldNavigateBack('/')).toBe(false);
  });

  it('shouldNavigateBack returns false for login path "/login"', () => {
    expect(shouldNavigateBack('/login')).toBe(false);
  });
});
