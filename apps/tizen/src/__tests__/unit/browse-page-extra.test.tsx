import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowsePage } from "../../pages/Browse";

let mockParams: Record<string, string> = { source: "trending-movies" };
const mockNavigate = vi.fn();
let mockLocationState: Record<string, unknown> | null = null;

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useLocation: () => ({ state: mockLocationState, pathname: `/browse/${mockParams.source}` }),
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

const mockGetTrendingMovies = vi.fn().mockResolvedValue({ results: [], page: 1, total_pages: 1 });
const mockGetTrendingTV = vi.fn().mockResolvedValue({ results: [], page: 1, total_pages: 1 });
const mockGetLibraries = vi.fn().mockResolvedValue([]);
const mockGetLibraryItems = vi.fn().mockResolvedValue([]);
const mockGetAllCollections = vi.fn().mockResolvedValue([]);
const mockGetMovieDetails = vi.fn().mockResolvedValue(null);
const mockGetTVDetails = vi.fn().mockResolvedValue(null);
const mockTraktIsAuth = vi.fn().mockReturnValue(false);
const mockTraktGetWatchlist = vi.fn().mockResolvedValue([]);
const mockTraktGetRecommendedMovies = vi.fn().mockResolvedValue([]);
const mockTraktGetTrendingMovies = vi.fn().mockResolvedValue([]);
const mockGetPlexWatchlist = vi.fn().mockResolvedValue([]);

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
      getMovieDetails: (...a: unknown[]) => mockGetMovieDetails(...a),
      getTVDetails: (...a: unknown[]) => mockGetTVDetails(...a),
      getPosterUrl: (p: string) => p ? `https://poster${p}` : "",
      getBackdropUrl: (p: string) => p ? `https://backdrop${p}` : "",
    },
    trakt: {
      isAuthenticated: () => mockTraktIsAuth(),
      getWatchlist: (...a: unknown[]) => mockTraktGetWatchlist(...a),
      getRecommendedMovies: (...a: unknown[]) => mockTraktGetRecommendedMovies(...a),
      getTrendingMovies: (...a: unknown[]) => mockTraktGetTrendingMovies(...a),
    },
  },
}));

vi.mock("../../services/plextv", () => ({
  getWatchlist: (...a: unknown[]) => mockGetPlexWatchlist(...a),
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({ catalogDisabledLibraries: [] }),
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/PosterCard", () => ({
  PosterCard: ({ item, onClick }: { item: { title: string }; onClick: () => void }) => (
    <div data-testid="poster-card" onClick={onClick}>{item.title}</div>
  ),
}));
vi.mock("../../components/SkeletonRow", () => ({
  SkeletonRow: () => <div data-testid="skeleton-row" />,
}));

describe("BrowsePage – extra sources & pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = null;
  });

  it("renders watchlist source from plextv", async () => {
    mockParams = { source: "watchlist" };
    mockGetPlexWatchlist.mockResolvedValue([
      { ratingKey: "w1", title: "Watchlist Movie", tmdbId: "123", guid: "tmdb://123" },
      { ratingKey: "w2", title: "Watchlist Show", tmdbId: "456", guid: "tmdb://456" },
    ]);
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Watchlist Movie")).toBeInTheDocument();
    expect(screen.getByText("Watchlist Show")).toBeInTheDocument();
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("renders trakt-watchlist source when authenticated", async () => {
    mockParams = { source: "trakt-watchlist" };
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktGetWatchlist.mockResolvedValue([
      { movie: { title: "Trakt WL Movie", ids: { tmdb: 100, trakt: 200 }, year: 2024 } },
    ]);
    mockGetMovieDetails.mockResolvedValue({ poster_path: "/p.jpg", backdrop_path: "/b.jpg", overview: "Great" });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Trakt WL Movie")).toBeInTheDocument();
  });

  it("returns empty for trakt-watchlist when not authenticated", async () => {
    mockParams = { source: "trakt-watchlist" };
    mockTraktIsAuth.mockReturnValue(false);
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders trakt-recommended source", async () => {
    mockParams = { source: "trakt-recommended" };
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktGetRecommendedMovies.mockResolvedValue([
      { title: "Recommended Film", ids: { tmdb: 300 }, year: 2025 },
    ]);
    mockGetMovieDetails.mockResolvedValue({ poster_path: "/r.jpg", backdrop_path: "/rb.jpg", overview: "Nice" });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Recommended Film")).toBeInTheDocument();
  });

  it("renders trakt-trending source", async () => {
    mockParams = { source: "trakt-trending" };
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktGetTrendingMovies.mockResolvedValue([
      { movie: { title: "Trending Trakt", ids: { tmdb: 400 }, year: 2025 } },
    ]);
    mockGetMovieDetails.mockResolvedValue({ poster_path: "/t.jpg", backdrop_path: "/tb.jpg", overview: "Hot" });
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("Trending Trakt")).toBeInTheDocument();
  });

  it("shows Load More button when hasMore is true and loads next page", async () => {
    mockParams = { source: "trending-movies" };
    const page1Items = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      title: `Movie ${i + 1}`,
      poster_path: "/p.jpg",
      backdrop_path: "/b.jpg",
      release_date: "2025-01-01",
      overview: "",
    }));
    mockGetTrendingMovies
      .mockResolvedValueOnce({ results: page1Items, page: 1, total_pages: 3 })
      .mockResolvedValueOnce({
        results: [{ id: 99, title: "Page 2 Movie", poster_path: "/p2.jpg", backdrop_path: "/b2.jpg", release_date: "2025-02-01", overview: "" }],
        page: 2,
        total_pages: 3,
      });

    await act(async () => {
      render(<BrowsePage />);
    });

    const loadMoreBtn = screen.getByText("Load More");
    expect(loadMoreBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(loadMoreBtn);
    });

    expect(screen.getByText("Page 2 Movie")).toBeInTheDocument();
  });

  it("renders recently-added-shows source", async () => {
    mockParams = { source: "recently-added-shows" };
    mockGetLibraries.mockResolvedValue([{ key: "2", type: "show", title: "TV Shows" }]);
    mockGetLibraryItems.mockResolvedValue([
      { ratingKey: "s1", title: "New Show" },
    ]);
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("New Show")).toBeInTheDocument();
    expect(screen.getByText("Recently Added Shows")).toBeInTheDocument();
  });

  it("returns empty for recently-added when no matching library", async () => {
    mockParams = { source: "recently-added-movies" };
    mockGetLibraries.mockResolvedValue([{ key: "2", type: "show", title: "TV Shows" }]);
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("handles error during fetch gracefully", async () => {
    mockParams = { source: "trending-movies" };
    mockGetTrendingMovies.mockRejectedValue(new Error("Network error"));
    await act(async () => {
      render(<BrowsePage />);
    });
    // Should show empty state, not crash
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("getSourceTitle returns formatted title for unknown source", async () => {
    mockParams = { source: "my-custom-source" };
    await act(async () => {
      render(<BrowsePage />);
    });
    expect(screen.getByText("My Custom Source")).toBeInTheDocument();
  });
});
