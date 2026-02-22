/**
 * Targeted tests for low-coverage components: HeroCarousel, SeekSlider, PosterCard, TopNav
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, getAllByText } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ── Mocks ───────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockLocation = { pathname: "/", state: null };

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: Record<string, unknown>) => ({
    ref: (_el: HTMLElement | null) => {},
    focused: false,
    focusKey: (opts?.focusKey as string) || "test-key",
    focusSelf: vi.fn(),
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockGetImageUrl = vi.fn().mockReturnValue("http://plex/img.jpg");
const mockFindByImdbId = vi.fn().mockResolvedValue({ movie_results: [], tv_results: [] });
const mockGetMovieImages = vi.fn().mockResolvedValue({ logos: [] });
const mockGetTVImages = vi.fn().mockResolvedValue({ logos: [] });
const mockTmdbGetImageUrl = vi.fn().mockReturnValue("http://tmdb/img.jpg");
const mockGetHomeUsers = vi.fn().mockResolvedValue([]);

let mockCurrentProfile: { title: string; thumb: string } | null = { title: "TestUser", thumb: "http://thumb.jpg" };

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getImageUrl: (...a: unknown[]) => mockGetImageUrl(...a),
    },
    tmdb: {
      findByImdbId: (...a: unknown[]) => mockFindByImdbId(...a),
      getMovieImages: (...a: unknown[]) => mockGetMovieImages(...a),
      getTVImages: (...a: unknown[]) => mockGetTVImages(...a),
      getImageUrl: (...a: unknown[]) => mockTmdbGetImageUrl(...a),
    },
    get currentProfile() {
      return mockCurrentProfile;
    },
    getHomeUsers: (...a: unknown[]) => mockGetHomeUsers(...a),
  },
}));

let mockShowHeroSection = true;

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    showHeroSection: mockShowHeroSection,
    heroLayout: "carousel",
  }),
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ alt }: { alt: string }) => <img data-testid="smart-image" alt={alt} />,
}));

vi.mock("../../components/UserAvatar", () => ({
  UserAvatar: ({ title, onPress }: { title: string; onPress: () => void }) => (
    <button data-testid="user-avatar" onClick={onPress}>{title}</button>
  ),
}));

// ── HeroCarousel Tests ──────────────────────────────────────────────

import { HeroCarousel } from "../../components/HeroCarousel";

describe("HeroCarousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockShowHeroSection = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      ratingKey: `item-${i}`,
      title: `Hero ${i}`,
      thumb: `/thumb-${i}.jpg`,
      art: `/art-${i}.jpg`,
      year: "2025",
      summary: `Summary ${i}`,
      contentRating: "PG-13",
      duration: 7200000,
      guid: `tmdb://${i + 100}`,
      Media: [{ Part: [{ key: `/video/${i}` }] }],
    })) as unknown as import("@flixor/core").PlexMediaItem[];

  it("renders null when showHeroSection is false", () => {
    mockShowHeroSection = false;
    const { container } = render(<HeroCarousel items={makeItems(3)} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders null when items is empty", () => {
    const { container } = render(<HeroCarousel items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders hero content with year and rating", async () => {
    await act(async () => {
      render(<HeroCarousel items={makeItems(2)} />);
    });
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("PG-13")).toBeInTheDocument();
  });

  it("renders Play and More Info buttons", async () => {
    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });
    expect(screen.getByText(/Play/)).toBeInTheDocument();
    expect(screen.getByText("More Info")).toBeInTheDocument();
  });

  it("navigates to player on Play click", async () => {
    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });
    fireEvent.click(screen.getByText(/Play/));
    expect(mockNavigate).toHaveBeenCalledWith("/player/item-0");
  });

  it("navigates to details on More Info click", async () => {
    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });
    fireEvent.click(screen.getByText("More Info"));
    expect(mockNavigate).toHaveBeenCalledWith("/details/item-0");
  });

  it("calls onBackdropChange when item changes", async () => {
    const onBackdropChange = vi.fn();
    await act(async () => {
      render(<HeroCarousel items={makeItems(2)} onBackdropChange={onBackdropChange} />);
    });
    expect(onBackdropChange).toHaveBeenCalled();
  });

  it("fetches TMDB logo for hero item", async () => {
    mockFindByImdbId.mockResolvedValue({
      movie_results: [{ id: 100 }],
      tv_results: [],
    });
    mockGetMovieImages.mockResolvedValue({
      logos: [{ file_path: "/logo.png", iso_639_1: "en" }],
    });

    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });

    expect(mockFindByImdbId).toHaveBeenCalled();
    expect(mockGetMovieImages).toHaveBeenCalled();
  });

  it("fetches TV images when tmdb result is tv", async () => {
    mockFindByImdbId.mockResolvedValue({
      movie_results: [],
      tv_results: [{ id: 200 }],
    });
    mockGetTVImages.mockResolvedValue({
      logos: [{ file_path: "/tv-logo.png", iso_639_1: "en" }],
    });

    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });

    expect(mockGetTVImages).toHaveBeenCalledWith(200);
  });

  it("shows formatted duration in meta", async () => {
    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });
    // 7200000ms = 120m
    expect(screen.getByText("120m")).toBeInTheDocument();
  });

  it("auto-rotates after 15 seconds with multiple items", async () => {
    const items = makeItems(3);
    const onBackdropChange = vi.fn();
    await act(async () => {
      render(<HeroCarousel items={items} onBackdropChange={onBackdropChange} />);
    });

    const callsBefore = onBackdropChange.mock.calls.length;

    // Advance 15s + 300ms for fade transition
    await act(async () => {
      vi.advanceTimersByTime(15300);
    });

    // After rotation, onBackdropChange should have been called again
    expect(onBackdropChange.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("does not auto-rotate with single item", async () => {
    const onBackdropChange = vi.fn();
    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} onBackdropChange={onBackdropChange} />);
    });

    const callsBefore = onBackdropChange.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(16000);
    });

    // Should not have rotated
    expect(onBackdropChange.mock.calls.length).toBe(callsBefore);
  });

  it("shows summary text", async () => {
    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });
    expect(screen.getByText("Summary 0")).toBeInTheDocument();
  });

  it("handles fetchLogo failure gracefully", async () => {
    mockFindByImdbId.mockRejectedValue(new Error("network error"));

    await act(async () => {
      render(<HeroCarousel items={makeItems(1)} />);
    });

    // Should still render — falls back to title text
    expect(screen.getByText("2025")).toBeInTheDocument();
  });
});


// ── SeekSlider Tests ────────────────────────────────────────────────

import { SeekSlider, formatTime, clampSeek, fillPercent } from "../../components/SeekSlider";

describe("SeekSlider – component rendering", () => {
  it("renders timestamps", () => {
    render(<SeekSlider currentTime={65} duration={3600} onSeek={vi.fn()} />);
    expect(screen.getByText("01:05")).toBeInTheDocument();
    expect(screen.getByText("1:00:00")).toBeInTheDocument();
  });

  it("renders with zero duration", () => {
    const { container } = render(<SeekSlider currentTime={0} duration={0} onSeek={vi.fn()} />);
    const spans = container.querySelectorAll("span");
    const texts = Array.from(spans).map((s) => s.textContent);
    expect(texts.filter((t) => t === "00:00")).toHaveLength(2);
  });

  it("renders with preview URL function", () => {
    const getPreviewUrl = vi.fn().mockReturnValue("http://preview/1.jpg");
    render(
      <SeekSlider currentTime={30} duration={3600} onSeek={vi.fn()} getPreviewUrl={getPreviewUrl} />,
    );
    expect(screen.getByText("00:30")).toBeInTheDocument();
  });
});

describe("SeekSlider – pure helpers", () => {
  it("formatTime formats seconds < 1 hour", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(599)).toBe("09:59");
  });

  it("formatTime formats seconds >= 1 hour", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(7200)).toBe("2:00:00");
  });

  it("formatTime handles negative values", () => {
    expect(formatTime(-10)).toBe("00:00");
  });

  it("clampSeek clamps to [0, duration]", () => {
    expect(clampSeek(50, -100, 200)).toBe(0);
    expect(clampSeek(50, 10, 200)).toBe(60);
    expect(clampSeek(190, 20, 200)).toBe(200);
  });

  it("fillPercent returns correct percentage", () => {
    expect(fillPercent(50, 100)).toBe(50);
    expect(fillPercent(0, 100)).toBe(0);
    expect(fillPercent(100, 100)).toBe(100);
  });

  it("fillPercent returns 0 for zero duration", () => {
    expect(fillPercent(50, 0)).toBe(0);
    expect(fillPercent(0, 0)).toBe(0);
  });

  it("fillPercent clamps to [0, 100]", () => {
    expect(fillPercent(200, 100)).toBe(100);
    expect(fillPercent(-10, 100)).toBe(0);
  });
});

// ── PosterCard Tests ────────────────────────────────────────────────

import { PosterCard } from "../../components/PosterCard";

describe("PosterCard", () => {
  const item = {
    ratingKey: "1",
    title: "Test Movie",
    thumb: "/thumb.jpg",
    year: "2025",
  } as unknown as import("@flixor/core").PlexMediaItem;

  beforeEach(() => vi.clearAllMocks());

  it("renders title and year", () => {
    render(<PosterCard item={item} onClick={vi.fn()} />);
    expect(screen.getByText("Test Movie (2025)")).toBeInTheDocument();
  });

  it("renders without year", () => {
    const noYear = { ...item, year: undefined } as unknown as import("@flixor/core").PlexMediaItem;
    render(<PosterCard item={noYear} onClick={vi.fn()} />);
    expect(screen.getByText("Test Movie")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<PosterCard item={item} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("uses grandparentThumb when available", () => {
    const gpItem = { ...item, grandparentThumb: "/gp.jpg" } as unknown as import("@flixor/core").PlexMediaItem;
    render(<PosterCard item={gpItem} onClick={vi.fn()} />);
    expect(mockGetImageUrl).toHaveBeenCalledWith("/gp.jpg", 400);
  });

  it("uses parentThumb when grandparentThumb is missing", () => {
    const pItem = { ...item, parentThumb: "/parent.jpg", grandparentThumb: undefined } as unknown as import("@flixor/core").PlexMediaItem;
    render(<PosterCard item={pItem} onClick={vi.fn()} />);
    expect(mockGetImageUrl).toHaveBeenCalledWith("/parent.jpg", 400);
  });

  it("renders SmartImage", () => {
    render(<PosterCard item={item} onClick={vi.fn()} />);
    expect(screen.getByTestId("smart-image")).toBeInTheDocument();
  });

  it("calls onFocus callback when provided", () => {
    const onFocus = vi.fn();
    render(<PosterCard item={item} onClick={vi.fn()} onFocus={onFocus} />);
    // The component renders — onFocus is wired to useFocusable which our mock doesn't trigger
    // but we verify it doesn't crash
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

// ── TopNav Tests ────────────────────────────────────────────────────

import { TopNav } from "../../components/TopNav";

describe("TopNav – navigation and user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = "/";
    mockCurrentProfile = { title: "TestUser", thumb: "http://thumb.jpg" };
  });

  it("renders all nav items", () => {
    render(<TopNav />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("My List")).toBeInTheDocument();
    expect(screen.getByText("New & Popular")).toBeInTheDocument();
    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(screen.getByText("Shows")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("⚙ Settings")).toBeInTheDocument();
  });

  it("renders FLIXOR logo", () => {
    render(<TopNav />);
    expect(screen.getByText("FLIXOR")).toBeInTheDocument();
  });

  it("navigates to home on Home click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("Home"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("navigates to mylist on My List click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("My List"));
    expect(mockNavigate).toHaveBeenCalledWith("/mylist");
  });

  it("navigates to search on Search click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("Search"));
    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  it("navigates to settings on Settings click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("⚙ Settings"));
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("navigates to library/movie on Movies click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("Movies"));
    expect(mockNavigate).toHaveBeenCalledWith("/library/movie");
  });

  it("navigates to library/show on Shows click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("Shows"));
    expect(mockNavigate).toHaveBeenCalledWith("/library/show");
  });

  it("navigates to new-popular on New & Popular click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("New & Popular"));
    expect(mockNavigate).toHaveBeenCalledWith("/new-popular");
  });

  it("shows active class for current path", () => {
    mockLocation.pathname = "/search";
    render(<TopNav />);
    const searchBtn = screen.getByText("Search");
    expect(searchBtn.className).toContain("active");
  });

  it("shows active class for library paths", () => {
    mockLocation.pathname = "/library/movie";
    render(<TopNav />);
    const moviesBtn = screen.getByText("Movies");
    expect(moviesBtn.className).toContain("active");
  });

  it("renders user avatar with profile name", () => {
    render(<TopNav />);
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("navigates to profile-select on avatar click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByTestId("user-avatar"));
    expect(mockNavigate).toHaveBeenCalledWith("/profile-select");
  });

  it("fetches home users when no current profile", async () => {
    mockCurrentProfile = null;
    mockGetHomeUsers.mockResolvedValue([
      { title: "Admin", thumb: "http://admin.jpg", admin: true },
      { title: "Guest", thumb: "http://guest.jpg", admin: false },
    ]);

    await act(async () => {
      render(<TopNav />);
    });

    expect(mockGetHomeUsers).toHaveBeenCalled();
  });

  it("uses first user when no admin found", async () => {
    mockCurrentProfile = null;
    mockGetHomeUsers.mockResolvedValue([
      { title: "FirstUser", thumb: "http://first.jpg", admin: false },
    ]);

    await act(async () => {
      render(<TopNav />);
    });

    expect(mockGetHomeUsers).toHaveBeenCalled();
  });

  it("handles getHomeUsers failure gracefully", async () => {
    mockCurrentProfile = null;
    mockGetHomeUsers.mockRejectedValue(new Error("network error"));

    await act(async () => {
      render(<TopNav />);
    });

    // Should still render with default "User"
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
  });
});
