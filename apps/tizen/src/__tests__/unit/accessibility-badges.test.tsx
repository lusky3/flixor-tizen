import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  detectAccessibilityBadges,
  AccessibilityBadges,
} from "../../components/AccessibilityBadges";

// --- detectAccessibilityBadges ---

describe("detectAccessibilityBadges", () => {
  it("returns all false for empty streams", () => {
    expect(detectAccessibilityBadges([])).toEqual({
      hasCC: false,
      hasSDH: false,
      hasAD: false,
    });
  });

  it("detects CC when a subtitle stream is present", () => {
    const result = detectAccessibilityBadges([
      { streamType: 3, title: "English" },
    ]);
    expect(result.hasCC).toBe(true);
    expect(result.hasSDH).toBe(false);
    expect(result.hasAD).toBe(false);
  });

  it("detects SDH when subtitle title contains 'SDH'", () => {
    const result = detectAccessibilityBadges([
      { streamType: 3, title: "English SDH" },
    ]);
    expect(result.hasCC).toBe(true);
    expect(result.hasSDH).toBe(true);
  });

  it("detects SDH when subtitle displayTitle contains 'deaf'", () => {
    const result = detectAccessibilityBadges([
      { streamType: 3, displayTitle: "English (Deaf)" },
    ]);
    expect(result.hasSDH).toBe(true);
  });

  it("detects SDH for 'hard of hearing' (case-insensitive)", () => {
    const result = detectAccessibilityBadges([
      { streamType: 3, title: "Hard Of Hearing" },
    ]);
    expect(result.hasSDH).toBe(true);
  });

  it("detects AD when audio title contains 'Audio Description'", () => {
    const result = detectAccessibilityBadges([
      { streamType: 2, title: "Audio Description" },
    ]);
    expect(result.hasAD).toBe(true);
    expect(result.hasCC).toBe(false);
  });

  it("detects AD when audio displayTitle contains ' AD'", () => {
    const result = detectAccessibilityBadges([
      { streamType: 2, displayTitle: "English AD" },
    ]);
    expect(result.hasAD).toBe(true);
  });

  it("detects AD for 'descriptive' in title", () => {
    const result = detectAccessibilityBadges([
      { streamType: 2, title: "Descriptive Audio" },
    ]);
    expect(result.hasAD).toBe(true);
  });

  it("returns all false when only video streams present", () => {
    const result = detectAccessibilityBadges([
      { streamType: 1, title: "H.264" },
      { streamType: 1, title: "HEVC" },
    ]);
    expect(result).toEqual({ hasCC: false, hasSDH: false, hasAD: false });
  });

  it("detects all three from mixed streams", () => {
    const result = detectAccessibilityBadges([
      { streamType: 1, title: "H.264" },
      { streamType: 3, title: "English" },
      { streamType: 3, displayTitle: "English (SDH)" },
      { streamType: 2, title: "English Audio Description" },
    ]);
    expect(result).toEqual({ hasCC: true, hasSDH: true, hasAD: true });
  });
});

// --- AccessibilityBadges component ---

describe("AccessibilityBadges", () => {
  it("renders null when all flags are false", () => {
    const { container } = render(
      <AccessibilityBadges hasCC={false} hasSDH={false} hasAD={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null when no props provided", () => {
    const { container } = render(<AccessibilityBadges />);
    expect(container.firstChild).toBeNull();
  });

  it("renders CC badge when hasCC is true", () => {
    render(<AccessibilityBadges hasCC />);
    const img = screen.getByAltText("CC");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/badges/cc.png");
  });

  it("renders SDH badge when hasSDH is true", () => {
    render(<AccessibilityBadges hasSDH />);
    const img = screen.getByAltText("SDH");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/badges/sdh.png");
  });

  it("renders AD badge when hasAD is true", () => {
    render(<AccessibilityBadges hasAD />);
    const img = screen.getByAltText("AD");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/badges/ad.png");
  });

  it("renders all three badges when all true", () => {
    render(<AccessibilityBadges hasCC hasSDH hasAD />);
    expect(screen.getByAltText("CC")).toBeInTheDocument();
    expect(screen.getByAltText("SDH")).toBeInTheDocument();
    expect(screen.getByAltText("AD")).toBeInTheDocument();
  });
});
