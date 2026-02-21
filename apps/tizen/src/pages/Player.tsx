import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import { loadSettings, saveSettings } from "../services/settings";
import type { PlexMediaItem, PlexMarker, PlexStream } from "@flixor/core";

export function PlayerPage() {
  const { ratingKey } = useParams<{ ratingKey: string }>();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [item, setItem] = useState<PlexMediaItem | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [activeMarker, setActiveMarker] = useState<PlexMarker | null>(null);
  const [audioTracks, setAudioTracks] = useState<PlexStream[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<PlexStream[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<number | null>(null);
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [quality, setQuality] = useState(() => loadSettings().preferredQuality || "original");
  const [resolution, setResolution] = useState(() => loadSettings().preferredResolution || "source");
  const [nextEpisode, setNextEpisode] = useState<PlexMediaItem | null>(null);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(10);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const controlsTimeout = useRef<number | null>(null);
  const nextTimerRef = useRef<number | null>(null);
  const resumeApplied = useRef(false);

  const qualityOptions = useMemo(() => [
    { label: "Original", value: "original" },
    { label: "1 Mbps", value: "1000" },
    { label: "2 Mbps", value: "2000" },
    { label: "4 Mbps", value: "4000" },
    { label: "8 Mbps", value: "8000" },
    { label: "12 Mbps", value: "12000" },
    { label: "20 Mbps", value: "20000" },
  ], []);

  const resolutionOptions = useMemo(() => [
    { label: "Source", value: "source" },
    { label: "480p", value: "480" },
    { label: "720p", value: "720" },
    { label: "1080p", value: "1080" },
    { label: "4K", value: "2160" },
  ], []);

  // Load media and set up video URL
  useEffect(() => {
    if (!ratingKey) return;
    resumeApplied.current = false;

    flixor.plexServer.getMetadata(ratingKey).then((data) => {
      if (!data) return;
      setItem(data);
      const media = data.Media?.[selectedMedia] || data.Media?.[0];
      const part = media?.Part?.[0];
      if (part) {
        if (quality !== "original" || resolution !== "source") {
          const maxBitrate = quality !== "original" ? Number(quality) : undefined;
          const maxRes = resolution !== "source" ? Number(resolution) : undefined;
          const result = flixor.plexServer.getTranscodeUrl(ratingKey, {
            mediaIndex: selectedMedia,
            maxVideoBitrate: maxBitrate,
            videoResolution: maxRes ? `${Math.round(maxRes * 16 / 9)}x${maxRes}` : undefined,
          });
          setVideoUrl(result.startUrl);
        } else {
          flixor.plexServer.getStreamUrl(ratingKey, selectedMedia).then((url) => {
            setVideoUrl(url);
          });
        }

        const streams = part.Stream || [];
        setAudioTracks(streams.filter((s) => s.streamType === 2));
        setSubtitleTracks(streams.filter((s) => s.streamType === 3));
        const activeAudio = streams.find((s) => s.streamType === 2 && s.selected);
        const activeSub = streams.find((s) => s.streamType === 3 && s.selected);
        if (activeAudio) setSelectedAudio(activeAudio.id);
        if (activeSub) setSelectedSub(activeSub.id);
      }

      // Detect next episode for TV shows
      if (data.type === "episode" && data.parentRatingKey) {
        flixor.plexServer.getChildren(data.parentRatingKey).then((siblings) => {
          const currentIdx = siblings.findIndex((e) => e.ratingKey === ratingKey);
          if (currentIdx >= 0 && currentIdx < siblings.length - 1) {
            setNextEpisode(siblings[currentIdx + 1]);
          } else {
            setNextEpisode(null);
          }
        }).catch(() => setNextEpisode(null));
      }
    });
  }, [ratingKey, selectedMedia, quality, resolution]);

  // Resume playback from viewOffset
  useEffect(() => {
    if (!item || !videoRef.current || resumeApplied.current) return;
    const video = videoRef.current;
    const viewOffset = (item as unknown as Record<string, unknown>).viewOffset as number | undefined;
    if (viewOffset && viewOffset > 0) {
      const handleCanPlay = () => {
        if (!resumeApplied.current) {
          video.currentTime = viewOffset / 1000;
          resumeApplied.current = true;
        }
        video.removeEventListener("canplay", handleCanPlay);
      };
      video.addEventListener("canplay", handleCanPlay);
      return () => video.removeEventListener("canplay", handleCanPlay);
    } else {
      resumeApplied.current = true;
    }
  }, [item, videoUrl]);

  // Trakt Scrobbling
  useEffect(() => {
    if (!ratingKey || !item || !flixor.trakt.isAuthenticated()) return;

    const ids = item.Guid || [];
    const tmdbId = ids.find((g) => g.id.startsWith("tmdb://"))?.id.replace("tmdb://", "");
    const imdbId = ids.find((g) => g.id.startsWith("imdb://"))?.id.replace("imdb://", "");

    const startTraktScrobble = async () => {
      const video = videoRef.current;
      if (!video) return;
      const progress = (video.currentTime / video.duration) * 100;

      if (item.type === "movie") {
        await flixor.trakt.startScrobbleMovie(
          { ids: { tmdb: tmdbId ? Number(tmdbId) : undefined, imdb: imdbId } },
          progress,
        );
      } else if (item.type === "episode") {
        const grandparentGuid = (item as unknown as Record<string, unknown>).grandparentGuid as Array<{ id: string }> | undefined;
        const showTmdb = grandparentGuid?.find((g) => g.id.startsWith("tmdb://"))?.id.replace("tmdb://", "");
        const showImdb = grandparentGuid?.find((g) => g.id.startsWith("imdb://"))?.id.replace("imdb://", "");
        await flixor.trakt.startScrobbleEpisode(
          { ids: { tmdb: showTmdb ? Number(showTmdb) : undefined, imdb: showImdb } },
          { season: item.parentIndex || 1, number: item.index || 1 },
          progress,
        );
      }
    };

    startTraktScrobble();
    const scrobbleTimer = globalThis.setInterval(startTraktScrobble, 60000);
    const video = videoRef.current;

    return () => {
      globalThis.clearInterval(scrobbleTimer);
      if (video && video.duration > 0) {
        const progress = (video.currentTime / video.duration) * 100;
        const movieIds = { ids: { tmdb: tmdbId ? Number(tmdbId) : undefined, imdb: imdbId } };

        if (item.type === "movie") {
          // Use stop (marks as watched if >= 80%) instead of pause
          flixor.trakt.stopScrobbleMovie(movieIds, progress).catch(() => {});
        } else if (item.type === "episode") {
          const grandparentGuid = (item as unknown as Record<string, unknown>).grandparentGuid as Array<{ id: string }> | undefined;
          const showTmdb = grandparentGuid?.find((g) => g.id.startsWith("tmdb://"))?.id.replace("tmdb://", "");
          const showImdb = grandparentGuid?.find((g) => g.id.startsWith("imdb://"))?.id.replace("imdb://", "");
          flixor.trakt.stopScrobbleEpisode(
            { ids: { tmdb: showTmdb ? Number(showTmdb) : undefined, imdb: showImdb } },
            { season: item.parentIndex || 1, number: item.index || 1 },
            progress,
          ).catch(() => {});
        }
      }
    };
  }, [ratingKey, item]);

  // Progress Reporting (Plex)
  useEffect(() => {
    if (!ratingKey || !videoRef.current) return;
    const interval = globalThis.setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        const currentTime = Math.floor(video.currentTime * 1000);
        const duration = Math.floor(video.duration * 1000);
        flixor.plexServer.updateTimeline(ratingKey, "playing", currentTime, duration);
      }
    }, 10000);
    return () => globalThis.clearInterval(interval);
  }, [ratingKey]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) globalThis.clearTimeout(controlsTimeout.current);
    controlsTimeout.current = globalThis.setTimeout(() => setShowControls(false), 5000) as unknown as number;
  };

  const handleTrackChange = async (type: "audio" | "subtitle", streamId: number | null) => {
    if (!ratingKey) return;
    if (type === "audio") setSelectedAudio(streamId);
    else setSelectedSub(streamId);
    const url = await flixor.plexServer.getStreamUrl(ratingKey, selectedMedia);
    setVideoUrl(url);
  };

  const handleQualityChange = (val: string) => {
    setQuality(val);
    saveSettings({ preferredQuality: val });
  };

  const handleResolutionChange = (val: string) => {
    setResolution(val);
    saveSettings({ preferredResolution: val });
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const currentTimeMs = video.currentTime * 1000;

    // Marker detection
    if (item?.Marker) {
      const marker = item.Marker.find(
        (m) => currentTimeMs >= m.startTimeOffset && currentTimeMs <= m.endTimeOffset,
      );
      setActiveMarker(marker || null);
    }

    // Next episode overlay: show when within last 30 seconds
    if (nextEpisode && video.duration > 0) {
      const remaining = video.duration - video.currentTime;
      if (remaining <= 30 && remaining > 0 && !showNextOverlay) {
        setShowNextOverlay(true);
        setNextCountdown(Math.ceil(remaining));
        nextTimerRef.current = globalThis.setInterval(() => {
          setNextCountdown((prev) => {
            if (prev <= 1) {
              if (nextTimerRef.current) globalThis.clearInterval(nextTimerRef.current);
              navigate(`/player/${nextEpisode.ratingKey}`, { replace: true });
              return 0;
            }
            return prev - 1;
          });
        }, 1000) as unknown as number;
      }
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (ratingKey && video) {
      flixor.plexServer.updateTimeline(
        ratingKey, "stopped",
        Math.floor(video.currentTime * 1000),
        Math.floor(video.duration * 1000),
      );
    }
    if (nextTimerRef.current) globalThis.clearInterval(nextTimerRef.current);
    if (nextEpisode) {
      navigate(`/player/${nextEpisode.ratingKey}`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  // Cleanup next episode timer
  useEffect(() => {
    return () => {
      if (nextTimerRef.current) globalThis.clearInterval(nextTimerRef.current);
    };
  }, []);

  // Reset next overlay on ratingKey change
  useEffect(() => {
    setShowNextOverlay(false);
    setNextCountdown(10);
    return () => {
      if (nextTimerRef.current) globalThis.clearInterval(nextTimerRef.current);
    };
  }, [ratingKey]);

  if (!videoUrl) return <div className="loading">Initializing player...</div>;

  return (
    <div className="player-container" onMouseMove={handleMouseMove}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="tv-video"
        autoPlay
        controls={showControls}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      >
        Your browser does not support the video tag.
      </video>

      {/* Next Episode Overlay */}
      {showNextOverlay && nextEpisode && (
        <div className="next-episode-overlay">
          <div className="next-episode-info">
            <span className="next-label">Next Episode</span>
            <span className="next-title">
              {nextEpisode.title}
              {nextEpisode.index ? ` (E${nextEpisode.index})` : ""}
            </span>
            <span className="next-countdown">Playing in {nextCountdown}s</span>
          </div>
          <div className="next-actions">
            <button
              className="btn-primary next-play-btn"
              autoFocus
              onClick={() => {
                if (nextTimerRef.current) globalThis.clearInterval(nextTimerRef.current);
                navigate(`/player/${nextEpisode.ratingKey}`, { replace: true });
              }}
            >
              ▶ Play Now
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                if (nextTimerRef.current) globalThis.clearInterval(nextTimerRef.current);
                setShowNextOverlay(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showControls && (
        <div className="player-overlay">
          <button className="player-exit" onClick={() => navigate(-1)}>
            &times;
          </button>

          <div className="player-meta">
            <h2 className="player-title">{item?.title}</h2>
            {item?.type === "episode" && (
              <div className="player-episode-meta">
                S{item.parentIndex || "?"}:E{item.index || "?"} · {(item as unknown as Record<string, unknown>).grandparentTitle as string || ""}
              </div>
            )}
          </div>

          {activeMarker && (
            <button
              className="player-skip-btn"
              onClick={() => {
                if (videoRef.current && activeMarker) {
                  videoRef.current.currentTime = activeMarker.endTimeOffset / 1000;
                  setActiveMarker(null);
                }
              }}
            >
              Skip{" "}
              {activeMarker.type === "intro" ? "Intro" : activeMarker.type === "credits" ? "Credits" : "Commercial"}
            </button>
          )}

          <div className="player-tracks">
            {/* Version picker */}
            {item?.Media && item.Media.length > 1 && (
              <div className="track-group">
                <h3>Version</h3>
                {item.Media.map((m, idx) => (
                  <button
                    key={m.id}
                    className={`track-btn ${idx === selectedMedia ? "active" : ""}`}
                    onClick={() => setSelectedMedia(idx)}
                  >
                    Version {idx + 1} ({m.videoResolution}p)
                  </button>
                ))}
              </div>
            )}

            {/* Quality picker */}
            <div className="track-group">
              <h3>Quality</h3>
              {qualityOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`track-btn ${quality === opt.value ? "active" : ""}`}
                  onClick={() => handleQualityChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Resolution picker */}
            <div className="track-group">
              <h3>Resolution</h3>
              {resolutionOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`track-btn ${resolution === opt.value ? "active" : ""}`}
                  onClick={() => handleResolutionChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Audio tracks */}
            <div className="track-group">
              <h3>Audio</h3>
              {audioTracks.map((t) => (
                <button
                  key={t.id}
                  className={`track-btn ${selectedAudio === t.id ? "active" : ""}`}
                  onClick={() => handleTrackChange("audio", t.id)}
                >
                  {t.language || "Unknown"} ({t.displayTitle})
                </button>
              ))}
            </div>

            {/* Subtitle tracks */}
            <div className="track-group">
              <h3>Subtitles</h3>
              <button
                className={`track-btn ${selectedSub === null ? "active" : ""}`}
                onClick={() => handleTrackChange("subtitle", null)}
              >
                Off
              </button>
              {subtitleTracks.map((t) => (
                <button
                  key={t.id}
                  className={`track-btn ${selectedSub === t.id ? "active" : ""}`}
                  onClick={() => handleTrackChange("subtitle", t.id)}
                >
                  {t.language || "Unknown"} ({t.displayTitle})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
