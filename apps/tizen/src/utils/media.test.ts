import { describe, it, expect } from 'vitest';
import {
  extractTechBadges,
  formatResumeLabel,
  detectMarkerAtTime,
  formatCastDisplay,
} from './media';

describe('extractTechBadges', () => {
  it('returns 4K badge for width >= 3800', () => {
    expect(extractTechBadges({ width: 3840, height: 2160 })).toContain('4K');
  });

  it('returns 4K badge for height >= 2100', () => {
    expect(extractTechBadges({ height: 2160 })).toContain('4K');
  });

  it('does not return 4K for 1080p', () => {
    expect(extractTechBadges({ width: 1920, height: 1080 })).not.toContain('4K');
  });

  it('returns HDR badge for hdr video profile', () => {
    expect(extractTechBadges({ videoProfile: 'HDR10' })).toContain('HDR');
  });

  it('returns HDR badge for HLG profile', () => {
    expect(extractTechBadges({ videoProfile: 'HLG' })).toContain('HDR');
  });

  it('returns Dolby Vision badge', () => {
    expect(extractTechBadges({ videoProfile: 'DV Profile 5' })).toContain('Dolby Vision');
  });

  it('returns Atmos badge for atmos audio profile', () => {
    expect(extractTechBadges({ audioProfile: 'Dolby Atmos' })).toContain('Atmos');
  });

  it('returns Atmos badge for truehd codec', () => {
    expect(extractTechBadges({ audioCodec: 'truehd' })).toContain('Atmos');
  });

  it('returns empty array for no special features', () => {
    expect(extractTechBadges({ width: 1280, height: 720 })).toEqual([]);
  });

  it('returns multiple badges', () => {
    const badges = extractTechBadges({
      width: 3840,
      height: 2160,
      videoProfile: 'HDR10',
      audioProfile: 'Dolby Atmos',
    });
    expect(badges).toEqual(['4K', 'HDR', 'Atmos']);
  });
});

describe('formatResumeLabel', () => {
  it('returns null for zero viewOffset', () => {
    expect(formatResumeLabel(0, 120000)).toBeNull();
  });

  it('returns null for negative viewOffset', () => {
    expect(formatResumeLabel(-1, 120000)).toBeNull();
  });

  it('returns null when >= 95% watched', () => {
    expect(formatResumeLabel(96000, 100000)).toBeNull();
  });

  it('returns minutes remaining for short content', () => {
    // 30min total, 10min watched = 20min left = 1200000ms remaining
    expect(formatResumeLabel(600000, 1800000)).toBe('20m left');
  });

  it('returns hours and minutes for long content', () => {
    // 2h total, 30min watched = 1h 30m left
    expect(formatResumeLabel(1800000, 7200000)).toBe('1h 30m left');
  });

  it('returns null for zero duration', () => {
    expect(formatResumeLabel(1000, 0)).toBeNull();
  });
});

describe('detectMarkerAtTime', () => {
  const markers = [
    { startTimeOffset: 0, endTimeOffset: 30000, type: 'intro' },
    { startTimeOffset: 3500000, endTimeOffset: 3600000, type: 'credits' },
  ];

  it('detects intro marker at start', () => {
    const marker = detectMarkerAtTime(markers, 15000);
    expect(marker).not.toBeNull();
    expect(marker!.type).toBe('intro');
  });

  it('detects credits marker', () => {
    const marker = detectMarkerAtTime(markers, 3550000);
    expect(marker).not.toBeNull();
    expect(marker!.type).toBe('credits');
  });

  it('returns null when no marker at time', () => {
    expect(detectMarkerAtTime(markers, 1000000)).toBeNull();
  });

  it('returns null for empty markers', () => {
    expect(detectMarkerAtTime([], 5000)).toBeNull();
  });

  it('detects marker at exact boundary', () => {
    expect(detectMarkerAtTime(markers, 0)).not.toBeNull();
    expect(detectMarkerAtTime(markers, 30000)).not.toBeNull();
  });
});

describe('formatCastDisplay', () => {
  it('formats cast member with tag and role', () => {
    expect(formatCastDisplay({ tag: 'John Doe', role: 'Hero' }))
      .toEqual({ name: 'John Doe', role: 'Hero' });
  });

  it('handles missing tag', () => {
    expect(formatCastDisplay({ role: 'Villain' }))
      .toEqual({ name: '', role: 'Villain' });
  });

  it('handles missing role', () => {
    expect(formatCastDisplay({ tag: 'Jane Doe' }))
      .toEqual({ name: 'Jane Doe', role: '' });
  });

  it('handles empty object', () => {
    expect(formatCastDisplay({})).toEqual({ name: '', role: '' });
  });
});
