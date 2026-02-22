import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContentRatingBadge, {
  ContentRatingText,
  isMatureRating,
} from "../../components/ContentRatingBadge";

// ── ContentRatingBadge ─────────────────────────────────────────────────

describe("ContentRatingBadge", () => {
  // ── Null on empty / undefined ──────────────────────────────────────

  it("returns null when rating is undefined", () => {
    const { container } = render(<ContentRatingBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when rating is empty string", () => {
    const { container } = render(<ContentRatingBadge rating="" />);
    expect(container.firstChild).toBeNull();
  });

  // ── Image badge for known ratings ──────────────────────────────────

  const imageBadgeRatings = [
    { rating: "G", file: "g" },
    { rating: "PG", file: "pg" },
    { rating: "PG-13", file: "pg13" },
    { rating: "R", file: "r" },
    { rating: "TV-G", file: "tvg" },
    { rating: "TV-PG", file: "tvpg" },
    { rating: "TV-14", file: "tv14" },
    { rating: "TV-MA", file: "tvma" },
    { rating: "NR", file: "unrated" },
  ];

  it.each(imageBadgeRatings)(
    "renders image badge for $rating → /badges/$file.png",
    ({ rating, file }) => {
      render(<ContentRatingBadge rating={rating} />);
      const img = screen.getByRole("img", { name: rating });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", `/badges/${file}.png`);
    },
  );

  // ── Normalization: variations map to canonical form ─────────────────

  const normalizedVariations = [
    { input: "TVMA", expected: "TV-MA", file: "tvma" },
    { input: "tvpg", expected: "TV-PG", file: "tvpg" },
    { input: "PG13", expected: "PG-13", file: "pg13" },
    { input: "TVY", expected: "TV-Y", file: undefined },
    { input: "TVY7", expected: "TV-Y7", file: undefined },
    { input: "NC17", expected: "NC-17", file: undefined },
    { input: "NOTRATED", expected: "NR", file: "unrated" },
    { input: "NOT RATED", expected: "NR", file: "unrated" },
    { input: "UNRATED", expected: "NR", file: "unrated" },
  ];

  it.each(normalizedVariations)(
    "normalizes '$input' to '$expected'",
    ({ input, expected, file }) => {
      render(<ContentRatingBadge rating={input} />);
      if (file) {
        // Known image badge
        const img = screen.getByRole("img", { name: expected });
        expect(img).toHaveAttribute("src", `/badges/${file}.png`);
      } else {
        // Text pill fallback
        expect(screen.getByText(expected)).toBeInTheDocument();
      }
    },
  );

  // ── Unknown rating falls back to gray text pill ────────────────────

  it("renders gray text pill for unknown rating", () => {
    render(<ContentRatingBadge rating="XYZZY" />);
    const pill = screen.getByText("XYZZY");
    expect(pill).toBeInTheDocument();
    expect(pill.tagName).toBe("SPAN");
    // Gray color scheme (jsdom normalizes hex → rgb)
    expect(pill.style.color).toBe("rgb(163, 163, 163)");
  });

  // ── Color categories via text pill (ratings without image assets) ──

  describe("color categories for text pill fallback", () => {
    it("green for TV-Y", () => {
      render(<ContentRatingBadge rating="TV-Y" />);
      const pill = screen.getByText("TV-Y");
      expect(pill.style.color).toBe("rgb(74, 222, 128)");
    });

    it("green for TV-Y7", () => {
      render(<ContentRatingBadge rating="TV-Y7" />);
      const pill = screen.getByText("TV-Y7");
      expect(pill.style.color).toBe("rgb(74, 222, 128)");
    });

    it("dark red for NC-17", () => {
      render(<ContentRatingBadge rating="NC-17" />);
      const pill = screen.getByText("NC-17");
      expect(pill.style.color).toBe("rgb(252, 165, 165)");
    });
  });

  // ── Size prop ──────────────────────────────────────────────────────

  it("applies size height to image badge", () => {
    render(<ContentRatingBadge rating="G" size="lg" />);
    const img = screen.getByRole("img", { name: "G" });
    expect(img.style.height).toBe("28px");
  });

  it("applies size font to text pill", () => {
    render(<ContentRatingBadge rating="CUSTOM" size="sm" />);
    const pill = screen.getByText("CUSTOM");
    expect(pill.style.fontSize).toBe("9px");
  });
});

// ── ContentRatingText ──────────────────────────────────────────────────

describe("ContentRatingText", () => {
  it("returns null for undefined rating", () => {
    const { container } = render(<ContentRatingText />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null for empty string rating", () => {
    const { container } = render(<ContentRatingText rating="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders normalized rating text with correct color", () => {
    render(<ContentRatingText rating="R" />);
    const el = screen.getByText("R");
    expect(el).toBeInTheDocument();
    expect(el.style.color).toBe("rgb(248, 113, 113)");
  });

  it("uses gray color for unknown rating", () => {
    render(<ContentRatingText rating="UNKNOWN" />);
    const el = screen.getByText("UNKNOWN");
    expect(el.style.color).toBe("rgb(163, 163, 163)");
  });
});

// ── isMatureRating ─────────────────────────────────────────────────────

describe("isMatureRating", () => {
  it("returns false for undefined", () => {
    expect(isMatureRating(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMatureRating("")).toBe(false);
  });

  const matureRatings = ["R", "NC-17", "TV-MA", "TV-14"];
  it.each(matureRatings)("returns true for %s", (rating) => {
    expect(isMatureRating(rating)).toBe(true);
  });

  it("returns true for unnormalized mature ratings", () => {
    expect(isMatureRating("TVMA")).toBe(true);
    expect(isMatureRating("NC17")).toBe(true);
    expect(isMatureRating("TV14")).toBe(true);
  });

  const nonMatureRatings = ["G", "PG", "PG-13", "TV-Y", "TV-Y7", "TV-G", "TV-PG", "NR"];
  it.each(nonMatureRatings)("returns false for %s", (rating) => {
    expect(isMatureRating(rating)).toBe(false);
  });

  it("returns false for unknown rating", () => {
    expect(isMatureRating("XYZZY")).toBe(false);
  });
});
