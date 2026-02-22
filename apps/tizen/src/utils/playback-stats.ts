import type { PlexMediaItem } from "@flixor/core";

export interface PlaybackStats {
  videoCodec: string;
  videoResolution: string;
  videoBitrate: number;
  audioCodec: string;
  audioChannels: number;
  bufferHealth: number;
  currentTime: number;
  duration: number;
}

/**
 * Extract playback stats from Plex media metadata and the HTML5 video element.
 */
export function extractPlaybackStats(
  video: HTMLVideoElement | null,
  item: PlexMediaItem | null,
): PlaybackStats {
  const media = item?.Media?.[0];
  const part = media?.Part?.[0];
  const audioStream = part?.Stream?.find((s) => s.streamType === 2);

  // Calculate buffered-ahead seconds from video.buffered ranges
  let bufferHealth = 0;
  if (video && video.buffered.length > 0) {
    for (let i = 0; i < video.buffered.length; i++) {
      const start = video.buffered.start(i);
      const end = video.buffered.end(i);
      if (video.currentTime >= start && video.currentTime <= end) {
        bufferHealth = Math.max(0, end - video.currentTime);
        break;
      }
    }
  }

  return {
    videoCodec: media?.videoCodec || "unknown",
    videoResolution: media?.width && media?.height
      ? `${media.width}x${media.height}`
      : media?.videoResolution || "unknown",
    videoBitrate: media?.bitrate || 0,
    audioCodec: audioStream?.codec || media?.audioCodec || "unknown",
    audioChannels: media?.audioChannels || 0,
    bufferHealth,
    currentTime: video?.currentTime || 0,
    duration: video?.duration || 0,
  };
}
