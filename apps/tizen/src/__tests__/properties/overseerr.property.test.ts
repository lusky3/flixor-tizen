import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { getStatusDisplayText, type OverseerrStatus } from '../../services/overseerr';

// Feature: tizen-feature-parity, Property 10: Overseerr status display text mapping
describe('Property 10: Overseerr status display text mapping', () => {
  /**
   * Validates: Requirements 7.10
   *
   * For any Overseerr status value in the valid set, the getStatusDisplayText()
   * function SHALL return a non-empty human-readable string corresponding to that status.
   */
  const allStatuses: OverseerrStatus[] = [
    'not_requested', 'pending', 'approved', 'declined',
    'processing', 'partially_available', 'available', 'unknown',
  ];

  it('returns a non-empty string for every valid OverseerrStatus', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStatuses),
        (status) => {
          const text = getStatusDisplayText(status);
          expect(typeof text).toBe('string');
          expect(text.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
