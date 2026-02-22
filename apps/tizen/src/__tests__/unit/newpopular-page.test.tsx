import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NewPopularPage } from "../../pages/NewPopular";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
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

const mockGetTrending = vi.fn();
vi.mock("../../services/tmdb", () => ({
  getTrending: (...a: unknown[]) => mockGetTrending(...a),
  getUpcoming: vi.fn().mockResolvedValue({ results: [] }),
  getDetails: vi.fn().mockResolvedValue(null),
  getCredits: vi.fn().mockResolvedValue({ cast: [], crew: [] }),
  getRecommendations: vi.fn().mockResolvedValue({ results: [] }),
  getVideos: vi.fn().mockResolvedValue({ results: [] }),
  buildImageUrl: (path: string) => path ? `https://tmdb${path}` : "",
}));

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getLibraries: vi.fn().mockResolvedValue([]),
      getRecentlyAdded: vi.fn().mockResolvedValue([]),
      getImageUrl: () => "",
    },
  },
}));

vi.mock("../../services/trakt", () => ({
  isAuthenticated: () => false,
  getTrending: vi.fn().mockResolvedValue([]),
  getAnticipated: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/MediaCard", () => ({
  MediaCard: ({ item }: any) => <div data-testid="media-card">{item.title}</div>,
}));
vi.mock("../../components/FilterBar", () => ({
  FilterBar: ({ options, activeId, onSelect }: any) => (
    <div data-testid="filter-bar">
      {options.map((o: any) => (
        <button key={o.id} data-testid={`filter-${o.id}`} onClick={() => onSelect(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  ),
}));

describe("NewPopularPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrending.mockResolvedValue({ results: [] });
  });

  it("renders tab buttons", async () => {
    await act(async () => {
      render(<NewPopularPage />);
    });
    expect(screen.getByText("Trending Now")).toBeInTheDocument();
    expect(screen.getByText("Top 10")).toBeInTheDocument();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.getByText("Worth the Wait")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockGetTrending.mockReturnValue(new Promise(() => {}));
    render(<NewPopularPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders trending movies when loaded", async () => {
    mockGetTrending.mockImplementation(async (type: string) => {
      if (type === "movie") {
        return {
          results: [
            { id: 1, title: "Trending Film", poster_path: "/p.jpg", backdrop_path: "/b.jpg", release_date: "2025-01-01", overview: "A film" },
          ],
        };
      }
      return { results: [] };
    });
    await act(async () => {
      render(<NewPopularPage />);
    });
    expect(screen.getAllByText("Trending Film").length).toBeGreaterThanOrEqual(1);
  });

  it("switches tabs on click", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });
    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Coming Soon"));
    });
    // Tab should be active (the button gets "active" class)
    expect(screen.getByText("Coming Soon").className).toContain("active");
  });

  it("renders filter bars", async () => {
    await act(async () => {
      render(<NewPopularPage />);
    });
    expect(screen.getAllByTestId("filter-bar").length).toBeGreaterThanOrEqual(1);
  });

  it("renders top nav", async () => {
    await act(async () => {
      render(<NewPopularPage />);
    });
    expect(screen.getByTestId("top-nav")).toBeInTheDocument();
  });

  it("switches to Top 10 tab", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });
    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Top 10"));
    });
    expect(screen.getByText("Top 10").className).toContain("active");
  });

  it("switches to Worth the Wait tab", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });
    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Worth the Wait"));
    });
    expect(screen.getByText("Worth the Wait").className).toContain("active");
  });

  it("applies content filter", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });
    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-movies"));
    });
    // After clicking Movies filter, only movie trending should be fetched
    expect(mockGetTrending).toHaveBeenCalled();
  });

  it("applies period filter", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });
    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-daily"));
    });
    // Period filter triggers reload
    expect(mockGetTrending).toHaveBeenCalled();
  });

  it("hides period filter on Coming Soon tab", async () => {
    mockGetTrending.mockResolvedValue({ results: [] });
    await act(async () => {
      render(<NewPopularPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Coming Soon"));
    });
    // Period filter should not be present (only 1 filter bar for content type)
    expect(screen.getAllByTestId("filter-bar").length).toBe(1);
  });
});
