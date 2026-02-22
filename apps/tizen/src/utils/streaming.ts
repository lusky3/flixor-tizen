import Hls from "hls.js";
import type { HlsConfig } from "hls.js";
import { MediaPlayer } from "dashjs";
import type { MediaPlayerClass, MediaPlayerSettingClass } from "dashjs";

/** Represents an available quality level from the HLS manifest */
export interface QualityLevel {
  index: number;
  width: number;
  height: number;
  bitrate: number;
  label: string;
}

/** Default Tizen-optimized HLS.js config overrides */
const TIZEN_HLS_CONFIG: Partial<HlsConfig> = {
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  maxBufferSize: 60 * 1000 * 1000, // 60 MB
  enableWorker: true,
};

/**
 * Check if a URL points to an HLS stream (.m3u8).
 */
export function isHlsStream(url: string): boolean {
  try {
    const pathname = new URL(url, "https://localhost").pathname;
    return pathname.endsWith(".m3u8");
  } catch {
    return url.includes(".m3u8");
  }
}

/**
 * Detect whether the current environment has native HLS support.
 * Some Tizen WebView versions can play HLS natively via the video element.
 */
export function hasNativeHlsSupport(): boolean {
  const video = document.createElement("video");
  return video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

/**
 * Create and attach an HLS.js instance to a video element.
 * Returns the Hls instance, or null if HLS.js is not supported
 * (in which case the caller should fall back to native playback).
 */
export function createHlsPlayer(
  video: HTMLVideoElement,
  url: string,
  options?: Partial<HlsConfig>,
): Hls | null {
  if (!Hls.isSupported()) {
    // Fall back to native — set src directly
    if (hasNativeHlsSupport()) {
      video.src = url;
    }
    return null;
  }

  const config: Partial<HlsConfig> = {
    ...TIZEN_HLS_CONFIG,
    ...options,
  };

  const hls = new Hls(config);
  hls.loadSource(url);
  hls.attachMedia(video);

  return hls;
}

/**
 * Get available quality levels from an HLS.js instance.
 * Returns an empty array if levels aren't loaded yet.
 */
export function getQualityLevels(hls: Hls): QualityLevel[] {
  return hls.levels.map((level, index) => ({
    index,
    width: level.width,
    height: level.height,
    bitrate: level.bitrate,
    label: formatQualityLabel(level.height, level.bitrate),
  }));
}

/**
 * Set the active quality level on an HLS.js instance.
 * Pass -1 for automatic (ABR) quality selection.
 */
export function setQualityLevel(hls: Hls, levelIndex: number): void {
  hls.currentLevel = levelIndex;
}

/**
 * Destroy an HLS.js instance and clean up resources.
 */
export function destroyHlsPlayer(hls: Hls): void {
  hls.destroy();
}

/** Format a human-readable quality label from height and bitrate */
function formatQualityLabel(height: number, bitrate: number): string {
  const mbps = bitrate / 1_000_000;
  if (height >= 2160) return `4K (${mbps.toFixed(1)} Mbps)`;
  if (height >= 1080) return `1080p (${mbps.toFixed(1)} Mbps)`;
  if (height >= 720) return `720p (${mbps.toFixed(1)} Mbps)`;
  if (height >= 480) return `480p (${mbps.toFixed(1)} Mbps)`;
  return `${height}p (${mbps.toFixed(1)} Mbps)`;
}

// ---------------------------------------------------------------------------
// DASH (dash.js) support
// ---------------------------------------------------------------------------

/** Default Tizen-optimized dash.js settings overrides */
const TIZEN_DASH_SETTINGS: MediaPlayerSettingClass = {
  streaming: {
    buffer: {
      bufferTimeDefault: 30,
      bufferTimeAtTopQuality: 60,
    },
  },
};

/**
 * Check if a URL points to a DASH stream (.mpd extension or content-type).
 */
export function isDashStream(url: string): boolean {
  try {
    const pathname = new URL(url, "https://localhost").pathname;
    return pathname.endsWith(".mpd");
  } catch {
    return url.includes(".mpd");
  }
}

/**
 * Create and attach a dash.js MediaPlayer instance to a video element.
 * Returns the MediaPlayerClass instance, or null if dash.js fails to
 * initialize (in which case the caller should fall back to direct src).
 */
export function createDashPlayer(
  video: HTMLVideoElement,
  url: string,
  settings?: MediaPlayerSettingClass,
): MediaPlayerClass | null {
  try {
    const player = MediaPlayer().create();

    player.updateSettings({
      ...TIZEN_DASH_SETTINGS,
      ...settings,
    });

    player.initialize(video, url, false);

    return player;
  } catch {
    // Fallback: set src directly on the video element
    video.src = url;
    return null;
  }
}

/**
 * Destroy a dash.js MediaPlayer instance and clean up resources.
 */
export function destroyDashPlayer(player: MediaPlayerClass): void {
  player.destroy();
}
