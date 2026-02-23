import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DetailsPage } from "../../pages/Details";

let mockParams: Record<string, string> = { ratingKey: "123" };
const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: () => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockGetMetadata = vi.fn();
const mockGetChildren = vi.fn();
const mockGetRelated = vi.fn();
const mockGetImageUrl = vi.fn().mockReturnValue("");

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getMetadata: (...a: unknown[]) => mockGetMetadata(...a),
      getChildren: (...a: unknown[]) => mockGetChildren(...a),
      getRelated: (...a: unknown[]) => mockGetRelated(...a),
      getImageUrl: (...a: unknown[]) => mockGetImageUrl(...a),
      findByGuid: vi.fn().mockResolvedValue([]),
    },
    tmdb: {
      findByImdbId: vi.fn().mockResolvedValue({ movie_results: [], tv_results: [] }),
    },
  },
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    detailsPageLayout: "tabbed",
    episodeLayout: "vertical",
    showImdb: true,
    showRtCritics: true,
    showRtAudience: true,
    mdblistEnabled: false,
  }),
}));

vi.mock("../../services/tmdb", () => ({
  getDetails: vi.fn().mockResolvedValue({}),
  getCredits: vi.fn().mockResolvedValue({ cast: [], crew: [] }),
  getRecommendations: vi.fn().mockResolvedValue({ results: [] }),
  getVideos: vi.fn().mockResolvedValue({ results: [] }),
  getImages: vi.fn().mockResolvedValue({ logos: [] }),
  getWatchProviders: vi.fn().mockResolvedValue(null),
  buildImageUrl: (path: string) => path ? `https://tmdb${path}` : "",
}));

vi.mock("../../services/ratings", () => ({
  getRatings: vi.fn().mockResolvedValue({ ratings: [], tmdbId: 0, mediaType: "movie" }),
}));

vi.mock("../../services/trakt", () => ({
  isAuthenticated: () => false,
}));

vi.mock("../../utils/media", () => ({
  extractTechBadges: vi.fn().mockReturnValue([]),
  formatResumeLabel: vi.fn().mockReturnValue(""),
}));

vi.mock("../../components/DetailsHero", () => ({ DetailsHero: ({ title }: any) => <div data-testid="details-hero">{title}</div> }));
vi.mock("../../components/DetailsTabs", () => ({ DetailsTabs: () => <div data-testid="details-tabs" /> }));
vi.mock("../../components/UltraBlurBackground", () => ({ UltraBlurBackground: () => <div /> }));
vi.mock("../../components/MediaCard", () => ({ MediaCard: () => <div data-testid="media-card" /> }));
vi.mock("../../components/RatingsBar", () => ({ RatingsBar: () => <div data-testid="ratings-bar" /> }));
vi.mock("../../components/SeasonSelector", () => ({ SeasonSelector: () => <div data-testid="season-selector" /> }));
vi.mock("../../components/EpisodeItem", () => ({ EpisodeItem: () => <div data-testid="episode-item" /> }));
vi.mock("../../components/WatchlistButton", () => ({ WatchlistButton: () => <div data-testid="watchlist-btn" /> }));
vi.mock("../../components/RequestButton", () => ({ RequestButton: () => <div data-testid="request-btn" /> }));
vi.mock("../../components/MoodTags", () => ({ MoodTags: () => <div data-testid="mood-tags" /> }));
vi.mock("../../components/TechnicalChips", () => ({ TechnicalChips: () => <div data-testid="tech-chips" /> }));
vi.mock("../../components/AccessibilityBadges", () => ({ AccessibilityBadges: () => <div /> }));
vi.mock("../../utils/accessibilityUtils", () => ({ detectAccessibilityBadges: () => ({ hasCC: false, hasSDH: false, hasAD: false }) }));
vi.mock("../../components/EpisodeLandscapeCard", () => ({ EpisodeLandscapeCard: () => <div /> }));
vi.mock("../../components/EpisodeSkeletonList", () => ({ EpisodeSkeletonList: () => <div data-testid="episode-skeleton" /> }));
vi.mock("../../components/PersonModal", () => ({ PersonModal: () => <div data-testid="person-modal" /> }));
vi.mock("../../components/VersionSelector", () => ({ VersionSelector: () => <div data-testid="version-selector" /> }));
vi.mock("../../components/ServiceIcons", () => ({ default: () => <div data-testid="service-icons" /> }));

describe("DetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { ratingKey: "123" };
    mockGetChildren.mockResolvedValue([]);
    mockGetRelated.mockResolvedValue([]);
  });

  it("shows loading state initially", () => {
    mockGetMetadata.mockReturnValue(new Promise(() => {}));
    render(<DetailsPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders details hero after loading a movie", async () => {
    mockGetMetadata.mockResolvedValue({
      ratingKey: "123",
      title: "Inception",
      type: "movie",
      year: 2010,
      summary: "A mind-bending thriller",
      thumb: "/thumb.jpg",
      art: "/art.jpg",
      contentRating: "PG-13",
      duration: 8880000,
      Guid: [{ id: "imdb://tt1375666" }, { id: "tmdb://27205" }],
      Media: [{ Part: [{ key: "/video/123" }] }],
    });
    await act(async () => {
      render(<DetailsPage />);
    });
    expect(screen.getByTestId("details-hero")).toBeInTheDocument();
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("renders details for a TV show with seasons", async () => {
    mockGetMetadata.mockResolvedValue({
      ratingKey: "456",
      title: "Breaking Bad",
      type: "show",
      year: 2008,
      summary: "A chemistry teacher turns to crime",
      thumb: "/thumb.jpg",
      art: "/art.jpg",
      Guid: [{ id: "tmdb://1396" }],
    });
    mockGetChildren.mockResolvedValue([
      { ratingKey: "s1", title: "Season 1", index: 1 },
      { ratingKey: "s2", title: "Season 2", index: 2 },
    ]);
    await act(async () => {
      render(<DetailsPage />);
    });
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
  });

  it("shows loading when no ratingKey", () => {
    mockParams = {};
    render(<DetailsPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
