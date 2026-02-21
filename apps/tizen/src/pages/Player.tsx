import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const controlsTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (ratingKey) {
      flixor.plexServer.getMetadata(ratingKey).then((data) => {
        if (!data) return;
        setItem(data);
        const media = data.Media?.[0];
        const part = media?.Part?.[0];
        if (part) {
          flixor.plexServer.getStreamUrl(ratingKey).then((url) => {
            setVideoUrl(url);
          });

          // Identify streams
          const streams = part.Stream || [];
          setAudioTracks(streams.filter((s) => s.streamType === 2));
          setSubtitleTracks(streams.filter((s) => s.streamType === 3));

          const activeAudio = streams.find(
            (s) => s.streamType === 2 && s.selected,
          );
          const activeSub = streams.find(
            (s) => s.streamType === 3 && s.selected,
          );

          if (activeAudio) setSelectedAudio(activeAudio.id);
          if (activeSub) setSelectedSub(activeSub.id);
        }
      });
    }
  }, [ratingKey]);

  // Trakt Scrobbling
  useEffect(() => {
    if (!ratingKey || !item || !flixor.trakt.isAuthenticated()) return;

    const ids = item.Guid || [];
    const tmdbId = ids
      .find((g) => g.id.startsWith("tmdb://"))
      ?.id.replace("tmdb://", "");
    const imdbId = ids
      .find((g) => g.id.startsWith("imdb://"))
      ?.id.replace("imdb://", "");

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
        // For episodes we need grandparent (show) ids
        const grandparentGuid = (item as any).grandparentGuid as
          | Array<{ id: string }>
          | undefined;
        const showTmdb = grandparentGuid
          ?.find((g: { id: string }) => g.id.startsWith("tmdb://"))
          ?.id.replace("tmdb://", "");
        const showImdb = grandparentGuid
          ?.find((g: { id: string }) => g.id.startsWith("imdb://"))
          ?.id.replace("imdb://", "");
        await flixor.trakt.startScrobbleEpisode(
          {
            ids: {
              tmdb: showTmdb ? Number(showTmdb) : undefined,
              imdb: showImdb,
            },
          },
          { season: item.parentIndex || 1, number: item.index || 1 },
          progress,
        );
      }
    };

    startTraktScrobble();

    // Update every minute
    const scrobbleTimer = globalThis.setInterval(startTraktScrobble, 60000);
    const video = videoRef.current;

    return () => {
      globalThis.clearInterval(scrobbleTimer);
      if (video) {
        const progress = (video.currentTime / video.duration) * 100;
        if (item.type === "movie") {
          flixor.trakt.pauseScrobbleMovie(
            {
              ids: { tmdb: tmdbId ? Number(tmdbId) : undefined, imdb: imdbId },
            },
            progress,
          );
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
        flixor.plexServer.updateTimeline(
          ratingKey,
          "playing",
          currentTime,
          duration,
        );
      }
    }, 10000);

    return () => globalThis.clearInterval(interval);
  }, [ratingKey]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current)
      globalThis.clearTimeout(controlsTimeout.current);
    controlsTimeout.current = globalThis.setTimeout(
      () => setShowControls(false),
      5000,
    ) as unknown as number;
  };

  const handleTrackChange = async (
    type: "audio" | "subtitle",
    streamId: number | null,
  ) => {
    if (!ratingKey) return;
    if (type === "audio") setSelectedAudio(streamId);
    else setSelectedSub(streamId);

    // Refresh stream
    const url = await flixor.plexServer.getStreamUrl(ratingKey);
    setVideoUrl(url);
  };

  if (!videoUrl) return <div className="loading">Initializing player...</div>;

  return (
    <div className="player-container" onMouseMove={handleMouseMove}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="tv-video"
        autoPlay
        controls={showControls}
        onTimeUpdate={() => {
          if (!item?.Marker || !videoRef.current) return;
          const currentTime = videoRef.current.currentTime * 1000;
          const marker = item.Marker.find(
            (m) =>
              currentTime >= m.startTimeOffset &&
              currentTime <= m.endTimeOffset,
          );
          setActiveMarker(marker || null);
        }}
        onEnded={() => {
          const video = videoRef.current;
          if (ratingKey && video) {
            flixor.plexServer.updateTimeline(
              ratingKey,
              "stopped",
              Math.floor(video.currentTime * 1000),
              Math.floor(video.duration * 1000),
            );
          }
          navigate(-1);
        }}
      >
        Your browser does not support the video tag.
      </video>

      {showControls && (
        <div className="player-overlay">
          <button className="player-exit" onClick={() => navigate(-1)}>
            &times;
          </button>

          <div className="player-meta">
            <h2 className="player-title">{item?.title}</h2>
          </div>

          {activeMarker && (
            <button
              className="player-skip-btn"
              onClick={() => {
                if (videoRef.current && activeMarker) {
                  videoRef.current.currentTime =
                    activeMarker.endTimeOffset / 1000;
                  setActiveMarker(null);
                }
              }}
            >
              Skip{" "}
              {activeMarker.type === "intro"
                ? "Intro"
                : activeMarker.type === "credits"
                  ? "Credits"
                  : "Commercial"}
            </button>
          )}

          <div className="player-tracks">
            {item?.Media && item.Media.length > 1 && (
              <div className="track-group">
                <h3>Version</h3>
                {item.Media.map((m, idx) => (
                  <button
                    key={m.id}
                    className={`track-btn ${idx === 0 ? "active" : ""}`}
                    onClick={() => {
                      // Handled by refresh but we could pick specific media
                    }}
                  >
                    Version {idx + 1} ({m.videoResolution}p)
                  </button>
                ))}
              </div>
            )}
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
