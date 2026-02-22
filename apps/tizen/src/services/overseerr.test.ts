import { describe, it, expect } from 'vitest';
import { getStatusDisplayText } from './overseerr';
import type { OverseerrStatus } from './overseerr';

describe('getStatusDisplayText', () => {
  const cases: [OverseerrStatus, string][] = [
    ['not_requested', 'Request'],
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['declined', 'Declined'],
    ['processing', 'Processing'],
    ['partially_available', 'Partial'],
    ['available', 'Available'],
    ['unknown', 'Unknown'],
  ];

  it.each(cases)('returns "%s" → "%s"', (status, expected) => {
    expect(getStatusDisplayText(status)).toBe(expected);
  });
});
