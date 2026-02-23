import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: () => ({
    ref: vi.fn(),
    focusKey: "mock-key",
    focused: false,
    focusSelf: vi.fn(),
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockGetTrending = vi.fn();

vi.mock("../../services/tmdb", () => ({
  getTrending: (...args: unknown[]) => mockGetTrending(...args),
  buildImageUrl: (path: string) => (path ? `https://tmdb.test${path}` : ""),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function makeTrendingItem(id: number, title: string) {
  return {
    id,
    title,
    media_type: "movie" as const,
    poster_path: `/poster_${id}.jpg`,
    backdrop_path: `/backdrop_${id}.jpg`,
  };
}

function makeTrendingTVItem(id: number, name: string) {
  return {
    id,
    name,
    media_type: "tv" as const,
    poster_path: `/poster_${id}.jpg`,
    backdrop_path: `/backdrop_${id}.jpg`,
  };
}

async function importPopularSearches() {
  const mod = await import("../../components/PopularSearches");
  return mod.PopularSearches;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("PopularSearches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrending.mockResolvedValue({ results: [] });
  });

  it("shows loading skeleton while fetching", async () => {
    // Never-resolving promise to keep loading state
    mockGetTrending.mockReturnValue(new Promise(() => {}));
    const PopularSearches = await importPopularSearches();

    render(<PopularSearches onSearchTerm={vi.fn()} />);

    expect(screen.getByText("Popular Searches")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".popular-search-pill.skeleton");
    expect(skeletons.length).toBe(8);
  });

  it("renders pills from trending movie titles", async () => {
    const PopularSearches = await importPopularSearches();
    mockGetTrending.mockResolvedValue({
      results: [
        makeTrendingItem(1, "Inception"),
        makeTrendingItem(2, "Interstellar"),
      ],
    });

    await act(async () => {
      render(<PopularSearches onSearchTerm={vi.fn()} />);
    });

    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.getByText("Interstellar")).toBeInTheDocument();
  });

  it("renders pills from trending TV show names", async () => {
    const PopularSearches = await importPopularSearches();
    mockGetTrending.mockResolvedValue({
      results: [makeTrendingTVItem(1, "Breaking Bad")],
    });

    await act(async () => {
      render(<PopularSearches onSearchTerm={vi.fn()} />);
    });

    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
  });

  it("calls onSearchTerm with the pill text on click", async () => {
    const PopularSearches = await importPopularSearches();
    const onSearchTerm = vi.fn();
    mockGetTrending.mockResolvedValue({
      results: [makeTrendingItem(1, "Dune")],
    });

    await act(async () => {
      render(<PopularSearches onSearchTerm={onSearchTerm} />);
    });

    fireEvent.click(screen.getByText("Dune"));
    expect(onSearchTerm).toHaveBeenCalledWith("Dune");
  });

  it("renders nothing when fetch fails", async () => {
    const PopularSearches = await importPopularSearches();
    mockGetTrending.mockRejectedValue(new Error("Network error"));

    const { container } = await act(async () =>
      render(<PopularSearches onSearchTerm={vi.fn()} />),
    );

    // After error, component hides entirely
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when results are empty", async () => {
    const PopularSearches = await importPopularSearches();
    mockGetTrending.mockResolvedValue({ results: [] });

    const { container } = await act(async () =>
      render(<PopularSearches onSearchTerm={vi.fn()} />),
    );

    expect(container.innerHTML).toBe("");
  });

  it("deduplicates identical titles", async () => {
    const PopularSearches = await importPopularSearches();
    mockGetTrending.mockResolvedValue({
      results: [
        makeTrendingItem(1, "Avatar"),
        makeTrendingItem(2, "Avatar"),
        makeTrendingItem(3, "Titanic"),
      ],
    });

    await act(async () => {
      render(<PopularSearches onSearchTerm={vi.fn()} />);
    });

    const pills = screen.getAllByRole("button");
    expect(pills).toHaveLength(2);
    expect(screen.getByText("Avatar")).toBeInTheDocument();
    expect(screen.getByText("Titanic")).toBeInTheDocument();
  });

  it("limits to 12 trending items max", async () => {
    const PopularSearches = await importPopularSearches();
    const items = Array.from({ length: 20 }, (_, i) =>
      makeTrendingItem(i, `Movie ${i}`),
    );
    mockGetTrending.mockResolvedValue({ results: items });

    await act(async () => {
      render(<PopularSearches onSearchTerm={vi.fn()} />);
    });

    const pills = screen.getAllByRole("button");
    expect(pills.length).toBeLessThanOrEqual(12);
  });
});
