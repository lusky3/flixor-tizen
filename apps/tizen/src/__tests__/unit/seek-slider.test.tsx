import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  formatTime,
  clampSeek,
  fillPercent,
  SeekSlider,
} from "../../components/SeekSlider";

// --- Mocks ---

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: () => ({
    ref: { current: null },
    focused: false,
    focusKey: "test",
  }),
}));

// --- formatTime ---

describe("formatTime", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats 61 seconds as 01:01", () => {
    expect(formatTime(61)).toBe("01:01");
  });

  it("formats 3661 seconds as 1:01:01 (H:MM:SS)", () => {
    expect(formatTime(3661)).toBe("1:01:01");
  });
});

// --- clampSeek ---

describe("clampSeek", () => {
  it("clamps to 0 when delta is large negative", () => {
    expect(clampSeek(50, -100, 100)).toBe(0);
  });

  it("clamps to duration when delta exceeds remaining", () => {
    expect(clampSeek(50, 100, 100)).toBe(100);
  });

  it("returns current + delta for normal seek", () => {
    expect(clampSeek(50, 10, 100)).toBe(60);
  });
});

// --- fillPercent ---

describe("fillPercent", () => {
  it("returns 50 for halfway", () => {
    expect(fillPercent(50, 100)).toBe(50);
  });

  it("returns 0 at start", () => {
    expect(fillPercent(0, 100)).toBe(0);
  });

  it("returns 100 at end", () => {
    expect(fillPercent(100, 100)).toBe(100);
  });

  it("returns 0 when duration is 0 (zero-division guard)", () => {
    expect(fillPercent(50, 0)).toBe(0);
  });
});

// --- SeekSlider component ---

describe("SeekSlider", () => {
  it("renders both timestamps", () => {
    render(
      <SeekSlider currentTime={61} duration={3661} onSeek={vi.fn()} />,
    );
    expect(screen.getByText("01:01")).toBeInTheDocument();
    expect(screen.getByText("1:01:01")).toBeInTheDocument();
  });

  it("renders fill bar with correct width", () => {
    const { container } = render(
      <SeekSlider currentTime={50} duration={100} onSeek={vi.fn()} />,
    );
    const fill = container.querySelector('[style*="width: 50%"]');
    expect(fill).not.toBeNull();
  });

  it("zero duration shows 00:00 for both timestamps", () => {
    render(
      <SeekSlider currentTime={0} duration={0} onSeek={vi.fn()} />,
    );
    const zeros = screen.getAllByText("00:00");
    expect(zeros).toHaveLength(2);
  });
});
