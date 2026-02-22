import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { LibraryPage } from "../../pages/Library";

let mockParams: Record<string, string> = { type: "movie" };
const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
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

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({ catalogDisabledLibraries: [] }),
}));

const mockGetLibraries = vi.fn();
const mockGetLibraryItems = vi.fn();
const mockGetGenres = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    isPlexAuthenticated: true,
    plexServer: {
      getLibraries: (...a: unknown[]) => mockGetLibraries(...a),
      getLibraryItems: (...a: unknown[]) => mockGetLibraryItems(...a),
      getGenres: (...a: unknown[]) => mockGetGenres(...a),
      getImageUrl: () => "",
    },
  },
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/PosterCard", () => ({
  PosterCard: ({ item }: any) => <div data-testid="poster-card">{item.title}</div>,
}));
vi.mock("../../components/FilterBar", () => ({
  FilterBar: ({ options }: any) => <div data-testid="filter-bar">{options.length} filters</div>,
}));
vi.mock("../../components/SkeletonRow", () => ({
  SkeletonRow: () => <div data-testid="skeleton-row" />,
}));
vi.mock("../../components/VirtualGrid", () => ({
  VirtualGrid: ({ items, render: renderFn }: any) => (
    <div data-testid="virtual-grid">
      {items.map((item: any) => <div key={item.id}>{renderFn(item)}</div>)}
    </div>
  ),
}));
vi.mock("../../components/SectionBanner", () => ({
  SectionBanner: ({ title }: any) => <div data-testid="section-banner">{title}</div>,
}));

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { type: "movie" };
    mockGetLibraries.mockResolvedValue([]);
    mockGetLibraryItems.mockResolvedValue([]);
    mockGetGenres.mockResolvedValue([]);
  });

  it("shows loading skeleton initially", () => {
    mockGetLibraries.mockReturnValue(new Promise(() => {}));
    render(<LibraryPage />);
    expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Movies title for movie type", async () => {
    await act(async () => {
      render(<LibraryPage />);
    });
    expect(screen.getByText("Movies")).toBeInTheDocument();
  });

  it("shows TV Shows title for show type", async () => {
    mockParams = { type: "show" };
    await act(async () => {
      render(<LibraryPage />);
    });
    expect(screen.getByText("TV Shows")).toBeInTheDocument();
  });

  it("renders library items in grid", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", type: "movie", title: "Movies" },
    ]);
    mockGetLibraryItems.mockResolvedValue([
      { ratingKey: "101", title: "Inception" },
      { ratingKey: "102", title: "Interstellar" },
    ]);
    mockGetGenres.mockResolvedValue([]);
    await act(async () => {
      render(<LibraryPage />);
    });
    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.getByText("Interstellar")).toBeInTheDocument();
  });

  it("shows no results when filtered items are empty", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", type: "movie", title: "Movies" },
    ]);
    mockGetLibraryItems.mockResolvedValue([]);
    mockGetGenres.mockResolvedValue([]);
    await act(async () => {
      render(<LibraryPage />);
    });
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("renders filter bar when genres exist", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", type: "movie", title: "Movies" },
    ]);
    mockGetLibraryItems.mockResolvedValue([
      { ratingKey: "101", title: "Test" },
    ]);
    mockGetGenres.mockResolvedValue([
      { key: "action", title: "Action" },
      { key: "comedy", title: "Comedy" },
    ]);
    await act(async () => {
      render(<LibraryPage />);
    });
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
  });

  it("filters items by search query", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", type: "movie", title: "Movies" },
    ]);
    mockGetLibraryItems.mockResolvedValue([
      { ratingKey: "101", title: "Inception" },
      { ratingKey: "102", title: "Interstellar" },
    ]);
    mockGetGenres.mockResolvedValue([]);
    await act(async () => {
      render(<LibraryPage />);
    });
    const input = screen.getByPlaceholderText("Search movies...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Incep" } });
    });
    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.queryByText("Interstellar")).not.toBeInTheDocument();
  });
});
