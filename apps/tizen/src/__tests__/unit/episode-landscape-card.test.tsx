import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  EpisodeLandscapeCard,
  getProgressDisplay,
} from "../../components/EpisodeLandscapeCard";

// --- Mocks ---

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test",
    ...opts,
  }),
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ alt }: { alt: string }) => <div data-testid="smart-image">{alt}</div>,
}));

// --- getProgressDisplay boundary tests ---

describe("getProgressDisplay — boundary values", () => {
  it("returns 'none' for 0%", () => {
    expect(getProgressDisplay(0)).toBe("none");
  });

  it("returns 'bar' for 1%", () => {
    expect(getProgressDisplay(1)).toBe("bar");
  });

  it("returns 'bar' for 84%", () => {
    expect(getProgressDisplay(84)).toBe("bar");
  });

  it("returns 'checkmark' for 85%", () => {
    expect(getProgressDisplay(85)).toBe("checkmark");
  });

  it("returns 'checkmark' for 100%", () => {
    expect(getProgressDisplay(100)).toBe("checkmark");
  });
});

// --- Component rendering tests ---

describe("EpisodeLandscapeCard", () => {
  it("renders episode number badge", () => {
    render(<EpisodeLandscapeCard episodeNumber={3} title="Test Episode" />);
    expect(screen.getByText("Episode 3")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(<EpisodeLandscapeCard episodeNumber={1} title="The Pilot" />);
    expect(screen.getByText("The Pilot")).toBeInTheDocument();
  });

  it("renders overview (2-line truncated)", () => {
    const overview = "A long overview that should be truncated to two lines.";
    render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" overview={overview} />,
    );
    const el = screen.getByText(overview);
    expect(el).toBeInTheDocument();
    expect(el.style.WebkitLineClamp).toBe("2");
  });

  it("renders duration formatted — 45 → '45m'", () => {
    render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" duration={45} />,
    );
    expect(screen.getByText("45m")).toBeInTheDocument();
  });

  it("renders duration formatted — 90 → '1h 30m'", () => {
    render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" duration={90} />,
    );
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
  });

  it("renders duration formatted — 60 → '1h'", () => {
    render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" duration={60} />,
    );
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  it("progress 0%: no progress bar, no checkmark", () => {
    const { container } = render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" progress={0} />,
    );
    // No progress bar (red bar element)
    expect(container.querySelector('[style*="background: #e50914"]')).toBeNull();
    // No checkmark SVG
    expect(container.querySelector("svg")).toBeNull();
  });

  it("progress 1%: shows progress bar", () => {
    const { container } = render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" progress={1} />,
    );
    const bar = container.querySelector('[style*="width: 1%"]');
    expect(bar).not.toBeNull();
    // No checkmark
    expect(container.querySelector("svg")).toBeNull();
  });

  it("progress 84%: shows progress bar", () => {
    const { container } = render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" progress={84} />,
    );
    const bar = container.querySelector('[style*="width: 84%"]');
    expect(bar).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("progress 85%: shows checkmark, no progress bar", () => {
    const { container } = render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" progress={85} />,
    );
    // Checkmark SVG present
    expect(container.querySelector("svg")).not.toBeNull();
    // No progress bar
    expect(container.querySelector('[style*="background: #e50914"]')).toBeNull();
  });

  it("progress 100%: shows checkmark", () => {
    const { container } = render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" progress={100} />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector('[style*="background: #e50914"]')).toBeNull();
  });

  it("missing overview: no overview rendered", () => {
    const { container } = render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" />,
    );
    expect(container.querySelector("p")).toBeNull();
  });

  it("missing duration: no duration rendered", () => {
    render(<EpisodeLandscapeCard episodeNumber={1} title="Ep" />);
    // No element with minute-format text
    expect(screen.queryByText(/\d+m/)).toBeNull();
    expect(screen.queryByText(/\d+h/)).toBeNull();
  });

  it("click handler fires onPress", () => {
    const onPress = vi.fn();
    render(
      <EpisodeLandscapeCard episodeNumber={1} title="Ep" onPress={onPress} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
