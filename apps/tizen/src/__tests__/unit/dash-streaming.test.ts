import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration-level unit tests for DASH streaming + playback speed control.
 *
 * Focuses on scenarios NOT already covered by streaming.test.ts or
 * stream-decision.test.ts:
 *   - attachStream routing logic (DASH vs HLS vs direct)
 *   - Fallback when dash.js initialization fails inside attachStream flow
 *   - Backend stream URL fallback to direct Plex stream
 *   - Speed control persistence, cycling, and video.playbackRate sync
 */

// ── Mocks ──────────────────────────────────────────────────────────────

// Mock dashjs — tracks whether create/destroy were called
const mockDashPlayer = {
  initialize: vi.fn(),
  updateSettings: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('dashjs', () => ({
  MediaPlayer: vi.fn(() => ({
    create: vi.fn(() => mockDashPlayer),
  })),
}));

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

vi.mock('../../services/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/settings')>();
  return {
    ...actual,
    saveSettings: vi.fn(actual.saveSettings),
  };
});

vi.mock('../../services/flixor', () => ({
  flixor: {
    plexServer: {
      getStreamUrl: vi.fn(),
    },
  },
}));

import {
  isDashStream,
  createDashPlayer,
  destroyDashPlayer,
  isHlsStream,
  createHlsPlayer,
  destroyHlsPlayer,
} from '../../utils/streaming';
import { loadSettings, saveSettings } from '../../services/settings';
import { getBackendStreamUrl } from '../../services/streamDecision';

const mockSaveSettings = saveSettings as ReturnType<typeof vi.fn>;

// ── Helpers ────────────────────────────────────────────────────────────

/** Replicates the attachStream logic from Player.tsx */
function attachStream(
  video: HTMLVideoElement,
  url: string,
  refs: { hls: any; dash: any },
) {
  // Destroy previous HLS instance
  if (refs.hls) {
    destroyHlsPlayer(refs.hls);
    refs.hls = null;
  }
  // Destroy previous DASH instance
  if (refs.dash) {
    destroyDashPlayer(refs.dash);
    refs.dash = null;
  }

  if (isDashStream(url)) {
    const player = createDashPlayer(video, url);
    refs.dash = player;
  } else if (isHlsStream(url)) {
    const hls = createHlsPlayer(video, url);
    refs.hls = hls;
  } else {
    video.src = url;
  }
}

/** Replicates SPEED_OPTIONS + cycleSpeed from Player.tsx */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function cycleSpeed(current: number): number {
  const currentIdx = SPEED_OPTIONS.indexOf(current as typeof SPEED_OPTIONS[number]);
  const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
  return SPEED_OPTIONS[nextIdx];
}

function handleSpeedChange(
  video: HTMLVideoElement,
  speed: number,
): void {
  video.playbackRate = speed;
  saveSettings({ preferredPlaybackSpeed: speed });
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('DASH Streaming Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashPlayer.initialize.mockClear();
    mockDashPlayer.updateSettings.mockClear();
    mockDashPlayer.destroy.mockClear();
    localStorage.clear();
  });

  // ── 1. attachStream routing ──────────────────────────────────────────

  describe('attachStream routing', () => {
    it('routes .mpd URLs to dash.js player', () => {
      const video = document.createElement('video');
      const refs = { hls: null, dash: null };

      attachStream(video, 'https://plex.local/video/:/transcode/universal/start.mpd?token=abc', refs);

      expect(refs.dash).not.toBeNull();
      expect(refs.hls).toBeNull();
    });

    it('routes .m3u8 URLs to HLS.js player', () => {
      const video = document.createElement('video');
      const refs = { hls: null, dash: null };

      attachStream(video, 'https://plex.local/video/stream.m3u8?token=abc', refs);

      expect(refs.hls).not.toBeNull();
      expect(refs.dash).toBeNull();
    });

    it('routes .mp4 URLs to direct video.src', () => {
      const video = document.createElement('video');
      const refs = { hls: null, dash: null };

      attachStream(video, 'https://plex.local/library/parts/123/file.mp4', refs);

      expect(refs.hls).toBeNull();
      expect(refs.dash).toBeNull();
      expect(video.src).toContain('file.mp4');
    });

    it('routes plain URLs without extension to direct video.src', () => {
      const video = document.createElement('video');
      const refs = { hls: null, dash: null };

      attachStream(video, 'https://plex.local/video/:/transcode/universal/start?token=abc', refs);

      expect(refs.hls).toBeNull();
      expect(refs.dash).toBeNull();
      expect(video.src).toContain('start?token=abc');
    });

    it('destroys previous DASH player when switching to HLS stream', () => {
      const video = document.createElement('video');
      const fakeDash = { destroy: vi.fn() } as any;
      const refs = { hls: null, dash: fakeDash };

      attachStream(video, 'https://plex.local/stream.m3u8', refs);

      expect(fakeDash.destroy).toHaveBeenCalledOnce();
      expect(refs.dash).toBeNull();
      expect(refs.hls).not.toBeNull();
    });

    it('destroys previous HLS player when switching to DASH stream', () => {
      const video = document.createElement('video');
      const fakeHls = { destroy: vi.fn() } as any;
      const refs = { hls: fakeHls, dash: null };

      attachStream(video, 'https://plex.local/manifest.mpd', refs);

      expect(fakeHls.destroy).toHaveBeenCalledOnce();
      expect(refs.hls).toBeNull();
      expect(refs.dash).not.toBeNull();
    });
  });

  // ── 2. DASH fallback on failure ──────────────────────────────────────

  describe('DASH fallback on failure', () => {
    it('sets video.src directly when dash.js throws during initialization', async () => {
      const { MediaPlayer } = await import('dashjs');
      vi.mocked(MediaPlayer).mockImplementationOnce(() => {
        throw new Error('dash.js load failure');
      });

      const video = { src: '' } as HTMLVideoElement;
      const refs = { hls: null, dash: null };

      attachStream(video, 'https://plex.local/manifest.mpd', refs);

      // createDashPlayer returns null on failure and sets video.src
      expect(refs.dash).toBeNull();
      expect(video.src).toBe('https://plex.local/manifest.mpd');
    });
  });

  // ── 3. Backend stream URL fallback ───────────────────────────────────

  describe('backend stream URL fallback', () => {
    function setBackendUrl(url: string) {
      const settings = JSON.parse(localStorage.getItem('flixor.tizen.settings') || '{}');
      settings.backendUrl = url;
      localStorage.setItem('flixor.tizen.settings', JSON.stringify(settings));
    }

    it('returns null when backend is unavailable, allowing direct Plex fallback', async () => {
      // No backendUrl configured in localStorage
      const result = await getBackendStreamUrl('12345');
      expect(result).toBeNull();
    });

    it('returns null on network error, enabling caller to fall back', async () => {
      setBackendUrl('https://backend.example.com');
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await getBackendStreamUrl('12345');
      expect(result).toBeNull();
    });

    it('returns stream result when backend responds with DASH URL', async () => {
      setBackendUrl('https://backend.example.com');
      const mockResponse = {
        streamUrl: 'https://backend.example.com/transcode/manifest.mpd',
        sessionId: 'sess-xyz',
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await getBackendStreamUrl('12345');
      expect(result).not.toBeNull();
      expect(result!.streamUrl).toContain('.mpd');
      expect(result!.sessionId).toBe('sess-xyz');
    });
  });

  // ── 4. Speed control persistence ─────────────────────────────────────

  describe('speed control persistence', () => {
    it('saves speed to settings via saveSettings', () => {
      const video = document.createElement('video');
      handleSpeedChange(video, 1.5);

      expect(mockSaveSettings).toHaveBeenCalledWith({ preferredPlaybackSpeed: 1.5 });
    });

    it('sets video.playbackRate when speed changes', () => {
      const video = document.createElement('video');
      handleSpeedChange(video, 2);

      expect(video.playbackRate).toBe(2);
    });

    it('loads saved speed from settings on init', () => {
      // Persist a speed via real localStorage
      localStorage.setItem('flixor.tizen.settings', JSON.stringify({ preferredPlaybackSpeed: 1.25 }));

      const settings = loadSettings();
      expect(settings.preferredPlaybackSpeed).toBe(1.25);
    });

    it('defaults to undefined when no speed is saved', () => {
      const settings = loadSettings();
      expect(settings.preferredPlaybackSpeed).toBeUndefined();
    });
  });

  // ── 5. Speed cycling ─────────────────────────────────────────────────

  describe('speed cycling', () => {
    it('cycles from 1x to 1.25x', () => {
      expect(cycleSpeed(1)).toBe(1.25);
    });

    it('cycles from 2x back to 0.5x (wraps around)', () => {
      expect(cycleSpeed(2)).toBe(0.5);
    });

    it('cycles from 0.5x to 0.75x', () => {
      expect(cycleSpeed(0.5)).toBe(0.75);
    });

    it('cycles through all speeds in order', () => {
      let speed = 0.5;
      const visited: number[] = [speed];
      for (let i = 0; i < SPEED_OPTIONS.length; i++) {
        speed = cycleSpeed(speed);
        visited.push(speed);
      }
      // After cycling through all options, should return to start
      expect(visited[visited.length - 1]).toBe(0.5);
      // All unique speeds should be visited
      expect(new Set(visited).size).toBe(SPEED_OPTIONS.length);
    });

    it('defaults to first speed option when current speed is not in the list', () => {
      // indexOf returns -1, so (−1 + 1) % 6 = 0 → first option
      expect(cycleSpeed(3)).toBe(SPEED_OPTIONS[0]);
    });

    it('persists speed after cycling', () => {
      const video = document.createElement('video');
      const newSpeed = cycleSpeed(1);
      handleSpeedChange(video, newSpeed);

      expect(video.playbackRate).toBe(1.25);
      expect(mockSaveSettings).toHaveBeenCalledWith({ preferredPlaybackSpeed: 1.25 });
    });
  });
});
