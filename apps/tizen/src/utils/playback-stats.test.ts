import { describe, it, expect } from 'vitest';
import { extractPlaybackStats } from './playback-stats';
import type { PlexMediaItem } from '@flixor/core';

function makeItem(overrides: Partial<PlexMediaItem> = {}): PlexMediaItem {
  return {
    ratingKey: '1',
    key: '/library/metadata/1',
    type: 'movie',
    title: 'Test Movie',
    Media: [{
      id: 1,
      duration: 7200000,
      bitrate: 8000,
      width: 1920,
      height: 1080,
      videoCodec: 'h264',
      audioCodec: 'aac',
      audioChannels: 6,
      videoResolution: '1080',
      Part: [{
        id: 1,
        key: '/library/parts/1',
        duration: 7200000,
        Stream: [
          { id: 1, streamType: 1, codec: 'h264' },
          { id: 2, streamType: 2, codec: 'aac' },
          { id: 3, streamType: 3, codec: 'srt' },
        ],
      }],
    }],
    ...overrides,
  };
}

function makeVideo(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  const buffered = {
    length: 1,
    start: () => 0,
    end: () => 30,
  } as TimeRanges;

  return {
    currentTime: 10,
    duration: 7200,
    buffered,
    ...overrides,
  } as unknown as HTMLVideoElement;
}

describe('extractPlaybackStats', () => {
  it('extracts stats from video element and media item', () => {
    const stats = extractPlaybackStats(makeVideo(), makeItem());
    expect(stats.videoCodec).toBe('h264');
    expect(stats.videoResolution).toBe('1920x1080');
    expect(stats.videoBitrate).toBe(8000);
    expect(stats.audioCodec).toBe('aac');
    expect(stats.audioChannels).toBe(6);
    expect(stats.currentTime).toBe(10);
    expect(stats.duration).toBe(7200);
    expect(stats.bufferHealth).toBe(20); // end(30) - currentTime(10)
  });

  it('returns defaults when video is null', () => {
    const stats = extractPlaybackStats(null, makeItem());
    expect(stats.currentTime).toBe(0);
    expect(stats.duration).toBe(0);
    expect(stats.bufferHealth).toBe(0);
  });

  it('returns defaults when item is null', () => {
    const stats = extractPlaybackStats(makeVideo(), null);
    expect(stats.videoCodec).toBe('unknown');
    expect(stats.videoResolution).toBe('unknown');
    expect(stats.videoBitrate).toBe(0);
    expect(stats.audioCodec).toBe('unknown');
    expect(stats.audioChannels).toBe(0);
  });

  it('falls back to videoResolution string when width/height missing', () => {
    const item = makeItem();
    delete item.Media![0].width;
    delete item.Media![0].height;
    const stats = extractPlaybackStats(makeVideo(), item);
    expect(stats.videoResolution).toBe('1080');
  });

  it('handles empty buffered ranges', () => {
    const video = makeVideo({
      buffered: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
    });
    const stats = extractPlaybackStats(video, makeItem());
    expect(stats.bufferHealth).toBe(0);
  });

  it('handles currentTime outside buffered range', () => {
    const video = makeVideo({ currentTime: 100 });
    // buffered is 0-30, currentTime is 100 — outside range
    const stats = extractPlaybackStats(video, makeItem());
    expect(stats.bufferHealth).toBe(0);
  });

  it('uses audioStream codec from Part.Stream when available', () => {
    const item = makeItem();
    item.Media![0].Part![0].Stream![1].codec = 'eac3';
    const stats = extractPlaybackStats(makeVideo(), item);
    expect(stats.audioCodec).toBe('eac3');
  });
});
