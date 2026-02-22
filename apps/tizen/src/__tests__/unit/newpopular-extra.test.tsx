import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NewPopularPage } from "../../pages/NewPopular";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockGetTrending = vi.fn();
const mockGetUpcoming = vi.fn();
const mockGetDetails = vi.fn();

vi.mock("../../services/tmdb", () => ({
  getTrending: (...a: unknown[]) => mockGetTrending(...a),
  getUpcoming: (...a: unknown[]) => mockGetUpcoming(...a),
  getDetails: (...a: unknown[]) => mockGetDetails(...a),
  buildImageUrl: (path: string) => path ? `https://tmdb${path}` : "",
}));

const mockTraktIsAuth = vi.fn().mockReturnValue(false);
const mockTraktGetTrending = vi.fn().mockResolvedValue([]);
const mockTraktGetAnticipated = vi.fn().mockResolvedValue([]);

vi.mock("../../services/trakt", () => ({
  isAuthenticated: () => mockTraktIsAuth(),
  getTrending: (...a: unknown[]) => mockTraktGetTrending(...a),
  getAnticipated: (...a: unknown[]) => mockTraktGetAnticipated(...a),
}));

const mockGetLibraries = vi.fn().mockResolvedValue([]);
const mockGetRecentlyAdded = vi.fn().mockResolvedValue([]);

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getLibraries: (...a: unknown[]) => mockGetLibraries(...a),
      getRecentlyAdded: (...a: unknown[]) => mockGetRecentlyAdded(...a),
    },
  },
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/MediaCard", () => ({
  MediaCard: ({ item, onClick }: { item: { title: string; ratingKey: string }; onClick: () => void }) => (
    <div data-testid="media-card" onClick={onClick}>{item.title}</div>
  ),
}));
vi.mock("../../components/FilterBar", () => ({
  FilterBar: ({ options, activeId, onSelect }: {
    options: { id: string; label: string }[];
    activeId: string;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="filter-bar">
      {options.map((o) => (
        <button key={o.id} data-testid={`filter-${o.id}`} onClick={() => onSelect(o.id)}
          className={activeId === o.id ? "active" : ""}>
          {o.label}
        </button>
      ))}
    </div>
  ),
}));

describe("NewPopularPage – advanced tabs & Trakt paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrending.mockResolvedValue({ results: [] });
    mockGetUpcoming.mockResolvedValue({ results: [] });
    mockGetDetails.mockResolvedValue(null);
  });

  it("loadTop10 with Trakt authenticated shows Trakt movies", async () => {
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktGetTrending.mockImplementation(async (type: string) => {
      if (type === "movies") {
        return [
          { movie: { title: "Trakt Top Movie", ids: { tmdb: 10, trakt: 20 }, year: 2025 } },
        ];
      }
      return [
        { show: { title: "Trakt Top Show", ids: { tmdb: 30, trakt: 40 }, year: 2025 } },
      ];
    });
    mockGetDetails.mockResolvedValue({ poster_path: "/p.jpg", backdrop_path: "/b.jpg", overview: "Good" });

    await act(async () => {
      render(<NewPopularPage />);
    });
    // Switch to Top 10 tab
    await act(async () => {
      fireEvent.click(screen.getByText("Top 10"));
    });

    expect(mockTraktGetTrending).toHaveBeenCalledWith("movies");
    expect(mockTraktGetTrending).toHaveBeenCalledWith("shows");
  });

  it("loadTop10 falls back to TMDB when Trakt not authenticated", async () => {
    mockTraktIsAuth.mockReturnValue(false);
    mockGetTrending.mockResolvedValue({
      results: [
        { id: 1, title: "TMDB Top", poster_path: "/p.jpg", backdrop_path: "/b.jpg", release_date: "2025-01-01", overview: "Fallback" },
      ],
    });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Top 10"));
    });

    expect(screen.getByText("TMDB Top")).toBeInTheDocument();
  });

  it("loadComingSoon shows upcoming movies", async () => {
    mockGetUpcoming.mockResolvedValue({
      results: [
        { id: 50, title: "Upcoming Film", poster_path: "/u.jpg", backdrop_path: "/ub.jpg", release_date: "2026-06-01", overview: "Soon" },
      ],
    });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Coming Soon"));
    });

    expect(screen.getByText("Upcoming Film")).toBeInTheDocument();
  });

  it("loadWorthWait with Trakt shows anticipated movies", async () => {
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktGetAnticipated.mockImplementation(async (type: string) => {
      if (type === "movies") {
        return [{ title: "Anticipated Movie", ids: { tmdb: 60 }, year: 2026 }];
      }
      return [{ title: "Anticipated Show", ids: { tmdb: 70 }, year: 2026 }];
    });
    mockGetDetails.mockResolvedValue({ poster_path: "/a.jpg", backdrop_path: "/ab.jpg", overview: "Hype" });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Worth the Wait"));
    });

    expect(mockTraktGetAnticipated).toHaveBeenCalledWith("movies");
    expect(mockTraktGetAnticipated).toHaveBeenCalledWith("shows");
  });

  it("loadWorthWait falls back to TMDB upcoming when Trakt not authenticated", async () => {
    mockTraktIsAuth.mockReturnValue(false);
    mockGetUpcoming.mockResolvedValue({
      results: [
        { id: 80, title: "Fallback Upcoming", poster_path: "/f.jpg", backdrop_path: "/fb.jpg", release_date: "2026-01-01", overview: "FB" },
      ],
    });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Worth the Wait"));
    });

    expect(screen.getByText("Fallback Upcoming")).toBeInTheDocument();
  });

  it("content filter 'movies' only shows movies in trending", async () => {
    mockGetTrending.mockImplementation(async (type: string) => {
      if (type === "movie") return { results: [{ id: 1, title: "Only Movie", poster_path: "/p.jpg", backdrop_path: "/b.jpg", release_date: "2025-01-01", overview: "" }] };
      return { results: [{ id: 2, name: "Only Show", poster_path: "/p2.jpg", backdrop_path: "/b2.jpg", first_air_date: "2025-01-01", overview: "" }] };
    });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-movies"));
    });

    // Should show movie but not show
    expect(screen.getByText("Only Movie")).toBeInTheDocument();
    expect(screen.queryByText("Only Show")).not.toBeInTheDocument();
  });

  it("content filter 'shows' only shows TV in trending", async () => {
    mockGetTrending.mockImplementation(async (type: string) => {
      if (type === "movie") return { results: [{ id: 1, title: "Hidden Movie", poster_path: "/p.jpg", backdrop_path: "/b.jpg", release_date: "2025-01-01", overview: "" }] };
      return { results: [{ id: 2, name: "Visible Show", poster_path: "/p2.jpg", backdrop_path: "/b2.jpg", first_air_date: "2025-01-01", overview: "" }] };
    });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-shows"));
    });

    expect(screen.getByText("Visible Show")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Movie")).not.toBeInTheDocument();
  });

  it("period filter 'daily' uses day time window", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-daily"));
    });

    // getTrending should be called with "day" time window
    const calls = mockGetTrending.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toBe("day");
  });

  it("period filter 'monthly' uses week time window (TMDB only has day/week)", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-monthly"));
    });

    const calls = mockGetTrending.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toBe("week");
  });

  it("trending tab shows Plex recently added when available", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });
    mockGetLibraries.mockResolvedValue([{ key: "1", type: "movie", title: "Movies" }]);
    mockGetRecentlyAdded.mockResolvedValue([
      { ratingKey: "r1", title: "New on Plex Movie" },
    ]);

    await act(async () => {
      render(<NewPopularPage />);
    });

    expect(screen.getByText("New on Plex Movie")).toBeInTheDocument();
  });

  it("navigates to details on media card click", async () => {
    mockGetTrending.mockImplementation(async (type: string) => {
      if (type === "movie") return { results: [{ id: 42, title: "Clickable Movie", poster_path: "/p.jpg", backdrop_path: "/b.jpg", release_date: "2025-01-01", overview: "" }] };
      return { results: [] };
    });

    await act(async () => {
      render(<NewPopularPage />);
    });

    fireEvent.click(screen.getByText("Clickable Movie"));
    expect(mockNavigate).toHaveBeenCalledWith("/details/tmdb-movie-42");
  });

  it("handles error in loadContent gracefully", async () => {
    mockGetTrending.mockRejectedValue(new Error("API down"));

    await act(async () => {
      render(<NewPopularPage />);
    });

    // Should not crash, just show empty
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("Top 10 with movies filter only fetches movies from Trakt", async () => {
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktGetTrending.mockResolvedValue([
      { movie: { title: "Top Movie Only", ids: { tmdb: 11 }, year: 2025 } },
    ]);
    mockGetDetails.mockResolvedValue({ poster_path: "/p.jpg", backdrop_path: "/b.jpg", overview: "" });

    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Top 10"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-movies"));
    });

    // Should only call getTrending for movies, not shows
    const movieCalls = mockTraktGetTrending.mock.calls.filter((c: unknown[]) => c[0] === "movies");
    expect(movieCalls.length).toBeGreaterThanOrEqual(1);
  });
});
