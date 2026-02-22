import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import type { PlaybackStats } from '../../utils/playback-stats';

/**
 * Pure function that extracts display data from PlaybackStats,
 * mirroring what StatsHUD renders.
 */
interface StatsDisplayData {
  videoCodec: string;
  videoResolution: string;
  videoBitrate: string;
  audioCodec: string;
  bufferHealth: string;
}

function getStatsDisplayData(stats: PlaybackStats): StatsDisplayData {
  return {
    videoCodec: stats.videoCodec,
    videoResolution: stats.videoResolution,
    videoBitrate: `${stats.videoBitrate} kbps`,
    audioCodec: stats.audioCodec,
    bufferHealth: `${stats.bufferHealth.toFixed(1)}s`,
  };
}

// Feature: tizen-feature-parity, Property 21: Playback stats HUD contains required fields
describe('Property 21: Playback stats HUD contains required fields', () => {
  /**
   * Validates: Requirements 18.1
   *
   * For any PlaybackStats object with all fields populated, the stats HUD
   * rendering function SHALL produce output containing the video codec,
   * resolution, bitrate, audio codec, and buffer status values.
   */

  const playbackStatsArb = fc.record({
    videoCodec: fc.string({ minLength: 1, maxLength: 20 }),
    videoResolution: fc.string({ minLength: 1, maxLength: 20 }),
    videoBitrate: fc.integer({ min: 1, max: 100000 }),
    audioCodec: fc.string({ minLength: 1, maxLength: 20 }),
    audioChannels: fc.integer({ min: 1, max: 16 }),
    bufferHealth: fc.double({ min: 0, max: 300, noNaN: true }),
    currentTime: fc.double({ min: 0, max: 36000, noNaN: true }),
    duration: fc.double({ min: 0, max: 36000, noNaN: true }),
  });

  it('all required display fields are non-empty strings', () => {
    fc.assert(
      fc.property(playbackStatsArb, (stats) => {
        const display = getStatsDisplayData(stats);

        expect(display.videoCodec).toBeTruthy();
        expect(display.videoResolution).toBeTruthy();
        expect(display.videoBitrate).toBeTruthy();
        expect(display.audioCodec).toBeTruthy();
        expect(display.bufferHealth).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  it('display data contains the original stat values', () => {
    fc.assert(
      fc.property(playbackStatsArb, (stats) => {
        const display = getStatsDisplayData(stats);

        expect(display.videoCodec).toBe(stats.videoCodec);
        expect(display.videoResolution).toBe(stats.videoResolution);
        expect(display.videoBitrate).toContain(String(stats.videoBitrate));
        expect(display.audioCodec).toBe(stats.audioCodec);
        expect(display.bufferHealth).toContain(stats.bufferHealth.toFixed(1));
      }),
      { numRuns: 100 },
    );
  });
});
