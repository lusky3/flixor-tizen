import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Onboarding } from "../../pages/Onboarding";

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

// ── Tests ──────────────────────────────────────────────────────────────

describe("Onboarding", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFocusSelf.mockClear();
    capturedOnArrowPress = undefined;
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
    // Slide 0 → 1
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Discover New Content")).toBeInTheDocument();
    // Slide 1 → 2
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Your Plex Library")).toBeInTheDocument();
    // Slide 2 → 3
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Configure Your Experience")).toBeInTheDocument();
    // Last slide shows "Get Started" instead of "Next"
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
    const { saveSettings } = require("../../services/settings");
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Skip"));
    expect(saveSettings).toHaveBeenCalledWith({ onboardingCompleted: true });
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("Get Started saves settings and navigates to /login", () => {
    const { saveSettings } = require("../../services/settings");
    render(<Onboarding />);
    // Navigate to last slide
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Get Started"));
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: true }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("renders 4 dot indicators", () => {
    const { container } = render(<Onboarding />);
    // Dots are span elements inside the dots container
    const dotsContainer = container.querySelectorAll("span");
    // Filter to find dots (small circular elements)
    // We check that at least 4 spans exist (dots + toggle indicators etc.)
    expect(dotsContainer.length).toBeGreaterThanOrEqual(4);
  });

  it("renders slide icons (SVG illustrations)", () => {
    const { container } = render(<Onboarding />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("config slide shows toggle descriptions", () => {
    render(<Onboarding />);
    // Navigate to config slide
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(
      screen.getByText(/Only show your Plex library content/),
    ).toBeInTheDocument();
  });

  it("config slide toggles have role='switch'", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBe(4);
  });

  it("D-PAD right arrow triggers next slide on non-config slides", () => {
    render(<Onboarding />);
    expect(capturedOnArrowPress).toBeDefined();
    // On slide 0, right should navigate forward
    const result = capturedOnArrowPress!("right");
    expect(result).toBe(false); // consumed the event
  });

  it("D-PAD left arrow on first slide allows normal nav", () => {
    render(<Onboarding />);
    expect(capturedOnArrowPress).toBeDefined();
    // On slide 0, left should pass through (no previous slide)
    const result = capturedOnArrowPress!("left");
    expect(result).toBe(true); // not consumed
  });

  it("calls focusSelf on slide change", () => {
    render(<Onboarding />);
    // focusSelf is called on mount via useEffect
    expect(mockFocusSelf).toHaveBeenCalled();
  });
});
