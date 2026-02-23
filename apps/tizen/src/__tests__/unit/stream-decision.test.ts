import { describe, it, expect } from 'vitest';
import {
  canDirectPlay,
  canDirectStream,
  hasDolbyVision,
  decideStream,
  getQualityOptions,
  getSubtitleOptions,
  getAudioOptions,
  getExternalSubtitleUrl,
} from '../../services/streamDecision';

describe('StreamDecision Unit Tests', () => {
  // --- canDirectPlay: specific codec/container combos ---

  describe('canDirectPlay', () => {
    it('returns true for mp4 + h264', () => {
      expect(canDirectPlay({ container: 'mp4', videoCodec: 'h264' })).toBe(true);
    });

    it('returns false for mkv + h264', () => {
      expect(canDirectPlay({ container: 'mkv', videoCodec: 'h264' })).toBe(false);
    });

    it('returns false for mp4 + hevc', () => {
      expect(canDirectPlay({ container: 'mp4', videoCodec: 'hevc' })).toBe(false);
    });

    it('returns false for mkv + hevc', () => {
      expect(canDirectPlay({ container: 'mkv', videoCodec: 'hevc' })).toBe(false);
    });

    it('returns false for avi + h264', () => {
      expect(canDirectPlay({ container: 'avi', videoCodec: 'h264' })).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(canDirectPlay({ container: 'MP4', videoCodec: 'H264' })).toBe(true);
      expect(canDirectPlay({ container: 'Mp4', videoCodec: 'h264' })).toBe(true);
    });
  });

  // --- canDirectStream: codec-only check ---

  describe('canDirectStream', () => {
    it('returns true for h264 in any container', () => {
      expect(canDirectStream({ container: 'mkv', videoCodec: 'h264' })).toBe(true);
      expect(canDirectStream({ container: 'mp4', videoCodec: 'h264' })).toBe(true);
      expect(canDirectStream({ container: 'avi', videoCodec: 'h264' })).toBe(true);
    });

    it('returns false for non-h264 codecs', () => {
      expect(canDirectStream({ container: 'mp4', videoCodec: 'hevc' })).toBe(false);
      expect(canDirectStream({ container: 'mkv', videoCodec: 'vp9' })).toBe(false);
      expect(canDirectStream({ container: 'mp4', videoCodec: 'av1' })).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(canDirectStream({ container: 'mkv', videoCodec: 'H264' })).toBe(true);
    });
  });

  // --- hasDolbyVision: edge cases ---

  describe('hasDolbyVision', () => {
    it('returns true when videoProfile contains "dolby vision"', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', videoProfile: 'dolby vision' }),
      ).toBe(true);
    });

    it('returns true when videoProfile contains "Dolby Vision Profile 5"', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', videoProfile: 'Dolby Vision Profile 5' }),
      ).toBe(true);
    });

    it('returns true when codecTag contains "dvhe"', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', codecTag: 'dvhe' }),
      ).toBe(true);
    });

    it('returns true when codecTag contains "dvh1"', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', codecTag: 'dvh1' }),
      ).toBe(true);
    });

    it('returns true when codecTag is "dvhe.05" (partial match)', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', codecTag: 'dvhe.05' }),
      ).toBe(true);
    });

    it('returns true when both profile and tag match', () => {
      expect(
        hasDolbyVision({
          container: 'mp4',
          videoCodec: 'hevc',
          videoProfile: 'dolby vision',
          codecTag: 'dvhe',
        }),
      ).toBe(true);
    });

    it('returns false when neither profile nor tag match', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', videoProfile: 'main', codecTag: 'hev1' }),
      ).toBe(false);
    });

    it('returns false when profile and tag are undefined', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc' }),
      ).toBe(false);
    });

    it('is case-insensitive for profile', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', videoProfile: 'DOLBY VISION' }),
      ).toBe(true);
    });

    it('is case-insensitive for codecTag', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', codecTag: 'DVHE' }),
      ).toBe(true);
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', codecTag: 'DVH1' }),
      ).toBe(true);
    });
  });

  // --- decideStream: "original" quality for various codec combos ---

  describe('decideStream', () => {
    describe('with "original" quality', () => {
      it('direct-plays mp4 + h264', () => {
        const result = decideStream({ container: 'mp4', videoCodec: 'h264' }, 'original');
        expect(result.strategy).toBe('direct-play');
        expect(result.maxBitrate).toBeUndefined();
      });

      it('direct-streams mkv + h264', () => {
        const result = decideStream({ container: 'mkv', videoCodec: 'h264' }, 'original');
        expect(result.strategy).toBe('direct-stream');
        expect(result.maxBitrate).toBeUndefined();
      });

      it('transcodes mp4 + hevc', () => {
        const result = decideStream({ container: 'mp4', videoCodec: 'hevc' }, 'original');
        expect(result.strategy).toBe('transcode');
        expect(result.maxBitrate).toBeUndefined();
      });

      it('transcodes mkv + hevc', () => {
        const result = decideStream({ container: 'mkv', videoCodec: 'hevc' }, 'original');
        expect(result.strategy).toBe('transcode');
      });

      it('transcodes mkv + vp9', () => {
        const result = decideStream({ container: 'mkv', videoCodec: 'vp9' }, 'original');
        expect(result.strategy).toBe('transcode');
      });

      it('is case-insensitive for "Original"', () => {
        const result = decideStream({ container: 'mp4', videoCodec: 'h264' }, 'Original');
        expect(result.strategy).toBe('direct-play');
      });
    });

    describe('with specific bitrate strings', () => {
      it('transcodes with maxBitrate for "8000"', () => {
        const result = decideStream({ container: 'mp4', videoCodec: 'h264' }, '8000');
        expect(result.strategy).toBe('transcode');
        expect(result.maxBitrate).toBe(8000);
      });

      it('transcodes with maxBitrate for "20000"', () => {
        const result = decideStream({ container: 'mkv', videoCodec: 'hevc' }, '20000');
        expect(result.strategy).toBe('transcode');
        expect(result.maxBitrate).toBe(20000);
      });

      it('transcodes with maxBitrate for "1000"', () => {
        const result = decideStream({ container: 'mp4', videoCodec: 'h264' }, '1000');
        expect(result.strategy).toBe('transcode');
        expect(result.maxBitrate).toBe(1000);
      });
    });

    describe('malformed quality setting', () => {
      it('defaults to transcode for non-numeric, non-original string', () => {
        const result = decideStream({ container: 'mp4', videoCodec: 'h264' }, 'garbage');
        expect(result.strategy).toBe('transcode');
      });

      it('defaults to transcode for empty string', () => {
        const result = decideStream({ container: 'mp4', videoCodec: 'h264' }, '');
        expect(result.strategy).toBe('transcode');
      });
    });
  });

  // --- getQualityOptions: various resolutions ---

  describe('getQualityOptions', () => {
    it('returns only Original for 360p source', () => {
      const options = getQualityOptions(360);
      expect(options).toEqual([
        { label: 'Original', bitrate: 0 },
        { label: '1 Mbps - 360p', bitrate: 1000 },
      ]);
    });

    it('includes 480p options for 480p source', () => {
      const options = getQualityOptions(480);
      const labels = options.map((o) => o.label);
      expect(labels).toContain('Original');
      expect(labels).toContain('2 Mbps - 480p');
      expect(labels).toContain('1 Mbps - 360p');
      expect(labels).not.toContain('8 Mbps - 720p');
    });

    it('includes 720p options for 720p source', () => {
      const options = getQualityOptions(720);
      const labels = options.map((o) => o.label);
      expect(labels).toContain('Original');
      expect(labels).toContain('8 Mbps - 720p');
      expect(labels).toContain('4 Mbps - 720p');
      expect(labels).toContain('2 Mbps - 480p');
      expect(labels).toContain('1 Mbps - 360p');
      expect(labels).not.toContain('20 Mbps - 1080p');
    });

    it('includes 1080p options for 1080p source', () => {
      const options = getQualityOptions(1080);
      const labels = options.map((o) => o.label);
      expect(labels).toContain('Original');
      expect(labels).toContain('20 Mbps - 1080p');
      expect(labels).toContain('12 Mbps - 1080p');
      expect(labels).toContain('8 Mbps - 720p');
    });

    it('includes all options for 4K source', () => {
      const options = getQualityOptions(2160);
      expect(options).toHaveLength(7); // Original + 6 presets
    });

    it('always includes Original', () => {
      expect(getQualityOptions(100).some((o) => o.label === 'Original')).toBe(true);
      expect(getQualityOptions(4320).some((o) => o.label === 'Original')).toBe(true);
    });

    it('strips internal maxHeight from returned objects', () => {
      const options = getQualityOptions(1080);
      for (const opt of options) {
        expect(opt).toEqual({ label: expect.any(String), bitrate: expect.any(Number) });
        expect((opt as any).maxHeight).toBeUndefined();
      }
    });
  });

  // --- getSubtitleOptions and getAudioOptions ---

  describe('getSubtitleOptions', () => {
    it('returns empty array for empty streams', () => {
      expect(getSubtitleOptions([])).toEqual([]);
    });

    it('returns empty array for null/undefined streams', () => {
      expect(getSubtitleOptions(null as any)).toEqual([]);
      expect(getSubtitleOptions(undefined as any)).toEqual([]);
    });

    it('extracts only subtitle streams (streamType 3)', () => {
      const streams = [
        { id: 1, streamType: 1, codec: 'h264', language: 'eng' },
        { id: 2, streamType: 2, codec: 'aac', language: 'eng' },
        { id: 3, streamType: 3, codec: 'srt', language: 'eng', title: 'English' },
        { id: 4, streamType: 3, codec: 'ass', language: 'spa', title: 'Spanish' },
      ] as any;

      const result = getSubtitleOptions(streams);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 3, language: 'eng', codec: 'srt', title: 'English' });
      expect(result[1]).toEqual({ id: 4, language: 'spa', codec: 'ass', title: 'Spanish' });
    });

    it('defaults missing language and codec to empty string', () => {
      const streams = [
        { id: 10, streamType: 3 },
      ] as any;

      const result = getSubtitleOptions(streams);
      expect(result[0].language).toBe('');
      expect(result[0].codec).toBe('');
    });
  });

  describe('getAudioOptions', () => {
    it('returns empty array for empty streams', () => {
      expect(getAudioOptions([])).toEqual([]);
    });

    it('returns empty array for null/undefined streams', () => {
      expect(getAudioOptions(null as any)).toEqual([]);
      expect(getAudioOptions(undefined as any)).toEqual([]);
    });

    it('extracts only audio streams (streamType 2) with channels', () => {
      const streams = [
        { id: 1, streamType: 1, codec: 'h264', language: 'eng' },
        { id: 2, streamType: 2, codec: 'aac', language: 'eng', channels: 2, title: 'Stereo' },
        { id: 3, streamType: 2, codec: 'eac3', language: 'eng', channels: 6, title: '5.1 Surround' },
        { id: 4, streamType: 3, codec: 'srt', language: 'eng' },
      ] as any;

      const result = getAudioOptions(streams);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 2, language: 'eng', codec: 'aac', channels: 2, title: 'Stereo' });
      expect(result[1]).toEqual({ id: 3, language: 'eng', codec: 'eac3', channels: 6, title: '5.1 Surround' });
    });

    it('handles mixed streams with missing optional fields', () => {
      const streams = [
        { id: 5, streamType: 2 },
      ] as any;

      const result = getAudioOptions(streams);
      expect(result[0].language).toBe('');
      expect(result[0].codec).toBe('');
      expect(result[0].channels).toBeUndefined();
    });
  });

  // --- getExternalSubtitleUrl ---

  describe('getExternalSubtitleUrl', () => {
    it('constructs a valid URL with server, key, and token', () => {
      const url = getExternalSubtitleUrl(
        'http://192.168.1.1:32400',
        'mytoken123',
        '/library/streams/42',
      );
      expect(url).toBe('http://192.168.1.1:32400/library/streams/42?X-Plex-Token=mytoken123');
    });

    it('returns empty string when subtitleKey is empty', () => {
      expect(getExternalSubtitleUrl('http://server', 'token', '')).toBe('');
    });

    it('returns empty string when subtitleKey is undefined', () => {
      expect(getExternalSubtitleUrl('http://server', 'token', undefined as any)).toBe('');
    });

    it('handles HTTPS server URLs', () => {
      const url = getExternalSubtitleUrl(
        'https://plex.example.com',
        'tok',
        '/library/parts/99/streams/3',
      );
      expect(url).toBe('https://plex.example.com/library/parts/99/streams/3?X-Plex-Token=tok');
    });
  });

  // --- Malformed metadata defaults ---

  describe('malformed metadata defaults', () => {
    it('canDirectPlay handles missing container/codec gracefully', () => {
      expect(canDirectPlay({ container: '', videoCodec: '' })).toBe(false);
      expect(canDirectPlay({ container: undefined as any, videoCodec: 'h264' })).toBe(false);
      expect(canDirectPlay({ container: 'mp4', videoCodec: undefined as any })).toBe(false);
    });

    it('canDirectStream handles missing videoCodec gracefully', () => {
      expect(canDirectStream({ container: 'mp4', videoCodec: '' })).toBe(false);
      expect(canDirectStream({ container: 'mp4', videoCodec: undefined as any })).toBe(false);
    });

    it('hasDolbyVision handles all undefined optional fields', () => {
      expect(
        hasDolbyVision({ container: 'mp4', videoCodec: 'hevc', videoProfile: undefined, codecTag: undefined }),
      ).toBe(false);
    });

    it('decideStream defaults to transcode for empty codec with "original"', () => {
      const result = decideStream({ container: '', videoCodec: '' }, 'original');
      expect(result.strategy).toBe('transcode');
    });
  });
});


// --- Backend-proxied stream URL tests ---

import {
  getBackendStreamUrl,
  updateBackendProgress,
  type BackendStreamOptions,
} from '../../services/streamDecision';
import { vi, beforeEach, afterEach } from 'vitest';

describe('Backend-Proxied Stream URL Support', () => {
  const BACKEND_URL = 'https://backend.example.com';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setBackendUrl(url: string) {
    const settings = JSON.parse(localStorage.getItem('flixor.tizen.settings') || '{}');
    settings.backendUrl = url;
    localStorage.setItem('flixor.tizen.settings', JSON.stringify(settings));
  }

  describe('getBackendStreamUrl', () => {
    it('returns null when backendUrl is not configured', async () => {
      const result = await getBackendStreamUrl('12345');
      expect(result).toBeNull();
    });

    it('returns stream URL and session ID on success', async () => {
      setBackendUrl(BACKEND_URL);
      const mockResponse = { streamUrl: 'https://stream.example.com/video.mpd', sessionId: 'sess-abc' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await getBackendStreamUrl('12345');
      expect(result).toEqual(mockResponse);
    });

    it('passes options as query parameters', async () => {
      setBackendUrl(BACKEND_URL);
      const mockResponse = { streamUrl: 'https://stream.example.com/video.mpd', sessionId: 'sess-123' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const options: BackendStreamOptions = {
        mediaIndex: 1,
        maxBitrate: 8000,
        directPlay: true,
        audioStreamID: 5,
      };
      await getBackendStreamUrl('99999', options);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/stream/99999');
      expect(calledUrl).toContain('mediaIndex=1');
      expect(calledUrl).toContain('maxBitrate=8000');
      expect(calledUrl).toContain('directPlay=true');
      expect(calledUrl).toContain('audioStreamID=5');
    });

    it('returns null on non-OK response', async () => {
      setBackendUrl(BACKEND_URL);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      );

      const result = await getBackendStreamUrl('12345');
      expect(result).toBeNull();
    });

    it('returns null when response is missing streamUrl', async () => {
      setBackendUrl(BACKEND_URL);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ sessionId: 'sess-abc' }), { status: 200 }),
      );

      const result = await getBackendStreamUrl('12345');
      expect(result).toBeNull();
    });

    it('returns null when response is missing sessionId', async () => {
      setBackendUrl(BACKEND_URL);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ streamUrl: 'https://stream.example.com/video.mpd' }), { status: 200 }),
      );

      const result = await getBackendStreamUrl('12345');
      expect(result).toBeNull();
    });

    it('returns null on network error (graceful fallback)', async () => {
      setBackendUrl(BACKEND_URL);
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await getBackendStreamUrl('12345');
      expect(result).toBeNull();
    });

    it('encodes ratingKey in the URL', async () => {
      setBackendUrl(BACKEND_URL);
      const mockResponse = { streamUrl: 'https://s.example.com/v.mpd', sessionId: 's1' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await getBackendStreamUrl('key/with spaces');
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/stream/key%2Fwith%20spaces');
    });
  });

  describe('updateBackendProgress', () => {
    it('returns false when backendUrl is not configured', async () => {
      const result = await updateBackendProgress('12345', 5000, 120000, 'playing');
      expect(result).toBe(false);
    });

    it('returns true on successful update', async () => {
      setBackendUrl(BACKEND_URL);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('', { status: 200 }),
      );

      const result = await updateBackendProgress('12345', 5000, 120000, 'playing');
      expect(result).toBe(true);
    });

    it('sends correct payload', async () => {
      setBackendUrl(BACKEND_URL);
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('', { status: 200 }),
      );

      await updateBackendProgress('12345', 30000, 7200000, 'paused');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${BACKEND_URL}/api/timeline`);
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({
        ratingKey: '12345',
        timeMs: 30000,
        durationMs: 7200000,
        state: 'paused',
      });
    });

    it('returns false on non-OK response', async () => {
      setBackendUrl(BACKEND_URL);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Server Error', { status: 500 }),
      );

      const result = await updateBackendProgress('12345', 5000, 120000, 'playing');
      expect(result).toBe(false);
    });

    it('returns false on network error (graceful fallback)', async () => {
      setBackendUrl(BACKEND_URL);
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await updateBackendProgress('12345', 5000, 120000, 'playing');
      expect(result).toBe(false);
    });

    it('handles stopped state', async () => {
      setBackendUrl(BACKEND_URL);
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('', { status: 200 }),
      );

      await updateBackendProgress('12345', 120000, 120000, 'stopped');

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.state).toBe('stopped');
    });
  });
});
