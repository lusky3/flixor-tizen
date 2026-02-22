import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SearchPage } from "../../pages/Search";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void; trackChildren?: boolean }) => ({
    ref: vi.fn(),
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    discoveryDisabled: false,
    includeTmdbInSearch: true,
  }),
}));

const mockPlexSearch = vi.fn();
vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      search: (...a: unknown[]) => mockPlexSearch(...a),
      getImageUrl: () => "",
    },
  },
}));

const mockGetTrending = vi.fn();
const mockTmdbSearch = vi.fn();
vi.mock("../../services/tmdb", () => ({
  getTrending: (...a: unknown[]) => mockGetTrending(...a),
  search: (...a: unknown[]) => mockTmdbSearch(...a),
  buildImageUrl: (path: string) => path ? `https://tmdb${path}` : "",
}));

const mockTraktIsAuth = vi.fn();
const mockTraktGetTrending = vi.fn();
vi.mock("../../services/trakt", () => ({
  isAuthenticated: () => mockTraktIsAuth(),
  getTrending: (...a: unknown[]) => mockTraktGetTrending(...a),
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/SearchInput", () => ({
  SearchInput: ({ value, onChange }: any) => (
    <input data-testid="search-input" value={value} onChange={(e: any) => onChange(e.target.value)} />
  ),
}));
vi.mock("../../components/SearchResults", () => ({
  SearchResults: ({ title, results }: any) => (
    <div data-testid="search-results">{title || "Results"}: {results.length}</div>
  ),
}));
vi.mock("../../components/PopularSearches", () => ({
  PopularSearches: ({ onSearchTerm }: any) => (
    <button data-testid="popular-searches" onClick={() => onSearchTerm("test")}>Popular</button>
  ),
}));
vi.mock("../../components/TrendingSearches", () => ({
  TrendingSearches: () => <div data-testid="trending-searches" />,
}));

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrending.mockResolvedValue({ results: [] });
    mockTraktIsAuth.mockReturnValue(false);
    mockPlexSearch.mockResolvedValue([]);
    mockTmdbSearch.mockResolvedValue({ results: [] });
  });

  it("renders search input and TopNav", async () => {
    await act(async () => {
      render(<SearchPage />);
    });
    expect(screen.getByTestId("top-nav")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("shows popular and trending searches when no query", async () => {
    await act(async () => {
      render(<SearchPage />);
    });
    expect(screen.getByTestId("popular-searches")).toBeInTheDocument();
    expect(screen.getByTestId("trending-searches")).toBeInTheDocument();
  });

  it("shows trending rows when trending data is available", async () => {
    mockGetTrending.mockResolvedValue({
      results: [
        { id: 1, title: "Movie 1", backdrop_path: "/b.jpg", release_date: "2024-01-01", media_type: "movie" },
      ],
    });
    await act(async () => {
      render(<SearchPage />);
    });
    expect(screen.getByText(/Trending/)).toBeInTheDocument();
  });

  it("shows Trakt popular when authenticated", async () => {
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktGetTrending.mockResolvedValue([
      { movie: { title: "Trakt Movie", ids: { tmdb: 1, trakt: 1 }, year: 2024 } },
    ]);
    await act(async () => {
      render(<SearchPage />);
    });
    expect(screen.getByText(/Popular on Trakt/)).toBeInTheDocument();
  });
});
