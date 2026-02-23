import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Home } from "../../pages/Home";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/", key: "default" }),
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void; onFocus?: () => void; onBlur?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  setFocus: vi.fn(),
  init: vi.fn(),
}));

const mockSettings = {
  showContinueWatchingRow: true,
  showWatchlistRow: true,
  showTrendingRows: true,
  showRecentlyAddedRows: true,
  showCollectionsRow: true,
  showGenreRows: false,
  showTraktRows: false,
  showHeroSection: true,
  heroLayout: "carousel",
  continueWatchingCardStyle: "landscape",
};

vi.mock("../../services/settings", () => ({
  loadSettings: () => mockSettings,
}));

const mockGetContinueWatching = vi.fn();
const mockGetLibraries = vi.fn();
const mockGetRecentlyAdded = vi.fn();
const mockGetAllCollections = vi.fn();
const mockGetImageUrl = vi.fn();
const mockGetMetadata = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    isPlexAuthenticated: true,
    plexServer: {
      getContinueWatching: (...a: unknown[]) => mockGetContinueWatching(...a),
      getLibraries: (...a: unknown[]) => mockGetLibraries(...a),
      getRecentlyAdded: (...a: unknown[]) => mockGetRecentlyAdded(...a),
      getAllCollections: (...a: unknown[]) => mockGetAllCollections(...a),
      getImageUrl: (...a: unknown[]) => mockGetImageUrl(...a),
      getMetadata: (...a: unknown[]) => mockGetMetadata(...a),
    },
    tmdb: {
      findByImdbId: vi.fn().mockResolvedValue({ movie_results: [], tv_results: [] }),
      getMovieImages: vi.fn().mockResolvedValue({ logos: [] }),
      getTVImages: vi.fn().mockResolvedValue({ logos: [] }),
      getImageUrl: vi.fn().mockReturnValue(""),
    },
  },
}));

const mockGetPlexWatchlist = vi.fn();
vi.mock("../../services/plextv", () => ({
  getWatchlist: (...a: unknown[]) => mockGetPlexWatchlist(...a),
}));

const mockGetTrending = vi.fn();
const mockGetVideos = vi.fn();
vi.mock("../../services/tmdb", () => ({
  getTrending: (...a: unknown[]) => mockGetTrending(...a),
  buildImageUrl: (path: string) => path ? `https://tmdb${path}` : "",
  getVideos: (...a: unknown[]) => mockGetVideos(...a),
}));

vi.mock("../../services/colorExtractor", () => ({
  extractUltraBlurColors: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/HeroCarousel", () => ({ HeroCarousel: ({ items }: any) => <div data-testid="hero-carousel">{items.length} items</div> }));
vi.mock("../../components/HomeHero", () => ({ HomeHero: () => <div data-testid="home-hero" /> }));
vi.mock("../../components/ContentRow", () => ({ ContentRow: ({ title }: any) => <div data-testid="content-row">{title}</div> }));
vi.mock("../../components/ContinueWatchingLandscapeCard", () => ({ ContinueWatchingLandscapeCard: ({ item }: any) => <div data-testid="cw-card">{item.title}</div> }));
vi.mock("../../components/ContinueWatchingPosterCard", () => ({ ContinueWatchingPosterCard: ({ item }: any) => <div data-testid="cw-poster">{item.title}</div> }));
vi.mock("../../components/TraktSection", () => ({ TraktSection: ({ title }: any) => <div data-testid="trakt-section">{title}</div> }));
vi.mock("../../components/SkeletonRow", () => ({ SkeletonRow: () => <div data-testid="skeleton-row" /> }));
vi.mock("../../components/SmartImage", () => ({ SmartImage: () => <div data-testid="smart-image" /> }));
vi.mock("../../components/Billboard", () => ({ Billboard: ({ title }: any) => <div data-testid="billboard">{title}</div> }));
vi.mock("../../components/UltraBlurBackground", () => ({ UltraBlurBackground: () => <div data-testid="ultra-blur" /> }));
vi.mock("../../components/SectionBanner", () => ({ SectionBanner: ({ title }: any) => <div data-testid="section-banner">{title}</div> }));

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContinueWatching.mockResolvedValue({ items: [] });
    mockGetPlexWatchlist.mockResolvedValue([]);
    mockGetTrending.mockResolvedValue({ results: [] });
    mockGetLibraries.mockResolvedValue([]);
    mockGetRecentlyAdded.mockResolvedValue([]);
    mockGetAllCollections.mockResolvedValue([]);
    mockGetImageUrl.mockReturnValue("");
    mockGetMetadata.mockResolvedValue({});
    mockGetVideos.mockResolvedValue({ results: [] });
  });

  it("shows loading skeleton initially", () => {
    // Make everything hang to keep loading state
    mockGetContinueWatching.mockReturnValue(new Promise(() => {}));
    render(<Home />);
    const skeletons = screen.getAllByTestId("skeleton-row");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders TopNav after loading", async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getAllByTestId("top-nav").length).toBeGreaterThanOrEqual(1);
  });

  it("renders trending rows when available", async () => {
    mockGetTrending.mockResolvedValue({
      results: [
        { id: 1, title: "Movie 1", poster_path: "/p1.jpg", backdrop_path: "/b1.jpg", release_date: "2024-01-01", overview: "Test" },
      ],
    });
    mockGetLibraries.mockResolvedValue([]);
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Popular Movies")).toBeInTheDocument();
  });

  it("renders continue watching when items exist", async () => {
    mockGetContinueWatching.mockResolvedValue({
      items: [
        { ratingKey: "1", title: "Movie A", thumb: "/t.jpg", art: "/a.jpg", type: "movie" },
      ],
    });
    mockGetLibraries.mockResolvedValue([]);
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Continue Watching")).toBeInTheDocument();
    expect(screen.getAllByText("Movie A").length).toBeGreaterThanOrEqual(1);
  });

  it("renders recently added rows", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", type: "movie", title: "Movies" },
    ]);
    mockGetRecentlyAdded.mockResolvedValue([
      { ratingKey: "r1", title: "New Movie", thumb: "/t.jpg" },
    ]);
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Recently Added Movies")).toBeInTheDocument();
  });

  it("renders collections row", async () => {
    mockGetLibraries.mockResolvedValue([]);
    mockGetAllCollections.mockResolvedValue([
      { ratingKey: "c1", title: "Marvel", thumb: "/m.jpg" },
    ]);
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Collections")).toBeInTheDocument();
  });

  it("renders billboard for first hero item when hero layout is hidden", async () => {
    mockGetContinueWatching.mockResolvedValue({
      items: [
        { ratingKey: "1", title: "Featured Movie", thumb: "/t.jpg", art: "/a.jpg", type: "movie", summary: "Great film" },
      ],
    });
    mockGetMetadata.mockResolvedValue({});
    mockGetLibraries.mockResolvedValue([]);
    // Billboard only renders when heroLayout is "hidden"
    const origLayout = mockSettings.heroLayout;
    mockSettings.heroLayout = "hidden";
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByTestId("billboard")).toBeInTheDocument();
    mockSettings.heroLayout = origLayout;
  });

  it("renders watchlist row when items exist", async () => {
    mockGetPlexWatchlist.mockResolvedValue([
      { ratingKey: "w1", title: "Watchlist Movie", thumb: "/t.jpg" },
    ]);
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("renders hero carousel when heroLayout is carousel", async () => {
    mockGetContinueWatching.mockResolvedValue({
      items: [
        { ratingKey: "1", title: "Hero 1", thumb: "/t.jpg", art: "/a.jpg", type: "movie" },
        { ratingKey: "2", title: "Hero 2", thumb: "/t2.jpg", art: "/a2.jpg", type: "movie" },
      ],
    });
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByTestId("hero-carousel")).toBeInTheDocument();
  });

  it("renders recently added shows", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "2", type: "show", title: "TV Shows" },
    ]);
    mockGetRecentlyAdded.mockResolvedValue([
      { ratingKey: "s1", title: "New Show", thumb: "/t.jpg" },
    ]);
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Recently Added Shows")).toBeInTheDocument();
  });
});
