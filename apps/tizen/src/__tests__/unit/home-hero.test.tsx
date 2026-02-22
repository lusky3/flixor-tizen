import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { HomeHero } from "../../components/HomeHero";
import type { HeroItem } from "../../pages/Home";

// ── Mocks ──────────────────────────────────────────────────────────────

// Track useFocusable calls to verify focus behavior
const mockFocusableInstances: Record<string, { onEnterPress?: () => void }> = {};

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: vi.fn((opts?: { focusKey?: string; onEnterPress?: () => void; trackChildren?: boolean }) => {
    const key = opts?.focusKey || Math.random().toString();
    if (opts?.onEnterPress) {
      mockFocusableInstances[key] = { onEnterPress: opts.onEnterPress };
    }
    return {
      ref: vi.fn(),
      focusKey: key,
      focused: false,
      focusSelf: vi.fn(),
    };
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getImageUrl: vi.fn((path: string) => `https://plex.test${path}`),
    },
    tmdb: {
      findByImdbId: vi.fn().mockResolvedValue({ movie_results: [], tv_results: [] }),
      getMovieImages: vi.fn().mockResolvedValue({ logos: [] }),
      getTVImages: vi.fn().mockResolvedValue({ logos: [] }),
      getImageUrl: vi.fn((path: string) => `https://tmdb.test${path}`),
    },
  },
}));

vi.mock("../../services/tmdb", () => ({
  getImages: vi.fn().mockResolvedValue({ logos: [] }),
  buildImageUrl: vi.fn((path: string) => `https://tmdb.test${path}`),
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="smart-image" />
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function makeHeroItem(overrides: Partial<HeroItem> = {}): HeroItem {
  return {
    ratingKey: "123",
    key: "/library/metadata/123",
    type: "movie",
    title: "Test Movie",
    art: "/art/test.jpg",
    thumb: "/thumb/test.jpg",
    summary: "A great test movie.",
    year: 2024,
    contentRating: "PG-13",
    duration: 7200000, // 120 min
    ...overrides,
  } as HeroItem;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("HomeHero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockFocusableInstances).forEach(
      (k) => delete mockFocusableInstances[k],
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 1. Renders backdrop image with SmartImage ──────────────────────

  describe("backdrop image", () => {
    it("renders SmartImage with Plex server image URL for relative art path", () => {
      render(<HomeHero item={makeHeroItem({ art: "/art/backdrop.jpg" })} />);
      const img = screen.getByTestId("smart-image");
      expect(img).toHaveAttribute("src", "https://plex.test/art/backdrop.jpg");
    });

    it("renders SmartImage with direct URL when art starts with http", () => {
      render(
        <HomeHero item={makeHeroItem({ art: "https://cdn.test/backdrop.jpg" })} />,
      );
      const img = screen.getByTestId("smart-image");
      expect(img).toHaveAttribute("src", "https://cdn.test/backdrop.jpg");
    });

    it("falls back to thumb when art is empty", () => {
      render(
        <HomeHero item={makeHeroItem({ art: "", thumb: "/thumb/fallback.jpg" })} />,
      );
      const img = screen.getByTestId("smart-image");
      expect(img).toHaveAttribute("src", "https://plex.test/thumb/fallback.jpg");
    });
  });

  // ── 2. TMDB logo or title text fallback ────────────────────────────

  describe("logo / title fallback", () => {
    it("shows title text when no logo is resolved", () => {
      render(<HomeHero item={makeHeroItem({ title: "My Movie" })} />);
      expect(screen.getByText("My Movie")).toBeInTheDocument();
    });

    it("fetches TMDB logo for tmdb-prefixed ratingKey", async () => {
      const { getImages } = await import("../../services/tmdb");
      const mockGetImages = getImages as ReturnType<typeof vi.fn>;
      mockGetImages.mockResolvedValueOnce({
        logos: [{ file_path: "/logo.png", iso_639_1: "en" }],
      });

      await act(async () => {
        render(
          <HomeHero
            item={makeHeroItem({ ratingKey: "tmdb-movie-550" })}
          />,
        );
      });

      // Logo image should be rendered instead of title text
      // Both SmartImage backdrop and logo <img> share the same alt text
      const imgs = screen.getAllByAltText("Test Movie");
      const logoImg = imgs.find((el) =>
        el.getAttribute("src")?.includes("/logo.png"),
      );
      expect(logoImg).toBeDefined();
      expect(logoImg!.tagName).toBe("IMG");
      expect(logoImg).toHaveAttribute("src", "https://tmdb.test/logo.png");
    });
  });

  // ── 3. Play and More Info buttons ──────────────────────────────────

  describe("action buttons", () => {
    it("renders Play button", () => {
      render(<HomeHero item={makeHeroItem()} />);
      expect(screen.getByText(/Play/)).toBeInTheDocument();
    });

    it("renders More Info button", () => {
      render(<HomeHero item={makeHeroItem()} />);
      expect(screen.getByText(/More Info/)).toBeInTheDocument();
    });

    it("calls onPlay when Play button is clicked", () => {
      const onPlay = vi.fn();
      render(<HomeHero item={makeHeroItem()} onPlay={onPlay} />);
      fireEvent.click(screen.getByText(/Play/));
      expect(onPlay).toHaveBeenCalledOnce();
    });

    it("calls onMoreInfo when More Info button is clicked", () => {
      const onMoreInfo = vi.fn();
      render(<HomeHero item={makeHeroItem()} onMoreInfo={onMoreInfo} />);
      fireEvent.click(screen.getByText(/More Info/));
      expect(onMoreInfo).toHaveBeenCalledOnce();
    });
  });

  // ── 4. Video autoplay after 5s delay ───────────────────────────────

  describe("video autoplay", () => {
    it("does not show video element before 5s timer fires", () => {
      vi.useFakeTimers();
      const { container } = render(
        <HomeHero item={makeHeroItem({ videoUrl: "https://plex.test/trailer.mp4" })} />,
      );
      // Before timer: no <video> element
      expect(container.querySelector("video")).toBeNull();
      vi.useRealTimers();
    });

    it("shows video element after 5s delay with autoPlay and muted", () => {
      vi.useFakeTimers();
      const { container } = render(
        <HomeHero item={makeHeroItem({ videoUrl: "https://plex.test/trailer.mp4" })} />,
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      const video = container.querySelector("video");
      expect(video).not.toBeNull();
      expect(video).toHaveAttribute("src", "https://plex.test/trailer.mp4");
      expect(video!.autoplay).toBe(true);
      expect(video!.muted).toBe(true);
      vi.useRealTimers();
    });

    it("does not start video when no videoUrl or ytKey", () => {
      vi.useFakeTimers();
      const { container } = render(
        <HomeHero item={makeHeroItem({ videoUrl: undefined, ytKey: undefined })} />,
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(container.querySelector("video")).toBeNull();
      expect(container.querySelector("iframe")).toBeNull();
      vi.useRealTimers();
    });
  });

  // ── 5. Mute/unmute toggle ──────────────────────────────────────────

  describe("mute toggle", () => {
    it("shows mute button when video is available", () => {
      vi.useFakeTimers();
      render(
        <HomeHero item={makeHeroItem({ videoUrl: "https://plex.test/trailer.mp4" })} />,
      );

      // Mute button should be visible even before video plays (hasVideo is true)
      const muteBtn = screen.getByLabelText("Unmute");
      expect(muteBtn).toBeInTheDocument();
      vi.useRealTimers();
    });

    it("toggles mute label on click", () => {
      render(
        <HomeHero item={makeHeroItem({ videoUrl: "https://plex.test/trailer.mp4" })} />,
      );

      // Initially muted
      const muteBtn = screen.getByLabelText("Unmute");
      fireEvent.click(muteBtn);

      // After click: unmuted
      expect(screen.getByLabelText("Mute")).toBeInTheDocument();
    });

    it("does not show mute button when no video source", () => {
      render(<HomeHero item={makeHeroItem()} />);
      expect(screen.queryByLabelText("Unmute")).toBeNull();
      expect(screen.queryByLabelText("Mute")).toBeNull();
    });
  });

  // ── 6. Fallback to static backdrop on video error ──────────────────

  describe("video error fallback", () => {
    it("removes video and shows backdrop on video error event", () => {
      vi.useFakeTimers();
      const { container } = render(
        <HomeHero item={makeHeroItem({ videoUrl: "https://plex.test/bad.mp4" })} />,
      );

      // Start video
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(container.querySelector("video")).not.toBeNull();

      // Trigger error
      act(() => {
        fireEvent.error(container.querySelector("video")!);
      });

      // Video should be gone, backdrop still present
      expect(container.querySelector("video")).toBeNull();
      expect(screen.getByTestId("smart-image")).toBeInTheDocument();

      // Mute button should also be gone (hasVideo becomes false)
      expect(screen.queryByLabelText("Unmute")).toBeNull();
      vi.useRealTimers();
    });
  });

  // ── 7. YouTube iframe embed ────────────────────────────────────────

  describe("YouTube embed", () => {
    it("renders YouTube iframe after 5s when ytKey is provided", () => {
      vi.useFakeTimers();
      const { container } = render(
        <HomeHero item={makeHeroItem({ ytKey: "dQw4w9WgXcQ" })} />,
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe!.src).toContain("youtube.com/embed/dQw4w9WgXcQ");
      expect(iframe!.src).toContain("autoplay=1");
      expect(iframe!.src).toContain("mute=1");
      vi.useRealTimers();
    });

    it("prefers videoUrl over ytKey when both are provided", () => {
      vi.useFakeTimers();
      const { container } = render(
        <HomeHero
          item={makeHeroItem({
            videoUrl: "https://plex.test/trailer.mp4",
            ytKey: "dQw4w9WgXcQ",
          })}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should render <video>, not <iframe>
      expect(container.querySelector("video")).not.toBeNull();
      expect(container.querySelector("iframe")).toBeNull();
      vi.useRealTimers();
    });
  });

  // ── 8. Focus behavior ─────────────────────────────────────────────

  describe("focus behavior", () => {
    it("uses useFocusable for the hero section with trackChildren", async () => {
      const { useFocusable } = await import(
        "@noriginmedia/norigin-spatial-navigation"
      );
      render(<HomeHero item={makeHeroItem()} />);

      // useFocusable should be called with home-hero focusKey and trackChildren
      expect(useFocusable).toHaveBeenCalledWith(
        expect.objectContaining({
          focusKey: "home-hero",
          trackChildren: true,
        }),
      );
    });

    it("registers onEnterPress handlers for Play and More Info buttons", async () => {
      const { useFocusable } = await import(
        "@noriginmedia/norigin-spatial-navigation"
      );
      const mockUseFocusable = useFocusable as ReturnType<typeof vi.fn>;

      render(<HomeHero item={makeHeroItem()} />);

      // Should have been called with onEnterPress for action buttons
      const callsWithEnterPress = mockUseFocusable.mock.calls.filter(
        (call: unknown[]) => call[0]?.onEnterPress,
      );
      // At least 2 calls with onEnterPress: Play, More Info (+ mute if video)
      expect(callsWithEnterPress.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 9. Meta badges ────────────────────────────────────────────────

  describe("meta badges", () => {
    it("shows year, content rating, and duration", () => {
      render(
        <HomeHero
          item={makeHeroItem({
            year: 2024,
            contentRating: "PG-13",
            duration: 7200000,
          })}
        />,
      );
      expect(screen.getByText("2024")).toBeInTheDocument();
      expect(screen.getByText("PG-13")).toBeInTheDocument();
      expect(screen.getByText("120m")).toBeInTheDocument();
    });

    it("shows summary text", () => {
      render(
        <HomeHero item={makeHeroItem({ summary: "A great test movie." })} />,
      );
      expect(screen.getByText("A great test movie.")).toBeInTheDocument();
    });
  });
});
