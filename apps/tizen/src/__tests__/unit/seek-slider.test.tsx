import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeekSlider } from "../../components/SeekSlider";
import { formatTime, clampSeek, fillPercent } from "../../utils/seekSliderUtils";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: () => ({
    ref: { current: null },
    focused: false,
  }),
}));

describe("formatTime", () => {
  it("formats seconds under an hour as MM:SS", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(599)).toBe("09:59");
  });

  it("formats seconds over an hour as H:MM:SS", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(7200)).toBe("2:00:00");
  });

  it("handles negative values", () => {
    expect(formatTime(-10)).toBe("00:00");
  });
});

describe("clampSeek", () => {
  it("clamps to 0 when seeking before start", () => {
    expect(clampSeek(5, -10, 100)).toBe(0);
  });

  it("clamps to duration when seeking past end", () => {
    expect(clampSeek(95, 10, 100)).toBe(100);
  });

  it("returns correct value within range", () => {
    expect(clampSeek(50, 10, 100)).toBe(60);
    expect(clampSeek(50, -10, 100)).toBe(40);
  });
});

describe("fillPercent", () => {
  it("returns 0 when duration is 0", () => {
    expect(fillPercent(50, 0)).toBe(0);
  });

  it("returns correct percentage", () => {
    expect(fillPercent(50, 100)).toBe(50);
    expect(fillPercent(25, 100)).toBe(25);
  });

  it("clamps to 100", () => {
    expect(fillPercent(150, 100)).toBe(100);
  });

  it("clamps to 0 for negative", () => {
    expect(fillPercent(-10, 100)).toBe(0);
  });
});

describe("SeekSlider component", () => {
  it("renders timestamps", () => {
    render(
      <SeekSlider currentTime={65} duration={600} onSeek={vi.fn()} />,
    );
    expect(screen.getByText("01:05")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("renders with zero duration", () => {
    render(
      <SeekSlider currentTime={0} duration={0} onSeek={vi.fn()} />,
    );
    expect(screen.getAllByText("00:00")).toHaveLength(2);
  });
});
