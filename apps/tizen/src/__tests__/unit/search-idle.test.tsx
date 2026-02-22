import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
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
  buildImageUrl: (path: string | null | undefined) =>
    path ? `https://tmdb.test${path}` : "",
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="smart-image" />
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function makeTrendingItem(
  id: number,
  title: string,
  opts: { backdrop?: string | null; mediaType?: string } = {},
) {
  return {
    id,
    title,
    name: undefined,
    media_type: (opts.mediaType ?? "movie") as "movie" | "tv",
    poster_path: `/poster_${id}.jpg`,
    backdrop_path: opts.backdrop !== undefined ? opts.backdrop : `/backdrop_${id}.jpg`,
  };
}

async function importTrendingSearches() {
  const mod = await import("../../components/TrendingSearches");
  return mod.TrendingSearches;
}

// ── TrendingSearches Tests ─────────────────────────────────────────────

describe("TrendingSearches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrending.mockResolvedValue({ results: [] });
  });

  it("shows loading skeleton while fetching", async () => {
    mockGetTrending.mockReturnValue(new Promise(() => {}));
    const TrendingSearches = await importTrendingSearches();

    render(<TrendingSearches onSelect={vi.fn()} />);

    expect(screen.getByText("Trending")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".trending-card.skeleton");
    expect(skeletons.length).toBe(5);
  });

  it("renders backdrop cards from trending items", async () => {
    const TrendingSearches = await importTrendingSearches();
    mockGetTrending.mockResolvedValue({
      results: [
        makeTrendingItem(1, "Inception"),
        makeTrendingItem(2, "Interstellar"),
      ],
    });

    await act(async () => {
      render(<TrendingSearches onSelect={vi.fn()} />);
    });

    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.getByText("Interstellar")).toBeInTheDocument();
    const images = screen.getAllByTestId("smart-image");
    expect(images.length).toBe(2);
  });

  it("calls onSelect with correct id, mediaType, title on click", async () => {
    const TrendingSearches = await importTrendingSearches();
    const onSelect = vi.fn();
    mockGetTrending.mockResolvedValue({
      results: [makeTrendingItem(42, "Dune", { mediaType: "movie" })],
    });

    await act(async () => {
      render(<TrendingSearches onSelect={onSelect} />);
    });

    fireEvent.click(screen.getByText("Dune"));
    expect(onSelect).toHaveBeenCalledWith({
      id: 42,
      mediaType: "movie",
      title: "Dune",
    });
  });

  it("hides when fetch fails", async () => {
    const TrendingSearches = await importTrendingSearches();
    mockGetTrending.mockRejectedValue(new Error("Network error"));

    const { container } = await act(async () =>
      render(<TrendingSearches onSelect={vi.fn()} />),
    );

    expect(container.innerHTML).toBe("");
  });

  it("hides when results are empty", async () => {
    const TrendingSearches = await importTrendingSearches();
    mockGetTrending.mockResolvedValue({ results: [] });

    const { container } = await act(async () =>
      render(<TrendingSearches onSelect={vi.fn()} />),
    );

    expect(container.innerHTML).toBe("");
  });

  it("filters out items without backdrop_path", async () => {
    const TrendingSearches = await importTrendingSearches();
    mockGetTrending.mockResolvedValue({
      results: [
        makeTrendingItem(1, "Has Backdrop"),
        makeTrendingItem(2, "No Backdrop", { backdrop: null }),
        makeTrendingItem(3, "Empty Backdrop", { backdrop: "" }),
      ],
    });

    await act(async () => {
      render(<TrendingSearches onSelect={vi.fn()} />);
    });

    expect(screen.getByText("Has Backdrop")).toBeInTheDocument();
    expect(screen.queryByText("No Backdrop")).not.toBeInTheDocument();
    // Empty string is falsy, so also filtered
    expect(screen.queryByText("Empty Backdrop")).not.toBeInTheDocument();
  });

  it("limits to 10 items", async () => {
    const TrendingSearches = await importTrendingSearches();
    const items = Array.from({ length: 20 }, (_, i) =>
      makeTrendingItem(i + 1, `Movie ${i + 1}`),
    );
    mockGetTrending.mockResolvedValue({ results: items });

    await act(async () => {
      render(<TrendingSearches onSelect={vi.fn()} />);
    });

    const cards = screen.getAllByRole("button");
    expect(cards.length).toBe(10);
  });
});
