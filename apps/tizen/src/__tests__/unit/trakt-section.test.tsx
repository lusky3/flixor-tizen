import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import type { TraktTrendingMovie, TraktWatchlistItem, TraktHistoryItem, TraktMovie, TraktShow } from "@flixor/core";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: vi.fn(() => ({
    ref: vi.fn(),
    focusKey: "mock-key",
    focused: false,
    focusSelf: vi.fn(),
  })),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Trakt service mocks
const mockIsAuthenticated = vi.fn(() => true);
const mockGetTrending = vi.fn();
const mockGetPopular = vi.fn();
const mockGetWatchlist = vi.fn();
const mockGetHistory = vi.fn();
const mockGetRecommendations = vi.fn();

vi.mock("../../services/trakt", () => ({
  isAuthenticated: (...args: unknown[]) => mockIsAuthenticated(...args),
  getTrending: (...args: unknown[]) => mockGetTrending(...args),
  getPopular: (...args: unknown[]) => mockGetPopular(...args),
  getWatchlist: (...args: unknown[]) => mockGetWatchlist(...args),
  getHistory: (...args: unknown[]) => mockGetHistory(...args),
  getRecommendations: (...args: unknown[]) => mockGetRecommendations(...args),
}));

// TMDB service mocks
const mockGetDetails = vi.fn();
const mockBuildImageUrl = vi.fn((path: string) => path ? `https://tmdb.test${path}` : "");

vi.mock("../../services/tmdb", () => ({
  getDetails: (...args: unknown[]) => mockGetDetails(...args),
  buildImageUrl: (...args: unknown[]) => mockBuildImageUrl(...args),
}));

// ContentRow mock — renders title and item count for assertions
vi.mock("../../components/ContentRow", () => ({
  ContentRow: ({ title, items }: { title: string; items: unknown[] }) => (
    <div data-testid="content-row">
      <span data-testid="row-title">{title}</span>
      <span data-testid="row-count">{items.length}</span>
    </div>
  ),
}));

// SkeletonRow mock
vi.mock("../../components/SkeletonRow", () => ({
  SkeletonRow: () => <div data-testid="skeleton-row" />,
}));

// ── Helpers ────────────────────────────────────────────────────────────

function makeTrendingMovie(id: number, title: string): TraktTrendingMovie {
  return {
    watchers: 100,
    movie: {
      title,
      year: 2024,
      ids: { trakt: id, tmdb: id + 1000 },
      overview: `Overview for ${title}`,
    },
  };
}

function makeWatchlistItem(id: number, title: string): TraktWatchlistItem {
  return {
    listed_at: "2024-01-01T00:00:00.000Z",
    type: "movie",
    movie: {
      title,
      year: 2024,
      ids: { trakt: id, tmdb: id + 1000 },
      overview: `Overview for ${title}`,
    },
  };
}

function makeHistoryItem(id: number, title: string): TraktHistoryItem {
  return {
    id,
    watched_at: "2024-01-01T00:00:00.000Z",
    action: "watch",
    type: "movie",
    movie: {
      title,
      year: 2024,
      ids: { trakt: id, tmdb: id + 1000 },
      overview: `Overview for ${title}`,
    },
  };
}

function makePopularShow(id: number, title: string): TraktShow {
  return {
    title,
    year: 2024,
    ids: { trakt: id, tmdb: id + 1000 },
    overview: `Overview for ${title}`,
    first_aired: "2024-01-01",
  };
}

/** Simulate successful TMDB enrichment with poster */
function setupTmdbSuccess() {
  mockGetDetails.mockImplementation((_id: number, type: string) =>
    Promise.resolve({
      poster_path: `/poster_${type}.jpg`,
      backdrop_path: `/backdrop_${type}.jpg`,
      overview: "TMDB overview",
    }),
  );
}

/** Simulate TMDB enrichment failure (all calls throw) */
function setupTmdbFailure() {
  mockGetDetails.mockRejectedValue(new Error("TMDB unavailable"));
}

// ── Tests ──────────────────────────────────────────────────────────────

// Lazy import so mocks are wired before module loads
async function importTraktSection() {
  const mod = await import("../../components/TraktSection");
  return mod.TraktSection;
}

describe("TraktSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockGetTrending.mockResolvedValue([]);
    mockGetPopular.mockResolvedValue([]);
    mockGetWatchlist.mockResolvedValue([]);
    mockGetHistory.mockResolvedValue([]);
    mockGetRecommendations.mockResolvedValue([]);
  });

  // ── 1. Loading skeleton then ContentRow ────────────────────────────

  describe("loading and rendering", () => {
    it("shows SkeletonRow while loading, then ContentRow with items", async () => {
      const TraktSection = await importTraktSection();
      const items = [makeTrendingMovie(1, "Movie A"), makeTrendingMovie(2, "Movie B")];
      mockGetTrending.mockResolvedValue(items);
      setupTmdbSuccess();

      await act(async () => {
        render(<TraktSection type="trending" mediaType="movies" />);
      });

      // After async resolution, ContentRow should be rendered
      await waitFor(() => {
        expect(screen.getByTestId("content-row")).toBeInTheDocument();
      });
      expect(screen.getByTestId("row-title")).toHaveTextContent("Trending Movies on Trakt");
      expect(screen.getByTestId("row-count")).toHaveTextContent("2");
    });
  });

  // ── 2. Hides on empty results ──────────────────────────────────────

  describe("empty results", () => {
    it("renders nothing when Trakt returns empty array", async () => {
      const TraktSection = await importTraktSection();
      mockGetTrending.mockResolvedValue([]);

      const { container } = render(<TraktSection type="trending" mediaType="movies" />);

      await waitFor(() => {
        expect(container.innerHTML).toBe("");
      });
    });
  });

  // ── 3. Hides on API error ──────────────────────────────────────────

  describe("API error", () => {
    it("renders nothing when Trakt API call throws", async () => {
      const TraktSection = await importTraktSection();
      mockGetTrending.mockRejectedValue(new Error("Network error"));

      const { container } = render(<TraktSection type="trending" mediaType="movies" />);

      await waitFor(() => {
        expect(container.innerHTML).toBe("");
      });
    });
  });

  // ── 4. Auth-required types hide when unauthenticated ───────────────

  describe("authentication gating", () => {
    it.each(["watchlist", "history", "recommendations"] as const)(
      "hides %s section when not authenticated",
      async (type) => {
        const TraktSection = await importTraktSection();
        mockIsAuthenticated.mockReturnValue(false);

        const { container } = render(<TraktSection type={type} mediaType="movies" />);

        await waitFor(() => {
          expect(container.innerHTML).toBe("");
        });
      },
    );
  });

  // ── 5. Trending/popular show even when unauthenticated ─────────────

  describe("public types without auth", () => {
    it.each(["trending", "popular"] as const)(
      "shows %s section even when not authenticated",
      async (type) => {
        const TraktSection = await importTraktSection();
        mockIsAuthenticated.mockReturnValue(false);

        const items =
          type === "trending"
            ? [makeTrendingMovie(1, "Public Movie")]
            : [{ title: "Pop Movie", year: 2024, ids: { trakt: 1, tmdb: 1001 } } as TraktMovie];

        if (type === "trending") mockGetTrending.mockResolvedValue(items);
        else mockGetPopular.mockResolvedValue(items);

        setupTmdbSuccess();

        render(<TraktSection type={type} mediaType="movies" />);

        await waitFor(() => {
          expect(screen.getByTestId("content-row")).toBeInTheDocument();
        });
      },
    );
  });

  // ── 6. TMDB enrichment failure filters out items ───────────────────

  describe("TMDB enrichment failure", () => {
    it("hides section when all items fail TMDB enrichment (no posters)", async () => {
      const TraktSection = await importTraktSection();
      mockGetTrending.mockResolvedValue([makeTrendingMovie(1, "No Poster")]);
      setupTmdbFailure();
      // buildImageUrl returns "" for null/undefined paths
      mockBuildImageUrl.mockReturnValue("");

      const { container } = render(<TraktSection type="trending" mediaType="movies" />);

      await waitFor(() => {
        expect(container.innerHTML).toBe("");
      });
    });

    it("keeps items that succeed enrichment, filters those that fail", async () => {
      const TraktSection = await importTraktSection();
      mockGetTrending.mockResolvedValue([
        makeTrendingMovie(1, "Good Movie"),
        makeTrendingMovie(2, "Bad Movie"),
      ]);

      // First call succeeds, second fails
      let callCount = 0;
      mockGetDetails.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            poster_path: "/poster.jpg",
            backdrop_path: "/backdrop.jpg",
            overview: "Good overview",
          });
        }
        return Promise.reject(new Error("TMDB fail"));
      });
      // buildImageUrl returns real URL for valid paths, "" for falsy
      mockBuildImageUrl.mockImplementation((path: string) =>
        path ? `https://tmdb.test${path}` : "",
      );

      render(<TraktSection type="trending" mediaType="movies" />);

      await waitFor(() => {
        expect(screen.getByTestId("content-row")).toBeInTheDocument();
      });
      // Only the successfully enriched item should remain
      expect(screen.getByTestId("row-count")).toHaveTextContent("1");
    });
  });

  // ── 7. Default titles for each type+mediaType combo ────────────────

  describe("default titles", () => {
    const titleCases: Array<{
      type: "trending" | "popular" | "watchlist" | "history" | "recommendations";
      mediaType: "movies" | "shows";
      expected: string;
    }> = [
      { type: "trending", mediaType: "movies", expected: "Trending Movies on Trakt" },
      { type: "trending", mediaType: "shows", expected: "Trending TV Shows on Trakt" },
      { type: "popular", mediaType: "movies", expected: "Popular Movies on Trakt" },
      { type: "popular", mediaType: "shows", expected: "Popular TV Shows on Trakt" },
      { type: "watchlist", mediaType: "movies", expected: "Trakt Watchlist" },
      { type: "watchlist", mediaType: "shows", expected: "Trakt Watchlist" },
      { type: "history", mediaType: "movies", expected: "Recently Watched" },
      { type: "history", mediaType: "shows", expected: "Recently Watched" },
      { type: "recommendations", mediaType: "movies", expected: "Recommended for You" },
      { type: "recommendations", mediaType: "shows", expected: "Recommended for You" },
    ];

    it.each(titleCases)(
      "renders '$expected' for type=$type mediaType=$mediaType",
      async ({ type, mediaType, expected }) => {
        const TraktSection = await importTraktSection();
        setupTmdbSuccess();

        // Provide data for the specific type
        const trendingItem = makeTrendingMovie(1, "T");
        const popularItem: TraktMovie = { title: "P", year: 2024, ids: { trakt: 1, tmdb: 1001 } };
        const watchlistItem = makeWatchlistItem(1, "W");
        const historyItem = makeHistoryItem(1, "H");
        const showItem = makePopularShow(1, "S");

        switch (type) {
          case "trending":
            mockGetTrending.mockResolvedValue(
              mediaType === "shows"
                ? [{ watchers: 10, show: showItem }]
                : [trendingItem],
            );
            break;
          case "popular":
            mockGetPopular.mockResolvedValue(
              mediaType === "shows" ? [showItem] : [popularItem],
            );
            break;
          case "watchlist":
            mockGetWatchlist.mockResolvedValue(
              mediaType === "shows"
                ? [{ ...watchlistItem, type: "show", movie: undefined, show: showItem }]
                : [watchlistItem],
            );
            break;
          case "history":
            mockGetHistory.mockResolvedValue(
              mediaType === "shows"
                ? [{ ...historyItem, type: "episode", movie: undefined, show: showItem }]
                : [historyItem],
            );
            break;
          case "recommendations":
            mockGetRecommendations.mockResolvedValue(
              mediaType === "shows" ? [showItem] : [popularItem],
            );
            break;
        }

        render(<TraktSection type={type} mediaType={mediaType} />);

        await waitFor(() => {
          expect(screen.getByTestId("row-title")).toHaveTextContent(expected);
        });
      },
    );

    it("uses custom title prop when provided", async () => {
      const TraktSection = await importTraktSection();
      mockGetTrending.mockResolvedValue([makeTrendingMovie(1, "M")]);
      setupTmdbSuccess();

      render(
          <TraktSection type="trending" mediaType="movies" title="My Custom Title" />,
        );

        await waitFor(() => {
          expect(screen.getByTestId("row-title")).toHaveTextContent("My Custom Title");
        });
    });
  });
});
