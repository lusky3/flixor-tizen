import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Onboarding } from "../../pages/Onboarding";
import { saveSettings, setDiscoveryDisabled } from "../../services/settings";

// ── Mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

let capturedOnArrowPress: ((dir: string) => boolean) | undefined;
const mockFocusSelf = vi.fn();

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: {
    onEnterPress?: () => void;
    onArrowPress?: (dir: string) => boolean;
    trackChildren?: boolean;
    isFocusBoundary?: boolean;
  }) => {
    if (opts?.onArrowPress) capturedOnArrowPress = opts.onArrowPress;
    return {
      ref: { current: null },
      focused: false,
      focusKey: "mock-focus-key",
      focusSelf: mockFocusSelf,
    };
  },
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    libraryOnlyMode: false,
    showTrendingRows: true,
    showTraktRows: true,
    includeTmdbInSearch: true,
    onboardingCompleted: false,
  }),
  saveSettings: vi.fn(),
  setDiscoveryDisabled: vi.fn(),
}));

const mockedSaveSettings = vi.mocked(saveSettings);
const mockedSetDiscoveryDisabled = vi.mocked(setDiscoveryDisabled);

// ── Tests ──────────────────────────────────────────────────────────────

describe("Onboarding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    mockFocusSelf.mockClear();
    mockedSaveSettings.mockClear();
    capturedOnArrowPress = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the welcome slide initially", () => {
    render(<Onboarding />);
    expect(screen.getByText("Welcome to Flixor")).toBeInTheDocument();
    expect(screen.getByText("FLIXOR")).toBeInTheDocument();
  });

  it("shows Next and Skip buttons on first slide", () => {
    render(<Onboarding />);
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Skip")).toBeInTheDocument();
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
  });

  it("shows Back button after navigating forward", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
  });

  it("navigates through all slides forward", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Your Plex Library")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Configure Your Experience")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("navigates back to previous slide", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Welcome to Flixor")).toBeInTheDocument();
  });

  it("skip completes onboarding and navigates to /login", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Skip"));
    expect(mockedSaveSettings).toHaveBeenCalledWith({ onboardingCompleted: true });
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("Get Started saves settings and navigates to /login", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Get Started"));
    expect(mockedSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: true }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("renders dot indicators for each slide", () => {
    const { container } = render(<Onboarding />);
    const dots = container.querySelectorAll("span");
    // 4 dot indicators + toggle indicator spans may exist, but at slide 0 there are exactly 4 dots
    // Filter by the dot style (small 10x10 circles)
    const dotEls = Array.from(dots).filter(
      (el) => el.style.width === "10px" && el.style.height === "10px",
    );
    expect(dotEls.length).toBe(4);
  });

  it("renders SVG icon on welcome slide", () => {
    const { container } = render(<Onboarding />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("config slide shows toggle descriptions", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(
      screen.getByText("Only show your Plex library content, hide all external sources."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Display trending movies and shows from TMDB on the home screen."),
    ).toBeInTheDocument();
  });

  it("config slide renders role='switch' toggles", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBe(4);
  });

  it("D-PAD right advances slide", () => {
    render(<Onboarding />);
    // The onArrowPress callback is captured from the container useFocusable
    expect(capturedOnArrowPress).toBeDefined();
    const result = capturedOnArrowPress!("right");
    expect(result).toBe(false); // consumed the event
  });

  it("D-PAD left goes to previous slide", () => {
    render(<Onboarding />);
    // Go to slide 1 first
    fireEvent.click(screen.getByText("Next"));
    // Now D-PAD left should go back
    expect(capturedOnArrowPress).toBeDefined();
    const result = capturedOnArrowPress!("left");
    expect(result).toBe(false);
  });

  it("focusSelf is called after mount via setTimeout", async () => {
    render(<Onboarding />);
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(mockFocusSelf).toHaveBeenCalled();
  });
});

// ── Tests ──────────────────────────────────────────────────────────────

describe("Onboarding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    mockFocusSelf.mockClear();
    mockedSaveSettings.mockClear();
    mockedSetDiscoveryDisabled.mockClear();
    capturedOnArrowPress = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the welcome slide initially", () => {
    render(<Onboarding />);
    expect(screen.getByText("Welcome to Flixor")).toBeInTheDocument();
    expect(screen.getByText("FLIXOR")).toBeInTheDocument();
  });

  it("shows Next and Skip buttons on first slide", () => {
    render(<Onboarding />);
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Skip")).toBeInTheDocument();
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
  });

  it("shows Back button after navigating forward", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
  });

  it("navigates through all slides forward", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Your Plex Library")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Configure Your Experience")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("navigates back to previous slide", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Welcome to Flixor")).toBeInTheDocument();
  });

  it("skip completes onboarding and navigates to /login", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Skip"));
    expect(mockedSaveSettings).toHaveBeenCalledWith({ onboardingCompleted: true });
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("Get Started saves settings and navigates to /login", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Get Started"));
    expect(mockedSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: true }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("calls focusSelf on slide change", async () => {
    render(<Onboarding />);
    mockFocusSelf.mockClear();
    fireEvent.click(screen.getByText("Next"));
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(mockFocusSelf).toHaveBeenCalled();
  });

  it("renders dot indicators for all slides", () => {
    const { container } = render(<Onboarding />);
    // 4 slides = 4 dot indicators
    const dots = container.querySelectorAll("span");
    // dots are rendered inside the dots div; at least 4 spans for dots
    expect(dots.length).toBeGreaterThanOrEqual(4);
  });

  it("renders SVG icons on each slide", () => {
    const { container } = render(<Onboarding />);
    // Welcome slide has an SVG icon
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  // ── Configuration slide tests ──────────────────────────────────────

  it("shows toggle items on configuration slide", () => {
    render(<Onboarding />);
    // Navigate to config slide (slide 4)
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Library Only Mode")).toBeInTheDocument();
    expect(screen.getByText("Show Trending Rows")).toBeInTheDocument();
    expect(screen.getByText("Show Trakt Rows")).toBeInTheDocument();
    expect(screen.getByText("Include TMDB in Search")).toBeInTheDocument();
  });

  it("toggles show ON/OFF indicators", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    // Default: showTrendingRows=true, so should show ON
    const onIndicators = screen.getAllByText("ON");
    expect(onIndicators.length).toBeGreaterThanOrEqual(1);
  });

  it("Get Started saves all toggle states", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Get Started"));
    expect(mockedSaveSettings).toHaveBeenCalledWith({
      libraryOnlyMode: false,
      showTrendingRows: true,
      showTraktRows: true,
      includeTmdbInSearch: true,
      onboardingCompleted: true,
    });
  });

  // ── D-PAD arrow navigation tests ──────────────────────────────────

  it("D-PAD right advances slide on non-config slides", () => {
    render(<Onboarding />);
    expect(capturedOnArrowPress).toBeDefined();
    let result: boolean;
    act(() => {
      result = capturedOnArrowPress!("right");
    });
    expect(result!).toBe(false);
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
  });

  it("D-PAD left goes back on non-config slides", () => {
    render(<Onboarding />);
    // Go to slide 2 first
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
    let result: boolean;
    act(() => {
      result = capturedOnArrowPress!("left");
    });
    expect(result!).toBe(false);
    expect(screen.getByText("Welcome to Flixor")).toBeInTheDocument();
  });

  it("D-PAD left on first slide returns true (no-op)", () => {
    render(<Onboarding />);
    const result = capturedOnArrowPress!("left");
    // Can't go back from first slide, returns true for normal nav
    expect(result).toBe(true);
  });

  it("D-PAD right on last non-config slide advances to config", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    // Now on slide 3 (Library), D-PAD right should go to config
    let result: boolean;
    act(() => {
      result = capturedOnArrowPress!("right");
    });
    expect(result!).toBe(false);
    expect(screen.getByText("Configure Your Experience")).toBeInTheDocument();
  });

  it("D-PAD on config slide returns true for normal spatial nav", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    // On config slide (slide 4), arrows should pass through
    const result = capturedOnArrowPress!("right");
    expect(result).toBe(true);
  });
});
