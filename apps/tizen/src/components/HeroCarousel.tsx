import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import { flixor } from "../services/flixor";
import { loadSettings } from "../services/settings";
import type { PlexMediaItem } from "@flixor/core";

interface HeroCarouselProps {
  items: PlexMediaItem[];
  onBackdropChange?: (url: string) => void;
}

export function HeroCarousel({ items, onBackdropChange }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logo, setLogo] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [fadeClass, setFadeClass] = useState("hero-slide-active");
  const navigate = useNavigate();
  const pausedRef = useRef(paused);

  const { ref: sectionRef, focusKey } = useFocusable({
    focusKey: "hero-carousel",
    trackChildren: true,
  });

  const { ref: playRef, focusSelf: focusPlay } = useFocusable({
    onFocus: () => {
      setPaused(true);
      emitBackdropForCurrent();
    },
    onBlur: () => setPaused(false),
  });

  const { ref: infoRef } = useFocusable({
    onFocus: () => {
      setPaused(true);
      emitBackdropForCurrent();
    },
    onBlur: () => setPaused(false),
  });

  // Keep ref in sync with state for use in interval callback
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const currentItem = items[currentIndex] ?? null;

  const fetchLogo = useCallback(async (item: PlexMediaItem) => {
    setLogo(null);
    try {
      const guid = item.guid || "";
      const tmdbIdResult = await flixor.tmdb.findByImdbId(guid);
      const tid =
        tmdbIdResult.movie_results[0]?.id || tmdbIdResult.tv_results[0]?.id;
      if (tid) {
        const imgs = tmdbIdResult.movie_results[0]
          ? await flixor.tmdb.getMovieImages(tid)
          : await flixor.tmdb.getTVImages(tid);
        const logos = imgs.logos || [];
        const found =
          logos.find((l: any) => l.iso_639_1 === "en") || logos[0];
        if (found) {
          setLogo(flixor.tmdb.getImageUrl(found.file_path as string, "w500"));
        }
      }
    } catch {
      /* TMDB logo fetch failed — fall back to title text */
    }
  }, []);

  const emitBackdrop = useCallback(
    (item: PlexMediaItem) => {
      const url = flixor.plexServer.getImageUrl(item.art || item.thumb);
      if (url && onBackdropChange) onBackdropChange(url);
    },
    [onBackdropChange],
  );

  // Helper used by focus callbacks (captures currentItem via closure at call time)
  const emitBackdropForCurrent = useCallback(() => {
    const item = items[currentIndex];
    if (item) {
      const url = flixor.plexServer.getImageUrl(item.art || item.thumb);
      if (url && onBackdropChange) onBackdropChange(url);
    }
  }, [items, currentIndex, onBackdropChange]);

  // Fetch logo on mount and when index changes
  useEffect(() => {
    if (currentItem) {
      fetchLogo(currentItem);
      emitBackdrop(currentItem);
    }
  }, [currentIndex, currentItem, fetchLogo, emitBackdrop]);

  // Auto-rotation every 15 seconds, paused when hero button is focused
  useEffect(() => {
    if (items.length <= 1) return;

    const timer = globalThis.setInterval(() => {
      if (pausedRef.current) return;

      setFadeClass("hero-slide-exit");
      globalThis.setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setFadeClass("hero-slide-active");
      }, 300);
    }, 15000);

    return () => globalThis.clearInterval(timer);
  }, [items]);

  // Auto-focus play button when items arrive
  useEffect(() => {
    if (items.length > 0) {
      focusPlay();
    }
  }, [items.length, focusPlay]);

  // Early returns AFTER all hooks
  const settings = loadSettings();
  if (!settings.showHeroSection) return null;
  if (items.length === 0 || !currentItem) return null;

  const formattedDuration = currentItem.duration
    ? `${Math.round(currentItem.duration / 60000)}m`
    : null;

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={sectionRef} className={`hero-section ${fadeClass}`}>
        <div className="hero-content">
          {logo ? (
            <img src={logo} className="hero-logo" alt={currentItem.title} />
          ) : (
            <h1 className="hero-title">{currentItem.title}</h1>
          )}

          <div className="hero-meta">
            {currentItem.year && (
              <span className="meta-badge">{currentItem.year}</span>
            )}
            <span className="meta-badge">
              {currentItem.contentRating || "PG-13"}
            </span>
            {formattedDuration && (
              <span className="meta-badge">{formattedDuration}</span>
            )}
          </div>

          <p className="hero-overview">
            {currentItem.summary || "No overview available for this title."}
          </p>

          <div className="hero-actions">
            <button
              ref={playRef}
              className="btn-primary"
              onClick={() => {
                const part = currentItem.Media?.[0]?.Part?.[0];
                if (part) navigate(`/player/${currentItem.ratingKey}`);
              }}
            >
              <span className="icon">▶</span> Play
            </button>
            <button
              ref={infoRef}
              className="btn-secondary"
              onClick={() => navigate(`/details/${currentItem.ratingKey}`)}
            >
              More Info
            </button>
          </div>
        </div>
      </section>
    </FocusContext.Provider>
  );
}
