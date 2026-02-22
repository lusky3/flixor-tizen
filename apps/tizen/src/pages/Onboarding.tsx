import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import { loadSettings, saveSettings, setDiscoveryDisabled } from "../services/settings";

const TOTAL_SLIDES = 4;

interface ToggleItemProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
}

function OnboardingToggle({ label, checked, disabled, onChange }: ToggleItemProps) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => {
      if (!disabled) onChange(!checked);
    },
  });

  return (
    <button
      ref={ref}
      className={`settings-toggle-item${focused ? " focused" : ""}${disabled ? " disabled" : ""}`}
      onClick={() => { if (!disabled) onChange(!checked); }}
      disabled={disabled}
    >
      <span>{label}</span>
      <span className={`toggle-indicator ${checked && !disabled ? "on" : "off"}`}>
        {checked && !disabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Load initial toggle state from persisted settings
  const initial = loadSettings();
  const [libraryOnlyMode, setLibraryOnlyMode] = useState(initial.libraryOnlyMode ?? false);
  const [showTrendingRows, setShowTrendingRows] = useState(initial.showTrendingRows ?? true);
  const [showTraktRows, setShowTraktRows] = useState(initial.showTraktRows ?? true);
  const [includeTmdbInSearch, setIncludeTmdbInSearch] = useState(initial.includeTmdbInSearch ?? true);

  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  const { ref: containerRef, focusKey: containerFocusKey } = useFocusable({
    trackChildren: true,
    isFocusBoundary: true,
  });

  // Auto-focus primary action when slide changes
  useEffect(() => {
    const timer = setTimeout(() => {
      primaryBtnRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentSlide]);

  const handleLibraryOnlyToggle = useCallback((val: boolean) => {
    setLibraryOnlyMode(val);
    if (val) {
      setShowTrendingRows(false);
      setShowTraktRows(false);
      setIncludeTmdbInSearch(false);
      setDiscoveryDisabled(true);
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    saveSettings({
      libraryOnlyMode,
      showTrendingRows,
      showTraktRows,
      includeTmdbInSearch,
      onboardingCompleted: true,
    });
    navigate("/login");
  }, [libraryOnlyMode, showTrendingRows, showTraktRows, includeTmdbInSearch, navigate]);

  const skipOnboarding = useCallback(() => {
    saveSettings({ onboardingCompleted: true });
    navigate("/login");
  }, [navigate]);

  const nextSlide = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) setCurrentSlide((s) => s + 1);
  }, [currentSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) setCurrentSlide((s) => s - 1);
  }, [currentSlide]);

  const isLastSlide = currentSlide === TOTAL_SLIDES - 1;

  return (
    <FocusContext.Provider value={containerFocusKey}>
      <div ref={containerRef} className="tv-container onboarding-container">
        <div className="onboarding-slide">
          {currentSlide === 0 && <SlideWelcome />}
          {currentSlide === 1 && <SlideDiscovery />}
          {currentSlide === 2 && <SlideLibrary />}
          {currentSlide === 3 && (
            <SlideConfiguration
              libraryOnlyMode={libraryOnlyMode}
              showTrendingRows={showTrendingRows}
              showTraktRows={showTraktRows}
              includeTmdbInSearch={includeTmdbInSearch}
              onLibraryOnlyChange={handleLibraryOnlyToggle}
              onTrendingChange={setShowTrendingRows}
              onTraktChange={setShowTraktRows}
              onTmdbSearchChange={setIncludeTmdbInSearch}
            />
          )}
        </div>

        <div className="onboarding-dots">
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
            <span key={i} className={`dot${i === currentSlide ? " active" : ""}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          {currentSlide > 0 && (
            <NavButton label="Back" className="btn-secondary" onClick={prevSlide} />
          )}
          <NavButton label="Skip" className="btn-secondary" onClick={skipOnboarding} />
          {isLastSlide ? (
            <NavButton
              ref={primaryBtnRef}
              label="Get Started"
              className="btn-primary"
              onClick={completeOnboarding}
            />
          ) : (
            <NavButton
              ref={primaryBtnRef}
              label="Next"
              className="btn-primary"
              onClick={nextSlide}
            />
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

const NavButton = forwardRef<HTMLButtonElement, { label: string; className: string; onClick: () => void }>(
  function NavButton({ label, className, onClick }, fwdRef) {
    const { ref, focused } = useFocusable({ onEnterPress: onClick });

    return (
      <button
        ref={(el) => {
          // Merge spatial nav ref + forwarded ref
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
          if (typeof fwdRef === "function") fwdRef(el);
          else if (fwdRef) (fwdRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
        }}
        className={`${className}${focused ? " focused" : ""}`}
        onClick={onClick}
      >
        {label}
      </button>
    );
  },
);

/* ---------- Slide content components ---------- */

function SlideWelcome() {
  return (
    <>
      <h1 className="logo">FLIXOR</h1>
      <h2>Welcome to Flixor</h2>
      <p>
        Your all-in-one media companion. Flixor integrates with Trakt, TMDB,
        MDBList, and Overseerr to give you the best streaming experience on your
        Samsung TV.
      </p>
    </>
  );
}

function SlideDiscovery() {
  return (
    <>
      <h2>Discover New Content</h2>
      <p>
        Browse trending movies and shows, get personalized recommendations, and
        explore rich metadata from TMDB — all without leaving your couch.
      </p>
    </>
  );
}

function SlideLibrary() {
  return (
    <>
      <h2>Your Plex Library</h2>
      <p>
        Browse your full Plex library, continue watching where you left off, and
        explore your collections — all optimized for your TV remote.
      </p>
    </>
  );
}

interface ConfigSlideProps {
  libraryOnlyMode: boolean;
  showTrendingRows: boolean;
  showTraktRows: boolean;
  includeTmdbInSearch: boolean;
  onLibraryOnlyChange: (val: boolean) => void;
  onTrendingChange: (val: boolean) => void;
  onTraktChange: (val: boolean) => void;
  onTmdbSearchChange: (val: boolean) => void;
}

function SlideConfiguration({
  libraryOnlyMode,
  showTrendingRows,
  showTraktRows,
  includeTmdbInSearch,
  onLibraryOnlyChange,
  onTrendingChange,
  onTraktChange,
  onTmdbSearchChange,
}: ConfigSlideProps) {
  return (
    <>
      <h2>Configure Your Experience</h2>
      <p>Choose which features to enable. You can change these later in Settings.</p>
      <div className="onboarding-toggles">
        <OnboardingToggle
          label="Library Only Mode"
          checked={libraryOnlyMode}
          onChange={onLibraryOnlyChange}
        />
        <OnboardingToggle
          label="Show Trending Rows"
          checked={showTrendingRows}
          disabled={libraryOnlyMode}
          onChange={onTrendingChange}
        />
        <OnboardingToggle
          label="Show Trakt Rows"
          checked={showTraktRows}
          disabled={libraryOnlyMode}
          onChange={onTraktChange}
        />
        <OnboardingToggle
          label="Include TMDB in Search"
          checked={includeTmdbInSearch}
          disabled={libraryOnlyMode}
          onChange={onTmdbSearchChange}
        />
      </div>
    </>
  );
}
