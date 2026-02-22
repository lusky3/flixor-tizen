import { useState, useEffect, useRef } from "react";
import type { PlexMediaItem } from "@flixor/core";
import { extractPlaybackStats } from "../utils/playback-stats";
import type { PlaybackStats } from "../utils/playback-stats";

interface StatsHUDProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  item: PlexMediaItem | null;
  visible: boolean;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBitrate(kbps: number): string {
  if (!kbps) return "N/A";
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} Kbps`;
}

export function StatsHUD({ videoRef, item, visible }: StatsHUDProps) {
  const [stats, setStats] = useState<PlaybackStats | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) {
        globalThis.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const update = () => {
      setStats(extractPlaybackStats(videoRef.current, item));
    };

    update();
    intervalRef.current = globalThis.setInterval(update, 1000) as unknown as number;

    return () => {
      if (intervalRef.current) {
        globalThis.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, videoRef, item]);

  if (!visible || !stats) return null;

  return (
    <div className="stats-hud">
      <div className="stats-hud-title">Playback Stats</div>

      <div className="stats-hud-section">
        <div className="stats-hud-label">Video</div>
        <div className="stats-hud-row">
          <span className="stats-hud-key">Codec</span>
          <span className="stats-hud-value">{stats.videoCodec.toUpperCase()}</span>
        </div>
        <div className="stats-hud-row">
          <span className="stats-hud-key">Resolution</span>
          <span className="stats-hud-value">{stats.videoResolution}</span>
        </div>
        <div className="stats-hud-row">
          <span className="stats-hud-key">Bitrate</span>
          <span className="stats-hud-value">{formatBitrate(stats.videoBitrate)}</span>
        </div>
      </div>

      <div className="stats-hud-section">
        <div className="stats-hud-label">Audio</div>
        <div className="stats-hud-row">
          <span className="stats-hud-key">Codec</span>
          <span className="stats-hud-value">{stats.audioCodec.toUpperCase()}</span>
        </div>
        <div className="stats-hud-row">
          <span className="stats-hud-key">Channels</span>
          <span className="stats-hud-value">{stats.audioChannels}ch</span>
        </div>
      </div>

      <div className="stats-hud-section">
        <div className="stats-hud-label">Buffer</div>
        <div className="stats-hud-row">
          <span className="stats-hud-key">Buffered Ahead</span>
          <span className="stats-hud-value">{stats.bufferHealth.toFixed(1)}s</span>
        </div>
      </div>

      <div className="stats-hud-section">
        <div className="stats-hud-label">Playback</div>
        <div className="stats-hud-row">
          <span className="stats-hud-key">Position</span>
          <span className="stats-hud-value">
            {formatTime(stats.currentTime)} / {formatTime(stats.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
