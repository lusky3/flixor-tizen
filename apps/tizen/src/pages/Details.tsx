import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import type { PlexMediaItem } from "@flixor/core";
import { MediaCard } from "../components/MediaCard";
import { RatingsBar } from "../components/RatingsBar";
import { SeasonSelector } from "../components/SeasonSelector";
import { EpisodeItem } from "../components/EpisodeItem";
import { WatchlistButton } from "../components/WatchlistButton";
import { RequestButton } from "../components/RequestButton";
import { DetailsHero } from "../components/DetailsHero";
import { DetailsTabs } from "../components/DetailsTabs";
import { UltraBlurBackground } from "../components/UltraBlurBackground";
import { extractTechBadges, formatResumeLabel } from "../utils/media";
import { getRatings, type RatingsResult } from "../services/ratings";
import {
  getDetails as getTmdbDetails,
  getCredits as getTmdbCredits,
  getRecommendations as getTmdbRecommendations,
  getVideos as getTmdbVideos,
  buildImageUrl,
  type MediaType as TmdbMediaType,
} from "../services/tmdb";
import { isAuthenticated as isTraktAuthenticated } from "../services/trakt";
import { loadSettings } from "../services/settings";
import {
  getImages as getTmdbImages,
} from "../services/tmdb";
import { MoodTags } from "../components/MoodTags";
import { TechnicalChips } from "../components/TechnicalChips";
import { AccessibilityBadges, detectAccessibilityBadges } from "../components/AccessibilityBadges";
import { EpisodeLandscapeCard } from "../components/EpisodeLandscapeCard";
import { EpisodeSkeletonList } from "../components/EpisodeSkeletonList";

export function DetailsPage() {
  const { ratingKey } = useParams<{ ratingKey: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<PlexMediaItem | null>(null);
  const [seasons, setSeasons] = useState<PlexMediaItem[]>([]);
  const [episodes, setEpisodes] = useState<PlexMediaItem[]>([]);
  const [related, setRelated] = useState<PlexMediaItem[]>([]);
  const [tmdbSimilar, setTmdbSimilar] = useState<PlexMediaItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Ratings via ratings service
  const [ratingsResult, setRatingsResult] = useState<RatingsResult | null>(null);

  // Watchlist state
  const [inWatchlist, setInWatchlist] = useState(false);

  // Tech badges, crew, metadata
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

  // Cast from TMDB credits
  const [cast, setCast] = useState<Array<{ name: string; character: string; profilePath?: string }>>([]);

  // TMDB logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Accessibility badges
  const [a11yBadges, setA11yBadges] = useState<{ hasCC: boolean; hasSDH: boolean; hasAD: boolean }>({ hasCC: false, hasSDH: false, hasAD: false });

  // Networks (TV shows)
  const [networks, setNetworks] = useState<string[]>([]);

  // Episodes loading state
  const [episodesLoading, setEpisodesLoading] = useState(false);

  const handleSeasonSelect = useCallback(async (seasonKey: string) => {
    setSelectedSeason(seasonKey);
    setEpisodesLoading(true);
    try {
      const episodeData = await flixor.plexServer.getChildren(seasonKey);
      setEpisodes(episodeData);
    } finally {
      setEpisodesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ratingKey) return;

    setLoading(true);
    setRatingsResult(null);
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
    setCast([]);
    setActiveTab(0);
    setLogoUrl(null);
    setA11yBadges({ hasCC: false, hasSDH: false, hasAD: false });
    setNetworks([]);
    setEpisodesLoading(false);

    const fetchData = async () => {
      try {
        const data = await flixor.plexServer.getMetadata(ratingKey);
        if (!data) return;
        setItem(data);

        // Extract tech badges using utility
        const media0 = data.Media?.[0] as Record<string, unknown> | undefined;
        if (media0) {
          setTechBadges(extractTechBadges({
            width: (media0.width as number) || 0,
            height: (media0.height as number) || 0,
            videoProfile: (media0.videoProfile as string) || "",
            audioProfile: (media0.audioProfile as string) || "",
            audioCodec: (media0.audioCodec as string) || "",
          }));
        }

        if (data.type === "show") {
          const seasonData = await flixor.plexServer.getChildren(data.ratingKey);
          setSeasons(seasonData);
          if (seasonData.length > 0) handleSeasonSelect(seasonData[0].ratingKey);

          // Fetch on-deck episode
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

        // Extract GUIDs
        const guids = data.Guid || [];
        const imdbGuid = guids.find((g) => g.id.startsWith("imdb://"));
        const tmdbGuid = guids.find((g) => g.id.startsWith("tmdb://"));
        const imdbId = imdbGuid?.id.replace("imdb://", "");
        const tmdbId = tmdbGuid?.id.replace("tmdb://", "");

        // Fetch multi-source ratings via ratings service
        if (tmdbId) {
          const mediaType = data.type === "show" ? "show" : "movie";
          getRatings(Number(tmdbId), mediaType as "movie" | "show", imdbId)
            .then(setRatingsResult)
            .catch(() => {});
        }

        // Fetch TMDB details, credits, recommendations, videos via service wrappers
        if (tmdbId) {
          const tmdbMediaType: TmdbMediaType = data.type === "show" ? "tv" : "movie";
          const tmdbIdNum = Number(tmdbId);

          // TMDB details for tagline + extra metadata
          try {
            const tmdbDetails = await getTmdbDetails(tmdbIdNum, tmdbMediaType);
            if (tmdbDetails) {
              const d = tmdbDetails as unknown as Record<string, unknown>;
              if (d.tagline) setTagline(d.tagline as string);

              if (d.production_companies) {
                const companies = (d.production_companies as Array<Record<string, unknown>>)
                  .map((c) => c.name as string).filter(Boolean).slice(0, 6);
                if (companies.length > 0) setProductionCompanies(companies);
              }
              if (d.networks) {
                const nets = (d.networks as Array<Record<string, unknown>>)
                  .map((n) => n.name as string).filter(Boolean).slice(0, 6);
                if (nets.length > 0) setNetworks(nets);
              }
              if (typeof d.budget === "number" && d.budget > 0) setBudget(d.budget as number);
              if (typeof d.revenue === "number" && d.revenue > 0) setRevenue(d.revenue as number);
              if (d.status) setStatus(d.status as string);
              if (d.release_date) setReleaseDate(d.release_date as string);
              else if (d.first_air_date) setReleaseDate(d.first_air_date as string);
              if (d.original_language) setOriginalLanguage((d.original_language as string).toUpperCase());
            }
          } catch { /* ignore */ }

          // TMDB credits for director, writers, and cast
          try {
            const credits = await getTmdbCredits(tmdbIdNum, tmdbMediaType);
            if (credits) {
              const crew = (credits as any).crew || [];
              const dirs = crew.filter((c: any) => c.job === "Director").map((c: any) => c.name);
              if (dirs.length > 0) setDirector(dirs.join(", "));
              const writerList = crew
                .filter((c: any) => c.department === "Writing" || c.job === "Screenplay" || c.job === "Writer")
                .map((c: any) => c.name);
              if (writerList.length > 0) setWriters([...new Set(writerList)].slice(0, 5) as string[]);

              // Extract cast from TMDB credits
              const castList = ((credits as any).cast || []).slice(0, 15).map((c: any) => ({
                name: c.name || "",
                character: c.character || "",
                profilePath: c.profile_path || undefined,
              }));
              setCast(castList);
            }
          } catch { /* ignore */ }

          // TMDB videos for YouTube trailer
          try {
            const videos = await getTmdbVideos(tmdbIdNum, tmdbMediaType);
            const vids = videos.results || [];
            const yt = vids.find((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
            if (yt && (yt as any).key) setYoutubeTrailerKey((yt as any).key as string);
          } catch { /* ignore */ }

          // TMDB recommendations
          try {
            const recs = await getTmdbRecommendations(tmdbIdNum, tmdbMediaType);
            const results = recs.results || [];
            const simItems: PlexMediaItem[] = results.slice(0, 10).map((r: any) => ({
              ratingKey: `tmdb-${tmdbMediaType}-${r.id}`,
              title: r.title || r.name,
              thumb: buildImageUrl(r.poster_path, "poster"),
              art: buildImageUrl(r.backdrop_path, "backdrop"),
              year: (r.release_date || r.first_air_date || "").split("-")[0],
              summary: r.overview || "",
              duration: 0,
              guid: `tmdb://${r.id}`,
            })) as any[];
            setTmdbSimilar(simItems);
          } catch { /* ignore */ }

          // TMDB logo images
          try {
            const images = await getTmdbImages(tmdbIdNum, tmdbMediaType);
            const logos = (images.logos || []) as Array<{ iso_639_1?: string | null; file_path?: string }>;
            const enLogo = logos.find((l) => l.iso_639_1 === "en" || l.iso_639_1 === null || l.iso_639_1 === undefined);
            if (enLogo?.file_path) {
              setLogoUrl(buildImageUrl(enLogo.file_path, "logo"));
            }
          } catch { /* ignore */ }
        }

        // Detect accessibility badges from media streams
        const allStreams: Array<{ streamType?: number; displayTitle?: string; title?: string }> = [];
        const mediaArr = (data as any).Media || [];
        for (const media of mediaArr) {
          const parts = media.Part || [];
          for (const part of parts) {
            const streams = part.Stream || [];
            allStreams.push(...streams);
          }
        }
        if (allStreams.length > 0) {
          setA11yBadges(detectAccessibilityBadges(allStreams));
        }

        // Check Trakt watchlist status
        if (isTraktAuthenticated() && tmdbId) {
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
  }, [ratingKey, handleSeasonSelect]);

  const handleCastClick = useCallback((name: string) => {
    if (name) navigate(`/person?name=${encodeURIComponent(name)}`);
  }, [navigate]);

  // Derived values
  const backdrop = item ? flixor.plexServer.getImageUrl(item.art || item.thumb) : "";
  const meta = item as any;
  const plexTrailer = meta?.Extras?.Metadata?.find(
    (m: any) => m.extraType === "trailer" || m.title?.toLowerCase().includes("trailer"),
  );

  const viewOffset = (item as unknown as Record<string, unknown>)?.viewOffset as number | undefined;
  const itemDuration = item?.duration || 0;
  const resumeLabel = viewOffset ? formatResumeLabel(viewOffset, itemDuration) : null;

  // Extract TMDB ID and media type for RequestButton
  const tmdbGuid = item?.Guid?.find((g) => g.id.startsWith("tmdb://"));
  const tmdbId = tmdbGuid ? Number(tmdbGuid.id.replace("tmdb://", "")) : null;
  const imdbGuid = item?.Guid?.find((g) => g.id.startsWith("imdb://"));
  const imdbId = imdbGuid?.id.replace("imdb://", "");
  const mediaType: "movie" | "tv" = item?.type === "show" ? "tv" : "movie";

  // Watchlist item for WatchlistButton
  const watchlistItem = useMemo(() => ({
    type: (item?.type === "show" ? "show" : "movie") as "movie" | "show",
    ids: { tmdb: tmdbId ?? undefined, imdb: imdbId },
  }), [item?.type, tmdbId, imdbId]);

  // Season selector data
  const seasonItems = useMemo(() =>
    seasons.map((s) => ({ key: s.ratingKey, title: s.title })),
    [seasons],
  );

  // Build tabs
  const tabs = useMemo(() => {
    const result: Array<{ label: string; content: React.ReactNode }> = [];

    // Overview tab (always present)
    result.push({
      label: "Overview",
      content: (
        <>
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
                      ${budget >= 1_000_000 ? `$${Math.round(budget / 1_000_000)}M` : `$${Math.round(budget / 1_000)}K`}
                    </span>
                  </div>
                )}
                {revenue && (
                  <div className="meta-field">
                    <span className="meta-field-label">Revenue</span>
                    <span className="meta-field-value">
                      ${revenue >= 1_000_000 ? `$${(revenue / 1_000_000).toFixed(1)}M` : `$${Math.round(revenue / 1_000)}K`}
                    </span>
                  </div>
                )}
                {productionCompanies.length > 0 && (
                  <div className="meta-field">
                    <span className="meta-field-label">Production</span>
                    <span className="meta-field-value">{productionCompanies.join(", ")}</span>
                  </div>
                )}
                {networks.length > 0 && (
                  <div className="meta-field">
                    <span className="meta-field-label">Networks</span>
                    <span className="meta-field-value">{networks.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ),
    });

    // Episodes tab (TV shows only)
    if (item?.type === "show" && seasons.length > 0) {
      const settings = loadSettings();
      const isHorizontal = settings.episodeLayout === "horizontal";

      result.push({
        label: "Episodes",
        content: (
          <div className="show-hierarchy">
            <SeasonSelector
              seasons={seasonItems}
              activeSeason={selectedSeason || ""}
              onSeasonChange={handleSeasonSelect}
            />
            {episodesLoading ? (
              <EpisodeSkeletonList count={6} />
            ) : isHorizontal ? (
              <div className="episodes-horizontal" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "16px 0" }}>
                {episodes.map((ep) => {
                  const epMeta = ep as any;
                  const viewOff = epMeta.viewOffset || 0;
                  const epDur = ep.duration || 1;
                  const pct = epDur > 0 ? Math.round((viewOff / epDur) * 100) : 0;
                  return (
                    <EpisodeLandscapeCard
                      key={ep.ratingKey}
                      episodeNumber={ep.index || 0}
                      title={ep.title}
                      overview={ep.summary}
                      thumbnailUrl={ep.thumb ? flixor.plexServer.getImageUrl(ep.thumb) : undefined}
                      duration={ep.duration ? Math.round(ep.duration / 60000) : undefined}
                      progress={pct}
                      onPress={() => navigate(`/player/${ep.ratingKey}`)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="episodes-grid">
                {episodes.map((ep) => (
                  <EpisodeItem
                    key={ep.ratingKey}
                    title={ep.title}
                    episodeNumber={ep.index || 0}
                    seasonNumber={(ep as any).parentIndex || 0}
                    thumbUrl={ep.thumb ? flixor.plexServer.getImageUrl(ep.thumb) : undefined}
                    duration={ep.duration}
                    summary={ep.summary}
                    onClick={() => navigate(`/player/${ep.ratingKey}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ),
      });
    }

    // Cast tab
    if (cast.length > 0) {
      result.push({
        label: "Cast",
        content: (
          <div className="details-section">
            <div className="cast-list">
              {cast.map((c, i) => (
                <button key={i} className="cast-item" onClick={() => handleCastClick(c.name)}>
                  <div className="cast-thumb-container">
                    {c.profilePath ? (
                      <img src={buildImageUrl(c.profilePath, "profile")} className="cast-thumb" alt={c.name} />
                    ) : (
                      <div className="cast-thumb-placeholder">👤</div>
                    )}
                  </div>
                  <div className="cast-name">{c.name}</div>
                  <div className="cast-role">{c.character}</div>
                </button>
              ))}
            </div>
          </div>
        ),
      });
    }

    // More Like This tab
    if (related.length > 0 || tmdbSimilar.length > 0) {
      result.push({
        label: "More Like This",
        content: (
          <>
            {related.length > 0 && (
              <div className="details-section">
                <h2 className="section-title">From Your Library</h2>
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
                        if (!r.ratingKey.startsWith("tmdb-")) navigate(`/details/${r.ratingKey}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ),
      });
    }

    return result;
  }, [
    item, seasons, seasonItems, selectedSeason, episodes, episodesLoading, cast, related, tmdbSimilar,
    productionCompanies, networks, budget, revenue, status, releaseDate, originalLanguage,
    handleSeasonSelect, handleCastClick, navigate,
  ]);

  if (loading || !item) return <div className="loading">Loading...</div>;

  const genres = meta?.Genre ? (meta.Genre as any[]).map((g: any) => g.tag).join(" • ") : null;
  const genreList: string[] = meta?.Genre ? (meta.Genre as any[]).map((g: any) => g.tag as string) : [];

  // Build TechnicalChips info from media metadata
  const media0Raw = (item as any)?.Media?.[0];
  const media0Info = media0Raw ? {
    resolution: media0Raw.height ? `${media0Raw.height}p` : undefined,
    bitrate: media0Raw.bitrate || undefined,
    videoCodec: media0Raw.videoCodec || undefined,
    audioCodec: media0Raw.audioCodec || undefined,
    audioChannels: media0Raw.audioChannels ? String(media0Raw.audioChannels) : undefined,
    hdr: media0Raw.videoProfile?.toLowerCase().includes("hdr") || media0Raw.videoProfile?.toLowerCase().includes("dolby")
      ? media0Raw.videoProfile : undefined,
  } : null;

  return (
    <div className="tv-container details-page">
      <UltraBlurBackground src={backdrop} />

      <div className="details-content">
        <button className="btn-back" onClick={() => navigate(-1)}>
          &larr; Back
        </button>

        <DetailsHero
          title={item.title}
          year={item.year}
          contentRating={item.contentRating || "PG-13"}
          duration={item.duration}
          overview={item.summary}
          tagline={tagline || undefined}
          backdropUrl={backdrop}
          logoUrl={logoUrl || undefined}
          techBadges={techBadges}
          director={director || undefined}
          writers={writers}
        >
          {/* Genre badges */}
          {genres && <span className="meta-genre">{genres}</span>}

          {/* Mood tags derived from genres */}
          {genreList.length > 0 && <MoodTags genres={genreList} />}

          {/* Technical chips */}
          {media0Info && <TechnicalChips {...media0Info} />}

          {/* Accessibility badges */}
          <AccessibilityBadges hasCC={a11yBadges.hasCC} hasSDH={a11yBadges.hasSDH} hasAD={a11yBadges.hasAD} />

          {/* Ratings */}
          {ratingsResult && <RatingsBar ratings={ratingsResult.ratings} />}

          {/* Action buttons */}
          <div className="hero-actions">
            {item.type === "movie" ? (
              <button className="btn-primary" autoFocus onClick={() => navigate(`/player/${item.ratingKey}`)}>
                {resumeLabel ? `▶ Resume · ${resumeLabel}` : "▶ Play"}
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

            {plexTrailer && (
              <button className="btn-secondary" onClick={() => navigate(`/player/${plexTrailer.ratingKey}`)}>
                Trailer
              </button>
            )}
            {!plexTrailer && youtubeTrailerKey && (
              <button className="btn-secondary" onClick={() => setShowTrailerModal(true)}>
                ▶ Trailer
              </button>
            )}

            <WatchlistButton
              item={watchlistItem}
              isOnWatchlist={inWatchlist}
              onToggle={(nowOn) => setInWatchlist(nowOn)}
            />

            {tmdbId && (
              <RequestButton tmdbId={tmdbId} mediaType={mediaType} />
            )}
          </div>
        </DetailsHero>

        <DetailsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
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
