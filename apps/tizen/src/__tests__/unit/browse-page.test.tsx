import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowsePage } from "../../pages/Browse";

let mockParams: Record<string, string> = { source: "trending-movies" };
const mockNavigate = vi.fn();
const mockLocation = { state: null, pathname: "/browse/trending-movies" };

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useLocation: () => mockLocation,
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void; trackChildren?: boolean }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockGetTrendingMovies = vi.fn();
const mockGetTrendingTV = vi.fn().mockResolvedValue({ results: [], page: 1, total_pages: 1 });
const mockGetLibraries = vi.fn().mockResolvedValue([]);
const mockGetLibraryItems = vi.fn().mockResolvedValue([]);
const mockGetAllCollections = vi.fn().mockResolvedValue([]);

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getRecentlyAdded: vi.fn().mockResolvedValue([]),
      getAllCollections: (...a: unknown[]) => mockGetAllCollections(...a),
      getLibraries: (...a: unknown[]) => mockGetLibraries(...a),
      getLibraryItems: (...a: unknown[]) => mockGetLibraryItems(...a),
      getImageUrl: () => "",
    },
    tmdb: {
      getTrendingMovies: (...a: unknown[]) => mockGetTrendingMovies(...a),
      getTrendingTV: (...a: unknown[]) => mockGetTrendingTV(...a),
      getImageUrl: (path: string) => path ? `https://tmdb${path}` : "",
    },
    trakt: {
      isAuthenticated: () => false,
    },
  },
}));

vi.mock("../../services/trakt", () => ({
  isAuthenticated: () => false,
  getTrending: vi.fn().mockResolvedValue([]),
  getWatchlist: vi.fn().mockResolvedValue([]),
  getRecommendations: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../services/plextv", () => ({
  getWatchlist: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({ catalogDisabledLibraries: [] }),
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/PosterCard", () => ({
  PosterCard: ({ item, onClick }: any) => <div data-testid="poster-card" onClick={onClick}>{item.title}</div>,
}));
vi.mock("../../components/SkeletonRow", () => ({
  SkeletonRow: () => <div data-testid="skeleton-row" />,
}));

describe("BrowsePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { source: "trending-movies" };
  });

  it("shows loading skeleton initially", () => {
    mockGetTrendingMovies.mockReturnValue(new Promise(() => {}));
    render(<BrowsePage />);
    expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThanOrEqual(1);
  });

  it("renders title based on source", async () => {
    mockGetTrendingMovies.mockResolvedValue({ results: [], page: 1, total_pages: 1 });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Popular Movies")).toBeInTheDocument();
  });

  it("renders items after loading", async () => {
    mockGetTrendingMovies.mockResolvedValue({
      results: [
        { id: 1, title: "Inception", poster_path: "/p.jpg", backdrop_path: "/b.jpg", release_date: "2010-07-16", overview: "Test" },
      ],
      page: 1,
      total_pages: 1,
    });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("shows no items found when empty", async () => {
    mockGetTrendingMovies.mockResolvedValue({ results: [], page: 1, total_pages: 1 });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders Back button", async () => {
    mockGetTrendingMovies.mockResolvedValue({ results: [], page: 1, total_pages: 1 });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("← Back")).toBeInTheDocument();
  });

  it("navigates back on Back click", async () => {
    mockGetTrendingMovies.mockResolvedValue({ results: [], page: 1, total_pages: 1 });
    await act(async () => {
      render(<BrowsePage />);
    });
    fireEvent.click(screen.getByText("← Back"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("renders trending-shows source", async () => {
    mockParams = { source: "trending-shows" };
    mockGetTrendingTV.mockResolvedValue({
      results: [
        { id: 10, name: "Breaking Bad", poster_path: "/bb.jpg", backdrop_path: "/bb-bg.jpg", first_air_date: "2008-01-20", overview: "Chemistry" },
      ],
      page: 1,
      total_pages: 1,
    });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText("Trending Shows")).toBeInTheDocument();
  });

  it("renders collections source", async () => {
    mockParams = { source: "collections" };
    mockGetAllCollections.mockResolvedValue([
      { ratingKey: "c1", title: "Marvel Collection" },
    ]);
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Marvel Collection")).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
  });

  it("renders recently-added-movies source", async () => {
    mockParams = { source: "recently-added-movies" };
    mockGetLibraries.mockResolvedValue([{ key: "1", type: "movie", title: "Movies" }]);
    mockGetLibraryItems.mockResolvedValue([
      { ratingKey: "m1", title: "New Movie" },
    ]);
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("New Movie")).toBeInTheDocument();
  });

  it("renders empty for unknown source", async () => {
    mockParams = { source: "unknown-source" };
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("uses route state title when provided", async () => {
    mockGetTrendingMovies.mockResolvedValue({ results: [], page: 1, total_pages: 1 });
    mockLocation.state = { title: "Custom Title" } as any;
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    mockLocation.state = null;
  });

  it("navigates to details on item click", async () => {
    mockGetTrendingMovies.mockResolvedValue({
      results: [
        { id: 5, title: "Clickable", poster_path: "/p.jpg", backdrop_path: "/b.jpg", release_date: "2025-01-01", overview: "" },
      ],
      page: 1,
      total_pages: 1,
    });
    await act(async () => {
      render(<BrowsePage />);
    });
    fireEvent.click(screen.getByText("Clickable"));
    expect(mockNavigate).toHaveBeenCalledWith("/details/tmdb-movie-5");
  });
});
