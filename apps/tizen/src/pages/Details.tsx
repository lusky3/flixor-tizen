import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { MediaCard } from "../components/MediaCard";
import {
  getMDBListRatings,
  formatRating,
  getSourceName,
  type MDBListRatings,
} from "../services/mdblist";
import {
  getOverseerrMediaStatus,
  requestMedia,
  getStatusDisplayText,
  type OverseerrMediaStatus,
} from "../services/overseerr";

export function DetailsPage() {
  const { ratingKey } = useParams<{ ratingKey: string }>();
  const [item, setItem] = useState<PlexMediaItem | null>(null);
  const [seasons, setSeasons] = useState<PlexMediaItem[]>([]);
  const [episodes, setEpisodes] = useState<PlexMediaItem[]>([]);
  const [related, setRelated] = useState<PlexMediaItem[]>([]);
  const [tmdbSimilar, setTmdbSimilar] = useState<PlexMediaItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mdbRatings, setMdbRatings] = useState<MDBListRatings | null>(null);
  const [overseerrStatus, setOverseerrStatus] = useState<OverseerrMediaStatus | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  // New state for gaps 3-7
  const [techBadges, setTechBadges] = useState<string[]>([]);
  const [tagline, setTagline] = useState<string | null>(null);
  const [director, setDirector] = useState<string | null>(null);
  const [writers, setWriters] = useState<string[]>([]);
  const [onDeckEpisode, setOnDeckEpisode] = useState<PlexMediaItem | null>(null);
  // Extra TMDB metadata
  const [productionCompanies, setProductionCompanies] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<string | null>(null);
  const [originalLanguage, setOriginalLanguage] = useState<string | null>(null);
  // YouTube trailer
  const [youtubeTrailerKey, setYoutubeTrailerKey] = useState<string | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const navigate = useNavigate();

  const handleSeasonSelect = useCallback(async (seasonKey: string) => {
    setSelectedSeason(seasonKey);
    const episodeData = await flixor.plexServer.getChildren(seasonKey);
    setEpisodes(episodeData);
  }, []);

  useEffect(() => {
    if (ratingKey) {
      setLoading(true);
      setMdbRatings(null);
      setOverseerrStatus(null);
      setTechBadges([]);
      setTagline(null);
      setDirector(null);
      setWriters([]);
      setTmdbSimilar([]);
      setOnDeckEpisode(null);
      setProductionCompanies([]);
      setBudget(null);
      setRevenue(null);
      setStatus(null);
      setReleaseDate(null);
      setOriginalLanguage(null);
      setYoutubeTrailerKey(null);
      setShowTrailerModal(false);
      const fetchData = async () => {
        try {
          const data = await flixor.plexServer.getMetadata(ratingKey);
          if (!data) return;
          setItem(data);

          // Extract tech badges from Media metadata
          const media0 = data.Media?.[0] as Record<string, unknown> | undefined;
          if (media0) {
            const badges: string[] = [];
            const w = (media0.width as number) || 0;
            const h = (media0.height as number) || 0;
            if (w >= 3800 || h >= 2100) badges.push("4K");
            const vp = ((media0.videoProfile as string) || "").toLowerCase();
            if (vp.includes("hdr") || vp.includes("hlg")) badges.push("HDR");
            if (vp.includes("dv")) badges.push("Dolby Vision");
            const ap = ((media0.audioProfile as string) || "").toLowerCase();
            const ac = ((media0.audioCodec as string) || "").toLowerCase();
            if (ap.includes("atmos") || ac.includes("truehd")) badges.push("Atmos");
            setTechBadges(badges);
          }

          if (data.type === "show") {
            const seasonData = await flixor.plexServer.getChildren(data.ratingKey);
            setSeasons(seasonData);
            if (seasonData.length > 0) handleSeasonSelect(seasonData[0].ratingKey);

            // Fetch on-deck episode for shows
            try {
              const onDeck = await flixor.plexServer.getOnDeck();
              const showOnDeck = onDeck.find((e: PlexMediaItem) => {
                const meta = e as any;
                return meta.grandparentRatingKey === data.ratingKey || meta.parentRatingKey === data.ratingKey;
              });
              if (showOnDeck) setOnDeckEpisode(showOnDeck);
            } catch { /* ignore */ }
          }

          const relatedData = await flixor.plexServer.getRelated(ratingKey);
          setRelated(relatedData.slice(0, 10));

          // Fetch MDBList ratings and Overseerr status
          const guids = data.Guid || [];
          const imdbGuid = guids.find((g) => g.id.startsWith("imdb://"));
          const tmdbGuid = guids.find((g) => g.id.startsWith("tmdb://"));
          const imdbId = imdbGuid?.id.replace("imdb://", "");
          const tmdbId = tmdbGuid?.id.replace("tmdb://", "");

          if (imdbId) {
            getMDBListRatings(imdbId, data.type === "show" ? "show" : "movie")
              .then(setMdbRatings)
              .catch(() => {});
          }

          if (tmdbId) {
            const mediaType = data.type === "show" ? "tv" : "movie";
            getOverseerrMediaStatus(Number(tmdbId), mediaType as "movie" | "tv")
              .then(setOverseerrStatus)
              .catch(() => {});

            // Fetch TMDB details for tagline + credits for director/writers
            try {
              const tmdbDetails = data.type === "show"
                ? await flixor.tmdb.getTVDetails(Number(tmdbId))
                : await flixor.tmdb.getMovieDetails(Number(tmdbId));
              const d = tmdbDetails as unknown as Record<string, unknown>;
              if (d.tagline) setTagline(d.tagline as string);

              // Extract extra metadata
              if (d.production_companies) {
                const companies = (d.production_companies as Array<Record<string, unknown>>)
                  .map((c) => c.name as string).filter(Boolean).slice(0, 3);
                if (companies.length > 0) setProductionCompanies(companies);
              }
              if (typeof d.budget === "number" && d.budget > 0) setBudget(d.budget as number);
              if (typeof d.revenue === "number" && d.revenue > 0) setRevenue(d.revenue as number);
              if (d.status) setStatus(d.status as string);
              if (d.release_date) setReleaseDate(d.release_date as string);
              else if (d.first_air_date) setReleaseDate(d.first_air_date as string);
              if (d.original_language) setOriginalLanguage((d.original_language as string).toUpperCase());

              // Fetch YouTube trailer via TMDB videos
              try {
                const videos = data.type === "show"
                  ? await flixor.tmdb.getTVVideos(Number(tmdbId))
                  : await flixor.tmdb.getMovieVideos(Number(tmdbId));
                const vids = (videos as Record<string, unknown>).results as Array<Record<string, unknown>> || [];
                const yt = vids.find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
                if (yt?.key) setYoutubeTrailerKey(yt.key as string);
              } catch { /* ignore videos */ }

              // Fetch credits
              try {
                const credits = data.type === "show"
                  ? await flixor.tmdb.getTVCredits(Number(tmdbId))
                  : await flixor.tmdb.getMovieCredits(Number(tmdbId));
                const crew = (credits as any).crew || [];
                const dirs = crew.filter((c: any) => c.job === "Director").map((c: any) => c.name);
                if (dirs.length > 0) setDirector(dirs.join(", "));
                const writerList = crew
                  .filter((c: any) => c.department === "Writing" || c.job === "Screenplay" || c.job === "Writer")
                  .map((c: any) => c.name);
                if (writerList.length > 0) setWriters([...new Set(writerList)].slice(0, 5) as string[]);
              } catch { /* ignore credits */ }

              // Fetch TMDB similar/recommendations
              try {
                const recs = data.type === "show"
                  ? await flixor.tmdb.getTVRecommendations(Number(tmdbId))
                  : await flixor.tmdb.getMovieRecommendations(Number(tmdbId));
                const results = (recs as any).results || [];
                const simItems: PlexMediaItem[] = results.slice(0, 10).map((r: any) => ({
                  ratingKey: `tmdb-${mediaType}-${r.id}`,
                  title: r.title || r.name,
                  thumb: flixor.tmdb.getPosterUrl(r.poster_path, "w500"),
                  art: flixor.tmdb.getBackdropUrl(r.backdrop_path, "original"),
                  year: (r.release_date || r.first_air_date || "").split("-")[0],
                  summary: r.overview || "",
                  duration: 0,
                  guid: `tmdb://${r.id}`,
                })) as any[];
                setTmdbSimilar(simItems);
              } catch { /* ignore recs */ }
            } catch { /* ignore tmdb details */ }
          }

          // Check Trakt watchlist status
          if (flixor.trakt.isAuthenticated() && tmdbId) {
            const wlType = data.type === "show" ? "shows" : "movies";
            flixor.trakt.getWatchlist(wlType).then((wl) => {
              const found = wl.some((w: any) => {
                const media = w.movie || w.show;
                return media?.ids?.tmdb === Number(tmdbId);
              });
              setInWatchlist(found);
            }).catch(() => {});
          }
        } catch (err) {
          console.error("Failed to load details", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [ratingKey, handleSeasonSelect]);

  const handleOverseerrRequest = async () => {
    if (!item || !overseerrStatus?.canRequest) return;
    const guids = item.Guid || [];
    const tmdbGuid = guids.find((g) => g.id.startsWith("tmdb://"));
    const tmdbId = tmdbGuid?.id.replace("tmdb://", "");
    if (!tmdbId) return;

    setRequesting(true);
    try {
      const mediaType = item.type === "show" ? "tv" : "movie";
      const result = await requestMedia(Number(tmdbId), mediaType as "movie" | "tv");
      if (result.success) {
        setOverseerrStatus({ status: "pending", canRequest: false });
      }
    } catch (err) {
      console.error("Overseerr request failed:", err);
    } finally {
      setRequesting(false);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!item || watchlistLoading || !flixor.trakt.isAuthenticated()) return;
    const guids = item.Guid || [];
    const tmdbGuid = guids.find((g) => g.id.startsWith("tmdb://"));
    const imdbGuid = guids.find((g) => g.id.startsWith("imdb://"));
    const tmdbId = tmdbGuid?.id.replace("tmdb://", "");
    const imdbId = imdbGuid?.id.replace("imdb://", "");
    if (!tmdbId && !imdbId) return;

    setWatchlistLoading(true);
    try {
      const ids = { tmdb: tmdbId ? Number(tmdbId) : undefined, imdb: imdbId };
      if (inWatchlist) {
        if (item.type === "show") await flixor.trakt.removeShowFromWatchlist({ ids });
        else await flixor.trakt.removeMovieFromWatchlist({ ids });
        setInWatchlist(false);
      } else {
        if (item.type === "show") await flixor.trakt.addShowToWatchlist({ ids });
        else await flixor.trakt.addMovieToWatchlist({ ids });
        setInWatchlist(true);
      }
    } catch (err) {
      console.error("Watchlist toggle failed:", err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleCastClick = (role: any) => {
    const personName = role.tag;
    if (personName) {
      navigate(`/person?name=${encodeURIComponent(personName)}`);
    }
  };

  if (loading || !item) return <div className="loading">Loading...</div>;

  const backdrop = flixor.plexServer.getImageUrl(item.art || item.thumb);

  // External ratings from Plex
  const imdbRating =
    item.Rating?.find((r) => r.type === "imdb") ||
    item.Rating?.find((r) => r.image?.includes("imdb"));
  const rtRating =
    item.Rating?.find((r) => r.type === "rottenTomatoes") ||
    item.Rating?.find((r) => r.image?.includes("rotten"));

  const meta = item as any;
  const trailer = meta.Extras?.Metadata?.find(
    (m: any) => m.extraType === "trailer" || m.title?.toLowerCase().includes("trailer"),
  );

  // MDBList rating entries
  const mdbEntries = mdbRatings
    ? (Object.entries(mdbRatings) as [string, number | undefined][])
        .filter(([, v]) => v !== undefined)
        .map(([key, val]) => ({
          source: getSourceName(key),
          value: formatRating(val, key as any) || "",
        }))
    : [];

  // Resume info for play button
  const viewOffset = (item as unknown as Record<string, unknown>).viewOffset as number | undefined;
  const itemDuration = item.duration || 0;
  const hasResume = viewOffset && viewOffset > 0 && itemDuration > 0 && (viewOffset / itemDuration) < 0.95;
  const resumeLabel = (() => {
    if (!hasResume || !viewOffset) return null;
    const remainingMs = itemDuration - viewOffset;
    const remainingMin = Math.round(remainingMs / 60000);
    if (remainingMin >= 60) {
      const hours = Math.floor(remainingMin / 60);
      const mins = remainingMin % 60;
      return `Resume · ${hours}h ${mins}m left`;
    }
    return `Resume · ${remainingMin}m left`;
  })();

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

        {/* Tech Badges */}
        {techBadges.length > 0 && (
          <div className="tech-badges">
            {techBadges.map((badge) => (
              <span key={badge} className={`tech-badge ${badge.toLowerCase().replace(/\s/g, "-")}`}>
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* MDBList Multi-source Ratings */}
        {mdbEntries.length > 0 && (
          <div className="mdblist-ratings">
            {mdbEntries.map((entry) => (
              <div key={entry.source} className="rating-pill mdb">
                <span className="rating-icon">{entry.source}</span>
                <span className="rating-value">{entry.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tagline */}
        {tagline && <p className="details-tagline">"{tagline}"</p>}

        <div className="hero-meta">
          <span className="meta-badge">{item.year}</span>
          <span className="meta-badge">{item.contentRating || "PG-13"}</span>
          {item.duration && (
            <span className="meta-badge">{Math.round(item.duration / 60000)}m</span>
          )}
          {meta.Genre && (
            <span className="meta-genre">
              {(meta.Genre as any[]).map((g) => g.tag).join(" • ")}
            </span>
          )}
        </div>

        <p className="details-summary">{item.summary}</p>

        {/* Director & Writers */}
        {(director || writers.length > 0) && (
          <div className="details-crew">
            {director && <span className="crew-item">Director: {director}</span>}
            {writers.length > 0 && <span className="crew-item">Writers: {writers.join(", ")}</span>}
          </div>
        )}

        <div className="hero-actions">
          {item.type === "movie" ? (
            <button className="btn-primary" autoFocus onClick={() => navigate(`/player/${item.ratingKey}`)}>
              {resumeLabel ? `▶ ${resumeLabel}` : "▶ Play"}
            </button>
          ) : onDeckEpisode ? (
            <button
              className="btn-primary"
              autoFocus
              onClick={() => navigate(`/player/${onDeckEpisode.ratingKey}`)}
            >
              ▶ Continue S{onDeckEpisode.parentIndex || "?"}:E{onDeckEpisode.index || "?"}
            </button>
          ) : (
            <button
              className="btn-primary"
              autoFocus
              onClick={() => { if (episodes.length > 0) navigate(`/player/${episodes[0].ratingKey}`); }}
            >
              ▶ Play S1:E1
            </button>
          )}
          {trailer && (
            <button className="btn-secondary" onClick={() => navigate(`/player/${trailer.ratingKey}`)}>
              Trailer
            </button>
          )}
          {!trailer && youtubeTrailerKey && (
            <button className="btn-secondary" onClick={() => setShowTrailerModal(true)}>
              ▶ Trailer
            </button>
          )}
          <button
            className={`btn-secondary ${inWatchlist ? "in-watchlist" : ""}`}
            disabled={watchlistLoading}
            onClick={handleWatchlistToggle}
          >
            {watchlistLoading ? "..." : inWatchlist ? "✓ In Watchlist" : "+ Watchlist"}
          </button>

          {/* Overseerr Request Button */}
          {overseerrStatus && (
            <button
              className={`btn-overseerr ${overseerrStatus.status}`}
              disabled={!overseerrStatus.canRequest || requesting}
              onClick={handleOverseerrRequest}
            >
              {requesting ? "Requesting..." : getStatusDisplayText(overseerrStatus.status)}
            </button>
          )}
        </div>

        {/* Cast & Crew */}
        {(item as any).Role && (item as any).Role.length > 0 && (
          <div className="details-section">
            <h2 className="section-title">Cast & Crew</h2>
            <div className="cast-list">
              {((item as any).Role as any[]).slice(0, 15).map((role: any, i: number) => (
                <button key={i} className="cast-item" onClick={() => handleCastClick(role)}>
                  <div className="cast-thumb-container">
                    {role.thumb ? (
                      <img src={flixor.plexServer.getImageUrl(role.thumb)} className="cast-thumb" alt={role.tag} />
                    ) : (
                      <div className="cast-thumb-placeholder">👤</div>
                    )}
                  </div>
                  <div className="cast-name">{role.tag}</div>
                  <div className="cast-role">{role.role}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show Hierarchy: Seasons & Episodes */}
        {item.type === "show" && seasons.length > 0 && (
          <div className="show-hierarchy">
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
              {episodes.map((ep) => (
                <button
                  key={ep.ratingKey}
                  className="episode-card"
                  onClick={() => navigate(`/player/${ep.ratingKey}`)}
                >
                  <div className="episode-thumb-container">
                    {ep.thumb && (
                      <img src={flixor.plexServer.getImageUrl(ep.thumb)} className="episode-thumb" alt={ep.title} />
                    )}
                    <div className="episode-play-overlay">▶</div>
                  </div>
                  <div className="episode-info">
                    <div className="episode-number">E{ep.index}</div>
                    <div className="episode-title">{ep.title}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* More Like This (Plex related) */}
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

        {/* Recommended (TMDB similar) */}
        {tmdbSimilar.length > 0 && (
          <div className="details-section">
            <h2 className="section-title">Recommended</h2>
            <div className="tv-row">
              {tmdbSimilar.map((r) => (
                <MediaCard
                  key={r.ratingKey}
                  item={r}
                  variant="poster"
                  onClick={() => {
                    const key = r.ratingKey;
                    if (key.startsWith("tmdb-")) {
                      // TMDB-only item, can't navigate to Plex details
                    } else {
                      navigate(`/details/${key}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Extra TMDB Metadata */}
        {(productionCompanies.length > 0 || budget || revenue || status || releaseDate || originalLanguage) && (
          <div className="details-section">
            <h2 className="section-title">Details</h2>
            <div className="details-meta-grid">
              {releaseDate && (
                <div className="meta-field">
                  <span className="meta-field-label">Release Date</span>
                  <span className="meta-field-value">{releaseDate}</span>
                </div>
              )}
              {status && (
                <div className="meta-field">
                  <span className="meta-field-label">Status</span>
                  <span className="meta-field-value">{status}</span>
                </div>
              )}
              {originalLanguage && (
                <div className="meta-field">
                  <span className="meta-field-label">Language</span>
                  <span className="meta-field-value">{originalLanguage}</span>
                </div>
              )}
              {budget && (
                <div className="meta-field">
                  <span className="meta-field-label">Budget</span>
                  <span className="meta-field-value">
                    {budget >= 1_000_000 ? `$${(budget / 1_000_000).toFixed(1)}M` : `$${(budget / 1_000).toFixed(0)}K`}
                  </span>
                </div>
              )}
              {revenue && (
                <div className="meta-field">
                  <span className="meta-field-label">Revenue</span>
                  <span className="meta-field-value">
                    {revenue >= 1_000_000 ? `$${(revenue / 1_000_000).toFixed(1)}M` : `$${(revenue / 1_000).toFixed(0)}K`}
                  </span>
                </div>
              )}
              {productionCompanies.length > 0 && (
                <div className="meta-field">
                  <span className="meta-field-label">Production</span>
                  <span className="meta-field-value">{productionCompanies.join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* YouTube Trailer Modal */}
      {showTrailerModal && youtubeTrailerKey && (
        <div className="trailer-modal-overlay" onClick={() => setShowTrailerModal(false)}>
          <div className="trailer-modal" onClick={(e) => e.stopPropagation()}>
            <button className="trailer-close-btn" onClick={() => setShowTrailerModal(false)} autoFocus>
              ✕
            </button>
            <iframe
              className="trailer-iframe"
              src={`https://www.youtube.com/embed/${youtubeTrailerKey}?autoplay=1&rel=0`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Trailer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
