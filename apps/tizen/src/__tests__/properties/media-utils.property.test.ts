import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  extractTechBadges,
  formatResumeLabel,
  detectMarkerAtTime,
  formatCastDisplay,
  type MediaMetadata,
  type Marker,
} from '../../utils/media';

// Feature: tizen-feature-parity, Property 9: Tech badge extraction from media metadata
describe('Property 9: Tech badge extraction from media metadata', () => {
  /**
   * Validates: Requirements 7.1
   *
   * For any Plex media object, extractTechBadges SHALL return "4K" if
   * width >= 3800 or height >= 2100, "HDR" if videoProfile contains "hdr"
   * or "hlg", "Dolby Vision" if videoProfile contains "dv", and "Atmos"
   * if audioProfile contains "atmos" or audioCodec contains "truehd".
   * No badge SHALL be returned for properties that don't match these criteria.
   */
  it('should extract correct badges for any media metadata', () => {
    const videoProfileArb = fc.constantFrom(
      'main', 'main 10', 'hdr10', 'hlg', 'dv', 'dvhe.05', 'hdr10+hlg', undefined,
    );
    const audioProfileArb = fc.constantFrom('lc', 'he-aac', 'atmos', undefined);
    const audioCodecArb = fc.constantFrom('aac', 'ac3', 'eac3', 'truehd', 'dts', undefined);

    const mediaArb: fc.Arbitrary<MediaMetadata> = fc.record({
      width: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 7680 })),
      height: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 4320 })),
      videoProfile: videoProfileArb,
      audioProfile: audioProfileArb,
      audioCodec: audioCodecArb,
    });

    fc.assert(
      fc.property(mediaArb, (media) => {
        const badges = extractTechBadges(media);

        // 4K badge
        const is4K =
          (media.width !== undefined && media.width >= 3800) ||
          (media.height !== undefined && media.height >= 2100);
        if (is4K) {
          expect(badges).toContain('4K');
        } else {
          expect(badges).not.toContain('4K');
        }

        // HDR badge
        const vp = media.videoProfile?.toLowerCase() ?? '';
        const isHDR = vp.includes('hdr') || vp.includes('hlg');
        if (isHDR) {
          expect(badges).toContain('HDR');
        } else {
          expect(badges).not.toContain('HDR');
        }

        // Dolby Vision badge
        const isDV = vp.includes('dv');
        if (isDV) {
          expect(badges).toContain('Dolby Vision');
        } else {
          expect(badges).not.toContain('Dolby Vision');
        }

        // Atmos badge
        const ap = media.audioProfile?.toLowerCase() ?? '';
        const ac = media.audioCodec?.toLowerCase() ?? '';
        const isAtmos = ap.includes('atmos') || ac.includes('truehd');
        if (isAtmos) {
          expect(badges).toContain('Atmos');
        } else {
          expect(badges).not.toContain('Atmos');
        }
      }),
      { numRuns: 100 },
    );
  });
});


// Feature: tizen-feature-parity, Property 11: Resume time label calculation
describe('Property 11: Resume time label calculation', () => {
  /**
   * Validates: Requirements 7.13
   *
   * For any viewOffset and duration where viewOffset > 0, duration > 0,
   * and viewOffset / duration < 0.95, formatResumeLabel SHALL return a
   * string containing the remaining time formatted as either "Xh Ym left"
   * (if >= 60 minutes remaining) or "Xm left" (if < 60 minutes).
   */
  it('should return correctly formatted resume label for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000_000 }),
        fc.integer({ min: 1, max: 10_000_000 }),
        (viewOffset, duration) => {
          // Ensure viewOffset/duration < 0.95 by constraining
          fc.pre(viewOffset > 0 && duration > 0 && viewOffset / duration < 0.95);

          const label = formatResumeLabel(viewOffset, duration);
          expect(label).not.toBeNull();

          const remaining = duration - viewOffset;
          const remainingMin = Math.round(remaining / 60000);

          if (remainingMin >= 60) {
            expect(label).toMatch(/^\d+h \d+m left$/);
          } else {
            expect(label).toMatch(/^\d+m left$/);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 12: Marker detection at current playback time
describe('Property 12: Marker detection at current playback time', () => {
  /**
   * Validates: Requirements 8.4
   *
   * For any list of Marker objects and a current time in milliseconds,
   * detectMarkerAtTime SHALL return the marker whose
   * startTimeOffset <= currentTime <= endTimeOffset, or null if no marker
   * spans the current time. If multiple markers overlap, the first match
   * SHALL be returned.
   */
  it('should detect the correct marker or null for any time and marker list', () => {
    // Generate non-overlapping markers sorted by start time
    const markersArb = fc
      .array(
        fc.record({
          start: fc.integer({ min: 0, max: 1_000_000 }),
          length: fc.integer({ min: 1, max: 100_000 }),
        }),
        { minLength: 0, maxLength: 10 },
      )
      .map((raw) => {
        // Sort by start and space them out to avoid overlaps
        const sorted = raw.sort((a, b) => a.start - b.start);
        const markers: Marker[] = [];
        let cursor = 0;
        for (const r of sorted) {
          const start = cursor + r.start;
          const end = start + r.length;
          markers.push({ startTimeOffset: start, endTimeOffset: end, type: 'intro' });
          cursor = end + 1; // gap of at least 1ms
        }
        return markers;
      });

    fc.assert(
      fc.property(markersArb, fc.integer({ min: 0, max: 5_000_000 }), (markers, currentTime) => {
        const result = detectMarkerAtTime(markers, currentTime);

        const expected =
          markers.find(
            (m) => m.startTimeOffset <= currentTime && currentTime <= m.endTimeOffset,
          ) ?? null;

        expect(result).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 22: Cast member display contains required fields
describe('Property 22: Cast member display contains required fields', () => {
  /**
   * Validates: Requirements 7.4
   *
   * For any cast/crew role object with tag (name), role, and thumb fields,
   * formatCastDisplay SHALL include the person's name and character role.
   */
  it('should include name and role from the cast member', () => {
    const castMemberArb = fc.record({
      tag: fc.oneof(fc.constant(undefined), fc.string({ minLength: 0, maxLength: 100 })),
      role: fc.oneof(fc.constant(undefined), fc.string({ minLength: 0, maxLength: 100 })),
      thumb: fc.oneof(fc.constant(undefined), fc.webUrl()),
    });

    fc.assert(
      fc.property(castMemberArb, (castMember) => {
        const display = formatCastDisplay(castMember);

        expect(display.name).toBe(castMember.tag ?? '');
        expect(display.role).toBe(castMember.role ?? '');
      }),
      { numRuns: 100 },
    );
  });
});
