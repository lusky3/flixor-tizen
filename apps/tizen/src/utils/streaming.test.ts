import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isHlsStream,
  hasNativeHlsSupport,
  createHlsPlayer,
  getQualityLevels,
  setQualityLevel,
  destroyHlsPlayer,
} from './streaming';

// Mock hls.js
vi.mock('hls.js', () => {
  class MockHls {
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    levels: unknown[] = [];
    currentLevel = -1;
    static isSupported = vi.fn().mockReturnValue(true);
  }
  return { default: MockHls };
});

import Hls from 'hls.js';

describe('streaming utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isHlsStream', () => {
    it('returns true for .m3u8 URLs', () => {
      expect(isHlsStream('https://example.com/stream.m3u8')).toBe(true);
    });

    it('returns true for .m3u8 URLs with query params', () => {
      expect(isHlsStream('https://example.com/stream.m3u8?token=abc')).toBe(true);
    });

    it('returns false for .mp4 URLs', () => {
      expect(isHlsStream('https://example.com/video.mp4')).toBe(false);
    });

    it('returns false for .mkv URLs', () => {
      expect(isHlsStream('https://example.com/video.mkv')).toBe(false);
    });

    it('handles relative paths containing .m3u8', () => {
      expect(isHlsStream('/video/stream.m3u8')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isHlsStream('')).toBe(false);
    });
  });

  describe('hasNativeHlsSupport', () => {
    it('returns false when canPlayType returns empty string', () => {
      const spy = vi.spyOn(document, 'createElement').mockReturnValue({
        canPlayType: vi.fn().mockReturnValue(''),
      } as unknown as HTMLVideoElement);
      expect(hasNativeHlsSupport()).toBe(false);
      spy.mockRestore();
    });

    it('returns true when canPlayType returns "maybe"', () => {
      const spy = vi.spyOn(document, 'createElement').mockReturnValue({
        canPlayType: vi.fn().mockReturnValue('maybe'),
      } as unknown as HTMLVideoElement);
      expect(hasNativeHlsSupport()).toBe(true);
      spy.mockRestore();
    });
  });

  describe('createHlsPlayer', () => {
    it('returns Hls instance when HLS.js is supported', () => {
      vi.mocked(Hls.isSupported).mockReturnValue(true);
      const video = document.createElement('video');
      const hls = createHlsPlayer(video, 'https://example.com/stream.m3u8');

      expect(hls).not.toBeNull();
      expect(hls!.loadSource).toHaveBeenCalledWith('https://example.com/stream.m3u8');
      expect(hls!.attachMedia).toHaveBeenCalledWith(video);
    });

    it('sets video.src when HLS.js not supported but native HLS is', () => {
      vi.mocked(Hls.isSupported).mockReturnValue(false);
      const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          return { canPlayType: vi.fn().mockReturnValue('maybe'), src: '' } as unknown as HTMLVideoElement;
        }
        return document.createElement(tag);
      });

      const video = { src: '' } as HTMLVideoElement;
      const result = createHlsPlayer(video, 'https://example.com/stream.m3u8');

      expect(result).toBeNull();
      expect(video.src).toBe('https://example.com/stream.m3u8');
      spy.mockRestore();
    });

    it('returns null without setting src when neither is supported', () => {
      vi.mocked(Hls.isSupported).mockReturnValue(false);
      const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          return { canPlayType: vi.fn().mockReturnValue('') } as unknown as HTMLVideoElement;
        }
        return document.createElement(tag);
      });

      const video = { src: '' } as HTMLVideoElement;
      const result = createHlsPlayer(video, 'https://example.com/stream.m3u8');

      expect(result).toBeNull();
      expect(video.src).toBe('');
      spy.mockRestore();
    });
  });

  describe('getQualityLevels', () => {
    it('formats 4K quality label', () => {
      const hls = { levels: [{ width: 3840, height: 2160, bitrate: 20_000_000 }] } as unknown as Hls;
      const levels = getQualityLevels(hls);

      expect(levels).toHaveLength(1);
      expect(levels[0].label).toContain('4K');
      expect(levels[0].index).toBe(0);
    });

    it('formats 1080p quality label', () => {
      const hls = { levels: [{ width: 1920, height: 1080, bitrate: 8_000_000 }] } as unknown as Hls;
      const levels = getQualityLevels(hls);

      expect(levels[0].label).toContain('1080p');
    });

    it('formats 720p quality label', () => {
      const hls = { levels: [{ width: 1280, height: 720, bitrate: 4_000_000 }] } as unknown as Hls;
      const levels = getQualityLevels(hls);

      expect(levels[0].label).toContain('720p');
    });

    it('returns empty array when no levels loaded', () => {
      const hls = { levels: [] } as unknown as Hls;
      expect(getQualityLevels(hls)).toEqual([]);
    });

    it('maps multiple levels with correct indices', () => {
      const hls = {
        levels: [
          { width: 1280, height: 720, bitrate: 4_000_000 },
          { width: 1920, height: 1080, bitrate: 8_000_000 },
          { width: 3840, height: 2160, bitrate: 20_000_000 },
        ],
      } as unknown as Hls;
      const levels = getQualityLevels(hls);

      expect(levels).toHaveLength(3);
      expect(levels[0].index).toBe(0);
      expect(levels[1].index).toBe(1);
      expect(levels[2].index).toBe(2);
    });
  });

  describe('setQualityLevel', () => {
    it('sets currentLevel on the Hls instance', () => {
      const hls = { currentLevel: -1 } as Hls;
      setQualityLevel(hls, 2);
      expect(hls.currentLevel).toBe(2);
    });

    it('sets -1 for auto quality', () => {
      const hls = { currentLevel: 2 } as Hls;
      setQualityLevel(hls, -1);
      expect(hls.currentLevel).toBe(-1);
    });
  });

  describe('destroyHlsPlayer', () => {
    it('calls destroy on the Hls instance', () => {
      const hls = { destroy: vi.fn() } as unknown as Hls;
      destroyHlsPlayer(hls);
      expect(hls.destroy).toHaveBeenCalledOnce();
    });
  });
});
