import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { MediaCard } from "../components/MediaCard";

export function DetailsPage() {
  const { ratingKey } = useParams<{ ratingKey: string }>();
  const [item, setItem] = useState<PlexMediaItem | null>(null);
  const [seasons, setSeasons] = useState<PlexMediaItem[]>([]);
  const [episodes, setEpisodes] = useState<PlexMediaItem[]>([]);
  const [related, setRelated] = useState<PlexMediaItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleSeasonSelect = useCallback(async (seasonKey: string) => {
    setSelectedSeason(seasonKey);
    const episodeData = await flixor.plexServer.getChildren(seasonKey);
    setEpisodes(episodeData);
  }, []);

  useEffect(() => {
    if (ratingKey) {
      setLoading(true);
      const fetchData = async () => {
        try {
          const data = await flixor.plexServer.getMetadata(ratingKey);
          if (!data) return;
          setItem(data);

          if (data.type === "show") {
            const seasonData = await flixor.plexServer.getChildren(
              data.ratingKey,
            );
            setSeasons(seasonData);
            if (seasonData.length > 0) {
              handleSeasonSelect(seasonData[0].ratingKey);
            }
          }

          const relatedData = await flixor.plexServer.getRelated(ratingKey);
          setRelated(relatedData.slice(0, 10));
        } catch (err) {
          console.error("Failed to load details", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [ratingKey, handleSeasonSelect]);

  if (loading || !item) return <div className="loading">Loading...</div>;

  const backdrop = flixor.plexServer.getImageUrl(item.art || item.thumb);

  // External ratings extraction
  const imdbRating =
    item.Rating?.find((r) => r.type === "imdb") ||
    item.Rating?.find((r) => r.image?.includes("imdb"));
  const rtRating =
    item.Rating?.find((r) => r.type === "rottenTomatoes") ||
    item.Rating?.find((r) => r.image?.includes("rotten"));

  const meta = item as any;
  const trailer = meta.Extras?.Metadata?.find(
    (m: any) =>
      m.extraType === "trailer" || m.title?.toLowerCase().includes("trailer"),
  );

  return (
    <div className="tv-container details-page">
      <div className="backdrop-container">
        <img src={backdrop} className="details-backdrop" alt="" />
        <div className="backdrop-overlay" />
      </div>

      <div className="details-content">
        <button className="btn-back" onClick={() => navigate(-1)}>
          &larr; Back
        </button>

        <div className="details-header">
          <h1 className="details-title">{item.title}</h1>
          <div className="external-ratings">
            {imdbRating && (
              <div className="rating-pill imdb">
                <span className="rating-icon">IMDb</span>
                <span className="rating-value">{imdbRating.value}</span>
              </div>
            )}
            {rtRating && (
              <div className="rating-pill rt">
                <span className="rating-icon">RT</span>
                <span className="rating-value">{rtRating.value}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="hero-meta">
          <span className="meta-badge">{item.year}</span>
          <span className="meta-badge">{item.contentRating || "PG-13"}</span>
          {item.duration && (
            <span className="meta-badge">
              {Math.round(item.duration / 60000)}m
            </span>
          )}
          {meta.Genre && (
            <span className="meta-genre">
              {(meta.Genre as any[]).map((g) => g.tag).join(" • ")}
            </span>
          )}
        </div>

        <p className="details-summary">{item.summary}</p>

        <div className="hero-actions">
          {item.type === "movie" ? (
            <button
              className="btn-primary"
              autoFocus
              onClick={() => navigate(`/player/${item.ratingKey}`)}
            >
              ▶ Play
            </button>
          ) : (
            <button
              className="btn-primary"
              autoFocus
              onClick={() => {
                if (episodes.length > 0)
                  navigate(`/player/${episodes[0].ratingKey}`);
              }}
            >
              ▶ Play S1:E1
            </button>
          )}
          {trailer && (
            <button
              className="btn-secondary"
              onClick={() => navigate(`/player/${trailer.ratingKey}`)}
            >
              Trailer
            </button>
          )}
          <button className="btn-secondary">+ Watchlist</button>
        </div>

        {/* Cast & Crew */}
        {meta.Role && (meta.Role as any[]).length > 0 && (
          <div className="details-section">
            <h2 className="section-title">Cast & Crew</h2>
            <div className="cast-list">
              {(meta.Role as any[]).slice(0, 10).map((role) => (
                <button
                  key={role.tag + (role.role || "")}
                  className="cast-item"
                  onClick={() =>
                    navigate(`/search?query=${encodeURIComponent(role.tag)}`)
                  }
                >
                  <div className="cast-thumb-container">
                    {role.thumb ? (
                      <img
                        src={flixor.plexServer.getImageUrl(role.thumb, 150)}
                        alt={role.tag}
                        className="cast-thumb"
                      />
                    ) : (
                      <div className="cast-thumb-placeholder">
                        {role.tag?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="cast-name">{role.tag}</div>
                  <div className="cast-role">{role.role}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {item.type === "show" && (
          <div className="show-hierarchy">
            <h2 className="section-title">Episodes</h2>
            <div className="seasons-list">
              {seasons.map((s) => (
                <button
                  key={s.ratingKey}
                  className={`season-item ${selectedSeason === s.ratingKey ? "active" : ""}`}
                  onClick={() => handleSeasonSelect(s.ratingKey)}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <div className="episodes-grid">
              {episodes.map((e) => (
                <button
                  key={e.ratingKey}
                  className="episode-card"
                  onClick={() => navigate(`/player/${e.ratingKey}`)}
                >
                  <div className="episode-thumb-container">
                    <img
                      src={flixor.plexServer.getImageUrl(e.thumb || e.art, 300)}
                      alt={e.title}
                      className="episode-thumb"
                    />
                    <div className="episode-play-overlay">▶</div>
                  </div>
                  <div className="episode-info">
                    <div className="episode-number">E{e.index}</div>
                    <div className="episode-title">{e.title}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="details-section">
            <h2 className="section-title">More Like This</h2>
            <div className="tv-row">
              {related.map((r) => (
                <MediaCard
                  key={r.ratingKey}
                  item={r}
                  variant="poster"
                  onClick={() => navigate(`/details/${r.ratingKey}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
