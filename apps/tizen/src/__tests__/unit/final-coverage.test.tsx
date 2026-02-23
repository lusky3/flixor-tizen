/**
 * Final coverage push: TraktSettings login flow, SeekSlider arrow press,
 * PosterCard callbacks, Library page, ProfileSelect, useTizenRemote visibility
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ═══════════════════════════════════════════════════════════════════
// PART 1: SeekSlider – onArrowPress handler and preview image
// ═══════════════════════════════════════════════════════════════════

let capturedOnArrowPress: ((dir: string) => boolean | void) | undefined;
let capturedFocused = false;

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: Record<string, unknown>) => {
    if (opts?.onArrowPress) {
      capturedOnArrowPress = opts.onArrowPress as (dir: string) => boolean | void;
    }
    return {
      ref: () => {},
      focused: capturedFocused,
      focusKey: "test-key",
      focusSelf: vi.fn(),
    };
  },
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  useParams: () => mockRouteParams,
}));

let mockRouteParams: Record<string, string> = {};

import { SeekSlider } from "../../components/SeekSlider";
import { clampSeek } from "../../utils/seekSliderUtils";

describe("SeekSlider – onArrowPress handler", () => {
  beforeEach(() => {
    capturedOnArrowPress = undefined;
    capturedFocused = false;
  });

  it("seeks left on left arrow press", () => {
    const onSeek = vi.fn();
    render(<SeekSlider currentTime={50} duration={100} onSeek={onSeek} />);

    expect(capturedOnArrowPress).toBeDefined();
    const result = capturedOnArrowPress!("left");
    expect(result).toBe(false); // traps focus
    expect(onSeek).toHaveBeenCalledWith(clampSeek(50, -10, 100));
  });

  it("seeks right on right arrow press", () => {
    const onSeek = vi.fn();
    render(<SeekSlider currentTime={50} duration={100} onSeek={onSeek} />);

    const result = capturedOnArrowPress!("right");
    expect(result).toBe(false);
    expect(onSeek).toHaveBeenCalledWith(clampSeek(50, 10, 100));
  });

  it("allows up/down navigation", () => {
    const onSeek = vi.fn();
    render(<SeekSlider currentTime={50} duration={100} onSeek={onSeek} />);

    expect(capturedOnArrowPress!("up")).toBe(true);
    expect(capturedOnArrowPress!("down")).toBe(true);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("uses custom increment", () => {
    const onSeek = vi.fn();
    render(<SeekSlider currentTime={50} duration={100} onSeek={onSeek} increment={30} />);

    capturedOnArrowPress!("right");
    expect(onSeek).toHaveBeenCalledWith(clampSeek(50, 30, 100));
  });

  it("renders preview image when focused and getPreviewUrl provided", () => {
    capturedFocused = true;
    const getPreviewUrl = vi.fn().mockReturnValue("http://preview/thumb.jpg");
    const { container } = render(
      <SeekSlider currentTime={30} duration={100} onSeek={vi.fn()} getPreviewUrl={getPreviewUrl} />,
    );

    expect(getPreviewUrl).toHaveBeenCalledWith(30);
    const img = container.querySelector('img[alt="Seek preview"]');
    expect(img).toBeInTheDocument();
  });

  it("hides preview when getPreviewUrl returns null", () => {
    capturedFocused = true;
    const getPreviewUrl = vi.fn().mockReturnValue(null);
    const { container } = render(
      <SeekSlider currentTime={30} duration={100} onSeek={vi.fn()} getPreviewUrl={getPreviewUrl} />,
    );

    const img = container.querySelector('img[alt="Seek preview"]');
    expect(img).not.toBeInTheDocument();
  });

  it("handles preview image error", () => {
    capturedFocused = true;
    const getPreviewUrl = vi.fn().mockReturnValue("http://preview/thumb.jpg");
    const { container } = render(
      <SeekSlider currentTime={30} duration={100} onSeek={vi.fn()} getPreviewUrl={getPreviewUrl} />,
    );

    const img = container.querySelector('img[alt="Seek preview"]') as HTMLImageElement;
    expect(img).toBeInTheDocument();

    // Trigger error — should hide preview
    fireEvent.error(img);
    expect(container.querySelector('img[alt="Seek preview"]')).not.toBeInTheDocument();
  });
});


// ═══════════════════════════════════════════════════════════════════
// PART 2: Library page – filtering, pagination, empty states
// ═══════════════════════════════════════════════════════════════════

const mockLibParams: Record<string, string> = { type: "movie" };

vi.mock("../../services/flixor", () => ({
  flixor: {
    isPlexAuthenticated: true,
    plexServer: {
      getLibraries: vi.fn(),
      getLibraryItems: vi.fn(),
      getGenres: vi.fn(),
      getImageUrl: vi.fn().mockReturnValue("http://img.jpg"),
    },
    trakt: {
      isAuthenticated: vi.fn().mockReturnValue(false),
      generateDeviceCode: vi.fn(),
      waitForDeviceCode: vi.fn(),
      signOut: vi.fn(),
    },
    getHomeUsers: vi.fn(),
    switchToProfile: vi.fn(),
  },
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    catalogDisabledLibraries: [],
  }),
}));

vi.mock("../../components/TopNav", () => ({
  TopNav: () => <div data-testid="top-nav" />,
}));
vi.mock("../../components/PosterCard", () => ({
  PosterCard: ({ item, onClick }: { item: { title: string }; onClick: () => void }) => (
    <button data-testid="poster-card" onClick={onClick}>{item.title}</button>
  ),
}));
vi.mock("../../components/FilterBar", () => ({
  FilterBar: ({ options, onSelect }: { options: Array<{ id: string }>; onSelect: (id: string | null) => void }) => (
    <div data-testid="filter-bar">
      {options.map((o) => (
        <button key={o.id} data-testid={`filter-${o.id}`} onClick={() => onSelect(o.id)}>{o.id}</button>
      ))}
      <button data-testid="filter-clear" onClick={() => onSelect(null)}>Clear</button>
    </div>
  ),
}));
vi.mock("../../components/SkeletonRow", () => ({
  SkeletonRow: () => <div data-testid="skeleton-row" />,
}));
vi.mock("../../components/VirtualGrid", () => ({
  VirtualGrid: ({ items, render, loadMore }: {
    items: Array<{ id: string; _item: { title: string } }>;
    render: (item: any) => React.ReactNode;
    loadMore?: () => void;
  }) => (
    <div data-testid="virtual-grid">
      {items.map((item) => <div key={item.id}>{render(item)}</div>)}
      {loadMore && <button data-testid="load-more" onClick={loadMore}>Load More</button>}
    </div>
  ),
}));
vi.mock("../../components/SectionBanner", () => ({
  SectionBanner: ({ title }: { title: string }) => <div data-testid="section-banner">{title}</div>,
}));
vi.mock("../../components/SmartImage", () => ({
  SmartImage: () => <div data-testid="smart-image" />,
}));

import { flixor } from "../../services/flixor";
import { LibraryPage } from "../../pages/Library";

describe("LibraryPage – filtering and pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteParams = { type: "movie" };
    (flixor.plexServer.getLibraries as ReturnType<typeof vi.fn>).mockResolvedValue([
      { key: "1", type: "movie", title: "Movies" },
    ]);
    (flixor.plexServer.getLibraryItems as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ratingKey: "m1", title: "Movie A", Genre: [{ tag: "Action" }] },
      { ratingKey: "m2", title: "Movie B", Genre: [{ tag: "Drama" }] },
    ]);
    (flixor.plexServer.getGenres as ReturnType<typeof vi.fn>).mockResolvedValue([
      { key: "g1", title: "Action" },
      { key: "g2", title: "Drama" },
    ]);
    // Override useParams for library
    mockLibParams.type = "movie";
  });

  it("renders library items after loading", async () => {
    await act(async () => { render(<LibraryPage />); });
    expect(screen.getByTestId("virtual-grid")).toBeInTheDocument();
    expect(screen.getAllByTestId("poster-card")).toHaveLength(2);
  });

  it("renders genre filter bar", async () => {
    await act(async () => { render(<LibraryPage />); });
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
  });

  it("filters by search query", async () => {
    await act(async () => { render(<LibraryPage />); });
    const input = screen.getByPlaceholderText(/Search movies/);
    await act(async () => {
      fireEvent.change(input, { target: { value: "Movie A" } });
    });
    expect(screen.getAllByTestId("poster-card")).toHaveLength(1);
    expect(screen.getByText("Movie A")).toBeInTheDocument();
  });

  it("filters by genre", async () => {
    await act(async () => { render(<LibraryPage />); });
    await act(async () => {
      fireEvent.click(screen.getByTestId("filter-Action"));
    });
    expect(screen.getAllByTestId("poster-card")).toHaveLength(1);
  });

  it("shows no results when filter matches nothing", async () => {
    await act(async () => { render(<LibraryPage />); });
    const input = screen.getByPlaceholderText(/Search movies/);
    await act(async () => {
      fireEvent.change(input, { target: { value: "Nonexistent" } });
    });
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("loads more items on scroll", async () => {
    // Return exactly PAGE_SIZE items to indicate hasMore
    const items = Array.from({ length: 50 }, (_, i) => ({
      ratingKey: `m${i}`,
      title: `Movie ${i}`,
    }));
    (flixor.plexServer.getLibraryItems as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([{ ratingKey: "m50", title: "Movie 50" }]);

    await act(async () => { render(<LibraryPage />); });

    const loadMoreBtn = screen.getByTestId("load-more");
    await act(async () => { fireEvent.click(loadMoreBtn); });

    expect(flixor.plexServer.getLibraryItems).toHaveBeenCalledTimes(2);
  });

  it("handles library fetch error gracefully", async () => {
    (flixor.plexServer.getLibraries as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));
    await act(async () => { render(<LibraryPage />); });
    // Should not crash — renders empty
    expect(screen.getByTestId("top-nav")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════
// PART 3: ProfileSelect – profile selection, PIN dialog, errors
// ═══════════════════════════════════════════════════════════════════

import { ProfileSelect } from "../../pages/ProfileSelect";

describe("ProfileSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteParams = {};
    (flixor.getHomeUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, title: "Admin", thumb: "http://admin.jpg", admin: true, protected: false, username: "admin" },
      { id: 2, title: "Kid", thumb: "", admin: false, protected: true, username: "kid" },
    ]);
    (flixor.switchToProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("shows loading state initially", () => {
    (flixor.getHomeUsers as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<ProfileSelect />);
    expect(screen.getByText("Loading profiles…")).toBeInTheDocument();
  });

  it("renders profile cards after loading", async () => {
    await act(async () => { render(<ProfileSelect />); });
    // "Admin" appears as both profile name and badge — use getAllByText
    expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Kid")).toBeInTheDocument();
  });

  it("renders admin badge", async () => {
    await act(async () => { render(<ProfileSelect />); });
    const badges = screen.getAllByText("Admin");
    const adminBadge = badges.find((el) => el.classList.contains("profile-badge"));
    expect(adminBadge).toBeTruthy();
  });

  it("renders PIN badge for protected user", async () => {
    await act(async () => { render(<ProfileSelect />); });
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });

  it("switches to unprotected profile on click", async () => {
    await act(async () => { render(<ProfileSelect />); });
    // Find the button that contains "Admin" as profile name
    const buttons = screen.getAllByRole("button");
    const adminCard = buttons.find((b) => b.classList.contains("profile-card") && b.textContent?.includes("Admin"));
    await act(async () => { fireEvent.click(adminCard!); });
    expect(flixor.switchToProfile).toHaveBeenCalled();
  });

  it("shows PIN dialog for protected profile", async () => {
    await act(async () => { render(<ProfileSelect />); });
    const buttons = screen.getAllByRole("button");
    const kidCard = buttons.find((b) => b.classList.contains("profile-card") && b.textContent?.includes("Kid"));
    await act(async () => { fireEvent.click(kidCard!); });
    expect(screen.getByText(/Enter PIN for Kid/)).toBeInTheDocument();
  });

  it("shows error when fetch fails", async () => {
    (flixor.getHomeUsers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    await act(async () => { render(<ProfileSelect />); });
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows empty state when no profiles", async () => {
    (flixor.getHomeUsers as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await act(async () => { render(<ProfileSelect />); });
    expect(screen.getByText("No Profiles Found")).toBeInTheDocument();
  });

  it("renders avatar initial when no thumb", async () => {
    (flixor.getHomeUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 3, title: "Guest", thumb: "", admin: false, protected: false, username: "guest" },
    ]);
    await act(async () => { render(<ProfileSelect />); });
    expect(screen.getByText("G")).toBeInTheDocument();
  });
});
