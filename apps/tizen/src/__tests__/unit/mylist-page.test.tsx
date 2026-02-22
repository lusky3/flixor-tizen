import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MyListPage } from "../../pages/MyList";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
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

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/MediaCard", () => ({
  MediaCard: ({ item, onClick }: any) => (
    <button data-testid="media-card" onClick={onClick}>{item.title}</button>
  ),
}));

const mockPlexWatchlist = vi.fn();
const mockTraktWatchlist = vi.fn();
const mockTraktIsAuth = vi.fn();
const mockTmdbGetDetails = vi.fn();

vi.mock("../../services/plextv", () => ({
  getWatchlist: (...a: unknown[]) => mockPlexWatchlist(...a),
}));

vi.mock("../../services/trakt", () => ({
  getWatchlist: (...a: unknown[]) => mockTraktWatchlist(...a),
  isAuthenticated: () => mockTraktIsAuth(),
}));

vi.mock("../../services/tmdb", () => ({
  getDetails: (...a: unknown[]) => mockTmdbGetDetails(...a),
  buildImageUrl: (path: string) => path ? `https://tmdb${path}` : "",
}));

describe("MyListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlexWatchlist.mockResolvedValue([]);
    mockTraktWatchlist.mockResolvedValue([]);
    mockTraktIsAuth.mockReturnValue(false);
    mockTmdbGetDetails.mockResolvedValue({});
  });

  it("shows loading state", () => {
    mockPlexWatchlist.mockReturnValue(new Promise(() => {}));
    render(<MyListPage />);
    expect(screen.getByText("Loading Watchlist...")).toBeInTheDocument();
  });

  it("shows empty state when no items", async () => {
    await act(async () => {
      render(<MyListPage />);
    });
    expect(screen.getByText("Your list is empty")).toBeInTheDocument();
  });

  it("renders plex watchlist items", async () => {
    mockPlexWatchlist.mockResolvedValue([
      { ratingKey: "1", title: "Inception", type: "movie", thumb: "/t.jpg", art: "" },
    ]);
    await act(async () => {
      render(<MyListPage />);
    });
    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.getByText("1 titles")).toBeInTheDocument();
  });

  it("renders trakt watchlist items when authenticated", async () => {
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktWatchlist.mockResolvedValue([
      {
        type: "movie",
        movie: { title: "Dune", ids: { tmdb: 438631, slug: "dune" }, year: 2021 },
      },
    ]);
    mockTmdbGetDetails.mockResolvedValue({ poster_path: "/dune.jpg" });
    await act(async () => {
      render(<MyListPage />);
    });
    expect(screen.getByText("Dune")).toBeInTheDocument();
  });

  it("deduplicates items by tmdb ID", async () => {
    mockPlexWatchlist.mockResolvedValue([
      { ratingKey: "1", title: "Inception", type: "movie", Guid: [{ id: "tmdb://27205" }] },
    ]);
    mockTraktIsAuth.mockReturnValue(true);
    mockTraktWatchlist.mockResolvedValue([
      { type: "movie", movie: { title: "Inception", ids: { tmdb: 27205, slug: "inception" }, year: 2010 } },
    ]);
    await act(async () => {
      render(<MyListPage />);
    });
    expect(screen.getByText("1 titles")).toBeInTheDocument();
  });

  it("navigates to details on plex item click", async () => {
    mockPlexWatchlist.mockResolvedValue([
      { ratingKey: "42", title: "Inception", type: "movie", thumb: "", art: "" },
    ]);
    await act(async () => {
      render(<MyListPage />);
    });
    fireEvent.click(screen.getByText("Inception"));
    expect(mockNavigate).toHaveBeenCalledWith("/details/42");
  });

  it("Browse Home button navigates to /", async () => {
    await act(async () => {
      render(<MyListPage />);
    });
    fireEvent.click(screen.getByText("Browse Home"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("handles plex watchlist error gracefully", async () => {
    mockPlexWatchlist.mockRejectedValue(new Error("Network"));
    await act(async () => {
      render(<MyListPage />);
    });
    expect(screen.getByText("Your list is empty")).toBeInTheDocument();
  });
});
