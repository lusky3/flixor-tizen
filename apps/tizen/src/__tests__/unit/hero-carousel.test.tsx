import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroCarousel } from "../../components/HeroCarousel";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void; onFocus?: () => void; onBlur?: () => void; focusKey?: string }) => ({
    ref: { current: null },
    focused: false,
    focusKey: opts?.focusKey || "test-key",
    focusSelf: vi.fn(),
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({ showHeroSection: true }),
}));

const mockGetImageUrl = vi.fn().mockReturnValue("https://plex/img.jpg");
const mockFindByImdbId = vi.fn().mockResolvedValue({ movie_results: [], tv_results: [] });

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getImageUrl: (...a: unknown[]) => mockGetImageUrl(...a),
    },
    tmdb: {
      findByImdbId: (...a: unknown[]) => mockFindByImdbId(...a),
      getMovieImages: vi.fn().mockResolvedValue({ logos: [] }),
      getTVImages: vi.fn().mockResolvedValue({ logos: [] }),
      getImageUrl: vi.fn().mockReturnValue(""),
    },
  },
}));

function makeItem(id: string, title: string) {
  return {
    ratingKey: id,
    title,
    thumb: `/thumb/${id}.jpg`,
    art: `/art/${id}.jpg`,
    year: 2024,
    summary: `Summary for ${title}`,
    duration: 7200000,
    contentRating: "PG-13",
    guid: `plex://movie/${id}`,
    Media: [{ Part: [{ key: `/video/${id}` }] }],
  } as any;
}

describe("HeroCarousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when items array is empty (hero section hidden)", () => {
    const { container } = render(<HeroCarousel items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when items array is empty", () => {
    const { container } = render(<HeroCarousel items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders hero content with title", () => {
    render(<HeroCarousel items={[makeItem("1", "Inception")]} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("renders Play and More Info buttons", () => {
    render(<HeroCarousel items={[makeItem("1", "Inception")]} />);
    expect(screen.getByText(/Play/)).toBeInTheDocument();
    expect(screen.getByText("More Info")).toBeInTheDocument();
  });

  it("renders meta badges (year, rating, duration)", () => {
    render(<HeroCarousel items={[makeItem("1", "Inception")]} />);
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("PG-13")).toBeInTheDocument();
    expect(screen.getByText("120m")).toBeInTheDocument();
  });

  it("renders overview text", () => {
    render(<HeroCarousel items={[makeItem("1", "Inception")]} />);
    expect(screen.getByText("Summary for Inception")).toBeInTheDocument();
  });

  it("calls onBackdropChange when item changes", () => {
    const onBackdropChange = vi.fn();
    render(<HeroCarousel items={[makeItem("1", "Inception")]} onBackdropChange={onBackdropChange} />);
    expect(onBackdropChange).toHaveBeenCalled();
  });
});
